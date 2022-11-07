import 'middie';
import { InlineConfig } from 'vite';
import { Template } from './DocumentTemplate';
import { RenderBus } from './RenderBus';
import { ReactRendererOptions } from './renderers/react/ReactRenderer';
import { RenderableRegistration, Renderer } from './renderers/Renderer';
import './types';
import { FastifyRendererHook, ServerEntrypointManifest, ViteClientManifest } from './types';
export interface FastifyRendererOptions {
    renderer?: ReactRendererOptions;
    vite?: InlineConfig;
    base?: string;
    layout?: string;
    document?: Template;
    devMode?: boolean;
    outDir?: string;
    assetsHost?: string;
    hooks?: (FastifyRendererHook | (() => FastifyRendererHook))[];
}
export declare type ImperativeRenderable = symbol;
export declare class FastifyRendererPlugin {
    renderer: Renderer;
    devMode: boolean;
    vite: InlineConfig;
    viteBase: string;
    clientOutDir: string;
    serverOutDir: string;
    assetsHost: string;
    hooks: (FastifyRendererHook | (() => FastifyRendererHook))[];
    clientManifest?: ViteClientManifest;
    serverEntrypointManifest?: ServerEntrypointManifest;
    renderables: RenderableRegistration[];
    registeredComponents: Record<ImperativeRenderable, RenderableRegistration>;
    constructor(incomingOptions: FastifyRendererOptions);
    /**
     * For a vite module id, returns the path it will be accessible at from the browser.
     * Adds in the `base`, and the `assetsHost` if it exists
     */
    clientAssetPath(asset: string): string;
    /**
     * Implements the backend integration logic for vite -- pulls out the chain of imported modules from the vite manifest and generates <script/> or <link/> tags to source the assets in the browser.
     **/
    pushImportTagsFromManifest: (bus: RenderBus, entryName: string, root?: boolean) => void;
    register(options: RenderableRegistration): ImperativeRenderable;
}
