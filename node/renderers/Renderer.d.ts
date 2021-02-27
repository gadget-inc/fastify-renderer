import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';
import { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
/** A unit of renderable work */
export interface Render<Props> {
    request: FastifyRequest;
    reply: FastifyReply;
    props: Props;
    renderable: string;
}
/** An object that knows how to render */
export interface Renderer {
    prepare(routes: RouteOptions[], viteOptions: ResolvedConfig, devServer?: ViteDevServer): Promise<void>;
    render<Props>(render: Render<Props>): Promise<void>;
    clientEntrypointModuleURL(id: string): string;
    buildClientEntrypointModuleURL(id: string): string;
    buildServerEntrypointModuleURL(id: string): string;
    vitePlugins(): Plugin[];
}
