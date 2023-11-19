import path from 'path'
import { DefaultDocumentTemplate } from '../src/node/DocumentTemplate'
import { FastifyRendererOptions } from '../src/node/Plugin'
import { RenderableRegistration } from '../src/node/renderers/Renderer'
import { newFastifyRendererPlugin, newRenderBus } from './helpers'
import { vi, describe, beforeEach, test, expect } from 'vitest'
import fs from 'node:fs'
describe('FastifyRendererPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should create a new instance with default options', async () => {
    const plugin = newFastifyRendererPlugin({})

    expect(plugin.devMode).toEqual(true)
    expect(plugin.viteBase).toEqual('/.vite/')
    expect(plugin.assetsHost).toEqual('')
    expect(plugin.hooks).toEqual([])
    expect(plugin.clientOutDir).toEqual(path.join(process.cwd(), 'dist', 'client', plugin.viteBase))
    expect(plugin.serverOutDir).toEqual(path.join(process.cwd(), 'dist', 'server'))
    // expect(fs.readFileSync).toHaveBeenCalledTimes(0)
    //expect(ReactRenderer).toBeCalledWith(plugin, { type: 'react', mode: 'streaming' })
  })

  test('should create a new instance with the provided options', async () => {
    const options: FastifyRendererOptions = {
      outDir: '/tmp/out/dir',
      renderer: { type: 'react', mode: 'sync' },
      devMode: false,
      assetsHost: 'https://custom.asset.host',
    }
    const plugin = newFastifyRendererPlugin(options)

    expect(plugin.devMode).toEqual(false)
    expect(plugin.viteBase).toEqual('/.vite/')
    expect(plugin.assetsHost).toEqual(options.assetsHost)
    expect(plugin.hooks).toEqual([])
    expect(plugin.clientOutDir).toEqual(path.join(options.outDir as string, 'client', plugin.viteBase))
    expect(plugin.serverOutDir).toEqual(path.join(options.outDir as string, 'server'))
    // expect(fs.readFileSync).toHaveBeenCalledTimes(2)
    // expect(ReactRenderer).toBeCalledWith(plugin, options.renderer)
  })

  describe('clientAssetPath()', () => {
    test('should return the client asset path that will be accessible from the browser', async () => {
      fs.mkdirSync('/tmp/out/dir/client/.vite/', { recursive: true })
      fs.mkdirSync('/tmp/out/dir/server/.vite/', { recursive: true })
      fs.writeFileSync('/tmp/out/dir/client/.vite/manifest.json', '{ "test": "value" }')
      fs.writeFileSync('/tmp/out/dir/server/.vite/manifest.json', '{ "test": "value" }')
      fs.writeFileSync('/tmp/out/dir/server/virtual-manifest.json', '{ "test": "value" }')
      const options: FastifyRendererOptions = {
        outDir: '/tmp/out/dir',
        renderer: { type: 'react', mode: 'sync' },
        devMode: false,
      }
      const plugin = newFastifyRendererPlugin(options)
      expect(plugin.clientAssetPath('file.css')).toEqual(path.join(plugin.viteBase, 'file.css'))
    })

    test('should prepend the provided assetHost to the generated path', async () => {
      const options: FastifyRendererOptions = {
        outDir: '/tmp/out/dir',
        renderer: { type: 'react', mode: 'sync' },
        devMode: false,
        assetsHost: 'https://custom.asset.host',
      }
      const plugin = newFastifyRendererPlugin(options)
      expect(plugin.clientAssetPath('file.css')).toContain(options.assetsHost)
    })
  })

  describe('pushImportTagsFromManifest()', () => {
    test('should throw when an entry is not found in the manifest', async () => {
      const plugin = newFastifyRendererPlugin({} as FastifyRendererOptions)
      const bus = newRenderBus()
      expect(() => plugin.pushImportTagsFromManifest(bus, 'entry-name')).toThrow()
    })

    // TODO: Generate the manifest file to test this
    test('should push all import tags from the manifest to the render bus', async () => {
      // const options: FastifyRendererOptions = {
      //   outDir: '/tmp/out/dir',
      //   renderer: { type: 'react', mode: 'sync' },
      //   devMode: false,
      //   assetsHost: 'https://custom.asset.host',
      // }
      // const plugin = newFastifyRendererPlugin(options)
      // const bus = new RenderBus()
      // expect(plugin.pushImportTagsFromManifest(bus, 'test')).toBe(true)
    })

    test('should add the root module as a script tag to the bus', async () => {
      // TODO:
    })

    test('should add descendent modules as preloaded modules to the bus', async () => {
      // TODO:
    })
  })

  describe('register()', () => {
    test('should add a registered route to the routes array', async () => {
      const plugin = newFastifyRendererPlugin({})
      const registration: RenderableRegistration = {
        pathPattern: 'route-url',
        renderable: 'renderable-component-path',
        layout: 'layout',
        base: 'base',
        document: DefaultDocumentTemplate,
      }

      expect(plugin.renderables.length).toEqual(0)

      plugin.register(registration)

      expect(plugin.renderables.length).toEqual(1)
      expect(plugin.renderables[0]).toEqual(registration)
    })
  })
})
