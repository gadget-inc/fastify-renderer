import { build } from 'fastify-renderer'
import { server } from './server'

void server().then(async (server) => {
  await server.ready()
  await build(server)
  process.exit(0)
})
