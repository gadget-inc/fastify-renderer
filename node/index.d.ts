import '@fastify/accepts';
import '@fastify/middie';
import { FastifyInstance } from 'fastify';
import { FastifyRendererOptions } from './Plugin';
import './types';
declare const FastifyRenderer: import("fastify").FastifyPluginCallback<FastifyRendererOptions, import("fastify").RawServerDefault, import("fastify").FastifyTypeProviderDefault, import("fastify").FastifyBaseLogger>;
export default FastifyRenderer;
export declare const build: (fastify: FastifyInstance) => Promise<void>;
