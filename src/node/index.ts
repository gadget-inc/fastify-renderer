/* eslint-disable @typescript-eslint/require-await */
import { FastifyInstance, RouteOptions } from 'fastify'
import fastifyAccepts from 'fastify-accepts'
import fp from 'fastify-plugin'
import fastifyStatic from 'fastify-static'
import { promises as fs } from 'fs'
import 'middie'
import path from 'path'
import { build as viteBuild, createServer, InlineConfig, resolveConfig, ResolvedConfig, ViteDevServer } from 'vite'
import { DefaultDocumentTemplate } from './DocumentTemplate'
import { ReactRenderer } from './renderers/react/ReactRenderer'
import { Render, Renderer } from './renderers/Renderer'
import './types' // necessary to make sure that the fastify types are augmented
import {
  FastifyRendererOptions,
  ResolvedOptions,
  ServerRenderer,
  ViteClientManifest,
  ViteServerManifest,
} from './types'
import { mapFilepathToEntrypointName, unthunk } from './utils'

export const instances: {
  fastify: FastifyInstance
  routes: RouteOptions[]
  options: ResolvedOptions
  renderer: Renderer
  vite: InlineConfig
}[] = []

const FastifyVite = fp<FastifyRendererOptions>(
  async (fastify, incomingOptions) => {
    await fastify.register(fastifyAccepts)
    // todo: register middie if it hasn't been registered already, same way as fastify-helmet does with trying to use `.use` first, and if it doesn't work, registering middie then trying again and remove dependency

    const devMode = incomingOptions.devMode ?? process.env.NODE_ENV != 'production'
    const outDir = incomingOptions.outDir || path.join(process.cwd(), 'dist')

    let clientManifest: ViteClientManifest | undefined, serverManifest: ViteServerManifest | undefined
    if (!devMode) {
      clientManifest = JSON.parse(await fs.readFile(path.join(outDir, 'client', 'manifest.json'), 'utf-8'))
      serverManifest = JSON.parse(await fs.readFile(path.join(outDir, 'client', 'ssr-manifest.json'), 'utf-8'))
    }

    const options: ResolvedOptions = {
      renderer: incomingOptions.renderer || { type: 'react', mode: 'streaming' },
      devMode,
      outDir,
      vite: incomingOptions.vite,
      layout: incomingOptions.layout || require.resolve('./renderers/react/DefaultLayout'),
      document: incomingOptions.document || DefaultDocumentTemplate,
      hooks: (incomingOptions.hooks || []).map(unthunk),
      base: incomingOptions.vite?.base || '/',
      clientManifest,
      serverManifest,
    }

    let vite: ViteDevServer
    const renderer = new ReactRenderer(options)
    const routes: RouteOptions[] = []

    fastify.decorate('vite', {
      getter() {
        return vite
      },
    })

    // we need to register a wildcard route for all the files that vite might serve so fastify will run the middleware chain and vite will do the serving. 404 in this request handler because we expect vite to handle any real requests
    void fastify.register(fastifyStatic, { root: path.join(outDir, 'client'), prefix: options.base })

    // Wrap routes that have the `vite` option set to invoke the rendererer with the result of the route handler as the props
    fastify.addHook('onRoute', (routeOptions) => {
      if (routeOptions.render) {
        const oldHandler = routeOptions.handler as ServerRenderer<any>
        const renderable = routeOptions.render
        routes.push(routeOptions)

        routeOptions.handler = async function (request, reply) {
          const props = await oldHandler.call(this, request, reply)

          void reply.header('Vary', 'Accept')
          switch (request.accepts().type(['html', 'json'])) {
            case 'json':
              await reply.type('application/json').send({ props })
              break
            case 'html':
              void reply.type('text/html')
              const render: Render<typeof props> = { request, reply, props, renderable }
              await renderer.render(render)
              break
            default:
              await reply.type('text/plain').send('Content type not supported')
              break
          }
        }
      }
    })

    // register vite once all the routes have been defined
    fastify.addHook('onReady', async () => {
      const viteOptions: InlineConfig = {
        clearScreen: false,
        ...options.vite,
        plugins: [...(options.vite?.plugins || []), ...renderer.vitePlugins()],
        server: {
          middlewareMode: true,
          ...options.vite?.server,
        },
        build: {
          ...options.vite?.build,
        },
      }

      let config: ResolvedConfig
      let devServer: ViteDevServer | undefined = undefined

      if (options.devMode) {
        fastify.log.debug('booting vite dev server')
        devServer = await createServer(viteOptions)
        fastify.use(devServer.middlewares)
        config = devServer.config
      } else {
        config = await resolveConfig(viteOptions, 'serve')
      }

      instances.push({ fastify, routes, options, renderer, vite: viteOptions })

      await renderer.prepare(routes, config, devServer)
    })
  },
  {
    fastify: '3.x',
    name: 'fastify-renderer',
    dependencies: ['fastify-accepts', 'middie'],
  }
)

export default FastifyVite

export const build = async () => {
  if (instances.length == 0) {
    throw new Error('No instances of fastify-renderer registered to build, have all the plugins been loaded?')
  }

  const total = instances.length
  for (const [index, { fastify, routes, options, renderer, vite }] of Object.entries(instances)) {
    fastify.log.info(`Building client side assets for fastify-renderer (${index}/${total})`)
    const clientEntrypoints: Record<string, string> = {}
    const serverEntrypoints: Record<string, string> = {}
    for (const route of routes) {
      const entrypointName = mapFilepathToEntrypointName(route.render!)
      clientEntrypoints[entrypointName] = renderer.buildEntrypointModuleURL(route.render!)
      serverEntrypoints[entrypointName] = route.render!

      serverEntrypoints[mapFilepathToEntrypointName(options.layout)] = options.layout
    }

    await viteBuild({
      ...vite,
      build: {
        ...vite.build,
        outDir: path.join(options.outDir, 'client'),
        ssrManifest: true,
        manifest: true,
        rollupOptions: {
          input: clientEntrypoints,
          ...vite?.build?.rollupOptions,
        },
      },
    })

    fastify.log.info(`Building server side side assets for fastify-renderer (${index}/${total})`)
    await viteBuild({
      ...vite,
      build: {
        ...vite.build,
        rollupOptions: {
          input: serverEntrypoints,
          ...vite?.build?.rollupOptions,
        },
        outDir: path.join(options.outDir, 'server'),
        ssr: true,
      },
    })
  }
}
