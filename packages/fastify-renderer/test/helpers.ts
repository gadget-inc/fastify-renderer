import fastify, { FastifyServerOptions } from 'fastify'
import fastifyAccepts from 'fastify-accepts'
import Middie from 'middie'
import { RenderBus } from '../src/node/RenderBus'
import { ReactRenderer, ReactRendererOptions } from '../src/node/renderers/react/ReactRenderer'

export const newFastify = async (options?: FastifyServerOptions) => {
  const server = fastify(options)
  await server.register(fastifyAccepts)
  await server.register(Middie)
  return server
}

export const newRenderBus = () => {
  return new RenderBus()
}
