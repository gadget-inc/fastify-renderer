import fastify, { FastifyServerOptions } from 'fastify'
import fastifyAccepts from 'fastify-accepts'
import Middie from 'middie'

export const newFastify = async (options?: FastifyServerOptions) => {
  const server = fastify(options)
  await server.register(fastifyAccepts)
  await server.register(Middie)
  return server
}
