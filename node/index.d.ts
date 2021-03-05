/// <reference types="node" />
import { FastifyInstance } from 'fastify';
import 'fastify-accepts';
import 'middie';
import { InlineConfig } from 'vite';
import { FastifyRendererOptions, FastifyRendererPlugin } from './Plugin';
import { RenderOptions } from './renderers/Renderer';
import './types';
declare const kRendererPlugin: unique symbol;
declare const kRenderOptions: unique symbol;
declare const kRendererViteOptions: unique symbol;
declare module 'fastify' {
    interface FastifyInstance {
        [kRendererPlugin]: FastifyRendererPlugin;
        [kRendererViteOptions]: InlineConfig;
        [kRenderOptions]: RenderOptions;
        setRenderConfig(options: FastifyRendererOptions): void;
    }
}
declare const FastifyRenderer: import("fastify").FastifyPluginAsync<FastifyRendererOptions, import("http").Server>;
export default FastifyRenderer;
export declare const build: (fastify: FastifyInstance) => Promise<void>;
