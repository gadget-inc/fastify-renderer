import { createContext } from 'react'
export { Link, Redirect, Route, Router, Switch, useLocation, useRoute, useRouter } from 'wouter'
export { Root } from './Root'
export type { LayoutProps } from './Root'
export { useNavigationDetails, useTransitionLocation } from './locationHook'

export const RenderBusContext = createContext<any>(null as any)

declare global {
  interface Window {
    fastifyRendererReady?: boolean
  }
}
