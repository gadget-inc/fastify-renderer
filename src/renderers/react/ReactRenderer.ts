import { RouteOptions } from 'fastify'
import * as React from 'react'
import * as ReactDOMServer from 'react-dom/server'
import { ViteDevServer } from 'vite'
import { FastifyRendererOptions } from '../..'
import { Renderer } from '../Renderer'

export class ReactRenderer implements Renderer {
  routes: RouteOptions[] = []
  layout: string
  document: string

  constructor(readonly options: FastifyRendererOptions, readonly vite: ViteDevServer) {
    this.layout = options.layout || require.resolve('./DefaultLayout')
    this.document = options.document || require.resolve('./DefaultDocument')
  }

  registerRoute(routeOptions) {
    this.routes.push(routeOptions)
  }

  async render<Props>(request, reply, renderableModule: string, props: Props) {
    const clientURL = renderableModule.startsWith('/') ? `/@fs/${renderableModule}` : renderableModule
    const template = await this.vite.transformIndexHtml(
      request.url,
      `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="app"><!-- fastify-app-html --></div>
    <script type="module" src="${clientURL}"></script>
  </body>
</html>`
    )

    const [pageModule, layoutModule] = await Promise.all([
      this.vite.ssrLoadModule(renderableModule),
      this.vite.ssrLoadModule(this.layout),
    ])

    const Layout = layoutModule.default as React.FunctionComponent
    const Page = pageModule.default as React.FunctionComponent<Props>

    const result = ReactDOMServer.renderToString(React.createElement(Layout, {}, React.createElement(Page, props)))

    await reply.send(
      template.replace(`<!-- fastify-app-html -->`, result).replace(
        `<!-- fastify-scripts -->`,
        `
          <script type="module">window.__FSVT_PROPS = ${JSON.stringify(props)};</script>
        `
      )
    )
  }
}
