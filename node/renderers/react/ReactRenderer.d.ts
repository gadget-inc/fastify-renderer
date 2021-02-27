import { RouteOptions } from 'fastify';
import { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { FastifyRendererPlugin } from '../../Plugin';
import { Render, Renderer } from '../Renderer';
export interface ReactRendererOptions {
    type: 'react';
    mode: 'sync' | 'streaming';
}
export declare class ReactRenderer implements Renderer {
    readonly plugin: FastifyRendererPlugin;
    readonly options: ReactRendererOptions;
    static ROUTE_TABLE_ID: string;
    static LAZY_ROUTE_TABLE_ID: string;
    viteConfig: ResolvedConfig;
    devServer?: ViteDevServer;
    routes: RouteOptions[];
    tmpdir: string;
    basePathRegexp: RegExp;
    React: any;
    ReactDOMServer: any;
    Client: any;
    constructor(plugin: FastifyRendererPlugin, options: ReactRendererOptions);
    vitePlugins(): Plugin[];
    prepare(routes: RouteOptions[], viteConfig: ResolvedConfig, devServer?: ViteDevServer): Promise<void>;
    /** Renders a given request and sends the resulting HTML document out with the `reply`. */
    render<Props>(render: Render<Props>): Promise<void>;
    /** Given a node-land module id (path), return the build time path to the script to hydrate the render client side */
    buildClientEntrypointModuleURL(id: string): string;
    /** Given a node-land module id (path), return the server run time path to a module to run the server side render*/
    buildServerEntrypointModuleURL(id: string): string;
    private startRenderBus;
    private renderStreamingTemplate;
    private renderSynchronousTemplate;
    private runHooks;
    /** Given a module ID, load it for use within this node process on the server */
    private loadModule;
    /**
     * A vite/rollup plugin that provides a virtual module to run client side React hydration for a specific route & entrypoint
     * Served to the client to rehydrate the server rendered code
     */
    private hydrationEntrypointVitePlugin;
    /**
     * A vite/rollup plugin that provides a virtual module to run the server side react render for a specific route & entrypoint
     * Its important that every module that the entrypoint and layout touch are eventually imported by this file so that there is exactly one copy of React referenced by all of the modules.
     */
    private serverEntrypointVitePlugin;
    /**
     * Produces the route table from all the registered routes to serve to the frontend
     */
    private routeTableVitePlugin;
    private stripBasePath;
    private reactRefreshScriptTag;
    /** Given a node-land module id (path), return the client-land path to the script to hydrate the render client side */
    clientEntrypointModuleURL(id: string): string;
}
