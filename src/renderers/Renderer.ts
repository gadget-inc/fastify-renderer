import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify'

export interface Renderer {
  render<Props>(request: FastifyRequest, reply: FastifyReply, renderable: any, props: Props): Promise<void>
  registerRoute(routeOptions: RouteOptions): void
}
