/* eslint-disable @typescript-eslint/require-await */
import fs from 'fs'
import 'middie'
import path from 'path'
import { InlineConfig } from 'vite'
import { Template } from './DocumentTemplate'
import { RenderBus } from './RenderBus'
import { ReactRenderer, ReactRendererOptions } from './renderers/react/ReactRenderer'
import { RenderableRoute, Renderer } from './renderers/Renderer'
import './types' // necessary to make sure that the fastify types are augmented
import { FastifyRendererHook, ServerEntrypointManifest, ViteClientManifest } from './types'
import { unthunk } from './utils'

export interface FastifyRendererOptions {
  renderer?: ReactRendererOptions
  vite?: InlineConfig
  base?: string
  layout?: string
  document?: Template
  devMode?: boolean
  outDir?: string
  assetsHost?: string
  hooks?: (FastifyRendererHook | (() => FastifyRendererHook))[]
}

export class FastifyRendererPlugin {
  renderer: Renderer
  devMode: boolean
  vite: InlineConfig
  viteBase: string
  clientOutDir: string
  serverOutDir: string
  assetsHost: string
  hooks: FastifyRendererHook[]
  clientManifest?: ViteClientManifest
  serverEntrypointManifest?: ServerEntrypointManifest
  routes: RenderableRoute[] = []

  constructor(incomingOptions: FastifyRendererOptions) {
    this.devMode = incomingOptions.devMode ?? process.env.NODE_ENV != 'production'

    this.vite = incomingOptions.vite || {}
    this.vite.base ??= '/.vite/'
    this.viteBase = this.vite.base
    this.assetsHost = incomingOptions.assetsHost || ''
    this.hooks = (incomingOptions.hooks || []).map(unthunk)

    const outDir = incomingOptions.outDir || path.join(process.cwd(), 'dist')
    this.clientOutDir = path.join(outDir, 'client', this.viteBase)
    this.serverOutDir = path.join(outDir, 'server')

    if (!this.devMode) {
      this.clientManifest = JSON.parse(fs.readFileSync(path.join(this.clientOutDir, 'manifest.json'), 'utf-8'))
      this.serverEntrypointManifest = JSON.parse(
        fs.readFileSync(path.join(this.serverOutDir, 'virtual-manifest.json'), 'utf-8')
      )
    }

    this.renderer = new ReactRenderer(this, incomingOptions.renderer || { type: 'react', mode: 'streaming' })
  }

  /**
   * For a vite module id, returns the path it will be accessible at from the browser.
   * Adds in the `base`, and the `assetsHost` if it exists
   */
  clientAssetPath(asset: string) {
    const absolutePath = path.join(this.viteBase, asset)
    if (this.assetsHost) {
      return this.assetsHost + absolutePath
    }
    return absolutePath
  }

  /**
   * Implements the backend integration logic for vite -- pulls out the chain of imported modules from the vite manifest and generates <script/> or <link/> tags to source the assets in the browser.
   **/
  pushImportTagsFromManifest = (bus: RenderBus, entryName: string, root = true) => {
    const manifestEntry = this.clientManifest![entryName]
    if (!manifestEntry) {
      throw new Error(
        `Module id ${entryName} was not found in the built assets manifest. Was it included in the build?`
      )
    }

    if (manifestEntry.imports) {
      for (const submodule of manifestEntry.imports) {
        this.pushImportTagsFromManifest(bus, submodule, false)
      }
    }
    if (manifestEntry.css) {
      for (const css of manifestEntry.css) {
        bus.linkStylesheet(this.clientAssetPath(css))
      }
    }

    const file = this.clientAssetPath(manifestEntry.file)

    if (file.endsWith('.js')) {
      if (root) {
        bus.push('tail', `<script type="module" src="${file}"></script>`)
      } else {
        bus.preloadModule(file)
      }
    } else if (file.endsWith('.css')) {
      bus.linkStylesheet(file)
    }
  }

  registerRoute(options: RenderableRoute) {
    this.routes.push(options)
  }
}
