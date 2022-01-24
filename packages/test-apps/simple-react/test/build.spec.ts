import { build } from '../../../fastify-renderer/src/node'
import { server as getServer } from '../server'

describe('simple-react building assets', () => {
  test('can run the build', async () => {
    const server = await getServer()
    await server.ready()
    await build(server)
  })
})
