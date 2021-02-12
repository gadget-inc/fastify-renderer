import reactRefresh from '@vitejs/plugin-react-refresh'
import { RouteOptions } from 'fastify'
import { Readable } from 'stream'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { ViteDevServer } from 'vite'
import { FastifyRendererOptions } from '../..'
import { Render, Renderer } from '../Renderer'
import { RenderBus } from './RenderBus'

const TEMPLATE_SIGIL = `<!-- fastify-app-html -->`

export enum ReactRenderMode {
  Streaming = 'streaming',
  FullPass = 'full-pass',
}

export class ReactRenderer implements Renderer {
  layout: string
  document: string
  mode: ReactRenderMode
  vite!: ViteDevServer
  routes!: RouteOptions[]
  tmpdir!: string
  entrypoints: Record<string, string> = {}

  constructor(readonly options: FastifyRendererOptions) {
    this.layout = options.layout || require.resolve('./DefaultLayout')
    this.document = options.document || require.resolve('./DefaultDocument')
    this.mode = ReactRenderMode.Streaming
  }

  vitePlugins() {
    return [reactRefresh(), this.entrypointVitePlugin()]
  }

  async prepare(routes: RouteOptions[], vite: ViteDevServer) {
    this.vite = vite
    this.routes = routes
  }

  async render<Props>(render: Render<Props>) {
    const template = await this.vite.transformIndexHtml(
      render.request.url,
      `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="fstrapp">${TEMPLATE_SIGIL}</div>
    <script type="module" src="/@fstr/${render.renderable}"></script>
    <script>window.__FSVT_PROPS=${JSON.stringify(render.props)};</script>
  </body>
</html>`
    )

    try {
      const [pageModule, layoutModule] = await Promise.all([
        this.vite.ssrLoadModule(render.renderable),
        this.vite.ssrLoadModule(this.layout),
      ])

      const Layout = layoutModule.default as React.FunctionComponent
      const Page = pageModule.default as React.FunctionComponent<Props>
      const bus = new RenderBus()

      const app = (
        <RenderBus.context.Provider value={bus}>
          <Layout>
            <Page {...render.props} />
          </Layout>
        </RenderBus.context.Provider>
      )

      if (this.mode == ReactRenderMode.Streaming) {
        await this.streamingRender(template, app, render)
      } else {
        await this.fullPassRender(template, app, render)
      }
    } catch (error) {
      this.vite.ssrFixStacktrace(error)
      // let fastify's error handling system figure out what to do with this after fixing the stack trace
      throw error
    }
  }

  private async fullPassRender<Props>(template: string, app: JSX.Element, render: Render<Props>) {
    const result = ReactDOMServer.renderToString(app)

    await render.reply.send(template.replace(TEMPLATE_SIGIL, result))
  }

  private async streamingRender<Props>(template: string, app: JSX.Element, render: Render<Props>) {
    await render.reply.send(Readable.from(this.generateRenderStream(template, app, render)))
  }

  private generateRenderStream = async function* <Props>(template: string, app: JSX.Element, render: Render<Props>) {
    const [preamble, postamble] = template.split(TEMPLATE_SIGIL)
    yield preamble
    for await (const chunk of ReactDOMServer.renderToNodeStream(app)) {
      yield chunk
    }
    yield postamble
  }

  // private unusedPropsFillerThing<Props>(str: string, render: Render<Props>) {
  //   return str.replace(
  //     `<!-- fastify-scripts -->`,
  //     `
  //       <script>window.__FSVT_PROPS=${JSON.stringify(render.props)};</script>
  //     `
  //   )
  // }

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
          import React from 'react'
          import ReactDOM from 'react-dom'
          import Layout from ${JSON.stringify(this.layout)}
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
