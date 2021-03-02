interface Tracker<T> {
  promise: Promise<T>
  error?: any
  response?: T
}

const trackers: Record<string, Tracker<any>> = {}

/**
 * Implements a React Suspense cache for a promise. For each passed `key` passed, runs the promise on first invocation, stores it, and suspends. On the next invocaation, will synchronously return the result of the promise if it resolved, or throw it's reject reason if it rejected.
 **/
export const usePromise = <T>(key: string, promise: () => Promise<T>) => {
  let tracker = trackers[key]

  if (tracker) {
    // If an error occurred,
    if (Object.prototype.hasOwnProperty.call(tracker, 'error')) {
      throw tracker.error
    }

    // If a response was successful,
    if (Object.prototype.hasOwnProperty.call(tracker, 'response')) {
      return tracker.response
    }
  }

  if (!tracker) {
    tracker = {
      promise: promise()
        .then((response: any) => {
          tracker.response = response
        })
        .catch((e: any) => {
          tracker.error = e
        }),
    }

    trackers[key] = tracker
  }

  throw tracker.promise
}
