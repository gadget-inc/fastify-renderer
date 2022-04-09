import type { FastifyRequest } from 'fastify'
import os from 'os'
import renderer from '../../fastify-renderer/src/node'
import { newFastify } from '../../fastify-renderer/test/helpers'
import { CustomDocumentTemplate } from './CustomDocumentTemplate'

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

  server.registerRenderable(require.resolve('./ImperativelyRenderablePage'))

  server.get('/imperative/:bool', async (request: FastifyRequest<{ Params: { bool: string } }>, reply) => {
    if (request.params.bool == 'true') {
      return reply.render(require.resolve('./ImperativelyRenderablePage'), {
        hostname: os.hostname(),
        requestIP: request.ip,
      })
    } else {
      return reply.redirect('/not-found')
    }
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

  await server.register(async (instance) => {
    instance.setRenderConfig({ document: CustomDocumentTemplate })

    instance.get('/custom-template', { render: require.resolve('./CustomTemplateTest') }, async (_request) => {
      return {}
    })
  })

  await server.register(async (instance) => {
    instance.setRenderConfig({ base: '/red', layout: require.resolve('./RedLayout') })

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

  await server.register(async (instance) => {
    instance.setRenderConfig({ base: '/bootprops', layout: require.resolve('./BootPropsLayout') })

    instance.get('/bootprops/test', { render: require.resolve('./About') }, async (request) => {
      return { hostname: os.hostname(), requestIP: request.ip, someValue: 'this is a boot prop' }
    })
  })

  await server.ready()
  return server
}

if (require.main === module) {
  void server().then((server) => {
    console.warn(server.printRoutes())
    return server.listen(3000).then((address) => {
      console.warn(`Test server listening on ${address}`)
    })
  })
}
