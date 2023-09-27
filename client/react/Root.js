import React, { useEffect, useState } from 'react';
import { Route, Router, Switch, useLocation, useRouter } from 'wouter';
import { usePromise } from './fetcher';
import { shouldScrollToHash, useNavigationDetails, useTransitionLocation } from './locationHook';
import { matcher } from './matcher';
const RouteTable = (props) => {
    const [isNavigating, navigationDestination] = useNavigationDetails();
    return (React.createElement(props.Layout, { isNavigating: isNavigating, navigationDestination: navigationDestination, bootProps: props.bootProps },
        React.createElement(Switch, null, props.routes)));
};
export function Root(props) {
    const [firstRenderComplete, setFirstRenderComplete] = useState(false);
    useEffect(() => {
        setFirstRenderComplete(true);
        if (typeof window != 'undefined') {
            // fire an event on the window when the layout mounts for downstream tooling to know the app has booted
            window.dispatchEvent(new Event('fastify-renderer:ready'));
            window.fastifyRendererReady = true;
        }
    }, []);
    const routes = [
        ...props.routes.map(([route, Component]) => (React.createElement(Route, { path: route, key: route }, (params) => {
            const [location] = useLocation();
            const router = useRouter();
            const backendPath = location.split('#')[0]; // remove current anchor for fetching data from the server side
            const payload = usePromise(props.basePath + backendPath, async () => {
                if (!firstRenderComplete) {
                    return { props: props.bootProps };
                }
                else {
                    return (await fetch(props.basePath + backendPath, {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json',
                        },
                        credentials: 'same-origin',
                    })).json();
                }
            });
            // Navigate to the anchor in the url after rendering, unless we're using replaceState and
            // the destination page and previous page have the same base route (i.e. before '#')
            // We would do this for example to update the url to the correct anchor as the user scrolls.
            useEffect(() => {
                var _a;
                if (window.location.hash && shouldScrollToHash(router.navigationHistory)) {
                    (_a = document.getElementById(window.location.hash.slice(1))) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
                }
            }, [location]);
            return React.createElement(Component, { params: params, ...payload.props });
        }))),
    ];
    return (React.createElement(Router, { base: props.basePath, hook: useTransitionLocation, matcher: matcher },
        React.createElement(RouteTable, { routes: routes, Layout: props.Layout, bootProps: props.bootProps })));
}
