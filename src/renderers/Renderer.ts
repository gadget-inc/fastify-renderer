import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify'
import { Plugin, ViteDevServer } from 'vite'

/** A unit of renderable work */
export interface Render<Props> {
  request: FastifyRequest
  reply: FastifyReply
  props: Props
  renderable: string
}

/** An object that knows how to render */
export interface Renderer {
  prepare(routes: RouteOptions[], vite: ViteDevServer): Promise<void>
  render<Props>(render: Render<Props>): Promise<void>
  vitePlugins(): Plugin[]
}
