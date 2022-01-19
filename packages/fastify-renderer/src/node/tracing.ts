import { context, SpanStatusCode, trace } from '@opentelemetry/api'

export const tracer = trace.getTracer('fastify-renderer', '0.1.0')

/** Wrap a function in tracing, and return it  */
export const wrap = <V, Args extends any[]>(
  name: string,
  func: (...args: Args) => Promise<V>
): ((...args: Args) => Promise<V>) => {
  return async function (this: any, ...args: Args) {
    const span = tracer.startSpan(name, undefined, context.active())
    return await context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await func.call(this, ...args)
        span.end()
        return result
      } catch (err: any) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message })
        span.end()
        throw err
      }
    })
  }
}
