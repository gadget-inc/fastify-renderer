"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactRenderer = void 0;
const plugin_react_refresh_1 = __importDefault(require("@vitejs/plugin-react-refresh"));
const path_1 = __importDefault(require("path"));
const server_1 = __importDefault(require("react-dom/server"));
const node_1 = require("vite/dist/node");
const static_location_1 = __importDefault(require("wouter/static-location"));
const DocumentTemplate_1 = require("../../DocumentTemplate");
const RenderBus_1 = require("../../RenderBus");
const utils_1 = require("../../utils");
const CLIENT_ENTRYPOINT_PREFIX = '/@fstr!entrypoint:';
const SERVER_ENTRYPOINT_PREFIX = '/@fstr!server-entrypoint:';
class ReactRenderer {
    constructor(plugin, options) {
        this.plugin = plugin;
        this.options = options;
        this.basePathRegexp = new RegExp(`^${utils_1.escapeRegex(this.plugin.base)}`);
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
    }
    /** Renders a given request and sends the resulting HTML document out with the `reply`. */
    async render(render) {
        var _a;
        const bus = this.startRenderBus(render);
        try {
            // we load all the context needed for this render from one `loadModule` call, which is really important for keeping the same copy of React around in all of the different bits that touch it.
            const React = (await this.loadModule('react')).default;
            const Router = (await this.loadModule('fastify-renderer/client/react')).Router;
            const Layout = (await this.loadModule(this.plugin.layout)).default;
            const Entrypoint = (await this.loadModule(render.renderable)).default;
            let app = (React.createElement(Router, { base: this.plugin.base, hook: static_location_1.default(this.stripBasePath(render.request.url)) },
                React.createElement(Layout, null,
                    React.createElement(Entrypoint, Object.assign({}, render.props)))));
            for (const hook of this.plugin.hooks) {
                if (hook.transform) {
                    app = hook.transform(app);
                }
            }
            if (this.options.mode == 'streaming') {
                await render.reply.send(this.renderStreamingTemplate(app, bus, render));
            }
            else {
                await render.reply.send(this.renderSynchronousTemplate(app, bus, render));
            }
        }
        catch (error) {
            (_a = this.devServer) === null || _a === void 0 ? void 0 : _a.ssrFixStacktrace(error);
            // let fastify's error handling system figure out what to do with this after fixing the stack trace
            throw error;
        }
    }
    /** Given a node-land module id (path), return the build time path to the virtual script to hydrate the render client side */
    buildVirtualClientEntrypointModuleURL(id) {
        return path_1.default.join(CLIENT_ENTRYPOINT_PREFIX, id, 'hydrate.jsx');
    }
    /**
     * Given a concrete, resolvable node-land module id (path), return the client-land path to the script to hydrate the render client side
     * In dev mode, will return a virtual module url that will use use the client side hydration plugin to produce a script around the entrypoint
     * In production, will reference the manifest to find the built module corresponding to the given entrypoint
     */
    entrypointScriptTagSrcForClient(id) {
        const entrypointName = this.buildVirtualClientEntrypointModuleURL(id);
        if (this.plugin.devMode) {
            return entrypointName;
        }
        else {
            const manifestEntryName = node_1.normalizePath(path_1.default.relative(this.viteConfig.root, entrypointName));
            const manifestEntry = this.plugin.clientManifest[manifestEntryName];
            if (!manifestEntry) {
                throw new Error(`Module id ${id} was not found in the built assets manifest. Looked for it at ${manifestEntryName}. Was it included in the build?`);
            }
            return manifestEntry.file;
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
        const entrypointName = this.buildVirtualClientEntrypointModuleURL(render.renderable);
        // if we're in development, we just source the entrypoint directly from vite and let the browser do its thing importing all the referenced stuff
        if (this.plugin.devMode) {
            bus.push('tail', `<script type="module" src="${path_1.default.join(this.plugin.assetsHost, this.plugin.base, this.entrypointScriptTagSrcForClient(render.renderable))}"></script>`);
        }
        else {
            const manifestEntryName = node_1.normalizePath(path_1.default.relative(this.viteConfig.root, entrypointName));
            this.plugin.pushImportTagsFromManifest(bus, manifestEntryName);
        }
        return bus;
    }
    renderStreamingTemplate(app, bus, render) {
        const contentStream = server_1.default.renderToNodeStream(app);
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
    renderSynchronousTemplate(app, bus, render) {
        const content = server_1.default.renderToString(app);
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
            // TODO: make this work for npm modules
            const builtPath = path_1.default.join(this.plugin.outDir, 'server', utils_1.mapFilepathToEntrypointName(id));
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
                    const importURL = id.replace(CLIENT_ENTRYPOINT_PREFIX, '/@fs/').replace(/\/hydrate\.jsx$/, '');
                    const layoutURL = this.plugin.layout;
                    return `
          // client side hydration entrypoint for a particular route generated by fastify-renderer
          import 'vite/dynamic-import-polyfill'
          import React from 'react'
          import ReactDOM from 'react-dom'
          import { routes } from '/@fstr!route-table.js'
          import { Root } from 'fastify-renderer/client/react'
          import Layout from ${JSON.stringify(layoutURL)}
          import Entrypoint from ${JSON.stringify(importURL)}

          ReactDOM.unstable_createRoot(document.getElementById('fstrapp'), {
            hydrate: true
          }).render(<Root
            Layout={Layout}
            Entrypoint={Entrypoint}
            basePath={${JSON.stringify(this.viteConfig.base.slice(0, -1))}}
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
                    const importURL = id.replace(SERVER_ENTRYPOINT_PREFIX, '').replace(/\/ssr\.jsx$/, '');
                    const layoutURL = this.plugin.layout;
                    return `
          // server side processed entrypoint for a particular route generated by fastify-renderer
          import React from 'react'
          import ReactDOMServer from 'react-dom/server'
          import { Router } from 'fastify-renderer/client/react'
          import Layout from ${JSON.stringify(layoutURL)}
          import Entrypoint from ${JSON.stringify(importURL)}

          export default {
            React,
            ReactDOMServer,
            Router,
            Layout,
            Entrypoint
          }
          `;
                }
            },
        };
    }
    /**
     * Produces the route table from all the registered routes to serve to the frontend
     */
    routeTableVitePlugin() {
        return {
            name: 'fastify-renderer:react-route-table',
            resolveId(id) {
                if (id == ReactRenderer.ROUTE_TABLE_ID || id == ReactRenderer.LAZY_ROUTE_TABLE_ID) {
                    return id;
                }
            },
            load: (id) => {
                if (id == ReactRenderer.ROUTE_TABLE_ID || id == ReactRenderer.LAZY_ROUTE_TABLE_ID) {
                    const pathsToModules = this.routes.map((route) => [this.stripBasePath(route.url), route.render]);
                    if (id == ReactRenderer.LAZY_ROUTE_TABLE_ID) {
                        return `
import { lazy } from "react";
// lazy route table generated by fastify-renderer
export const routes = {
  ${pathsToModules
                            .map(([url, component]) => `${JSON.stringify(url)}: lazy(() => import(${JSON.stringify(component)}))`)
                            .join(',\n')}
}
          `;
                    }
                    else {
                        return `
// route table generated by fastify-renderer
${pathsToModules.map(([_url, component], index) => `import mod_${index} from ${JSON.stringify(component)}`).join('\n')}

export const routes = {
  ${pathsToModules.map(([url], index) => `${JSON.stringify(url)}: mod_${index}`).join(',\n')}
}`;
                    }
                }
            },
        };
    }
    stripBasePath(path) {
        return path.replace(this.basePathRegexp, '/');
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