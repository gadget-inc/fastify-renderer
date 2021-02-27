import React, { useEffect, useState } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { usePromise } from './fetcher';
import { useTransitionLocation } from './locationHook';
const RouteTable = (props) => {
    const isNavigating = useLocation()[2]; // we hack in a third return value from our custom location hook to get at the transition current state
    return (React.createElement(props.Layout, { isNavigating: isNavigating },
        React.createElement(Switch, null, props.routes)));
};
export const Root = (props) => {
    const [firstRenderComplete, setFirstRenderComplete] = useState(false);
    useEffect(() => setFirstRenderComplete(true));
    const routes = [
        ...Object.entries(props.routes).map(([route, Component]) => (React.createElement(Route, { path: route, key: route }, (params) => {
            const [location] = useLocation();
            const payload = usePromise(props.basePath + location, async () => (await fetch(props.basePath + location, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            })).json());
            return React.createElement(Component, Object.assign({ params: params }, payload.props));
        }))),
    ];
    if (!firstRenderComplete) {
        routes.unshift(React.createElement(Route, { key: "first-render-root" },
            React.createElement(props.Entrypoint, Object.assign({}, props.bootProps))));
    }
    return (React.createElement(Router, { base: props.basePath, hook: useTransitionLocation },
        React.createElement(RouteTable, { routes: routes, Layout: props.Layout })));
};
