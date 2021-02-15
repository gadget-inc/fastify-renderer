import { Router } from 'wouter'
import staticLocationHook from 'wouter/static-location'
import { Readable } from 'stream'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { RouteOptions } from 'fastify'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { Plugin, ViteDevServer } from 'vite'
import { ResolvedOptions } from '../../types'
import { Render, Renderer } from '../Renderer'
import { DefaultDocumentTemplate } from '../../DocumentTemplate'

export class ReactRenderer implements Renderer {
  static ROUTE_TABLE_ID = '/@fstr!route-table.js'
  static LAZY_ROUTE_TABLE_ID = '/@fstr!lazy-route-table.js'

  vite!: ViteDevServer
  routes!: RouteOptions[]
  tmpdir!: string
  entrypoints: Record<string, string> = {}

  constructor(readonly options: ResolvedOptions) {}

  vitePlugins() {
    return [reactRefresh(), this.routeTableVitePlugin(), this.entrypointVitePlugin()]
  }

  async prepare(routes: RouteOptions[], vite: ViteDevServer) {
    this.vite = vite
    this.routes = routes
  }

  async render<Props>(render: Render<Props>) {
    try {
      const [entrypointModule, layoutModule] = await Promise.all([
        this.vite.ssrLoadModule(render.renderable),
        this.vite.ssrLoadModule(this.options.layout),
      ])

      const Layout = layoutModule.default as React.FunctionComponent
      const Entrypoint = entrypointModule.default as React.FunctionComponent<Props>

      let app = (
        <Router hook={staticLocationHook(render.request.url)}>
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
      this.vite.ssrFixStacktrace(error)
      // let fastify's error handling system figure out what to do with this after fixing the stack trace
      throw error
    }
  }

  private renderTemplate<Props>(app: JSX.Element, render: Render<Props>) {
    const scriptsStream = new Readable()
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    scriptsStream._read = () => {}

    // push the script for the react-refresh runtime that vite's plugin normally would
    // push the props for the entrypoint to use when hydrating client side
    scriptsStream.push(`
      <script type="module">
        import RefreshRuntime from "/@react-refresh"
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <script type="module">window.__FSTR_PROPS=${JSON.stringify(render.props)};</script>
      <script type="module" src="/@fstr/${render.renderable}/entrypoint.jsx"></script>
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

  /**
   * Produces a bit of code we pass through Vite to import the specific entrypoint for a route
   * Served to the client to rehydrate the server rendered code
   */
  private entrypointVitePlugin(): Plugin {
    return {
      name: 'fastify-renderer-react-entrypoints',
      resolveId(id) {
        if (id.startsWith('/@fstr/') && id.endsWith('entrypoint.jsx')) {
          return id
        }
      },
      load: (id) => {
        if (id.startsWith('/@fstr/') && id.endsWith('entrypoint.jsx')) {
          const importURL = id.replace('/@fstr/', '/@fs/').replace(/\/entrypoint\.jsx$/, '')
          const layoutURL = this.options.layout

          return `
          // client side entrypoint for a particular route generated by fastify-renderer
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
      name: 'fastify-renderer-react-route-table',
      resolveId(id) {
        if (id == ReactRenderer.ROUTE_TABLE_ID || id == ReactRenderer.LAZY_ROUTE_TABLE_ID) {
          return id
        }
      },
      load: (id) => {
        if (id == ReactRenderer.ROUTE_TABLE_ID || id == ReactRenderer.LAZY_ROUTE_TABLE_ID) {
          const pathsToModules = this.routes.map((route) => [route.url, route.render!])
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
}
