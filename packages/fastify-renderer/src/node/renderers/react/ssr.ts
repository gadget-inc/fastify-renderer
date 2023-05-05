import { ReactElement } from 'react'
import * as _ReactDOMServer from 'react-dom/server'
import { parentPort, workerData } from 'worker_threads'

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

interface RenderArgs {
  renderBase: string
  destination: string
  bootProps: any
  module: any
}

// Presence of `parentPort` suggests
// that this code is running in a Worker
if (parentPort) {
  // Preload each path from `workerData`
  if (!workerData) throw new Error('No Worker Data')
  const { paths } = workerData

  for (const path of paths) {
    require(path)
  }
}

export function staticRender({ bootProps, destination, renderBase, module }: RenderArgs) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { React, ReactDOMServer, Router, RenderBusContext, Layout, Entrypoint } = module

  const app: ReactElement = React.createElement(
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
  // Transofmr hook cannot work
  // for (const hook of hooks) {
  //   if (hook.transform) {
  //     app = hook.transform(app)
  //   }
  // }

  return (ReactDOMServer as typeof _ReactDOMServer).renderToString(app)
}

export function streamingRender({ bootProps, destination, renderBase, module }: RenderArgs) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { React, ReactDOMServer, Router, RenderBusContext, Layout, Entrypoint } = module

  const app: ReactElement = React.createElement(
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
  // Transofmr hook cannot work
  // for (const hook of hooks) {
  //   if (hook.transform) {
  //     app = hook.transform(app)
  //   }
  // }

  return (ReactDOMServer as typeof _ReactDOMServer).renderToStaticNodeStream(app)
}
