interface Tracker<T> {
  promise: Promise<T>
  error?: any
  response?: T
}

const trackers: Record<string, Tracker<any>> = {}

export const usePromise = <T>(key: string, promise: () => Promise<T>) => {
  let tracker = trackers[key]

  if (tracker) {
    // If an error occurred,
    if (Object.prototype.hasOwnProperty.call(trackers, 'error')) {
      throw trackers.error
    }

    // If a response was successful,
    if (Object.prototype.hasOwnProperty.call(trackers, 'response')) {
      return trackers.response
    }
  }

  if (!tracker) {
    tracker = {
      promise: promise()
        .then((response: any) => {
          trackers.response = response
        })
        .catch((e: any) => {
          trackers.error = e
        }),
    }

    trackers[key] = tracker
  }

  throw tracker.promise
}
