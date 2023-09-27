/**
 * Implements a React Suspense cache for a promise. For each passed `key` passed, runs the promise on first invocation, stores it, and suspends. On the next invocaation, will synchronously return the result of the promise if it resolved, or throw it's reject reason if it rejected.
 **/
export declare const usePromise: <T>(key: string, promise: () => Promise<T>) => any;
