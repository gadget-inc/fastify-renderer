import React, { useEffect, useState } from 'react'
import { Switch, Route, useLocation, Router } from 'wouter'
import { usePromise } from './fetcher'

export const Root = <BootProps,>(props: {
  Entrypoint: React.FunctionComponent<BootProps>
  Layout: React.FunctionComponent
  bootProps: BootProps
  basePath: string
  routes: Record<string, React.FunctionComponent<any>>
}) => {
  const [firstRenderComplete, setFirstRenderComplete] = useState(false)

  useEffect(() => setFirstRenderComplete(true))

  const routes: JSX.Element[] = [
    ...Object.entries(props.routes).map(([route, Component]) => (
      <Route path={route} key={route}>
        {(params) => {
          const [location] = useLocation()

          const payload = usePromise(props.basePath + location, async () =>
            (
              await fetch(props.basePath + location, {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                },
                credentials: 'same-origin',
              })
            ).json()
          )

          return <Component params={params} {...(payload as any).props} />
        }}
      </Route>
    )),
  ]

  if (!firstRenderComplete) {
    routes.unshift(
      <Route key="first-render-root">
        <props.Entrypoint {...props.bootProps} />
      </Route>
    )
  }

  return (
    <Router base={props.basePath}>
      <props.Layout>
        <Switch>{routes}</Switch>
      </props.Layout>
    </Router>
  )
}
