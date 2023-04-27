import { ReactElement } from 'react'

import { parentPort, workerData } from 'worker_threads'

// if (!isMainThread) throw new Error('Worker spawned in Main thread')

const { modulePath, renderBase, destination, renderProps, mode } = workerData as {
  modulePath: string
  renderBase: string
  destination: string
  renderProps: Record<string, any>
  mode: string
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { React, ReactDOMServer, Router, RenderBusContext, Layout, Entrypoint } = require(modulePath).default

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
        bootProps: renderProps,
      },
      React.createElement(Entrypoint, renderProps)
    )
  )
)

// Transofmr hook cannot work
// for (const hook of hooks) {
//   if (hook.transform) {
//     app = hook.transform(app)
//   }
// }

if (mode == 'streaming') {
  //return this.renderStreamingTemplate(app, bus, ReactDOMServer, render, hooks)
} else {
  const content = ReactDOMServer.renderToString(app)
  if (!parentPort) throw new Error('Missing parentPort')

  parentPort.postMessage(content)
}
