import React, { useEffect, useState } from 'react'
import { Route, Router, Switch, useLocation } from 'wouter'
import { usePromise } from './fetcher'
import { useTransitionLocation } from './locationHook'

export interface LayoutProps {
  isNavigating: boolean
  children: React.ReactNode
}

const RouteTable = (props: { Layout: React.FunctionComponent<LayoutProps>; routes: JSX.Element[] }) => {
  const isNavigating = (useLocation() as any)[2] as boolean // we hack in a third return value from our custom location hook to get at the transition current state

  return (
    <props.Layout isNavigating={isNavigating}>
      <Switch>{props.routes}</Switch>
    </props.Layout>
  )
}

export function Root<BootProps>(props: {
  Entrypoint: React.FunctionComponent<BootProps>
  Layout: React.FunctionComponent<LayoutProps>
  bootProps: BootProps
  basePath: string
  routes: Record<string, React.FunctionComponent<any>>
}) {
  const [firstRenderComplete, setFirstRenderComplete] = useState(false)

  useEffect(() => setFirstRenderComplete(true))

  const routes: JSX.Element[] = [
    ...Object.entries(props.routes).map(([route, Component]) => (
      <Route path={route} key={route}>
        {(params) => {
          const [location] = useLocation()

          const payload = usePromise<{ props: Record<string, any> }>(props.basePath + location, async () =>
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

          // navigate to the anchor in the url after rendering
          useEffect(() => {
            if (window.location.hash) {
              document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
            }
          }, [location])

          return <Component params={params} {...payload.props} />
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
    <Router base={props.basePath} hook={useTransitionLocation as any}>
      <RouteTable routes={routes} Layout={props.Layout} />
    </Router>
  )
}
