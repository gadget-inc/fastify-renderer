import { unstable_useTransition as useTransition, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
/**
 * History API docs @see https://developer.mozilla.org/en-US/docs/Web/API/History
 */
const eventPopstate = 'popstate';
const eventPushState = 'pushState';
const eventReplaceState = 'replaceState';
export const events = [eventPopstate, eventPushState, eventReplaceState];
/**
 * This is a customized `useLocation` hook for `wouter`, adapted to use React's new Concurrent mode with `useTransition` for fastify-renderer.
 * @see https://github.com/molefrog/wouter#customizing-the-location-hook
 *
 * Extended to return an array of 4 elements:
 * @return [currentLocation, setLocation, isNavigating, navigationDestination]
 */
export const useTransitionLocation = ({ base = '' } = {}) => {
    const [path, update] = useState(() => currentPathname(base));
    const prevLocation = useRef(path);
    const [startTransition, isPending] = useTransition({ busyWaitMs: 400, timeoutMs: 400 });
    useEffect(() => {
        // this function checks if the location has been changed since the
        // last render and updates the state only when needed.
        // unfortunately, we can't rely on `path` value here, since it can be stale,
        // that's why we store the last pathname in a ref.
        const checkForUpdates = () => {
            const destination = currentPathname(base);
            if (prevLocation.current !== destination) {
                prevLocation.current = destination;
                startTransition(() => {
                    update(destination);
                });
            }
        };
        events.map((e) => addEventListener(e, checkForUpdates));
        // it's possible that an update has occurred between render and the effect handler,
        // so we run additional check on mount to catch these updates. Based on:
        // https://gist.github.com/bvaughn/e25397f70e8c65b0ae0d7c90b731b189
        checkForUpdates();
        return () => {
            events.map((e) => removeEventListener(e, checkForUpdates));
        };
    }, [base]);
    // the 2nd argument of the `useLocation` return value is a function
    // that allows to perform a navigation.
    //
    // the function reference should stay the same between re-renders, so that
    // it can be passed down as an element prop without any performance concerns.
    const navigate = useCallback((to, { replace = false } = {}) => history[replace ? eventReplaceState : eventPushState](null, '', 
    // handle nested routers and absolute paths
    to[0] === '~' ? to.slice(1) : base + to), [base]);
    return [path, navigate, isPending, prevLocation.current];
};
// While History API does have `popstate` event, the only
// proper way to listen to changes via `push/replaceState`
// is to monkey-patch these methods.
//
// See https://stackoverflow.com/a/4585031
if (typeof history !== 'undefined') {
    for (const type of [eventPushState, eventReplaceState]) {
        const original = history[type];
        history[type] = function (...args) {
            const result = original.apply(this, args);
            const event = new Event(type);
            event.arguments = args;
            dispatchEvent(event);
            return result;
        };
    }
}
/**
 * React hook to access the navigation details of the current context
 * @returns [isNavigating: boolean, navigationDestination: string]
 */
export const useNavigationDetails = () => {
    const [_, __, isNavigating, navigationDestination] = useLocation(); // we hack in more return values from our custom location hook to get at the transition current state and the destination
    return [isNavigating, navigationDestination];
};
const currentPathname = (base, path = location.pathname + location.search + location.hash) => !path.toLowerCase().indexOf(base.toLowerCase()) ? path.slice(base.length) || '/' : '~' + path;
