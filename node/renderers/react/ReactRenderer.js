"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactRenderer = void 0;
const plugin_react_refresh_1 = __importDefault(require("@vitejs/plugin-react-refresh"));
const path_1 = __importDefault(require("path"));
const querystring_1 = __importDefault(require("querystring"));
const url_1 = require("url");
const node_1 = require("vite/dist/node");
const DocumentTemplate_1 = require("../../DocumentTemplate");
const RenderBus_1 = require("../../RenderBus");
const utils_1 = require("../../utils");
const CLIENT_ENTRYPOINT_PREFIX = '/@fstr!entrypoint:';
const SERVER_ENTRYPOINT_PREFIX = '/@fstr!server-entrypoint:';
const staticLocationHook = (path = '/', { record = false } = {}) => {
    // eslint-disable-next-line prefer-const
    let hook;
    const navigate = (to, { replace } = {}) => {
        if (record) {
            if (replace) {
                hook.history.pop();
            }
            hook.history.push(to);
        }
    };
    hook = () => [path, navigate];
    hook.history = [path];
    return hook;
};
class ReactRenderer {
    constructor(plugin, options) {
        this.plugin = plugin;
        this.options = options;
        this.clientModulePath = require.resolve('../../../client/react');
    }
    vitePlugins() {
        return [
            plugin_react_refresh_1.default(),
            this.routeTableVitePlugin(),
            this.hydrationEntrypointVitePlugin(),
            this.serverEntrypointVitePlugin(),
        ];
    }
    async prepare(routes, viteConfig, devServer) {
        this.viteConfig = viteConfig;
        this.routes = routes;
        this.devServer = devServer;
        // in production mode, we eagerly require all the endpoints during server boot, so that the first request to the endpoint isn't slow
        // if the service running fastify-renderer is being gracefully restarted, this will block the fastify server from listening until all the code is required, keeping the old server in service a bit longer while this require is done, which is good for users
        if (!this.plugin.devMode) {
            for (const route of routes) {
                await this.loadModule(this.entrypointRequirePathForServer(route));
            }
        }
    }
    /** Renders a given request and sends the resulting HTML document out with the `reply`. */
    async render(render) {
        var _a;
        const bus = this.startRenderBus(render);
        try {
            const url = this.entrypointRequirePathForServer(render);
            // we load all the context needed for this render from one `loadModule` call, which is really important for keeping the same copy of React around in all of the different bits that touch it.
            const { React, ReactDOMServer, Router, RenderBusContext, Layout, Entrypoint } = (await this.loadModule(url)).default;
            let app = (React.createElement(RenderBusContext.Provider, { value: bus },
                React.createElement(Router, { base: render.base, hook: staticLocationHook(this.stripBasePath(render.request.url, render.base)) },
                    React.createElement(Layout, null,
                        React.createElement(Entrypoint, Object.assign({}, render.props))))));
            for (const hook of this.plugin.hooks) {
                if (hook.transform) {
                    app = hook.transform(app);
                }
            }
            if (this.options.mode == 'streaming') {
                await render.reply.send(this.renderStreamingTemplate(app, bus, ReactDOMServer, render));
            }
            else {
                await render.reply.send(this.renderSynchronousTemplate(app, bus, ReactDOMServer, render));
            }
        }
        catch (error) {
            (_a = this.devServer) === null || _a === void 0 ? void 0 : _a.ssrFixStacktrace(error);
            // let fastify's error handling system figure out what to do with this after fixing the stack trace
            throw error;
        }
    }
    /** Given a node-land module id (path), return the build time path to the virtual script to hydrate the render client side */
    buildVirtualClientEntrypointModuleID(route) {
        return (path_1.default.join(CLIENT_ENTRYPOINT_PREFIX, route.renderable, 'hydrate.jsx') +
            '?' +
            querystring_1.default.stringify({ layout: route.layout, base: route.base }));
    }
    /** Given a node-land module id (path), return the server run time path to a virtual module to run the server side render */
    buildVirtualServerEntrypointModuleID(route) {
        return (path_1.default.join(SERVER_ENTRYPOINT_PREFIX, route.renderable, 'ssr.jsx') +
            '?' +
            querystring_1.default.stringify({ layout: route.layout, base: route.base }));
    }
    /**
     * Given a concrete, resolvable node-land module id (path), return the client-land path to the script to hydrate the render client side
     * In dev mode, will return a virtual module url that will use use the client side hydration plugin to produce a script around the entrypoint
     * In production, will reference the manifest to find the built module corresponding to the given entrypoint
     */
    entrypointScriptTagSrcForClient(render) {
        const entrypointName = this.buildVirtualClientEntrypointModuleID(render);
        if (this.plugin.devMode) {
            return path_1.default.join(this.plugin.viteBase, entrypointName);
        }
        else {
            const manifestEntryName = node_1.normalizePath(path_1.default.relative(this.viteConfig.root, entrypointName));
            const manifestEntry = this.plugin.clientManifest[manifestEntryName];
            if (!manifestEntry) {
                throw new Error(`Module id ${render.renderable} was not found in the built assets manifest. Looked for it at ${manifestEntryName} in manifest.json. Was it included in the build?`);
            }
            return manifestEntry.file;
        }
    }
    /**
     * Given a concrete, resolvable node-land module id (path), return the server-land path to the script to render server side
     * Because we're using vite, we have special server side entrypoints too such that we can't just `require()` an entrypoint, even on the server, we need to a require a file that vite has built where all the copies of React are the same within.
     * In dev mode, will return a virtual module url that will use use the server side render plugin to produce a script around the entrypoint
     * In production
     */
    entrypointRequirePathForServer(route) {
        const entrypointName = this.buildVirtualServerEntrypointModuleID(route);
        if (this.plugin.devMode) {
            return entrypointName;
        }
        else {
            const manifestEntry = this.plugin.serverEntrypointManifest[entrypointName];
            if (!manifestEntry) {
                throw new Error(`Module id ${route.renderable} was not found in the built server entrypoints manifest. Looked for it at ${entrypointName} in virtual-manifest.json. Was it included in the build?`);
            }
            return manifestEntry;
        }
    }
    startRenderBus(render) {
        const bus = new RenderBus_1.RenderBus();
        // push the script for the react-refresh runtime that vite's plugin normally would
        if (this.plugin.devMode) {
            bus.push('tail', this.reactRefreshScriptTag());
        }
        // push the props for the entrypoint to use when hydrating client side
        bus.push('tail', `<script type="module">window.__FSTR_PROPS=${JSON.stringify(render.props)};</script>`);
        const entrypointName = this.buildVirtualClientEntrypointModuleID(render);
        // if we're in development, we just source the entrypoint directly from vite and let the browser do its thing importing all the referenced stuff
        if (this.plugin.devMode) {
            bus.push('tail', `<script type="module" src="${path_1.default.join(this.plugin.assetsHost, this.entrypointScriptTagSrcForClient(render))}"></script>`);
        }
        else {
            const manifestEntryName = node_1.normalizePath(path_1.default.relative(this.viteConfig.root, entrypointName));
            this.plugin.pushImportTagsFromManifest(bus, manifestEntryName);
        }
        return bus;
    }
    renderStreamingTemplate(app, bus, ReactDOMServer, render) {
        const contentStream = ReactDOMServer.renderToNodeStream(app);
        contentStream.on('end', () => {
            this.runHooks(bus);
        });
        return DocumentTemplate_1.DefaultDocumentTemplate({
            content: contentStream,
            head: bus.stack('head').join('\n'),
            tail: bus.stack('tail').join('\n'),
            props: render.props,
        });
    }
    renderSynchronousTemplate(app, bus, ReactDOMServer, render) {
        const content = ReactDOMServer.renderToString(app);
        this.runHooks(bus);
        return DocumentTemplate_1.DefaultDocumentTemplate({
            content,
            head: bus.stack('head').join('\n'),
            tail: bus.stack('tail').join('\n'),
            props: render.props,
        });
    }
    runHooks(bus) {
        // when we're done rendering the content, run any hooks that might want to push more content after the content
        for (const hook of this.plugin.hooks) {
            if (hook.tails) {
                bus.push('tail', hook.tails());
            }
            if (hook.heads) {
                bus.push('head', hook.heads());
            }
        }
    }
    /** Given a module ID, load it for use within this node process on the server */
    async loadModule(id) {
        if (this.plugin.devMode) {
            return await this.devServer.ssrLoadModule(id);
        }
        else {
            const builtPath = path_1.default.join(this.plugin.serverOutDir, utils_1.mapFilepathToEntrypointName(id));
            return require(builtPath);
        }
    }
    /**
     * A vite/rollup plugin that provides a virtual module to run client side React hydration for a specific route & entrypoint
     * Served to the client to rehydrate the server rendered code
     */
    hydrationEntrypointVitePlugin() {
        return {
            name: 'fastify-renderer:react-client-entrypoints',
            enforce: 'pre',
            resolveId(id) {
                if (id.startsWith(CLIENT_ENTRYPOINT_PREFIX)) {
                    return id;
                }
            },
            load: (id) => {
                if (id.startsWith(CLIENT_ENTRYPOINT_PREFIX)) {
                    const url = new url_1.URL('fstr://' + id);
                    const entrypoint = id.replace(CLIENT_ENTRYPOINT_PREFIX, '/@fs/').replace(/\/hydrate\.jsx\?.+$/, '');
                    const layout = url.searchParams.get('layout');
                    const base = url.searchParams.get('base');
                    return `
          // client side hydration entrypoint for a particular route generated by fastify-renderer
          import 'vite/dynamic-import-polyfill'
          import React from 'react'
          import ReactDOM from 'react-dom'
          import { routes } from ${JSON.stringify(ReactRenderer.ROUTE_TABLE_ID + '?' + querystring_1.default.stringify({ base }))}
          import { Root } from ${JSON.stringify(this.clientModulePath)}
          import Layout from ${JSON.stringify(layout)}
          import Entrypoint from ${JSON.stringify(entrypoint)}

          ReactDOM.unstable_createRoot(document.getElementById('fstrapp'), {
            hydrate: true
          }).render(<Root
            Layout={Layout}
            Entrypoint={Entrypoint}
            basePath={${JSON.stringify(base)}}
            routes={routes}
            bootProps={window.__FSTR_PROPS}
          />)
        `;
                }
            },
        };
    }
    /**
     * A vite/rollup plugin that provides a virtual module to run the server side react render for a specific route & entrypoint
     * Its important that every module that the entrypoint and layout touch are eventually imported by this file so that there is exactly one copy of React referenced by all of the modules.
     */
    serverEntrypointVitePlugin() {
        return {
            name: 'fastify-renderer:react-server-entrypoints',
            enforce: 'pre',
            resolveId(id) {
                if (id.startsWith(SERVER_ENTRYPOINT_PREFIX)) {
                    return id;
                }
            },
            load: (id) => {
                if (id.startsWith(SERVER_ENTRYPOINT_PREFIX)) {
                    const entrypoint = id.replace(SERVER_ENTRYPOINT_PREFIX, '').replace(/\/ssr\.jsx\?.+$/, '');
                    const url = new url_1.URL('fstr://' + id);
                    const layout = url.searchParams.get('layout');
                    const code = `
          // server side processed entrypoint for a particular route generated by fastify-renderer
          import React from 'react'
          import ReactDOMServer from 'react-dom/server'
          import { Router, RenderBusContext } from ${JSON.stringify(this.clientModulePath)}
          import Layout from ${JSON.stringify(layout)}
          import Entrypoint from ${JSON.stringify(entrypoint)}

          export default {
            React,
            ReactDOMServer,
            Router,
            RenderBusContext,
            Layout,
            Entrypoint
          }
          `;
                    return code;
                }
            },
        };
    }
    /**
     * Produces the route table from all the registered routes to serve to the frontend
     */
    routeTableVitePlugin() {
        // Hacky way to approximate find-my-way's segment precedence -- will not scale very well, but means we don't have to ship all of find-my-way to the browser which is good.
        const routeSortScore = (path) => {
            if (path.includes('*')) {
                return 2;
            }
            else if (path.includes(':')) {
                return 1;
            }
            else {
                return 0;
            }
        };
        // b before a if greater than 0
        // b=2, a=1 if greater than 0
        // Convert find-my-way route paths to path-to-regexp syntax
        const pathToRegexpify = (path) => path.replace('*', ':splat*');
        return {
            name: 'fastify-renderer:react-route-table',
            resolveId(id) {
                if (id.startsWith(ReactRenderer.ROUTE_TABLE_ID)) {
                    return id;
                }
            },
            load: (id) => {
                if (id.startsWith(ReactRenderer.ROUTE_TABLE_ID)) {
                    const url = new url_1.URL('fstr://' + id);
                    const lazy = !!url.searchParams.get('lazy');
                    const base = url.searchParams.get('base');
                    const applicableRoutes = this.routes.filter((route) => route.base == base);
                    applicableRoutes.sort((a, b) => routeSortScore(a.url) - routeSortScore(b.url));
                    const pathsToModules = applicableRoutes.map((route) => [
                        pathToRegexpify(this.stripBasePath(route.url, base)),
                        route.renderable,
                    ]);
                    if (lazy) {
                        return `
import { lazy } from "react";
// lazy route table generated by fastify-renderer
export const routes = [
  ${pathsToModules
                            .map(([url, component]) => `[${JSON.stringify(url)}, lazy(() => import(${JSON.stringify(component)}))]`)
                            .join(',\n')}
  ]
          `;
                    }
                    else {
                        return `
// route table generated by fastify-renderer
${pathsToModules.map(([_url, component], index) => `import mod_${index} from ${JSON.stringify(component)}`).join('\n')}

export const routes = [
  ${pathsToModules.map(([url], index) => `[${JSON.stringify(url)}, mod_${index}]`).join(',\n')}
]`;
                    }
                }
            },
        };
    }
    stripBasePath(fullyQualifiedPath, base) {
        if (fullyQualifiedPath.startsWith(base)) {
            const baseless = fullyQualifiedPath.slice(base.length);
            if (baseless == '') {
                return '/';
            }
            else {
                return baseless;
            }
        }
        else {
            return fullyQualifiedPath;
        }
    }
    reactRefreshScriptTag() {
        return `<script type="module">
      import RefreshRuntime from "${path_1.default.join(this.viteConfig.base, '@react-refresh')}"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>`;
    }
}
exports.ReactRenderer = ReactRenderer;
ReactRenderer.ROUTE_TABLE_ID = '/@fstr!route-table.js';
ReactRenderer.LAZY_ROUTE_TABLE_ID = '/@fstr!lazy-route-table.js';
//# sourceMappingURL=ReactRenderer.js.map