/// <reference types="node" />
import 'middie';
import { FastifyRendererOptions } from './Plugin';
import './types';
declare const FastifyRenderer: import("fastify").FastifyPluginAsync<FastifyRendererOptions, import("http").Server>;
export default FastifyRenderer;
export declare const build: () => Promise<void>;
