/// <reference types="node" />
import '@fastify/accepts';
import '@fastify/middie';
import { FastifyInstance } from 'fastify';
import { InlineConfig, SSROptions } from 'vite';
import { FastifyRendererOptions, FastifyRendererPlugin } from './Plugin';
import { PartialRenderOptions, RenderOptions } from './renderers/Renderer';
import { kRendererPlugin, kRendererViteOptions, kRenderOptions } from './symbols';
import './types';
declare module 'fastify' {
    interface FastifyInstance {
        [kRendererPlugin]: FastifyRendererPlugin;
        [kRendererViteOptions]: InlineConfig & {
            ssr?: SSROptions;
        };
        [kRenderOptions]: RenderOptions;
        setRenderConfig(options: PartialRenderOptions): void;
    }
}
declare const FastifyRenderer: import("fastify").FastifyPluginAsync<FastifyRendererOptions, import("http").Server, import("fastify").FastifyTypeProviderDefault>;
export default FastifyRenderer;
export declare const build: (fastify: FastifyInstance) => Promise<void>;
