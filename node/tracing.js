"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrap = exports.tracer = void 0;
const api_1 = require("@opentelemetry/api");
exports.tracer = api_1.trace.getTracer('fastify-renderer', '0.1.0');
/** Wrap a function in tracing, and return it  */
const wrap = (name, func) => {
    return async function (...args) {
        const span = exports.tracer.startSpan(name, undefined, api_1.context.active());
        return await api_1.context.with(api_1.setSpan(api_1.context.active(), span), async () => {
            try {
                const result = await func.call(this, ...args);
                span.end();
                return result;
            }
            catch (err) {
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err === null || err === void 0 ? void 0 : err.message });
                span.end();
                throw err;
            }
        });
    };
};
exports.wrap = wrap;
//# sourceMappingURL=tracing.js.map