export declare const tracer: import("@opentelemetry/api").Tracer;
/** Wrap a function in tracing, and return it  */
export declare const wrap: <V, Args extends any[]>(name: string, func: (...args: Args) => Promise<V>) => (...args: Args) => Promise<V>;
