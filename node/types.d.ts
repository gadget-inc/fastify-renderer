/// <reference types="node" />
import { ContextConfigDefault, FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest, FastifySchema, FastifyTypeProvider, FastifyTypeProviderDefault, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault, RequestGenericInterface } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { ReactElement } from 'react';
import { InlineConfig, SSROptions, type ViteDevServer } from 'vite';
import { FastifyRendererPlugin, ImperativeRenderable } from './Plugin';
import { RenderOptions, PartialRenderOptions } from './renderers/Renderer';
import { kRendererPlugin, kRendererViteOptions, kRenderOptions } from './symbols';
export type ServerRenderer<Props> = (this: FastifyInstance<Server, IncomingMessage, ServerResponse>, request: FastifyRequest, reply: FastifyReply) => Promise<Props>;
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
        [kRendererPlugin]: FastifyRendererPlugin;
        [kRendererViteOptions]: InlineConfig & {
            ssr?: SSROptions;
        };
        [kRenderOptions]: RenderOptions;
        setRenderConfig(options: PartialRenderOptions): void;
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
    interface RouteShorthandMethod<RawServer extends RawServerBase = RawServerDefault, RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>, RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>, TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault> {
        <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, ContextConfig = ContextConfigDefault, SchemaCompiler extends FastifySchema = FastifySchema, Logger extends FastifyBaseLogger = FastifyBaseLogger>(path: string, opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> & {
            render: string;
        }, // this creates an overload that only applies these different types if the handler is for rendering
        handler: ServerRenderer<unknown>): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;
    }
}
