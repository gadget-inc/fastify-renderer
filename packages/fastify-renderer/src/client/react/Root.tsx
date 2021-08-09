import React, { useEffect, useState } from 'react'
import { Route, Router, Switch, useLocation } from 'wouter'
import { usePromise } from './fetcher'
import { useNavigationDetails, useTransitionLocation } from './locationHook'
import { matcher } from './matcher'

export interface LayoutProps {
  isNavigating: boolean
  navigationDestination: string
  children: React.ReactNode
}

const RouteTable = (props: { Layout: React.FunctionComponent<LayoutProps>; routes: JSX.Element[] }) => {
  const [isNavigating, navigationDestination] = useNavigationDetails()

  return (
    <props.Layout isNavigating={isNavigating} navigationDestination={navigationDestination}>
      <Switch>{props.routes}</Switch>
    </props.Layout>
  )
}

export function Root<BootProps>(props: {
  Entrypoint: React.FunctionComponent<BootProps>
  Layout: React.FunctionComponent<LayoutProps>
  bootProps: BootProps
  basePath: string
  routes: [string, React.FunctionComponent<any>][]
}) {
  const [firstRenderComplete, setFirstRenderComplete] = useState(false)
  useEffect(() => setFirstRenderComplete(true), [])
  const routes: JSX.Element[] = [
    ...props.routes.map(([route, Component]) => (
      <Route path={route} key={route}>
        {(params) => {
          const [location] = useLocation()

          const payload = usePromise<{ props: Record<string, any> }>(props.basePath + location, async () => {
            if (!firstRenderComplete) {
              return { props: props.bootProps }
            } else {
              return (
                await fetch(props.basePath + location, {
                  method: 'GET',
                  headers: {
                    Accept: 'application/json',
                  },
                  credentials: 'same-origin',
                })
              ).json()
            }
          })

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

  return (
    <Router base={props.basePath} hook={useTransitionLocation as any} matcher={matcher}>
      <RouteTable routes={routes} Layout={props.Layout} />
    </Router>
  )
}
