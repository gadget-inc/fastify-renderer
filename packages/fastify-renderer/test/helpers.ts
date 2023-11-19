import fastify, { FastifyServerOptions } from 'fastify'
import fastifyAccepts from '@fastify/accepts'
import Middie from 'middie'
import path from 'path'
import { Readable } from 'stream'
import { FastifyRendererOptions, FastifyRendererPlugin } from '../src/node/Plugin'
import { RenderBus } from '../src/node/RenderBus'
import { Render } from '../src/node/renderers/Renderer'
import { ReactRenderer, ReactRendererOptions } from '../src/node/renderers/react/ReactRenderer'
import fs from 'fs'
const logLevel = process.env.LOG_LEVEL || 'error'

export const newFastify = async (options?: FastifyServerOptions) => {
  const server = fastify({ ...options, logger: { level: logLevel, prettyPrint: true } })
  await server.register(fastifyAccepts)
  await server.register(Middie)
  return server
}

export const newRenderBus = () => {
  return new RenderBus()
}

export const newFastifyRendererPlugin = (options: FastifyRendererOptions = {}) => {
  fs.mkdirSync('/tmp/out/dir/client/.vite/', { recursive: true })
  fs.mkdirSync('/tmp/out/dir/server/.vite/', { recursive: true })
  return new FastifyRendererPlugin(options)
}

export const newReactRenderer = (options?: ReactRendererOptions): ReactRenderer => {
  const plugin = newFastifyRendererPlugin({ renderer: options })
  return plugin.renderer as ReactRenderer
}

export const getMockRender = <T>(props: T): Render<T> => {
  return {
    props,
    renderable: path.resolve(__dirname, 'fixtures', 'test-module.tsx'),
    pathPattern: 'test-url',
    layout: path.resolve(__dirname, 'fixtures', 'test-layout.tsx'),
    base: '',
    document: (_data) => Readable.from(''),
    request: {
      url: 'test-url',
    } as any,
    reply: {
      send: (_payload: unknown) => {
        throw new Error('Send is not implemented')
      },
    } as any,
  }
}
