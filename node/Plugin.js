"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastifyRendererPlugin = void 0;
/* eslint-disable @typescript-eslint/require-await */
require("@fastify/middie");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ReactRenderer_1 = require("./renderers/react/ReactRenderer");
require("./types"); // necessary to make sure that the fastify types are augmented
class FastifyRendererPlugin {
    constructor(incomingOptions) {
        var _a, _b;
        var _c;
        this.renderables = [];
        this.registeredComponents = {};
        /**
         * Implements the backend integration logic for vite -- pulls out the chain of imported modules from the vite manifest and generates <script/> or <link/> tags to source the assets in the browser.
         **/
        this.pushImportTagsFromManifest = (bus, entryName, root = true) => {
            const manifestEntry = this.clientManifest[entryName];
            if (!manifestEntry) {
                throw new Error(`Module id ${entryName} was not found in the built assets manifest. Was it included in the build?`);
            }
            if (manifestEntry.imports) {
                for (const submodule of manifestEntry.imports) {
                    this.pushImportTagsFromManifest(bus, submodule, false);
                }
            }
            if (manifestEntry.css) {
                for (const css of manifestEntry.css) {
                    bus.linkStylesheet(this.clientAssetPath(css));
                }
            }
            const file = this.clientAssetPath(manifestEntry.file);
            if (file.endsWith('.js')) {
                if (root) {
                    bus.loadScript(file);
                }
                else {
                    bus.preloadModule(file);
                }
            }
            else if (file.endsWith('.css')) {
                bus.linkStylesheet(file);
            }
        };
        this.devMode = (_a = incomingOptions.devMode) !== null && _a !== void 0 ? _a : process.env.NODE_ENV != 'production';
        this.vite = incomingOptions.vite || {};
        (_b = (_c = this.vite).base) !== null && _b !== void 0 ? _b : (_c.base = '/.vite/');
        this.viteBase = this.vite.base;
        this.assetsHost = incomingOptions.assetsHost || '';
        this.hooks = incomingOptions.hooks || [];
        const outDir = incomingOptions.outDir || path_1.default.join(process.cwd(), 'dist');
        this.clientOutDir = path_1.default.join(outDir, 'client', this.viteBase);
        this.serverOutDir = path_1.default.join(outDir, 'server');
        if (!this.devMode) {
            this.clientManifest = JSON.parse(fs_1.default.readFileSync(path_1.default.join(this.clientOutDir, 'manifest.json'), 'utf-8'));
            this.serverEntrypointManifest = JSON.parse(fs_1.default.readFileSync(path_1.default.join(this.serverOutDir, 'virtual-manifest.json'), 'utf-8'));
        }
        this.renderer = new ReactRenderer_1.ReactRenderer(this, incomingOptions.renderer || { type: 'react', mode: 'streaming' });
    }
    /**
     * For a vite module id, returns the path it will be accessible at from the browser.
     * Adds in the `base`, and the `assetsHost` if it exists
     */
    clientAssetPath(asset) {
        const absolutePath = path_1.default.join(this.viteBase, asset);
        if (this.assetsHost) {
            return this.assetsHost + absolutePath;
        }
        return absolutePath;
    }
    register(options) {
        // If the component is not already registered, we register it and return a unique symbol for it
        const symbol = Symbol(options.renderable);
        this.registeredComponents[symbol] = options;
        this.renderables.push(options);
        return symbol;
    }
}
exports.FastifyRendererPlugin = FastifyRendererPlugin;
//# sourceMappingURL=Plugin.js.map