import { createContext } from 'react'
export { Link, Redirect, Route, Router, Switch, useLocation, useRoute, useRouter } from 'wouter'
export { useNavigationDetails, useTransitionLocation } from './locationHook'
export { Root } from './Root'
export type { LayoutProps } from './Root'

export const RenderBusContext = createContext<any>(null as any)

declare global {
  interface Window {
    fastifyRendererReady?: boolean
  }
}
