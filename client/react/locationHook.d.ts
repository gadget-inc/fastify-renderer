import React from 'react';
import { NavigationHistory } from 'wouter';
export declare const events: string[];
/**
 * Internal context for the whole app capturing if we're currently navigating or not
 */
export declare const TransitionProvider: ({ children }: {
    children: React.ReactNode;
}) => JSX.Element;
/**
 * This is a customized `useLocation` hook for `wouter`, adapted to use React's new Concurrent mode with `useTransition` for fastify-renderer.
 * @see https://github.com/molefrog/wouter#customizing-the-location-hook
 *
 * Extended to stick the `isNavigating` and `navigationDestination` properties on the router object
 */
export declare const useTransitionLocation: ({ base }?: {
    base?: string | undefined;
}) => (string | ((path: any, { replace }?: any) => void))[];
/**
 * React hook to access the navigation details of the current context. Useful for capturing the details of an ongoing navigation in the existing page while React is rendering the new page.
 *
 * @returns [isNavigating: boolean, navigationDestination: string]
 */
export declare const useNavigationDetails: () => [boolean, string];
export declare const navigatingOnSamePage: (history?: NavigationHistory) => boolean;
export declare const shouldScrollToHash: (history?: NavigationHistory) => boolean;
