/* eslint-disable @typescript-eslint/require-await */
import errors from 'http-errors'
import path from 'path'
import fastifyAccepts from 'fastify-accepts'
import 'middie'
import { createServer, InlineConfig, ViteDevServer } from 'vite'
import { RouteOptions } from 'fastify'
import fp from 'fastify-plugin'
import { ReactRenderer } from './renderers/react/ReactRenderer'
import './types' // necessary to make sure that the fastify types are augmented
import { Render } from './renderers/Renderer'
import { DefaultDocumentTemplate } from './DocumentTemplate'
import { unthunk } from './utils'
import { FastifyRendererOptions, ResolvedOptions, ServerRenderer } from './types'

export const FastifyVite = fp<FastifyRendererOptions>(
  async (fastify, incomingPptions) => {
    await fastify.register(fastifyAccepts)
    // todo: register middie if it hasn't been registered already, same way as fastify-helmet does with trying to use `.use` first, and if it doesn't work, registering middie then trying again and remove dependency

    const options: ResolvedOptions = {
      renderer: 'react',
      vite: incomingPptions.vite,
      layout: incomingPptions.layout || require.resolve('./renderers/react/DefaultLayout'),
      document: incomingPptions.document || DefaultDocumentTemplate,
      hooks: (incomingPptions.hooks || []).map(unthunk),
    }

    let vite: ViteDevServer
    const renderer = new ReactRenderer(options)
    const routes: RouteOptions[] = []
    const base = options.vite?.base || '/'

    fastify.decorate('vite', {
      getter() {
        return vite
      },
    })

    // we need to register a wildcard route for all the files that vite might serve so fastify will run the middleware chain and vite will do the serving. 404 in this request handler because we expect vite to handle any real requests
    fastify.get(`${path.join(base, '*')}`, async (request) => {
      request.log.warn({ url: request.url }, 'fastify-renderer file serving miss')
      throw new errors.NotFound()
    })

    // Wrap routes that have the `vite` option set to invoke the rendererer with the result of the route handler as the props
    fastify.addHook('onRoute', (routeOptions) => {
      if (routeOptions.render) {
        const oldHandler = routeOptions.handler as ServerRenderer<any>
        const renderable = routeOptions.render
        routes.push(routeOptions)

        routeOptions.handler = async function (request, reply) {
          const props = await oldHandler.call(this, request, reply)

          request.log.info({ headers: request.headers }, 'render')
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

      fastify.addHook('onReady', async () => {
        // register vite once all the routes have been defined
        const entrypoints: Record<string, string> = {}
        for (const route of routes) {
          entrypoints[options.layout] = options.layout
          entrypoints[route.render!] = route.render!
        }

        const viteOptions: InlineConfig = {
          clearScreen: false,
          ...options.vite,
          plugins: [...(options.vite?.plugins || []), ...renderer.vitePlugins()],
          server: {
            middlewareMode: true,
            ...options.vite?.server,
          },
          build: {
            manifest: true,
            ssrManifest: true,
            ...options.vite?.build,
            rollupOptions: {
              input: entrypoints,
              ...options.vite?.build?.rollupOptions,
            },
            ssr: {
              external: ['wouter/use-location'],
            } as any,
          },
        }

        fastify.log.debug('booting vite server')
        vite = await createServer(viteOptions)

        fastify.use(vite.middlewares)

        await renderer.prepare(routes, vite)
      })
    })
  },
  {
    fastify: '3.x',
    name: 'fastify-renderer',
    dependencies: ['fastify-accepts', 'middie'],
  }
)

// Workaround for importing fastify-renderer in native ESM context
module.exports = exports = FastifyVite
export default FastifyVite
