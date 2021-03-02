import { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { FastifyRendererPlugin } from '../../Plugin';
import { Render, RenderableRoute, Renderer } from '../Renderer';
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
    routes: RenderableRoute[];
    tmpdir: string;
    basePathRegexp: RegExp;
    clientModulePath: string;
    constructor(plugin: FastifyRendererPlugin, options: ReactRendererOptions);
    vitePlugins(): Plugin[];
    prepare(routes: RenderableRoute[], viteConfig: ResolvedConfig, devServer?: ViteDevServer): Promise<void>;
    /** Renders a given request and sends the resulting HTML document out with the `reply`. */
    render<Props>(render: Render<Props>): Promise<void>;
    /** Given a node-land module id (path), return the build time path to the virtual script to hydrate the render client side */
    buildVirtualClientEntrypointModuleURL(route: RenderableRoute): string;
    /** Given a node-land module id (path), return the server run time path to a virtual module to run the server side render */
    buildVirtualServerEntrypointModuleURL(route: RenderableRoute): string;
    /**
     * Given a concrete, resolvable node-land module id (path), return the client-land path to the script to hydrate the render client side
     * In dev mode, will return a virtual module url that will use use the client side hydration plugin to produce a script around the entrypoint
     * In production, will reference the manifest to find the built module corresponding to the given entrypoint
     */
    entrypointScriptTagSrcForClient(render: Render): string;
    /**
     * Given a concrete, resolvable node-land module id (path), return the server-land path to the script to render server side
     * Because we're using vite, we have special server side entrypoints too such that we can't just `require()` an entrypoint, even on the server, we need to a require a file that vite has built where all the copies of React are the same within.
     * In dev mode, will return a virtual module url that will use use the server side render plugin to produce a script around the entrypoint
     * In production
     */
    entrypointRequirePathForServer(render: Render<any>): string;
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
}
