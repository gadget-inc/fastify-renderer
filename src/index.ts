/* eslint-disable @typescript-eslint/require-await */
import reactRefresh from '@vitejs/plugin-react-refresh'
import * as errors from 'http-errors'
import * as path from 'path'
import fastifyAccepts from 'fastify-accepts'
import 'middie'
import { createServer, InlineConfig, ViteDevServer } from 'vite'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { ReactRenderer } from './renderers/react/ReactRenderer'
import './type-extensions' // necessary to make sure that the fastify types are augmented
import { Renderer } from './renderers/Renderer'

export type ServerRenderer<Props> = (
  this: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<Props>

export interface FastifyRendererOptions {
  vite?: InlineConfig
  renderer: 'react'
  layout?: string
  document?: string
}

export const FastifyVite = fp<FastifyRendererOptions>(
  async (fastify, options) => {
    await fastify.register(fastifyAccepts)
    // todo: register middie if it hasn't been registered already, same way as fastify-helmet does with trying to use `.use` first, and if it doesn't work, registering middie then trying again and remove dependency

    let vite: ViteDevServer
    let renderer: Renderer
    const entrypoints: string[] = []
    const base = options.vite?.base || '/'

    fastify.decorate('vite', {
      getter() {
        return vite
      },
    })

    // we need to register a wildcard route for all the files that vite might serve so fastify will run the middleware chain and vite will do the serving. 404 in this request handler because we expect vite to handle any real requests
    fastify.get(`${path.join(base, '*')}`, async () => {
      throw new errors.NotFound()
    })

    // Wrap routes that have the `vite` option set to invoke the rendererer with the result of the route handler as the props
    fastify.addHook('onRoute', (routeOptions) => {
      if (routeOptions.render) {
        const oldHandler = routeOptions.handler as ServerRenderer<any>
        const renderable = routeOptions.render
        entrypoints.push(renderable)

        routeOptions.handler = async function (request, reply) {
          const props = await oldHandler.call(this, request, reply)

          request.log.info({ headers: request.headers }, 'render')
          switch (request.accepts().type(['html', 'json'])) {
            case 'json':
              await reply.type('application/json').send({ props })
              break
            case 'html':
              void reply.type('text/html')
              await renderer.render(request, reply, renderable, props)
              break
            default:
              await reply.type('text/plain').send('Content type not supported')
              break
          }
        }
      }

      fastify.addHook('onReady', async () => {
        // register vite once all the routes have been defined
        const viteOptions: InlineConfig = {
          clearScreen: false,
          ...options.vite,
          plugins: [...(options.vite?.plugins || []), reactRefresh()],
          server: {
            middlewareMode: true,
            ...options.vite?.server,
          },
          build: {
            manifest: true,
            ...options.vite?.build,
            rollupOptions: {
              input: Object.fromEntries(entrypoints.map((entrypoint) => [entrypoint, entrypoint])),
              ...options.vite?.build?.rollupOptions,
            },
          },
        }

        fastify.log.debug('booting vite server')
        vite = await createServer(viteOptions)

        fastify.use(vite.middlewares)

        renderer = new ReactRenderer(options, vite)
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
