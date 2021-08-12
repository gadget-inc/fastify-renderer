import { FastifyReply, FastifyRequest } from 'fastify'
import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { Template } from '../DocumentTemplate'

/** The options configuring a plugin encapsulation context's renders */
export interface RenderOptions {
  layout: string
  document: Template
  base: string
}

/**
 * One renderable route comprising of a component to render (the `renderable`) inside a `document` HTML template and a `layout` component
 * After a fastify-renderer app has booted, there will be a bunch of these objects registered as routes on the fastify router
 */
export interface RenderableRoute extends RenderOptions {
  url: string
  renderable: string
  // Should we actually boot the client side application once loaded on the client. Useful for rendering something server side and not bothering to hydrate it client side after.
  boot: boolean
}

/**
 * A unit of renderable work. Generated for each render of a renderable route when a request comes in for that route.
 **/
export interface Render<Props = any> extends RenderableRoute {
  request: FastifyRequest
  reply: FastifyReply
  props: Props
}

/**
 * An object that knows how to render a given `Render`
 **/
export interface Renderer {
  prepare(routes: RenderableRoute[], viteOptions: ResolvedConfig, devServer?: ViteDevServer): Promise<void>
  render<Props>(render: Render<Props>): Promise<void>
  buildVirtualClientEntrypointModuleID(route: RenderableRoute): string
  buildVirtualServerEntrypointModuleID(route: RenderableRoute): string
  vitePlugins(): Plugin[]
}
