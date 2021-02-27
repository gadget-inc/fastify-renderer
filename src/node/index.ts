/* eslint-disable @typescript-eslint/require-await */
import { FastifyInstance, RouteOptions } from 'fastify'
import fastifyAccepts from 'fastify-accepts'
import fp from 'fastify-plugin'
import fastifyStatic from 'fastify-static'
import { promises as fs } from 'fs'
import 'middie'
import path from 'path'
import { build as viteBuild, createServer, InlineConfig, resolveConfig, ResolvedConfig, ViteDevServer } from 'vite'
import { FastifyRendererOptions, FastifyRendererPlugin } from './Plugin'
import { Render } from './renderers/Renderer'
import './types' // necessary to make sure that the fastify types are augmented
import { ServerRenderer } from './types'
import { mapFilepathToEntrypointName } from './utils'

const instances: {
  fastify: FastifyInstance
  routes: RouteOptions[]
  plugin: FastifyRendererPlugin
  vite: InlineConfig
}[] = []

const FastifyRenderer = fp<FastifyRendererOptions>(
  async (fastify, incomingOptions) => {
    await fastify.register(fastifyAccepts)
    // todo: register middie if it hasn't been registered already, same way as fastify-helmet does with trying to use `.use` first, and if it doesn't work, registering middie then trying again and remove dependency

    const plugin = new FastifyRendererPlugin(incomingOptions)
    let vite: ViteDevServer
    const routes: RouteOptions[] = []

    fastify.decorate('vite', {
      getter() {
        return vite
      },
    })

    // we need to register a wildcard route for all the files that vite might serve so fastify will run the middleware chain and vite will do the serving. 404 in this request handler because we expect vite to handle any real requests
    const staticPath = path.join(plugin.outDir, 'client')
    await fs.mkdir(staticPath, { recursive: true })
    void fastify.register(fastifyStatic, {
      root: staticPath,
      prefix: plugin.base,
    })

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
              await plugin.renderer.render(render)
              break
            default:
              await reply.type('text/plain').send('Content type not supported')
              break
          }
        }
      }
    })

    let devServer: ViteDevServer | undefined = undefined

    // register vite once all the routes have been defined
    fastify.addHook('onReady', async () => {
      const viteOptions: InlineConfig = {
        clearScreen: false,
        ...plugin.vite,
        plugins: [...(plugin.vite?.plugins || []), ...plugin.renderer.vitePlugins()],
        server: {
          middlewareMode: true,
          ...plugin.vite?.server,
        },
        build: {
          ...plugin.vite?.build,
        },
      }

      let config: ResolvedConfig

      if (plugin.devMode) {
        fastify.log.debug('booting vite dev server')
        devServer = await createServer(viteOptions)
        fastify.use(devServer.middlewares)
        config = devServer.config
      } else {
        config = await resolveConfig(viteOptions, 'serve')
      }

      instances.push({ fastify, routes, plugin, vite: viteOptions })

      await plugin.renderer.prepare(routes, config, devServer)
    })

    fastify.addHook('onClose', async (_, done) => {
      await devServer?.close()
      done()
    })
  },
  {
    fastify: '3.x',
    name: 'fastify-renderer',
    dependencies: ['fastify-accepts', 'middie'],
  }
)

module.exports = exports = FastifyRenderer
export default FastifyRenderer

export const build = async () => {
  if (instances.length == 0) {
    throw new Error('No instances of fastify-renderer registered to build, have all your fastify plugins been loaded?')
  }

  const total = instances.length
  for (const [index, { fastify, routes, plugin, vite }] of Object.entries(instances)) {
    const clientEntrypoints: Record<string, string> = {}
    const serverEntrypoints: Record<string, string> = {}
    for (const route of routes) {
      const entrypointName = mapFilepathToEntrypointName(route.render!)
      clientEntrypoints[entrypointName] = plugin.renderer.buildVirtualClientEntrypointModuleURL(route.render!)
      serverEntrypoints[entrypointName] = plugin.renderer.buildVirtualServerEntrypointModuleURL(route.render!)

      serverEntrypoints[mapFilepathToEntrypointName(plugin.layout)] = plugin.layout
    }

    fastify.log.info(`Building client side assets for fastify-renderer (${index + 1}/${total + 1})`)
    await viteBuild({
      ...vite,
      build: {
        ...vite.build,
        outDir: path.join(plugin.outDir, 'client'),
        ssrManifest: true,
        manifest: true,
        rollupOptions: {
          input: clientEntrypoints,
          ...vite?.build?.rollupOptions,
        },
      },
    })

    fastify.log.info(`Building server side side assets for fastify-renderer (${index + 1}/${total + 1})`)
    await viteBuild({
      ...vite,
      build: {
        ...vite.build,
        rollupOptions: {
          input: serverEntrypoints,
          ...vite?.build?.rollupOptions,
        },
        outDir: path.join(plugin.outDir, 'server'),
        ssr: true,
      },
    })

    // Write a special manifest for the server side entrypoints
    // Somewhat strangely we also use virtual entrypoints for the server side code used during SSR -- that means that in production, the server needs to require code from a special spot to get the SSR-safe version of each entrypoint. We write out our own manifesth here because there's a bug in rollup or vite that errors when trying to generate a manifest in SSR mode.
    const virtualModulesToRenderedEntrypoints = Object.fromEntries(
      Object.entries(serverEntrypoints).map(([key, value]) => [value, key])
    )
    await fs.writeFile(
      path.join(plugin.outDir, 'server', 'virtual-manifest.json'),
      JSON.stringify(virtualModulesToRenderedEntrypoints, null, 2)
    )
  }
}
