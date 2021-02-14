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
  RequestGenericInterface,
} from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { ReactElement } from 'react'
import { InlineConfig, ViteDevServer } from 'vite'
import { Template } from './DocumentTemplate'

export type ServerRenderer<Props> = (
  this: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<Props>

export interface FastifyRendererHook {
  name?: string
  scripts?: () => string
  transform?: (app: ReactElement) => ReactElement
}

export interface FastifyRendererOptions {
  renderer?: string
  vite?: InlineConfig
  layout?: string
  document?: Template
  hooks?: (FastifyRendererHook | (() => FastifyRendererHook))[]
}

export interface ResolvedOptions {
  renderer: 'react'
  vite?: InlineConfig
  layout: string
  document: Template
  hooks: FastifyRendererHook[]
}

declare module 'fastify' {
  interface RouteShorthandOptions<RawServer extends RawServerBase = RawServerDefault> {
    render?: string
  }

  interface FastifyInstance {
    vite: ViteDevServer
    render(path: string)
  }

  interface FastifyRequest {
    vite: ViteDevServer
  }

  interface RouteShorthandMethod<
    RawServer extends RawServerBase = RawServerDefault,
    RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
    RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
    Props = any
  > {
    <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, ContextConfig = ContextConfigDefault>(
      path: string,
      opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> & {
        render: string
      }, // this creates an overload that only applies these different types if the handler is for rendering
      handler: ServerRenderer<Props>
    ): FastifyInstance<RawServer, RawRequest, RawReply>
  }
}
