import os from 'os'
import renderer from '../../fastify-renderer/src/node'
import { newFastify } from '../../fastify-renderer/test/helpers'

export const server = async () => {
  const server = await newFastify({
    logger: {
      level: process.env.LOG_LEVEL ?? process.env.NODE_ENV == 'test' ? 'warn' : 'info',
      prettyPrint: true,
    },
  })

  await server.register(renderer, {
    renderer: {
      type: 'react',
      mode: 'sync',
    },
    vite: {
      server: {
        hmr: {
          port: 27123,
        },
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-dom/server', 'wouter', 'path-to-regexp'],
      },
    },
  })

  server.get('/*', { render: require.resolve('./NotFound') }, async (request) => {
    return { params: request.params }
  })

  server.get('/', { render: require.resolve('./Home') }, async () => {
    return { time: Date.now() }
  })

  server.get('/about', { render: require.resolve('./About') }, async (request) => {
    return { hostname: os.hostname(), requestIP: request.ip }
  })

  server.get('/navigation-test', { render: require.resolve('./NavigationTest') }, async (_request) => {
    return {}
  })

  server.get('/imperative', async (request, reply) => {
    await reply.render(require.resolve('./About'), { hostname: os.hostname(), requestIP: request.ip })
  })

  server.get<{ Params: { id: string } }>('/widget/:id', { render: require.resolve('./Widget') }, async (request) => {
    return { widget: { id: request.params.id } }
  })

  await server.register(async (instance) => {
    instance.setRenderConfig({ layout: require.resolve('./RedLayout') })

    instance.get('/red/about', { render: require.resolve('./About') }, async (request) => {
      return { hostname: os.hostname(), requestIP: request.ip }
    })
  })

  await server.register(async (instance) => {
    instance.setRenderConfig({ base: '/subpath' })

    instance.get('/subpath/this', { render: require.resolve('./subapp/This') }, async (_request) => {
      return {}
    })
    instance.get('/subpath/that', { render: require.resolve('./subapp/That') }, async (_request) => {
      return {}
    })
  })

  await server.ready()
  return server
}

if (require.main === module) {
  void server().then((server) => {
    console.warn(server.printRoutes())
    return server.listen(3000)
  })
}
