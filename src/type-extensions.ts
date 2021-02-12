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
import { ViteDevServer } from 'vite'

export type ViteRenderer<Props> = (
  this: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<Props>

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
    RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
  > {
    <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, ContextConfig = ContextConfigDefault>(
      path: string,
      opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> & {
        render: string
      }, // this creates an overload that only applies these different types if the handler is for rendering
      handler: ViteRenderer<any>
    ): FastifyInstance<RawServer, RawRequest, RawReply>
  }
}
