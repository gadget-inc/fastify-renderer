import React, { useEffect, useState } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { usePromise } from './fetcher';
import { useNavigationDetails, useTransitionLocation } from './locationHook';
import { matcher } from './matcher';
const RouteTable = (props) => {
    const [isNavigating, navigationDestination] = useNavigationDetails();
    return (React.createElement(props.Layout, { isNavigating: isNavigating, navigationDestination: navigationDestination },
        React.createElement(Switch, null, props.routes)));
};
export function Root(props) {
    const [firstRenderComplete, setFirstRenderComplete] = useState(false);
    useEffect(() => setFirstRenderComplete(true));
    const routes = [
        ...props.routes.map(([route, Component]) => (React.createElement(Route, { path: route, key: route }, (params) => {
            const [location] = useLocation();
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
