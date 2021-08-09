import { FastifyReply, FastifyRequest } from 'fastify';
import { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { Template } from '../DocumentTemplate';
/** The options configuring a plugin encapsulation context's renders */
export interface RenderOptions {
    layout: string;
    document: Template;
    base: string;
}
/** One renderable route */
export interface RenderableRoute extends RenderOptions {
    url: string;
    renderable: string;
}
/** A unit of renderable work */
export interface Render<Props = any> extends RenderableRoute {
    request: FastifyRequest;
    reply: FastifyReply;
    props: Props;
}
/** An object that knows how to render */
export interface Renderer {
    prepare(routes: RenderableRoute[], viteOptions: ResolvedConfig, devServer?: ViteDevServer): Promise<void>;
    render<Props>(render: Render<Props>): Promise<void>;
    buildVirtualClientEntrypointModuleID(route: RenderableRoute): string;
    buildVirtualServerEntrypointModuleID(route: RenderableRoute): string;
    vitePlugins(): Plugin[];
}
