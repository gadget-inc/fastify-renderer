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
const symbols_1 = require("./symbols");
const tracing_1 = require("./tracing");
require("./types"); // necessary to make sure that the fastify types are augmented
const utils_1 = require("./utils");
const FastifyRenderer = (0, fastify_plugin_1.default)(async (fastify, incomingOptions) => {
    const plugin = new Plugin_1.FastifyRendererPlugin(incomingOptions);
    let vite;
    fastify.decorate('vite', {
        getter() {
            return vite;
        },
    });
    if (fastify[symbols_1.kRendererPlugin]) {
        throw new Error("Can't register fastify-renderer-plugin more than once -- register it once then use `setRenderConfig` to change options for different encapsulation contexts");
    }
    fastify[symbols_1.kRendererPlugin] = plugin;
    fastify.addHook('onRegister', (instance) => {
        const innerOptions = { ...instance[symbols_1.kRenderOptions] };
        instance[symbols_1.kRenderOptions] = innerOptions;
    });
    fastify.decorate('setRenderConfig', function (config) {
        if ('layout' in config && !('base' in config)) {
            throw new Error('The base property is required when setting a new layout');
        }
        const newOptions = { ...this[symbols_1.kRenderOptions], ...config };
        if (newOptions.base.endsWith('/')) {
            this.log.warn(`fastify-renderer base paths shouldn't end in a slash, got ${newOptions.base}`);
        }
        this[symbols_1.kRenderOptions] = newOptions;
    });
    fastify.setRenderConfig({
        base: incomingOptions.base || '',
        layout: incomingOptions.layout || require.resolve('./renderers/react/DefaultLayout'),
        document: incomingOptions.document || DocumentTemplate_1.DefaultDocumentTemplate,
    });
    // Wrap routes that have the `render` option set to invoke the rendererer with the result of the route handler as the props
    fastify.addHook('onRoute', function (routeOptions) {
        if (routeOptions.render) {
            const oldHandler = (0, tracing_1.wrap)('fastify-renderer.getProps', routeOptions.handler);
            const renderable = routeOptions.render;
            const plugin = this[symbols_1.kRendererPlugin];
            const renderableRoute = { ...this[symbols_1.kRenderOptions], url: routeOptions.url, renderable };
            plugin.registerRoute(renderableRoute);
            routeOptions.handler = (0, tracing_1.wrap)('fastify-renderer.handler', async function (request, reply) {
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
            });
        }
    });
    let devServer = undefined;
    let viteMountInstance = fastify;
    await fs_1.promises.mkdir(plugin.clientOutDir, { recursive: true });
    // this nasty bit is to support vite's middlewares running at a prefix where they don't collide with other routes the user might have added
    // we use the fastify router's prefix functionality to only let vite operate on routes that match it's prefix
    await fastify.register(async (instance) => {
        viteMountInstance = instance;
        // we need to register a wildcard route for all the files that vite might serve, which we use fastify-static to do
        // in dev mode, this is needed so the fastify router will recognize the route and dispatch it, which will then run the middleware chain, letting vite take over and serve the file
        // in production, this will actually serve the files that vite has built for the client
        void instance.register(fastify_static_1.default, {
            root: plugin.clientOutDir,
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
        fastify[symbols_1.kRendererViteOptions] = {
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
            devServer = await (0, vite_1.createServer)(fastify[symbols_1.kRendererViteOptions]);
            viteMountInstance.use(devServer.middlewares);
            config = devServer.config;
        }
        else {
            config = await (0, vite_1.resolveConfig)(fastify[symbols_1.kRendererViteOptions], 'serve');
        }
        await plugin.renderer.prepare(plugin.routes, config, devServer);
    });
    fastify.addHook('onClose', async () => {
        await (devServer === null || devServer === void 0 ? void 0 : devServer.close());
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
    const plugin = fastify[symbols_1.kRendererPlugin];
    if (!plugin) {
        throw new Error('No fastify-renderer registered to build, have all your fastify plugins been loaded?');
    }
    const log = fastify.log.child({ name: 'fastify-renderer' });
    const clientEntrypoints = {};
    const serverEntrypoints = {};
    for (const renderableRoute of plugin.routes) {
        const entrypointName = (0, utils_1.mapFilepathToEntrypointName)(renderableRoute.renderable, renderableRoute.base);
        clientEntrypoints[entrypointName] = plugin.renderer.buildVirtualClientEntrypointModuleID(renderableRoute);
        serverEntrypoints[entrypointName] = plugin.renderer.buildVirtualServerEntrypointModuleID(renderableRoute);
    }
    const vite = fastify[symbols_1.kRendererViteOptions];
    log.info(`Building ${Object.keys(clientEntrypoints).length} client side asset(s) to ${plugin.clientOutDir}`);
    await (0, vite_1.build)({
        ...vite,
        build: {
            ...vite.build,
            outDir: plugin.clientOutDir,
            ssrManifest: true,
            manifest: true,
            rollupOptions: {
                input: clientEntrypoints,
                ...(_a = vite === null || vite === void 0 ? void 0 : vite.build) === null || _a === void 0 ? void 0 : _a.rollupOptions,
            },
        },
    });
    log.info(`Building ${Object.keys(serverEntrypoints).length} server side side asset(s) for ${plugin.serverOutDir}`);
    await (0, vite_1.build)({
        ...vite,
        build: {
            ...vite.build,
            outDir: plugin.serverOutDir,
            rollupOptions: {
                input: serverEntrypoints,
                ...(_b = vite === null || vite === void 0 ? void 0 : vite.build) === null || _b === void 0 ? void 0 : _b.rollupOptions,
            },
            ssr: true,
        },
    });
    // Write a special manifest for the server side entrypoints
    // Somewhat strangely we also use virtual entrypoints for the server side code used during SSR --
    // that means that in production, the server needs to require code from a special spot to get the
    // SSR-safe version of each entrypoint. We write out our own manifest here because there's a bug
    // in rollup or vite that errors when trying to generate a manifest in SSR mode.
    const virtualModulesToRenderedEntrypoints = Object.fromEntries(Object.entries(serverEntrypoints).map(([key, value]) => [value, key]));
    await fs_1.promises.writeFile(path_1.default.join(plugin.serverOutDir, 'virtual-manifest.json'), JSON.stringify(virtualModulesToRenderedEntrypoints, null, 2));
};
exports.build = build;
//# sourceMappingURL=index.js.map