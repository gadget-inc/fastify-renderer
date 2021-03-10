"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = void 0;
require("fastify-accepts");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const fastify_static_1 = __importDefault(require("fastify-static"));
const fs_1 = require("fs");
require("middie");
const path_1 = __importDefault(require("path"));
const vite_1 = require("vite");
const DocumentTemplate_1 = require("./DocumentTemplate");
const Plugin_1 = require("./Plugin");
require("./types"); // necessary to make sure that the fastify types are augmented
const utils_1 = require("./utils");
const kRendererPlugin = Symbol('fastify-renderer-plugin');
const kRenderOptions = Symbol('fastify-renderer-render-options');
const kRendererViteOptions = Symbol('fastify-renderer-vite-options');
const FastifyRenderer = fastify_plugin_1.default(async (fastify, incomingOptions) => {
    const plugin = new Plugin_1.FastifyRendererPlugin(incomingOptions);
    let vite;
    fastify.decorate('vite', {
        getter() {
            return vite;
        },
    });
    if (fastify[kRendererPlugin]) {
        throw new Error("Can't register fastify-renderer-plugin more than once -- register it once then use `setRenderConfig` to change options for different encapsulation contexts");
    }
    fastify[kRendererPlugin] = plugin;
    fastify.addHook('onRegister', (instance) => {
        const innerOptions = { ...instance[kRenderOptions] };
        instance[kRenderOptions] = innerOptions;
    });
    fastify.decorate('setRenderConfig', function (config) {
        const newOptions = { ...this[kRenderOptions], ...config };
        if (newOptions.base.endsWith('/')) {
            this.log.warn(`fastify-renderer base paths shouldn't end in a slash, got ${newOptions.base}`);
        }
        this[kRenderOptions] = newOptions;
    });
    fastify.setRenderConfig({
        base: incomingOptions.base || '',
        layout: incomingOptions.layout || require.resolve('./renderers/react/DefaultLayout'),
        document: incomingOptions.document || DocumentTemplate_1.DefaultDocumentTemplate,
    });
    // Wrap routes that have the `render` option set to invoke the rendererer with the result of the route handler as the props
    fastify.addHook('onRoute', function (routeOptions) {
        if (routeOptions.render) {
            const oldHandler = routeOptions.handler;
            const renderable = routeOptions.render;
            const plugin = this[kRendererPlugin];
            const renderableRoute = { ...this[kRenderOptions], url: routeOptions.url, renderable };
            plugin.registerRoute(renderableRoute);
            routeOptions.handler = async function (request, reply) {
                const props = await oldHandler.call(this, request, reply);
                void reply.header('Vary', 'Accept');
                switch (request.accepts().type(['html', 'json'])) {
                    case 'json':
                        await reply.type('application/json').send({ props });
                        break;
                    case 'html':
                        void reply.type('text/html');
                        const render = { ...renderableRoute, request, reply, props, renderable };
                        await plugin.renderer.render(render);
                        break;
                    default:
                        await reply.type('text/plain').send('Content type not supported');
                        break;
                }
            };
        }
    });
    let devServer = undefined;
    let viteMountInstance = fastify;
    // this nasty bit is to support vite's middlewares running at a prefix where they don't collide with other routes the user might have added
    // we use the fastify router's prefix functionality to only let vite operate on routes that match it's prefix
    await fastify.register(async (instance) => {
        viteMountInstance = instance;
        // we need to register a wildcard route for all the files that vite might serve, which we use fastify-static to do
        // in dev mode, this is needed so the fastify router will recognize the route and dispatch it, which will then run the middleware chain, letting vite take over and serve the file
        // in production, this will actually serve the files that vite has built for the client
        const staticPath = path_1.default.join(plugin.outDir, 'client');
        await fs_1.promises.mkdir(staticPath, { recursive: true });
        await instance.register(fastify_static_1.default, {
            root: staticPath,
        });
        if (plugin.devMode) {
            // register a dummy route so the router knows vite will connect to itself for websocket hot module reloading at the root
            instance.get('/', async (_request, reply) => {
                await reply.status(404);
                await reply.send('Not found');
            });
        }
    }, { prefix: plugin.viteBase });
    // register vite once all the routes have been defined
    fastify.addHook('onReady', async () => {
        var _a, _b;
        fastify[kRendererViteOptions] = {
            clearScreen: false,
            ...plugin.vite,
            plugins: [...(((_a = plugin.vite) === null || _a === void 0 ? void 0 : _a.plugins) || []), ...plugin.renderer.vitePlugins()],
            server: {
                middlewareMode: true,
                ...(_b = plugin.vite) === null || _b === void 0 ? void 0 : _b.server,
            },
        };
        let config;
        if (plugin.devMode) {
            fastify.log.debug('booting vite dev server');
            devServer = await vite_1.createServer(fastify[kRendererViteOptions]);
            viteMountInstance.use(devServer.middlewares);
            config = devServer.config;
        }
        else {
            config = await vite_1.resolveConfig(fastify[kRendererViteOptions], 'serve');
        }
        await plugin.renderer.prepare(plugin.routes, config, devServer);
    });
    fastify.addHook('onClose', async (_, done) => {
        await (devServer === null || devServer === void 0 ? void 0 : devServer.close());
        done();
    });
}, {
    fastify: '3.x',
    name: 'fastify-renderer',
    dependencies: ['fastify-accepts', 'middie'],
});
module.exports = exports = FastifyRenderer;
exports.default = FastifyRenderer;
const build = async (fastify) => {
    var _a, _b;
    const plugin = fastify[kRendererPlugin];
    if (!plugin) {
        throw new Error('No fastify-renderer registered to build, have all your fastify plugins been loaded?');
    }
    const log = fastify.log.child({ name: 'fastify-renderer' });
    const clientEntrypoints = {};
    const serverEntrypoints = {};
    for (const renderableRoute of plugin.routes) {
        const entrypointName = utils_1.mapFilepathToEntrypointName(renderableRoute.renderable);
        clientEntrypoints[entrypointName] = plugin.renderer.buildVirtualClientEntrypointModuleID(renderableRoute);
        serverEntrypoints[entrypointName] = plugin.renderer.buildVirtualServerEntrypointModuleID(renderableRoute);
        serverEntrypoints[utils_1.mapFilepathToEntrypointName(renderableRoute.layout)] = renderableRoute.layout;
    }
    const vite = fastify[kRendererViteOptions];
    const clientOutDir = path_1.default.join(plugin.outDir, 'client', plugin.viteBase);
    const serverOutDir = path_1.default.join(plugin.outDir, 'server');
    log.info(`Building ${Object.keys(clientEntrypoints).length} client side asset(s) to ${clientOutDir}`);
    await vite_1.build({
        ...vite,
        build: {
            ...vite.build,
            outDir: clientOutDir,
            ssrManifest: true,
            manifest: true,
            rollupOptions: {
                input: clientEntrypoints,
                ...(_a = vite === null || vite === void 0 ? void 0 : vite.build) === null || _a === void 0 ? void 0 : _a.rollupOptions,
            },
        },
    });
    log.info(`Building ${Object.keys(serverEntrypoints).length} server side side asset(s) for ${serverOutDir}`);
    await vite_1.build({
        ...vite,
        build: {
            ...vite.build,
            outDir: serverOutDir,
            rollupOptions: {
                input: serverEntrypoints,
                ...(_b = vite === null || vite === void 0 ? void 0 : vite.build) === null || _b === void 0 ? void 0 : _b.rollupOptions,
            },
            ssr: true,
        },
    });
    // Write a special manifest for the server side entrypoints
    // Somewhat strangely we also use virtual entrypoints for the server side code used during SSR -- that means that in production, the server needs to require code from a special spot to get the SSR-safe version of each entrypoint. We write out our own manifesth here because there's a bug in rollup or vite that errors when trying to generate a manifest in SSR mode.
    const virtualModulesToRenderedEntrypoints = Object.fromEntries(Object.entries(serverEntrypoints).map(([key, value]) => [value, key]));
    await fs_1.promises.writeFile(path_1.default.join(plugin.outDir, 'server', 'virtual-manifest.json'), JSON.stringify(virtualModulesToRenderedEntrypoints, null, 2));
};
exports.build = build;
//# sourceMappingURL=index.js.map