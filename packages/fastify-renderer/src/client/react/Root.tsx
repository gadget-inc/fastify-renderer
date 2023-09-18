import React, { useEffect, useState } from 'react'
import { Route, Router, Switch, useLocation, useRouter } from 'wouter'
import { usePromise } from './fetcher'
import { shouldScrollToHash, useNavigationDetails, useTransitionLocation } from './locationHook'
import { matcher } from './matcher'

export interface LayoutProps {
  isNavigating: boolean
  navigationDestination: string
  children: React.ReactNode
  bootProps: Record<string, any>
}

const RouteTable = (props: {
  Layout: React.FunctionComponent<LayoutProps>
  routes: JSX.Element[]
  bootProps: Record<string, any>
}) => {
  const [isNavigating, navigationDestination] = useNavigationDetails()

  return (
    <props.Layout isNavigating={isNavigating} navigationDestination={navigationDestination} bootProps={props.bootProps}>
      <Switch>{props.routes}</Switch>
    </props.Layout>
  )
}

export function Root<BootProps extends Record<string, any>>(props: {
  Entrypoint: React.FunctionComponent<BootProps>
  Layout: React.FunctionComponent<LayoutProps>
  bootProps: BootProps
  basePath: string
  routes: [string, React.FunctionComponent<any>][]
}) {
  const [firstRenderComplete, setFirstRenderComplete] = useState(false)
  useEffect(() => {
    setFirstRenderComplete(true)
    if (typeof window != 'undefined') {
      // fire an event on the window when the layout mounts for downstream tooling to know the app has booted
      window.dispatchEvent(new Event('fastify-renderer:ready'))
      window.fastifyRendererReady = true
    }
  }, [])

  const routes: JSX.Element[] = [
    ...props.routes.map(([route, Component]) => (
      <Route path={route} key={route}>
        {(params) => {
          const [location] = useLocation()
          const router = useRouter()
          const backendPath = location.split('#')[0] // remove current anchor for fetching data from the server side

          const payload = usePromise<{ props: Record<string, any> }>(props.basePath + backendPath, async () => {
            if (!firstRenderComplete) {
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

          // Navigate to the anchor in the url after rendering, unless we're using replaceState and
          // the destination page and previous page have the same base route (i.e. before '#')
          // We would do this for example to update the url to the correct anchor as the user scrolls.
          useEffect(() => {
            if (window.location.hash && shouldScrollToHash(router.navigationHistory)) {
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
      <RouteTable routes={routes} Layout={props.Layout} bootProps={props.bootProps} />
    </Router>
  )
}
