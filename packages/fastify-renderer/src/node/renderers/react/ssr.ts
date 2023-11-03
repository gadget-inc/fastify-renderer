import { ReactElement } from 'react'
import * as _ReactDOMServer from 'react-dom/server'
import { parentPort, workerData } from 'worker_threads'
import { RenderBus } from '../../RenderBus'
import { FastifyRendererHook, RenderInput } from '../../types'
import { unthunk } from '../../utils'

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

interface RenderArgs extends RenderInput {
  module: any
  bus: RenderBus
  mode: 'sync' | 'streaming'
}

// Presence of `parentPort` suggests
// that this code is running in a Worker
if (parentPort) {
  // Preload each path from `workerData`
  if (!workerData) throw new Error('No Worker Data')
  const { paths } = workerData

  for (const path of paths) {
    require(path as string)
  }
}

export function staticRender({ mode, bus, bootProps, destination, renderBase, module, hooks }: RenderArgs) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { React, ReactDOMServer, Router, RenderBusContext, Layout, Entrypoint } = module
  const thunkHooks = hooks.map((hook) => require(hook)!.default).map(unthunk) as FastifyRendererHook[]

  for (const { heads } of thunkHooks) {
    if (heads) {
      bus.push('head', heads())
    }
  }
  let app: ReactElement = React.createElement(
    RenderBusContext.Provider,
    null,
    React.createElement(
      Router,
      {
        base: renderBase,
        hook: staticLocationHook(destination),
      },
      React.createElement(
        Layout,
        {
          isNavigating: false,
          navigationDestination: destination,
          bootProps: bootProps,
        },
        React.createElement(Entrypoint, bootProps)
      )
    )
  )

  for (const { transform } of thunkHooks) {
    if (transform) {
      app = transform(app)
    }
  }

  for (const { tails } of thunkHooks) {
    if (tails) {
      bus.push('tail', tails())
    }
  }
  bus.push('tail', null)

  if (mode === 'streaming') {
    ;(ReactDOMServer as typeof _ReactDOMServer).renderToStaticNodeStream(app).pipe(bus.stack('content'))
  } else {
    const content = (ReactDOMServer as typeof _ReactDOMServer).renderToString(app)
    bus.push('content', content)
    bus.push('content', null)

    for (const { postRenderHeads } of thunkHooks) {
      if (postRenderHeads) {
        bus.push('head', postRenderHeads())
      }
    }
  }

  bus.push('head', null)
}
