import React, { useEffect, useState } from 'react'
import { Route, Router, Switch, useLocation } from 'wouter'
import { usePromise } from './fetcher'
import { useTransitionLocation } from './locationHook'
import { matcher } from './matcher'

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
  routes: [string, React.FunctionComponent<any> | null][]
}) {
  const [firstRenderComplete, setFirstRenderComplete] = useState(false)
  useEffect(() => setFirstRenderComplete(true), [])
  console.log({ firstRenderComplete })
  const routes: JSX.Element[] = [
    ...props.routes.map(([route, Component]) => {
      if (!Component) {
        return (
          <Route path={route} key={route}>
            {() => {
              const [location] = useLocation()
              window.location.href = location

              return <div>redirecting...</div>
            }}
          </Route>
        )
      }
      console.log({ route, Component })
      return (
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

            console.log('Component=', { Component, location })
            return <Component params={params} {...payload.props} />
          }}
        </Route>
      )
    }),
  ]

  return (
    <Router base={props.basePath} hook={useTransitionLocation as any} matcher={matcher}>
      <RouteTable routes={routes} Layout={props.Layout} />
    </Router>
  )
}
