"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamingRender = exports.staticRender = void 0;
const worker_threads_1 = require("worker_threads");
const staticLocationHook = (path = '/', { record = false } = {}) => {
    // eslint-disable-next-line prefer-const
    let hook;
    const navigate = (to, { replace } = {}) => {
        if (record) {
            if (replace) {
                hook.history.pop();
            }
            hook.history.push(to);
        }
    };
    hook = () => [path, navigate];
    hook.history = [path];
    return hook;
};
// Presence of `parentPort` suggests
// that this code is running in a Worker
if (worker_threads_1.parentPort) {
    // Preload each path from `workerData`
    if (!worker_threads_1.workerData)
        throw new Error('No Worker Data');
    const { paths } = worker_threads_1.workerData;
    for (const path of paths) {
        require(path);
    }
}
function staticRender({ bootProps, destination, renderBase, module, hooks }) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { React, ReactDOMServer, Router, RenderBusContext, Layout, Entrypoint } = module;
    let app = React.createElement(RenderBusContext.Provider, null, React.createElement(Router, {
        base: renderBase,
        hook: staticLocationHook(destination),
    }, React.createElement(Layout, {
        isNavigating: false,
        navigationDestination: destination,
        bootProps: bootProps,
    }, React.createElement(Entrypoint, bootProps))));
    const transformers = hooks.map((hook) => require(hook).default);
    for (const hook of transformers) {
        app = hook(app);
    }
    return ReactDOMServer.renderToString(app);
}
exports.staticRender = staticRender;
function streamingRender({ bootProps, destination, renderBase, module }) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { React, ReactDOMServer, Router, RenderBusContext, Layout, Entrypoint } = module;
    const app = React.createElement(RenderBusContext.Provider, null, React.createElement(Router, {
        base: renderBase,
        hook: staticLocationHook(destination),
    }, React.createElement(Layout, {
        isNavigating: false,
        navigationDestination: destination,
        bootProps: bootProps,
    }, React.createElement(Entrypoint, bootProps))));
    return ReactDOMServer.renderToStaticNodeStream(app);
}
exports.streamingRender = streamingRender;
//# sourceMappingURL=ssr.js.map