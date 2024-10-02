import FR from 'fastify-renderer'
import { server as getServer } from '../server'
import { describe, test } from 'vitest'

describe('simple-react building assets', () => {
  test('can run the build', async () => {
    const server = await getServer()
    await server.ready()
    await (FR as any).build(server)
  })
})
