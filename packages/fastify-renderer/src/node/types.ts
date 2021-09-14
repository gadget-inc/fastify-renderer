/* eslint-disable @typescript-eslint/no-empty-interface */
import {
  ContextConfigDefault,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault,
} from 'fastify'
import { RouteGenericInterface } from 'fastify/types/route'
import { ReactElement } from 'react'
import { ViteDevServer } from 'vite'

export type ServerRenderer<
  Props extends Record<string, any>,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  request: FastifyRequest<RouteGeneric, RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric>
) => Promise<Props>

export interface FastifyRendererHook {
  name?: string
  tails?: () => string
  heads?: () => string
  transform?: (app: ReactElement) => ReactElement
}

export interface ViteClientManifest {
  [file: string]: {
    src?: string
    file: string
    css?: string[]
    assets?: string[]
    isEntry?: boolean
    isDynamicEntry?: boolean
    imports?: string[]
    dynamicImports?: string[]
  }
}

export interface ServerEntrypointManifest {
  [file: string]: string
}

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface RouteShorthandOptions<RawServer extends RawServerBase = RawServerDefault> {
    render?: string
  }

  interface FastifyRequest {
    vite: ViteDevServer
  }

  interface FastifyReply {
    /**
     * Render a given server side component as the response imperatively.
     * Uses the current Fastify encapsulation context's render config
     *
     * @param renderable: a string path to a component to render
     * @param props: The props to pass to the rendered component
     */
    render(renderable: string, props: Record<string, any>): Promise<void>
  }

  interface RouteShorthandMethod<
    RawServer extends RawServerBase = RawServerDefault,
    RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
    RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
    Props = any
  > {
    <RouteGeneric extends RouteGenericInterface = RouteGenericInterface, ContextConfig = ContextConfigDefault>(
      path: string,
      opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig> & {
        render: string
      }, // this creates an overload that only applies these different types if the handler is for rendering
      handler: ServerRenderer<Props, RawServer, RawRequest, RawReply, RouteGeneric>
    ): FastifyInstance<RawServer, RawRequest, RawReply>
  }
}
