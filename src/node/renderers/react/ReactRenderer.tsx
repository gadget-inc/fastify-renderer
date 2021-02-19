import reactRefresh from '@vitejs/plugin-react-refresh'
import { RouteOptions } from 'fastify'
import path from 'path'
import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { normalizePath } from 'vite/dist/node'
import staticLocationHook from 'wouter/static-location'
import { DefaultDocumentTemplate } from '../../DocumentTemplate'
import { FastifyRendererPlugin } from '../../Plugin'
import { RenderBus } from '../../RenderBus'
import { escapeRegex, mapFilepathToEntrypointName } from '../../utils'
import { Render, Renderer } from '../Renderer'

const CLIENT_ENTRYPOINT_PREFIX = '/@fstr!entrypoint:'
const SERVER_ENTRYPOINT_PREFIX = '/@fstr!server-entrypoint:'

export interface ReactRendererOptions {
  type: 'react'
  mode: 'sync' | 'streaming'
}

export class ReactRenderer implements Renderer {
  static ROUTE_TABLE_ID = '/@fstr!route-table.js'
  static LAZY_ROUTE_TABLE_ID = '/@fstr!lazy-route-table.js'

  viteConfig!: ResolvedConfig
  devServer?: ViteDevServer
  routes!: RouteOptions[]
  tmpdir!: string
  basePathRegexp: RegExp
  React!: any
  ReactDOMServer!: any
  Client!: any

  constructor(readonly plugin: FastifyRendererPlugin, readonly options: ReactRendererOptions) {
    this.basePathRegexp = new RegExp(`^${escapeRegex(this.plugin.base)}`)
  }

  vitePlugins() {
    return [
      reactRefresh(),
      this.routeTableVitePlugin(),
      this.hydrationEntrypointVitePlugin(),
      this.serverEntrypointVitePlugin(),
    ]
  }

  async prepare(routes: RouteOptions[], viteConfig: ResolvedConfig, devServer?: ViteDevServer) {
    this.viteConfig = viteConfig
    this.routes = routes
    this.devServer = devServer
  }

  /** Renders a given request and sends the resulting HTML document out with the `reply`. */
  async render<Props>(render: Render<Props>) {
    const bus = this.startRenderBus(render)

    try {
      // we load all the context needed for this render from one `loadModule` call, which is really important for keeping the same copy of React around in all of the different bits that touch it.
      const { React, ReactDOMServer, Router, Layout, Entrypoint } = (
        await this.loadModule(this.buildServerEntrypointModuleURL(render.renderable))
      ).default

      let app = (
        <RenderBus.Context.Provider value={bus}>
          <Router base={this.plugin.base} hook={staticLocationHook(this.stripBasePath(render.request.url))}>
            <Layout>
              <Entrypoint {...render.props} />
            </Layout>
          </Router>
        </RenderBus.Context.Provider>
      )

      for (const hook of this.plugin.hooks) {
        if (hook.transform) {
          app = hook.transform(app)
        }
      }

      if (this.options.mode == 'streaming') {
        await render.reply.send(this.renderStreamingTemplate(app, bus, ReactDOMServer, render))
      } else {
        await render.reply.send(this.renderSynchronousTemplate(app, bus, ReactDOMServer, render))
      }
    } catch (error) {
      // this.devServer?.ssrFixStacktrace(error)
      // let fastify's error handling system figure out what to do with this after fixing the stack trace
      throw error
    }
  }

  /** Given a node-land module id (path), return the build time path to the script to hydrate the render client side */
  public buildClientEntrypointModuleURL(id: string) {
    return path.join(CLIENT_ENTRYPOINT_PREFIX, id, 'hydrate.jsx')
  }

  /** Given a node-land module id (path), return the server run time path to a module to run the server side render*/
  public buildServerEntrypointModuleURL(id: string) {
    return path.join(SERVER_ENTRYPOINT_PREFIX, id, 'ssr.jsx')
  }

  private startRenderBus(render: Render<any>) {
    const bus = new RenderBus()

    // push the script for the react-refresh runtime that vite's plugin normally would
    if (this.plugin.devMode) {
      bus.push('tail', this.reactRefreshScriptTag())
    }

    // push the props for the entrypoint to use when hydrating client side
    bus.push('tail', `<script type="module">window.__FSTR_PROPS=${JSON.stringify(render.props)};</script>`)

    const entrypointName = this.buildClientEntrypointModuleURL(render.renderable)
    // if we're in development, we just source the entrypoint directly from vite and let the browser do its thing importing all the referenced stuff
    if (this.plugin.devMode) {
      bus.push(
        'tail',
        `<script type="module" src="${path.join(
          this.plugin.assetsHost,
          this.plugin.base,
          this.clientEntrypointModuleURL(render.renderable)
        )}"></script>`
      )
    } else {
      const manifestEntryName = normalizePath(path.relative(this.viteConfig.root, entrypointName))
      this.plugin.pushImportTagsFromManifest(bus, manifestEntryName)
    }

    return bus
  }

  private renderStreamingTemplate<Props>(app: JSX.Element, bus: RenderBus, ReactDOMServer: any, render: Render<Props>) {
    const contentStream = ReactDOMServer.renderToNodeStream(app)

    contentStream.on('end', () => {
      this.runHooks(bus)
    })

    return DefaultDocumentTemplate({
      content: contentStream,
      head: bus.stack('head').join('\n'),
      tail: bus.stack('tail').join('\n'),
      props: render.props,
    })
  }

  private renderSynchronousTemplate<Props>(
    app: JSX.Element,
    bus: RenderBus,
    ReactDOMServer: any,
    render: Render<Props>
  ) {
    const content = ReactDOMServer.renderToString(app)
    this.runHooks(bus)

    return DefaultDocumentTemplate({
      content,
      head: bus.stack('head').join('\n'),
      tail: bus.stack('tail').join('\n'),
      props: render.props,
    })
  }

  private runHooks(bus: RenderBus) {
    // when we're done rendering the content, run any hooks that might want to push more content after the content
    for (const hook of this.plugin.hooks) {
      if (hook.tails) {
        bus.push('tail', hook.tails())
      }
      if (hook.heads) {
        bus.push('head', hook.heads())
      }
    }
  }

  /** Given a module ID, load it for use within this node process on the server */
  private async loadModule(id: string) {
    if (this.plugin.devMode) {
      return await this.devServer!.ssrLoadModule(id)
    } else {
      const builtPath = path.join(this.plugin.outDir, 'server', mapFilepathToEntrypointName(id))
      return require(builtPath)
    }
  }

  /**
   * A vite/rollup plugin that provides a virtual module to run client side React hydration for a specific route & entrypoint
   * Served to the client to rehydrate the server rendered code
   */
  private hydrationEntrypointVitePlugin(): Plugin {
    return {
      name: 'fastify-renderer:react-client-entrypoints',
      enforce: 'pre',
      resolveId(id) {
        if (id.startsWith(CLIENT_ENTRYPOINT_PREFIX)) {
          return id
        }
      },
      load: (id) => {
        if (id.startsWith(CLIENT_ENTRYPOINT_PREFIX)) {
          const importURL = id.replace(CLIENT_ENTRYPOINT_PREFIX, '/@fs/').replace(/\/hydrate\.jsx$/, '')
          const layoutURL = this.plugin.layout

          return `
          // client side hydration entrypoint for a particular route generated by fastify-renderer
          import 'vite/dynamic-import-polyfill'
          import React from 'react'
          import ReactDOM from 'react-dom'
          import { routes } from '/@fstr!route-table.js'
          import { Root } from 'fastify-renderer/client/react'
          import Layout from ${JSON.stringify(layoutURL)}
          import Entrypoint from ${JSON.stringify(importURL)}

          ReactDOM.unstable_createRoot(document.getElementById('fstrapp'), {
            hydrate: true
          }).render(<Root
            Layout={Layout}
            Entrypoint={Entrypoint}
            basePath={${JSON.stringify(this.viteConfig.base.slice(0, -1))}}
            routes={routes}
            bootProps={window.__FSTR_PROPS}
          />)
        `
        }
      },
    }
  }

  /**
   * A vite/rollup plugin that provides a virtual module to run the server side react render for a specific route & entrypoint
   * Its important that every module that the entrypoint and layout touch are eventually imported by this file so that there is exactly one copy of React referenced by all of the modules.
   */
  private serverEntrypointVitePlugin(): Plugin {
    return {
      name: 'fastify-renderer:react-server-entrypoints',
      enforce: 'pre',
      resolveId(id) {
        if (id.startsWith(SERVER_ENTRYPOINT_PREFIX)) {
          return id
        }
      },
      load: (id) => {
        if (id.startsWith(SERVER_ENTRYPOINT_PREFIX)) {
          const importURL = id.replace(SERVER_ENTRYPOINT_PREFIX, '').replace(/\/ssr\.jsx$/, '')
          const layoutURL = this.plugin.layout

          return `
          // server side processed entrypoint for a particular route generated by fastify-renderer
          import React from 'react'
          import ReactDOMServer from 'react-dom/server'
          import { Router } from 'fastify-renderer/client/react'
          import Layout from ${JSON.stringify(layoutURL)}
          import Entrypoint from ${JSON.stringify(importURL)}

          export default {
            React,
            ReactDOMServer,
            Router,
            Layout,
            Entrypoint
          }
          `
        }
      },
    }
  }

  /**
   * Produces the route table from all the registered routes to serve to the frontend
   */
  private routeTableVitePlugin(): Plugin {
    return {
      name: 'fastify-renderer:react-route-table',
      resolveId(id) {
        if (id == ReactRenderer.ROUTE_TABLE_ID || id == ReactRenderer.LAZY_ROUTE_TABLE_ID) {
          return id
        }
      },
      load: (id) => {
        if (id == ReactRenderer.ROUTE_TABLE_ID || id == ReactRenderer.LAZY_ROUTE_TABLE_ID) {
          const pathsToModules = this.routes.map((route) => [this.stripBasePath(route.url), route.render!])

          if (id == ReactRenderer.LAZY_ROUTE_TABLE_ID) {
            return `
import { lazy } from "react";
// lazy route table generated by fastify-renderer
export const routes = {
  ${pathsToModules
    .map(([url, component]) => `${JSON.stringify(url)}: lazy(() => import(${JSON.stringify(component)}))`)
    .join(',\n')}
}
          `
          } else {
            return `
// route table generated by fastify-renderer
${pathsToModules.map(([_url, component], index) => `import mod_${index} from ${JSON.stringify(component)}`).join('\n')}

export const routes = {
  ${pathsToModules.map(([url], index) => `${JSON.stringify(url)}: mod_${index}`).join(',\n')}
}`
          }
        }
      },
    }
  }

  private stripBasePath(path: string) {
    return path.replace(this.basePathRegexp, '/')
  }

  private reactRefreshScriptTag() {
    return `<script type="module">
      import RefreshRuntime from "${path.join(this.viteConfig.base, '@react-refresh')}"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>`
  }

  /** Given a node-land module id (path), return the client-land path to the script to hydrate the render client side */
  public clientEntrypointModuleURL(id: string) {
    const entrypointName = this.buildClientEntrypointModuleURL(id)
    if (this.plugin.devMode) {
      return entrypointName
    } else {
      const manifestEntryName = normalizePath(path.relative(this.viteConfig.root, entrypointName))
      const manifestEntry = this.plugin.clientManifest![manifestEntryName]
      if (!manifestEntry) {
        throw new Error(
          `Module id ${id} was not found in the built assets manifest. Looked for it at ${manifestEntryName}. Was it included in the build?`
        )
      }
      return manifestEntry.file
    }
  }
}
