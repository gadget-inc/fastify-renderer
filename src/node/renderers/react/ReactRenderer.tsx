import path from 'path'
import { Router } from 'wouter'
import staticLocationHook from 'wouter/static-location'
import { Readable } from 'stream'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { RouteOptions } from 'fastify'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { Plugin, ViteDevServer, ResolvedConfig } from 'vite'
import { ResolvedOptions } from '../../types'
import { Render, Renderer } from '../Renderer'
import { DefaultDocumentTemplate } from '../../DocumentTemplate'
import { escapeRegex, mapFilepathToEntrypointName } from '../../utils'
import { normalizePath } from 'vite/dist/node'

const ENTRYPOINT_PREFIX = '/@fstr!entrypoint:'

export class ReactRenderer implements Renderer {
  static ROUTE_TABLE_ID = '/@fstr!route-table.js'
  static LAZY_ROUTE_TABLE_ID = '/@fstr!lazy-route-table.js'

  viteConfig!: ResolvedConfig
  devServer?: ViteDevServer
  routes!: RouteOptions[]
  tmpdir!: string
  basePathRegexp: RegExp

  constructor(readonly options: ResolvedOptions) {
    this.basePathRegexp = new RegExp(`^${escapeRegex(this.options.base)}`)
  }

  vitePlugins() {
    return [reactRefresh(), this.routeTableVitePlugin(), this.hydrationEntrypointVitePlugin()]
  }

  async prepare(routes: RouteOptions[], viteConfig: ResolvedConfig, devServer?: ViteDevServer) {
    this.viteConfig = viteConfig
    this.routes = routes
    this.devServer = devServer
  }

  /** Renders a given request and sends the resulting HTML document out with the `reply`. */
  async render<Props>(render: Render<Props>) {
    try {
      const [entrypointModule, layoutModule] = await Promise.all([
        this.loadModule(render.renderable),
        this.loadModule(this.options.layout),
      ])

      const Layout = layoutModule.default as React.FunctionComponent
      const Entrypoint = entrypointModule.default as React.FunctionComponent<Props>

      let app = (
        <Router base={this.options.base} hook={staticLocationHook(this.stripBasePath(render.request.url))}>
          <Layout>
            <Entrypoint {...render.props} />
          </Layout>
        </Router>
      )

      for (const hook of this.options.hooks) {
        if (hook.transform) {
          app = hook.transform(app)
        }
      }

      await render.reply.send(this.renderTemplate(app, render))
    } catch (error) {
      this.devServer?.ssrFixStacktrace(error)
      // let fastify's error handling system figure out what to do with this after fixing the stack trace
      throw error
    }
  }

  /** Given a node-land module id (path), return the client-land path to the script to hydrate the render client side */
  public clientEntrypointModuleURL(id: string) {
    const entrypointName = this.buildEntrypointModuleURL(id)
    if (this.options.devMode) {
      return entrypointName
    } else {
      const manifestEntryName = normalizePath(path.relative(this.viteConfig.root, entrypointName))
      const manifestEntry = this.options.clientManifest![manifestEntryName]
      if (!manifestEntry) {
        throw new Error(
          `Module id ${id} was not found in the built assets manifest. Looked for it at ${manifestEntryName}. Was it included in the build?`
        )
      }
      return manifestEntry.file
    }
  }

  /** Given a node-land module id (path), return the build time path to the script to hydrate the render client side */
  public buildEntrypointModuleURL(id: string) {
    return path.join(ENTRYPOINT_PREFIX, id, 'hydrate.jsx')
  }

  private renderTemplate<Props>(app: JSX.Element, render: Render<Props>) {
    const scriptsStream = new Readable()
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    scriptsStream._read = () => {}

    // push the script for the react-refresh runtime that vite's plugin normally would
    if (this.options.devMode) {
      scriptsStream.push(`
      <script type="module">
        import RefreshRuntime from "${path.join(this.viteConfig.base, '@react-refresh')}"
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>`)
    }

    // push the props for the entrypoint to use when hydrating client side
    scriptsStream.push(`
      <script type="module">window.__FSTR_PROPS=${JSON.stringify(render.props)};</script>
      <script type="module" src="${path.join(
        this.options.base,
        this.clientEntrypointModuleURL(render.renderable)
      )}"></script>
    `)

    const contentStream = ReactDOMServer.renderToNodeStream(app)

    contentStream.on('end', () => {
      // when we're done rendering the content, run any hooks that might want to push more content after the content
      for (const hook of this.options.hooks) {
        if (hook.scripts) {
          scriptsStream.push(hook.scripts())
        }
      }
      scriptsStream.push(null)
    })

    return DefaultDocumentTemplate({ content: contentStream, scripts: scriptsStream, props: render.props })
  }

  /** Given a module ID, load it for use within this node process on the server */
  private async loadModule(id: string) {
    if (this.options.devMode) {
      return await this.devServer!.ssrLoadModule(id)
    } else {
      const builtPath = path.join(this.options.outDir, 'server', mapFilepathToEntrypointName(id))
      return require(builtPath)
    }
  }

  /**
   * Maps the internal Produces a bit of code we pass through Vite to import the specific hydration entrypoint for a route
   * Served to the client to rehydrate the server rendered code
   */
  private hydrationEntrypointVitePlugin(): Plugin {
    return {
      name: 'fastify-renderer:react-entrypoints',
      enforce: 'pre',
      resolveId(id) {
        if (id.startsWith(ENTRYPOINT_PREFIX)) {
          return id
        }
      },
      load: (id) => {
        if (id.startsWith(ENTRYPOINT_PREFIX)) {
          const importURL = id.replace(ENTRYPOINT_PREFIX, '/@fs/').replace(/\/hydrate\.jsx$/, '')
          const layoutURL = this.options.layout

          return `
          // client side hydration entrypoint for a particular route generated by fastify-renderer
          import 'vite/dynamic-import-polyfill'
          import React from 'react'
          import ReactDOM from 'react-dom'
          import { routes } from '/@fstr!route-table.js'
          import { Root } from 'fastify-renderer/dist/client/react'
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
}
