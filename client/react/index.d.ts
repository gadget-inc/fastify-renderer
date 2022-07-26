/// <reference types="react" />
export { Link, Redirect, Route, Router, Switch, useLocation, useRoute, useRouter } from 'wouter';
export { useNavigationDetails, useTransitionLocation } from './locationHook';
export { Root } from './Root';
export type { LayoutProps } from './Root';
export declare const RenderBusContext: import("react").Context<any>;
declare global {
    interface Window {
        fastifyRendererReady?: boolean;
    }
}
