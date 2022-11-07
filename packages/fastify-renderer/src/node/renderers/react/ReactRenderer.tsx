import reactRefresh from '@vitejs/plugin-react-refresh'
import path from 'path'
import querystring from 'querystring'
import type { ReactElement } from 'react'
import { URL } from 'url'
import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { normalizePath } from 'vite/dist/node'
import { FastifyRendererPlugin } from '../../Plugin'
import { RenderBus } from '../../RenderBus'
import { wrap } from '../../tracing'
import { FastifyRendererHook } from '../../types'
import { mapFilepathToEntrypointName, unthunk } from '../../utils'
import { Render, RenderableRegistration, Renderer } from '../Renderer'

const CLIENT_ENTRYPOINT_PREFIX = '/@fstr!entrypoint:'
const SERVER_ENTRYPOINT_PREFIX = '/@fstr!server-entrypoint:'

export interface ReactRendererOptions {
  type: 'react'
  mode: 'sync' | 'streaming'
}

const staticLocationHook = (path = '/', { record = false } = {}) => {
  // eslint-disable-next-line prefer-const
  let hook
  const navigate = (to, { replace }: { replace?: boolean } = {}) => {
    if (record) {
      if (replace) {
        hook.history.pop()
      }
      hook.history.push(to)
    }
  }
  hook = () => [path, navigate]
  hook.history = [path]
  return hook
}

export class ReactRenderer implements Renderer {
  static ROUTE_TABLE_ID = '/@fstr!route-table.js'

  viteConfig!: ResolvedConfig
  devServer?: ViteDevServer
  renderables!: RenderableRegistration[]
  tmpdir!: string
  clientModulePath: string

  constructor(readonly plugin: FastifyRendererPlugin, readonly options: ReactRendererOptions) {
    this.clientModulePath = require.resolve('../../../client/react')
  }

  vitePlugins() {
    return [
      reactRefresh(),
      this.routeTableVitePlugin(),
      this.hydrationEntrypointVitePlugin(),
      this.serverEntrypointVitePlugin(),
    ]
  }

  async prepare(renderables: RenderableRegistration[], viteConfig: ResolvedConfig, devServer?: ViteDevServer) {
    this.viteConfig = viteConfig
    this.renderables = renderables
    this.devServer = devServer

    // in production mode, we eagerly require all the endpoints during server boot, so that the first request to the endpoint isn't slow
    // if the service running fastify-renderer is being gracefully restarted, this will block the fastify server from listening until all the code is required, keeping the old server in service a bit longer while this require is done, which is good for users
    if (!this.plugin.devMode) {
      for (const renderable of renderables) {
        await this.loadModule(this.entrypointRequirePathForServer(renderable))
      }
    }
  }

  /** The purpose of adding this function is to allow us to spy on this method, otherwise it isn't available in the class prototype */
  async render<Props>(render: Render<Props>): Promise<void> {
    return this.wrappedRender(render)
  }

  /** Renders a given request and sends the resulting HTML document out with the `reply`. */
  private wrappedRender = wrap('fastify-renderer.render', async <Props,>(render: Render<Props>): Promise<void> => {
    const bus = this.startRenderBus(render)
    const hooks = this.plugin.hooks.map(unthunk)

    try {
      const requirePath = this.entrypointRequirePathForServer(render)

      // we load all the context needed for this render from one `loadModule` call, which is really important for keeping the same copy of React around in all of the different bits that touch it.
      const { React, ReactDOMServer, Router, RenderBusContext, Layout, Entrypoint } = (
        await this.loadModule(requirePath)
      ).default

      const destination = this.stripBasePath(render.request.url, render.base)

      let app: ReactElement = React.createElement(
        RenderBusContext.Provider,
        null,
        React.createElement(
          Router,
          {
            base: render.base,
            hook: staticLocationHook(destination),
          },
          React.createElement(
            Layout,
            {
              isNavigating: false,
              navigationDestination: destination,
              bootProps: render.props,
            },
            React.createElement(Entrypoint, render.props)
          )
        )
      )

      for (const hook of hooks) {
        if (hook.transform) {
          app = hook.transform(app)
        }
      }

      if (this.options.mode == 'streaming') {
        await render.reply.send(this.renderStreamingTemplate(app, bus, ReactDOMServer, render, hooks))
      } else {
        await render.reply.send(this.renderSynchronousTemplate(app, bus, ReactDOMServer, render, hooks))
      }
    } catch (error: unknown) {
      this.devServer?.ssrFixStacktrace(error as Error)
      // let fastify's error handling system figure out what to do with this after fixing the stack trace
      throw error
    }
  })

  /** Given a node-land module id (path), return the build time path to the virtual script to hydrate the render client side */
  public buildVirtualClientEntrypointModuleID(route: RenderableRegistration) {
    const queryParams = {
      layout: route.layout,
      base: route.base,
      ...(route.isImperative && { imperativePathPattern: route.pathPattern, imperativeRenderable: route.renderable }),
    }

    return (
      path.join(CLIENT_ENTRYPOINT_PREFIX, route.renderable, 'hydrate.jsx') + '?' + querystring.stringify(queryParams)
    )
  }

  /** Given a node-land module id (path), return the server run time path to a virtual module to run the server side render */
  public buildVirtualServerEntrypointModuleID(register: RenderableRegistration) {
    return (
      path.join(SERVER_ENTRYPOINT_PREFIX, register.renderable, 'ssr.jsx') +
      '?' +
      querystring.stringify({ layout: register.layout, base: register.base })
    )
  }

  /**
   * Given a concrete, resolvable node-land module id (path), return the client-land path to the script to hydrate the render client side
   * In dev mode, will return a virtual module url that will use use the client side hydration plugin to produce a script around the entrypoint
   * In production, will reference the manifest to find the built module corresponding to the given entrypoint
   */
  public entrypointScriptTagSrcForClient(render: Render) {
    const entrypointName = this.buildVirtualClientEntrypointModuleID(render)
    if (this.plugin.devMode) {
      return path.join(this.plugin.viteBase, entrypointName)
    } else {
      const manifestEntryName = normalizePath(path.relative(this.viteConfig.root, entrypointName))
      const manifestEntry = this.plugin.clientManifest![manifestEntryName]
      if (!manifestEntry) {
        throw new Error(
          `Module id ${render.renderable} was not found in the built assets manifest. Looked for it at ${manifestEntryName} in manifest.json. Was it included in the build?`
        )
      }
      return manifestEntry.file
    }
  }

  /**
   * Given a concrete, resolvable node-land module id (path), return the server-land path to the script to render server side
   * Because we're using vite, we have special server side entrypoints too such that we can't just `require()` an entrypoint, even on the server, we need to a require a file that vite has built where all the copies of React are the same within.
   * In dev mode, will return a virtual module url that will use use the server side render plugin to produce a script around the entrypoint
   */
  public entrypointRequirePathForServer(register: RenderableRegistration) {
    const entrypointName = this.buildVirtualServerEntrypointModuleID(register)
    if (this.plugin.devMode) {
      return entrypointName
    } else {
      const manifestEntry = this.plugin.serverEntrypointManifest![entrypointName]
      if (!manifestEntry) {
        throw new Error(
          `Module id ${register.renderable} was not found in the built server entrypoints manifest. Looked for it at ${entrypointName} in virtual-manifest.json. Was it included in the build?`
        )
      }
      return manifestEntry
    }
  }

  private startRenderBus(render: Render<any>) {
    const bus = new RenderBus()

    // push the script for the react-refresh runtime that vite's plugin normally would
    if (this.plugin.devMode) {
      bus.push('tail', this.reactRefreshScriptTag())
    }

    // push the props for the entrypoint to use when hydrating client side
    bus.push('tail', `<script type="module">window.__FSTR_PROPS=${JSON.stringify(render.props)};</script>`)

    // if we're in development, we just source the entrypoint directly from vite and let the browser do its thing importing all the referenced stuff
    if (this.plugin.devMode) {
      bus.push(
        'tail',
        `<script type="module" src="${path.join(
          this.plugin.assetsHost,
          this.entrypointScriptTagSrcForClient(render)
        )}"></script>`
      )
    } else {
      const entrypointName = this.buildVirtualClientEntrypointModuleID(render)
      const manifestEntryName = normalizePath(path.relative(this.viteConfig.root, entrypointName))
      this.plugin.pushImportTagsFromManifest(bus, manifestEntryName)
    }

    return bus
  }

  private renderStreamingTemplate<Props>(
    app: JSX.Element,
    bus: RenderBus,
    ReactDOMServer: any,
    render: Render<Props>,
    hooks: FastifyRendererHook[]
  ) {
    this.runHeadHooks(bus, hooks)
    // There are not postRenderHead hooks for streaming templates
    // so let's end the head stack
    bus.push('head', null)
    const contentStream = ReactDOMServer.renderToNodeStream(app)
    contentStream.on('end', () => {
      this.runTailHooks(bus, hooks)
    })

    return render.document({
      content: contentStream,
      head: bus.stack('head'),
      tail: bus.stack('tail'),
      props: render.props,
    })
  }

  private renderSynchronousTemplate<Props>(
    app: JSX.Element,
    bus: RenderBus,
    ReactDOMServer: any,
    render: Render<Props>,
    hooks: FastifyRendererHook[]
  ) {
    this.runHeadHooks(bus, hooks)
    const content = ReactDOMServer.renderToString(app)
    this.runPostRenderHeadHooks(bus, hooks)
    this.runTailHooks(bus, hooks)

    return render.document({
      content,
      head: bus.stack('head'),
      tail: bus.stack('tail'),
      props: render.props,
    })
  }

  private runPostRenderHeadHooks(bus: RenderBus, hooks: FastifyRendererHook[]) {
    // Run any heads hooks that might want to push something after the content
    for (const hook of hooks) {
      if (hook.postRenderHeads) {
        bus.push('head', hook.postRenderHeads())
      }
    }
    bus.push('head', null)
  }

  private runHeadHooks(bus: RenderBus, hooks: FastifyRendererHook[]) {
    // Run any heads hooks that might want to push something before the content
    for (const hook of hooks) {
      if (hook.heads) {
        bus.push('head', hook.heads())
      }
    }
  }

  private runTailHooks(bus: RenderBus, hooks: FastifyRendererHook[]) {
    // when we're done rendering the content, run any hooks that might want to push more stuff after the content
    for (const hook of hooks) {
      if (hook.tails) {
        bus.push('tail', hook.tails())
      }
    }
    bus.push('tail', null)
  }

  /** Given a module ID, load it for use within this node process on the server */
  private async loadModule(id: string) {
    if (this.plugin.devMode) {
      return await this.devServer!.ssrLoadModule(id)
    } else {
      const builtPath = path.join(this.plugin.serverOutDir, mapFilepathToEntrypointName(id))
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
          const url = new URL('fstr://' + id)
          const entrypoint = id.replace(CLIENT_ENTRYPOINT_PREFIX, '/@fs/').replace(/\/hydrate\.jsx\?.+$/, '')
          const layout = url.searchParams.get('layout')!
          const base = url.searchParams.get('base')!
          const imperativePathPattern = url.searchParams.get('imperativePathPattern')!
          const imperativeRenderable = url.searchParams.get('imperativeRenderable')!
          const queryParams = {
            base,
            lazy: true,
            ...(imperativeRenderable && { imperativePathPattern, imperativeRenderable }),
          }

          return `
          // client side hydration entrypoint for a particular route generated by fastify-renderer
          import React from 'react'
          import ReactDOM from 'react-dom'
          import { routes } from ${JSON.stringify(
            ReactRenderer.ROUTE_TABLE_ID + '?' + querystring.stringify(queryParams)
          )}
          import { Root } from ${JSON.stringify(this.clientModulePath)}
          import Layout from ${JSON.stringify(layout)}
          import Entrypoint from ${JSON.stringify(entrypoint)}

          ReactDOM.unstable_createRoot(document.getElementById('fstrapp'), {
            hydrate: true
          }).render(<Root
            Layout={Layout}
            Entrypoint={Entrypoint}
            basePath={${JSON.stringify(base)}}
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
          const entrypoint = id.replace(SERVER_ENTRYPOINT_PREFIX, '').replace(/\/ssr\.jsx\?.+$/, '')
          const url = new URL('fstr://' + id)
          const layout = url.searchParams.get('layout')!

          const code = `
          // server side processed entrypoint for a particular route generated by fastify-renderer
          import React from 'react'
          import ReactDOMServer from 'react-dom/server'
          import { Router, RenderBusContext } from ${JSON.stringify(this.clientModulePath)}
          import Layout from ${JSON.stringify(layout)}
          import Entrypoint from ${JSON.stringify(entrypoint)}

          export default {
            React,
            ReactDOMServer,
            Router,
            RenderBusContext,
            Layout,
            Entrypoint
          }
          `

          return code
        }
      },
    }
  }

  /**
   * Produces the route table from all the registered routes to serve to the frontend
   */
  private routeTableVitePlugin(): Plugin {
    // Hacky way to approximate find-my-way's segment precedence -- will not scale very well, but means we don't have to ship all of find-my-way to the browser which is good.
    const routeSortScore = (path: string) => {
      if (path.includes('*')) {
        return 2
      } else if (path.includes(':')) {
        return 1
      } else {
        return 0
      }
    }
    // b before a if greater than 0
    // b=2, a=1 if greater than 0

    // Convert find-my-way route paths to path-to-regexp syntax
    const pathToRegexpify = (path: string) => path.replace('*', ':splat*')

    return {
      name: 'fastify-renderer:react-route-table',
      resolveId(id) {
        if (id.startsWith(ReactRenderer.ROUTE_TABLE_ID)) {
          return id
        }
      },
      load: (id) => {
        if (id.startsWith(ReactRenderer.ROUTE_TABLE_ID)) {
          const url = new URL('fstr://' + id)
          const lazy = !!url.searchParams.get('lazy')!
          const base = url.searchParams.get('base')!
          const imperativePathPattern = url.searchParams.get('imperativePathPattern')
          const imperativeRenderable = url.searchParams.get('imperativeRenderable')

          // We filter out the routes the imperatively renderable routes, which don't have a url property
          // There is no point in having them included in the route table
          const routeableRenderables = this.renderables.filter(
            (route) => route.base == base && route.pathPattern !== undefined
          ) as (RenderableRegistration & { pathPattern: string })[]

          if (imperativePathPattern && imperativeRenderable) {
            const routeObject = Object.assign(
              {},
              this.renderables.find((route) => route.renderable == imperativeRenderable),
              { pathPattern: imperativePathPattern }
            )
            routeableRenderables.push(routeObject)
          }

          routeableRenderables.sort((a, b) => routeSortScore(a.pathPattern) - routeSortScore(b.pathPattern))

          const pathsToModules = routeableRenderables.map((route) => [
            pathToRegexpify(this.stripBasePath(route.pathPattern, base)),
            route.renderable,
          ])

          if (lazy) {
            return `
import { lazy } from "react";
// lazy route table generated by fastify-renderer
export const routes = [
  ${pathsToModules
    .map(([url, component]) => `[${JSON.stringify(url)}, lazy(() => import(${JSON.stringify(component)}))]`)
    .join(',\n')}
  ]
          `
          } else {
            return `
// route table generated by fastify-renderer
${pathsToModules.map(([_url, component], index) => `import mod_${index} from ${JSON.stringify(component)}`).join('\n')}

export const routes = [
  ${pathsToModules.map(([url], index) => `[${JSON.stringify(url)}, mod_${index}]`).join(',\n')}
]`
          }
        }
      },
    }
  }

  private stripBasePath(fullyQualifiedPath: string, base: string) {
    if (fullyQualifiedPath.startsWith(base)) {
      const baseless = fullyQualifiedPath.slice(base.length)
      if (baseless == '') {
        return '/'
      } else {
        return baseless
      }
    } else {
      return fullyQualifiedPath
    }
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
}
