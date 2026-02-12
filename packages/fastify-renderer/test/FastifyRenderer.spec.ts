import { promises as fs } from 'fs'
import path from 'path'
import * as Vite from 'vite'
import FastifyRenderer, { build } from '../src/node'
import { FastifyRendererPlugin } from '../src/node/Plugin'
import { kRendererViteOptions, kRenderOptions } from '../src/node/symbols'
import { newFastify } from './helpers'

const testComponent = require.resolve(path.join(__dirname, 'fixtures', 'test-module.tsx'))
const testLayoutComponent = require.resolve(path.join(__dirname, 'fixtures', 'test-layout.tsx'))
const options = { vite: { root: __dirname, logLevel: (process.env.LOG_LEVEL ?? 'info') as any } }

describe('FastifyRenderer', () => {
  let server
  beforeEach(async () => {
    jest.clearAllMocks()

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
    expect(server.printRoutes()).toMatch('.vite')
  })

  test('should not preserve process.env references by default', async () => {
    await server.ready()
    expect(server[kRendererViteOptions].define?.['process.env']).toBeUndefined()
  })

  test('should preserve process.env references when configured', async () => {
    server = await newFastify()
    await server.register(FastifyRenderer, { ...options, preserveProcessEnv: true })

    await server.ready()
    expect(server[kRendererViteOptions].define?.['process.env']).toEqual('process.env')
  })

  test('should not override an explicit vite.define["process.env"] when preserveProcessEnv is true', async () => {
    server = await newFastify()
    await server.register(FastifyRenderer, {
      ...options,
      preserveProcessEnv: true,
      vite: {
        ...options.vite,
        define: {
          'process.env': JSON.stringify({ KEEP: 'EXPLICIT' }),
        },
      },
    })

    await server.ready()
    expect(server[kRendererViteOptions].define?.['process.env']).toEqual(JSON.stringify({ KEEP: 'EXPLICIT' }))
  })

  test('should preserve process.env references for matching module ids when configured with include matchers', async () => {
    server = await newFastify()
    await server.register(FastifyRenderer, {
      ...options,
      preserveProcessEnv: {
        include: ['/packages/docs/', /\/docs\//],
      },
    })

    await server.ready()

    // scoped mode should avoid setting a global Vite define, and instead rely on a transform plugin
    expect(server[kRendererViteOptions].define?.['process.env']).toBeUndefined()

    const preservePlugin = server[kRendererViteOptions].plugins.find(
      (plugin: any) => plugin.name === 'fastify-renderer:preserve-process-env'
    )
    expect(preservePlugin).toBeDefined()

    const originalCode = 'const appUrl = ({}).PUBLIC_APP_URL;'
    const docsModuleId = '/workspace/packages/docs/pages/reference/example.mdx'
    const webModuleId = '/workspace/packages/web/src/components/auth/LoginPage.tsx'

    const transformedDocsCode = preservePlugin.transform(originalCode, docsModuleId)
    expect(transformedDocsCode.code).toContain('process.env.PUBLIC_APP_URL')

    const transformedWebCode = preservePlugin.transform(originalCode, webModuleId)
    expect(transformedWebCode).toBeNull()
  })

  test('should not rewrite bracket-form object access in scoped preserve mode', async () => {
    server = await newFastify()
    await server.register(FastifyRenderer, {
      ...options,
      preserveProcessEnv: {
        include: ['/packages/docs/'],
      },
    })

    await server.ready()

    const preservePlugin = server[kRendererViteOptions].plugins.find(
      (plugin: any) => plugin.name === 'fastify-renderer:preserve-process-env'
    )
    expect(preservePlugin).toBeDefined()

    const bracketFormCode = 'const appUrl = ({})["PUBLIC_APP_URL"];'
    const docsModuleId = '/workspace/packages/docs/pages/reference/example.mdx'

    const transformed = preservePlugin.transform(bracketFormCode, docsModuleId)
    expect(transformed).toBeNull()
  })

  test('should leave already-correct process.env code unchanged in scoped preserve mode', async () => {
    server = await newFastify()
    await server.register(FastifyRenderer, {
      ...options,
      preserveProcessEnv: {
        include: ['/packages/docs/'],
      },
    })

    await server.ready()

    const preservePlugin = server[kRendererViteOptions].plugins.find(
      (plugin: any) => plugin.name === 'fastify-renderer:preserve-process-env'
    )
    expect(preservePlugin).toBeDefined()

    const alreadyCorrectCode = 'const appUrl = process.env.PUBLIC_APP_URL;'
    const docsModuleId = '/workspace/packages/docs/pages/reference/example.mdx'

    const transformed = preservePlugin.transform(alreadyCorrectCode, docsModuleId)
    expect(transformed).toBeNull()
  })

  test('should not add scoped preserve plugin when include matchers are empty', async () => {
    server = await newFastify()
    await server.register(FastifyRenderer, {
      ...options,
      preserveProcessEnv: {
        include: [],
      },
    })

    await server.ready()

    expect(server[kRendererViteOptions].define?.['process.env']).toBeUndefined()
    const preservePlugins = server[kRendererViteOptions].plugins.filter(
      (plugin: any) => plugin.name === 'fastify-renderer:preserve-process-env'
    )
    expect(preservePlugins).toHaveLength(0)
  })

  test('should close vite devServer when fastify server is closing in dev mode', async () => {
    const devServer = await Vite.createServer()
    const closeSpy = jest.spyOn(devServer, 'close')
    jest.spyOn(Vite, 'createServer').mockImplementation(async () => devServer)

    server = await newFastify()
    await server.register(FastifyRenderer, { ...options, devMode: true })
    await server.listen({ port: 0 })
    await server.close()

    expect(closeSpy).toHaveBeenCalled()
  })

  test('should do nothing if the registered route is not renderable', async () => {
    const registerRouteSpy = jest.spyOn(FastifyRendererPlugin.prototype, 'register')

    server.get('/', async (_request, reply) => reply.send('Hello'))
    await server.inject({ method: 'GET', url: '/' })

    expect(registerRouteSpy).toHaveBeenCalledTimes(0)
  })

  test("should register the route in the plugin if it's renderable", async () => {
    const registerRouteSpy = jest.spyOn(FastifyRendererPlugin.prototype, 'register').mockImplementation(jest.fn())

    server.get('/', { render: testComponent }, async (request, reply) => reply.send('Hello'))
    const response = await server.inject({ method: 'GET', url: '/' })
    expect(response.statusCode).toEqual(200)

    expect(registerRouteSpy).toHaveBeenCalled()
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
    await server.listen({ port: 0 })

    jest.spyOn(fs, 'writeFile').mockImplementation(jest.fn())
    jest.spyOn(path, 'join').mockImplementation(jest.fn())
    const viteBuildSpy = jest.spyOn(Vite, 'build').mockImplementation(jest.fn())

    await build(server)

    expect(viteBuildSpy).toHaveBeenCalledTimes(2)
  })
})
