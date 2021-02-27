"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = void 0;
const fastify_accepts_1 = __importDefault(require("fastify-accepts"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const fastify_static_1 = __importDefault(require("fastify-static"));
const fs_1 = require("fs");
require("middie");
const path_1 = __importDefault(require("path"));
const vite_1 = require("vite");
const Plugin_1 = require("./Plugin");
require("./types"); // necessary to make sure that the fastify types are augmented
const utils_1 = require("./utils");
const instances = [];
const FastifyRenderer = fastify_plugin_1.default(async (fastify, incomingOptions) => {
    await fastify.register(fastify_accepts_1.default);
    // todo: register middie if it hasn't been registered already, same way as fastify-helmet does with trying to use `.use` first, and if it doesn't work, registering middie then trying again and remove dependency
    const plugin = new Plugin_1.FastifyRendererPlugin(incomingOptions);
    let vite;
    const routes = [];
    fastify.decorate('vite', {
        getter() {
            return vite;
        },
    });
    // we need to register a wildcard route for all the files that vite might serve so fastify will run the middleware chain and vite will do the serving. 404 in this request handler because we expect vite to handle any real requests
    const staticPath = path_1.default.join(plugin.outDir, 'client');
    await fs_1.promises.mkdir(staticPath, { recursive: true });
    void fastify.register(fastify_static_1.default, {
        root: staticPath,
        prefix: plugin.base,
    });
    // Wrap routes that have the `vite` option set to invoke the rendererer with the result of the route handler as the props
    fastify.addHook('onRoute', (routeOptions) => {
        if (routeOptions.render) {
            const oldHandler = routeOptions.handler;
            const renderable = routeOptions.render;
            routes.push(routeOptions);
            routeOptions.handler = async function (request, reply) {
                const props = await oldHandler.call(this, request, reply);
                void reply.header('Vary', 'Accept');
                switch (request.accepts().type(['html', 'json'])) {
                    case 'json':
                        await reply.type('application/json').send({ props });
                        break;
                    case 'html':
                        void reply.type('text/html');
                        const render = { request, reply, props, renderable };
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
    // register vite once all the routes have been defined
    fastify.addHook('onReady', async () => {
        var _a, _b, _c;
        const viteOptions = {
            clearScreen: false,
            ...plugin.vite,
            plugins: [...(((_a = plugin.vite) === null || _a === void 0 ? void 0 : _a.plugins) || []), ...plugin.renderer.vitePlugins()],
            server: {
                middlewareMode: true,
                ...(_b = plugin.vite) === null || _b === void 0 ? void 0 : _b.server,
            },
            build: {
                ...(_c = plugin.vite) === null || _c === void 0 ? void 0 : _c.build,
            },
        };
        let config;
        if (plugin.devMode) {
            fastify.log.debug('booting vite dev server');
            devServer = await vite_1.createServer(viteOptions);
            fastify.use(devServer.middlewares);
            config = devServer.config;
        }
        else {
            config = await vite_1.resolveConfig(viteOptions, 'serve');
        }
        instances.push({ fastify, routes, plugin, vite: viteOptions });
        await plugin.renderer.prepare(routes, config, devServer);
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
const build = async () => {
    var _a, _b;
    if (instances.length == 0) {
        throw new Error('No instances of fastify-renderer registered to build, have all your fastify plugins been loaded?');
    }
    const total = instances.length;
    for (const [index, { fastify, routes, plugin, vite }] of Object.entries(instances)) {
        const clientEntrypoints = {};
        const serverEntrypoints = {};
        for (const route of routes) {
            const entrypointName = utils_1.mapFilepathToEntrypointName(route.render);
            clientEntrypoints[entrypointName] = plugin.renderer.buildVirtualClientEntrypointModuleURL(route.render);
            serverEntrypoints[entrypointName] = entrypointName;
            serverEntrypoints[utils_1.mapFilepathToEntrypointName(plugin.layout)] = plugin.layout;
        }
        fastify.log.info(`Building client side assets for fastify-renderer (${index + 1}/${total + 1})`);
        await vite_1.build({
            ...vite,
            build: {
                ...vite.build,
                outDir: path_1.default.join(plugin.outDir, 'client'),
                ssrManifest: true,
                manifest: true,
                rollupOptions: {
                    input: clientEntrypoints,
                    ...(_a = vite === null || vite === void 0 ? void 0 : vite.build) === null || _a === void 0 ? void 0 : _a.rollupOptions,
                },
            },
        });
        fastify.log.info(`Building server side side assets for fastify-renderer (${index + 1}/${total + 1})`);
        await vite_1.build({
            ...vite,
            build: {
                ...vite.build,
                rollupOptions: {
                    input: serverEntrypoints,
                    ...(_b = vite === null || vite === void 0 ? void 0 : vite.build) === null || _b === void 0 ? void 0 : _b.rollupOptions,
                },
                outDir: path_1.default.join(plugin.outDir, 'server'),
                ssr: true,
            },
        });
    }
};
exports.build = build;
//# sourceMappingURL=index.js.map