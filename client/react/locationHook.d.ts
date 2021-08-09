export declare const events: string[];
/**
 * This is a customized `useLocation` hook for `wouter`, adapted to use React's new Concurrent mode with `useTransition` for fastify-renderer.
 * @see https://github.com/molefrog/wouter#customizing-the-location-hook
 *
 * Extended to return an array of 4 elements:
 * @return [currentLocation, setLocation, isNavigating, navigationDestination]
 */
export declare const useTransitionLocation: ({ base }?: {
    base?: string | undefined;
}) => (string | boolean | ((to: any, { replace }?: any) => void))[];
