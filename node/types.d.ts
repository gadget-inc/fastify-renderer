/// <reference types="node" />
import { ContextConfigDefault, FastifyInstance, FastifyLoggerInstance, FastifyReply, FastifyRequest, FastifySchema, FastifyTypeProvider, FastifyTypeProviderDefault, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault } from 'fastify';
import { RouteGenericInterface } from 'fastify/types/route';
import { FastifyRequestType, ResolveFastifyRequestType } from 'fastify/types/type-provider';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { ReactElement } from 'react';
import { ViteDevServer } from 'vite';
import { ImperativeRenderable } from './Plugin';
export declare type ServerRenderer<Props> = (this: FastifyInstance<Server, IncomingMessage, ServerResponse>, request: FastifyRequest, reply: FastifyReply) => Promise<Props>;
export interface FastifyRendererHook {
    name?: string;
    tails?: () => string;
    heads?: () => string;
    transform?: (app: ReactElement) => ReactElement;
    postRenderHeads?: () => string;
}
export interface ViteClientManifest {
    [file: string]: {
        src?: string;
        file: string;
        css?: string[];
        assets?: string[];
        isEntry?: boolean;
        isDynamicEntry?: boolean;
        imports?: string[];
        dynamicImports?: string[];
    };
}
export interface ServerEntrypointManifest {
    [file: string]: string;
}
declare module 'fastify' {
    interface FastifyInstance {
        registerRenderable: (renderable: string) => ImperativeRenderable;
    }
    interface RouteShorthandOptions<RawServer extends RawServerBase = RawServerDefault> {
        render?: string;
    }
    interface FastifyRequest {
        vite: ViteDevServer;
    }
    interface FastifyReply {
        render: <Props>(this: FastifyReply, renderable: ImperativeRenderable, props: Props) => Promise<void>;
    }
    interface RouteShorthandMethod<RawServer extends RawServerBase = RawServerDefault, RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>, RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>, TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault, Props = any> {
        <RouteGeneric extends RouteGenericInterface = RouteGenericInterface, ContextConfig = ContextConfigDefault, SchemaCompiler = FastifySchema, RequestType extends FastifyRequestType = ResolveFastifyRequestType<TypeProvider, SchemaCompiler, RouteGeneric>, Logger extends FastifyLoggerInstance = FastifyLoggerInstance>(path: string, opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, RequestType, Logger> & {
            render: string;
        }, // this creates an overload that only applies these different types if the handler is for rendering
        handler: ServerRenderer<Props>): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;
    }
}
