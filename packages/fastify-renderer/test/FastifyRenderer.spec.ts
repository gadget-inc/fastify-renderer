import { promises as fs } from 'node:fs'
import path from 'path'
import * as Vite from 'vite'
import FastifyRenderer, { build } from '../src/node'
import { FastifyRendererPlugin } from '../src/node/Plugin'
import { kRenderOptions } from '../src/node/symbols'
import { newFastify } from './helpers'
import { describe, beforeEach, vi, test, expect } from 'vitest'

const testComponent = require.resolve(path.join(__dirname, 'fixtures', 'test-module.tsx'))
const testLayoutComponent = require.resolve(path.join(__dirname, 'fixtures', 'test-layout.tsx'))
const options = { vite: { root: __dirname, logLevel: (process.env.LOG_LEVEL ?? 'info') as any } }

describe('FastifyRenderer', () => {
  let server
  beforeEach(async () => {
    vi.clearAllMocks()

    server = await newFastify()
    await server.register(FastifyRenderer, options)
    server.setRenderConfig({
      base: '',
      layout: testLayoutComponent,
    })
  })

  test('should throw if the fastify-renderer plugin was already registered in the same fastify context', async () => {
    server = await newFastify()

    await server.register(FastifyRenderer, options)
    await expect(server.register(FastifyRenderer)).rejects.toThrow("The decorator 'vite' has already been added!")
  })

  test('should throw if the fastify-renderer plugin was already registered in a different context', async () => {
    server = await newFastify()

    await server.register(FastifyRenderer, options)
    await expect(server.register(async (instance) => instance.register(FastifyRenderer))).rejects.toThrow()
  })

  test('should decorate the fastify instance with a "setRenderConfig" method', async () => {
    server = await newFastify()
    await server.register(FastifyRenderer, options)
    expect(server.setRenderConfig).toBeInstanceOf(Function)
    server.setRenderConfig({
      base: '/foo',
    })
  })

  test('should set default render config for the instance', async () => {
    expect(server[kRenderOptions]).toBeInstanceOf(Object)
  })

  test('should set the renderOptions on the new fastify instance context', async () => {
    await server.register(async (instance) => {
      expect(server[kRenderOptions]).toEqual(instance[kRenderOptions])
    })
  })

  test('should mount vite routes at a prefix to avoid collision with user routes', async () => {
    expect(server.printRoutes()).toMatch('/.vite/')
  })

  test('should close vite devServer when fastify server is closing in dev mode', async () => {
    const devServer = await Vite.createServer()
    const closeSpy = vi.spyOn(devServer, 'close')
    vi.spyOn(Vite, 'createServer').mockImplementation(async () => devServer)

    server = await newFastify()
    await server.register(FastifyRenderer, { ...options, devMode: true })
    await server.listen(0)
    await server.close()

    expect(closeSpy).toHaveBeenCalled()
  })

  test('should do nothing if the registered route is not renderable', async () => {
    const registerRouteSpy = vi.spyOn(FastifyRendererPlugin.prototype, 'register')

    server.get('/', async (_request, reply) => reply.send('Hello'))
    await server.inject({ method: 'GET', url: '/' })

    expect(registerRouteSpy).toHaveBeenCalledTimes(0)
  })

  test("should register the route in the plugin if it's renderable", async () => {
    const registerRouteSpy = vi
      .spyOn(FastifyRendererPlugin.prototype, 'register')
      .mockImplementation(vi.fn(() => null as any))

    server.get('/', { render: testComponent }, async (request, reply) => reply.send('Hello'))
    await server.inject({ method: 'GET', url: '/' })

    expect(registerRouteSpy).toHaveBeenCalledTimes(1)
  })
})

describe('build()', () => {
  test('should throw if the fastify-renderer plugin isnt available on the fastify instance', async () => {
    const server = await newFastify()
    void expect(build(server)).rejects.toThrow()
  })

  test('should build client and server side assets', async () => {
    const server = await newFastify()
    await server.register(FastifyRenderer, options)
    await server.listen(0)

    vi.spyOn(fs, 'writeFile').mockImplementation(vi.fn(() => null as any))
    vi.spyOn(path, 'join').mockImplementation(vi.fn(() => null as any))
    const viteBuildSpy = vi.spyOn(Vite, 'build').mockImplementation(vi.fn(() => null as any))

    await build(server)

    expect(viteBuildSpy).toHaveBeenCalledTimes(2)
  })
})
