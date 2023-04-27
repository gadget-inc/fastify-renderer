"use strict";
exports.__esModule = true;
var worker_threads_1 = require("worker_threads");
// if (!isMainThread) throw new Error('Worker spawned in Main thread')
var _a = worker_threads_1.workerData, modulePath = _a.modulePath, renderBase = _a.renderBase, destination = _a.destination, bootProps = _a.bootProps, mode = _a.mode;
var staticLocationHook = function (path, _a) {
    if (path === void 0) { path = '/'; }
    var _b = _a === void 0 ? {} : _a, _c = _b.record, record = _c === void 0 ? false : _c;
    // eslint-disable-next-line prefer-const
    var hook;
    var navigate = function (to, _a) {
        var _b = _a === void 0 ? {} : _a, replace = _b.replace;
        if (record) {
            if (replace) {
                hook.history.pop();
            }
            hook.history.push(to);
        }
    };
    hook = function () { return [path, navigate]; };
    hook.history = [path];
    return hook;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
var _b = require(modulePath)["default"], React = _b.React, ReactDOMServer = _b.ReactDOMServer, Router = _b.Router, RenderBusContext = _b.RenderBusContext, Layout = _b.Layout, Entrypoint = _b.Entrypoint;
var app = React.createElement(RenderBusContext.Provider, null, React.createElement(Router, {
    base: renderBase,
    hook: staticLocationHook(destination)
}, React.createElement(Layout, {
    isNavigating: false,
    navigationDestination: destination,
    bootProps: bootProps
}, React.createElement(Entrypoint, bootProps))));
// Transofmr hook cannot work
// for (const hook of hooks) {
//   if (hook.transform) {
//     app = hook.transform(app)
//   }
// }
if (mode == 'streaming') {
    //return this.renderStreamingTemplate(app, bus, ReactDOMServer, render, hooks)
}
else {
    var content = ReactDOMServer.renderToString(app);
    if (!worker_threads_1.parentPort)
        throw new Error('Missing parentPort');
    worker_threads_1.parentPort.postMessage(content);
}
