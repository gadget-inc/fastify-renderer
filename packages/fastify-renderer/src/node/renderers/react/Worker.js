"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var worker_threads_1 = require("worker_threads");
// if (!isMainThread) throw new Error('Worker spawned in Main thread')
var _a = worker_threads_1.workerData, modulePath = _a.modulePath, renderBase = _a.renderBase, destination = _a.destination, renderProps = _a.renderProps, mode = _a.mode;
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
require(modulePath).then(function (module) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, React, ReactDOMServer, Router, RenderBusContext, Layout, Entrypoint, app, content;
    return __generator(this, function (_b) {
        _a = module["default"], React = _a.React, ReactDOMServer = _a.ReactDOMServer, Router = _a.Router, RenderBusContext = _a.RenderBusContext, Layout = _a.Layout, Entrypoint = _a.Entrypoint;
        app = React.createElement(RenderBusContext.Provider, null, React.createElement(Router, {
            base: renderBase,
            hook: staticLocationHook(destination)
        }, React.createElement(Layout, {
            isNavigating: false,
            navigationDestination: destination,
            bootProps: renderProps
        }, React.createElement(Entrypoint, renderProps))));
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
            content = ReactDOMServer.renderToString(app);
            if (!worker_threads_1.parentPort)
                throw new Error('Missing parentPort');
            worker_threads_1.parentPort.postMessage(content);
        }
        return [2 /*return*/];
    });
}); });
