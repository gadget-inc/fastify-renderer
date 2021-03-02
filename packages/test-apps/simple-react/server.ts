import os from 'os'
import renderer from '../../fastify-renderer/src/node'
import { newFastify } from '../../fastify-renderer/test/helpers'

export const server = async () => {
  const server = await newFastify({
    logger: {
      level: 'info',
      prettyPrint: true,
    },
  })

  await server.register(renderer, {
    renderer: {
      type: 'react',
      mode: 'sync',
    },
  })

  server.get('/', { render: require.resolve('./Home') }, async () => {
    return { time: Date.now() }
  })

  server.get('/about', { render: require.resolve('./About') }, async (request) => {
    return { hostname: os.hostname(), requestIP: request.ip }
  })

  await server.register(async (instance) => {
    instance.setRenderConfig({ layout: require.resolve('./RedLayout') })

    instance.get('/red/about', { render: require.resolve('./About') }, async (request) => {
      return { hostname: os.hostname(), requestIP: request.ip }
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
