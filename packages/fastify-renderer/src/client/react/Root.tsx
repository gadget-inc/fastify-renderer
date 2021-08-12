import React, { useEffect, useMemo } from 'react'
import { Route, Router, Switch, useLocation } from 'wouter'
import { usePromise } from './fetcher'
import { useNavigationDetails, useTransitionLocation } from './locationHook'
import { matcher } from './matcher'

export interface LayoutProps {
  isNavigating: boolean
  navigationDestination: string
  children: React.ReactNode
}

function RouteTable<BootProps>(props: {
  Entrypoint: React.FunctionComponent<BootProps>
  Layout: React.FunctionComponent<LayoutProps>
  bootProps: BootProps
  basePath: string
  routes: [string, React.FunctionComponent<any>][]
}) {
  useEffect(() => {
    if (typeof window != 'undefined') {
      // fire an event on the window when the layout mounts for downstream tooling to know the app has booted
      window.dispatchEvent(new Event('fastify-renderer:ready'))
      window.fastifyRendererReady = true
    }
  }, [])

  const [location] = useLocation()
  const [isNavigating, navigationDestination] = useNavigationDetails()
  const bootLocation = useMemo(() => location, [])

  const routes: JSX.Element[] = [
    ...props.routes.map(([route, Component]) => (
      <Route path={route} key={route}>
        {(params) => {
          const [location] = useLocation()
          const backendPath = location.split('#')[0] // remove current anchor for fetching data from the server side

          const payload = usePromise<{ props: Record<string, any> }>(props.basePath + location, async () => {
            if (location == bootLocation) {
              return { props: props.bootProps }
            } else {
              return (
                await fetch(props.basePath + backendPath, {
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
    <props.Layout isNavigating={isNavigating} navigationDestination={navigationDestination}>
      <Switch>{routes}</Switch>
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
  return (
    <Router base={props.basePath} hook={useTransitionLocation as any} matcher={matcher}>
      <RouteTable {...props} />
    </Router>
  )
}
