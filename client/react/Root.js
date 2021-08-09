import React, { useEffect, useState } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { usePromise } from './fetcher';
import { useTransitionLocation } from './locationHook';
import { matcher } from './matcher';
const RouteTable = (props) => {
    const [_, __, isNavigating, navigationDestination] = useLocation(); // we hack in more return values from our custom location hook to get at the transition current state and the destination
    return (React.createElement(props.Layout, { isNavigating: isNavigating, navigationDestination: navigationDestination },
        React.createElement(Switch, null, props.routes)));
};
export function Root(props) {
    const [firstRenderComplete, setFirstRenderComplete] = useState(false);
    useEffect(() => setFirstRenderComplete(true));
    const routes = [
        ...props.routes.map(([route, Component]) => (React.createElement(Route, { path: route, key: route }, (params) => {
            const [location] = useLocation();
            const payload = usePromise(props.basePath + location, async () => {
                if (!firstRenderComplete) {
                    return { props: props.bootProps };
                }
                else {
                    return (await fetch(props.basePath + location, {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json',
                        },
                        credentials: 'same-origin',
                    })).json();
                }
            });
            // navigate to the anchor in the url after rendering
            useEffect(() => {
                var _a;
                if (window.location.hash) {
                    (_a = document.getElementById(window.location.hash.slice(1))) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
                }
            }, [location]);
            return React.createElement(Component, Object.assign({ params: params }, payload.props));
        }))),
    ];
    return (React.createElement(Router, { base: props.basePath, hook: useTransitionLocation, matcher: matcher },
        React.createElement(RouteTable, { routes: routes, Layout: props.Layout })));
}
