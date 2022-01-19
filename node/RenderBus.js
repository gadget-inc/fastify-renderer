"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderBus = void 0;
const stream_1 = require("stream");
/** Holds groups of content during a render that eventually get pushed into the template. */
class RenderBus {
    constructor() {
        this.stacks = {};
        this.included = new Set();
    }
    createStack(key) {
        const stack = (this.stacks[key] = {
            content: [],
            hasEnded: false,
            contentStreamed: false,
            stream: new stream_1.Readable(),
        });
        stack.stream._read = function () {
            if (stack.hasEnded && stack.contentStreamed) {
                this.push(null);
            }
            else {
                this.push(stack.content.join('\n'));
                stack.contentStreamed = true;
            }
        };
        return stack;
    }
    push(key, content) {
        if (!this.stacks[key])
            this.createStack(key);
        if (this.stacks[key].hasEnded)
            throw new Error(`Stack with key=${key} has ended, no more content can be added`);
        if (content === null) {
            this.stacks[key].hasEnded = true;
        }
        else if (!this.stacks[key].hasEnded) {
            this.stacks[key].content.push(content);
        }
    }
    stack(key) {
        if (!this.stacks[key])
            this.createStack(key);
        return this.stacks[key].stream;
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
//# sourceMappingURL=RenderBus.js.map