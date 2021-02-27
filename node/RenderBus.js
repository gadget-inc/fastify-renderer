"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderBus = void 0;
const react_1 = require("react");
/** Holds groups of content during a render that eventually get pushed into the template. */
class RenderBus {
    constructor() {
        this.stacks = {};
        this.included = new Set();
    }
    push(key, content) {
        var _a;
        var _b;
        (_a = (_b = this.stacks)[key]) !== null && _a !== void 0 ? _a : (_b[key] = []);
        this.stacks[key].push(content);
    }
    stack(key) {
        return this.stacks[key] || [];
    }
    preloadModule(path) {
        if (this.included.has(path))
            return;
        this.included.add(path);
        this.push('head', `<link rel="modulepreload" crossorigin href="${path}">`);
    }
    linkStylesheet(path) {
        if (this.included.has(path))
            return;
        this.included.add(path);
        this.push('head', `<link rel="stylesheet" href="${path}">`);
    }
}
exports.RenderBus = RenderBus;
RenderBus.Context = react_1.createContext(null);
//# sourceMappingURL=RenderBus.js.map