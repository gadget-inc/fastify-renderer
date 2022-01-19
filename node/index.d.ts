/// <reference types="node" />
import { FastifyInstance } from 'fastify';
import 'fastify-accepts';
import 'middie';
import { InlineConfig } from 'vite';
import { FastifyRendererOptions, FastifyRendererPlugin } from './Plugin';
import { PartialRenderOptions, RenderOptions } from './renderers/Renderer';
import { kRendererPlugin, kRendererViteOptions, kRenderOptions } from './symbols';
import './types';
declare module 'fastify' {
    interface FastifyInstance {
        [kRendererPlugin]: FastifyRendererPlugin;
        [kRendererViteOptions]: InlineConfig;
        [kRenderOptions]: RenderOptions;
        setRenderConfig(options: PartialRenderOptions): void;
    }
}
declare const FastifyRenderer: import("fastify").FastifyPluginAsync<FastifyRendererOptions, import("http").Server>;
export default FastifyRenderer;
export declare const build: (fastify: FastifyInstance) => Promise<void>;
