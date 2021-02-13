import { Readable } from 'stream'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { RouteOptions } from 'fastify'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { ViteDevServer } from 'vite'
import { ResolvedOptions } from '../..'
import { Render, Renderer } from '../Renderer'
import { DefaultDocumentTemplate } from '../../DocumentTemplate'

export class ReactRenderer implements Renderer {
  vite!: ViteDevServer
  routes!: RouteOptions[]
  tmpdir!: string
  entrypoints: Record<string, string> = {}

  constructor(readonly options: ResolvedOptions) {}

  vitePlugins() {
    return [reactRefresh(), this.entrypointVitePlugin()]
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

      console.warn(layoutModule)
      const Layout = layoutModule.default as React.FunctionComponent
      const Entrypoint = entrypointModule.default as React.FunctionComponent<Props>

      let app = (
        <Layout>
          <Entrypoint {...render.props} />
        </Layout>
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
    const scripts = new Readable()
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    scripts._read = () => {}

    // push the script for the react-refresh runtime that vite's plugin normally would
    // push the props for the entrypoint to use when hydrating client side
    scripts.push(`
      <script type="module">
        import RefreshRuntime from "/@react-refresh"
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <script type="module">window.__FSVT_PROPS=${JSON.stringify(render.props)};</script>
      <script type="module" src="/@fstr/${render.renderable}"></script>
    `)

    const content = ReactDOMServer.renderToNodeStream(app)

    content.on('end', () => {
      // when we're done rendering the content, run any hooks that might want to push more content after the content
      for (const hook of this.options.hooks) {
        if (hook.scripts) {
          scripts.push(hook.scripts())
        }
      }
      scripts.push(null)
    })

    return DefaultDocumentTemplate({ content, scripts, props: render.props })
  }

  /**
   * Produces a bit of code we pass through Vite to import the specific entrypoint for a route
   * Served to the client to rehydrate the server rendered code
   */
  private entrypointVitePlugin() {
    return {
      name: 'fastify-renderer-react',
      resolveId(id) {
        if (id.startsWith('/@fstr/')) {
          return id
        }
      },
      load: (id) => {
        if (id.startsWith('/@fstr/')) {
          return `
          import 'vite/dynamic-import-polyfill'
          import React from 'react'
          import ReactDOM from 'react-dom'
          import Layout from ${JSON.stringify(this.options.layout)}
          import Entrypoint from ${JSON.stringify(id.replace('/@fstr/', '/@fs/'))}

          ReactDOM.hydrate(
            <Layout>
              <Entrypoint {...window.__FSVT_PROPS} />
            </Layout>,
            document.getElementById('fstrapp')
          )
        `
        }
      },
    }
  }
}
