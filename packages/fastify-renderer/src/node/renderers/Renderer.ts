import { FastifyReply, FastifyRequest } from 'fastify'
import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { Template } from '../DocumentTemplate'

/** The options configuring a plugin encapsulation context's renders */
export interface RenderOptions {
  layout: string
  document: Template
  base: string
}

/** The options configuring a renderable route */
export interface RenderableRouteOptions {
  /** If the component rendered by the route should have its props refetched each time it is rendered */
  refetch?: boolean
}

export type PartialRenderOptions =
  | { layout: string; document: Template; base: string }
  | { layout: string; base: string }
  | { document: Template; base: string }
  | { base: string }
  | { document: Template }

/** One renderable component registered in the system */
export interface RenderableRegistration extends RenderOptions {
  /** The URL path pattern this renderable will be mounted at  */
  pathPattern?: string
  /** The path on disk to the renderable component for SSR */
  renderable: string
  /** If this renderable was registered for imperative rendering */
  isImperative?: true
  options?: RenderableRouteOptions
}

/** A unit of renderable work */
export interface Render<Props = any> extends RenderableRegistration {
  request: FastifyRequest
  reply: FastifyReply
  props: Props
}

/** An object that knows how to render */
export interface Renderer {
  prepare(renderable: RenderableRegistration[], viteOptions: ResolvedConfig, devServer?: ViteDevServer): Promise<void>
  render<Props>(render: Render<Props>): Promise<void>
  buildVirtualClientEntrypointModuleID(renderable: RenderableRegistration): string
  buildVirtualServerEntrypointModuleID(renderable: RenderableRegistration): string
  vitePlugins(): Plugin[]
}

export function scriptTag(render: Render, content: string, attrs: Record<string, string> = {}) {
  if ('cspNonce' in render.reply) {
    attrs.nonce ??= (render.reply as any).cspNonce.script
  }

  const attrsString = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')

  return `<script type="module" ${attrsString}>${content}</script>`
}

export function stylesheetLinkTag(render: Render, href: string) {
  const nonceString = 'cspNonce' in render.reply ? `nonce="${(render.reply as any).cspNonce.style}"` : ''

  return `<link rel="stylesheet" href="${href}" ${nonceString}>`
}
