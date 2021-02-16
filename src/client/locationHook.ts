import { unstable_useTransition as useTransition, useEffect, useRef, useState, useCallback } from 'react'
import type { LocationHook } from 'wouter/use-location'

/**
 * History API docs @see https://developer.mozilla.org/en-US/docs/Web/API/History
 */
const eventPopstate = 'popstate'
const eventPushState = 'pushState'
const eventReplaceState = 'replaceState'
export const events = [eventPopstate, eventPushState, eventReplaceState]

export const useLocation: LocationHook = ({ base = '' } = {}) => {
  const [path, update] = useState(() => currentPathname(base)) // @see https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const prevHash = useRef(path + location.search)

  useEffect(() => {
    // this function checks if the location has been changed since the
    // last render and updates the state only when needed.
    // unfortunately, we can't rely on `path` value here, since it can be stale,
    // that's why we store the last pathname in a ref.
    const checkForUpdates = () => {
      const pathname = currentPathname(base),
        hash = pathname + location.search

      if (prevHash.current !== hash) {
        prevHash.current = hash
        update(pathname)
      }
    }

    events.map((e) => addEventListener(e, checkForUpdates))

    // it's possible that an update has occurred between render and the effect handler,
    // so we run additional check on mount to catch these updates. Based on:
    // https://gist.github.com/bvaughn/e25397f70e8c65b0ae0d7c90b731b189
    checkForUpdates()

    return () => {
      events.map((e) => removeEventListener(e, checkForUpdates))
    }
  }, [base])

  // the 2nd argument of the `useLocation` return value is a function
  // that allows to perform a navigation.
  //
  // the function reference should stay the same between re-renders, so that
  // it can be passed down as an element prop without any performance concerns.
  const navigate = useCallback(
    (to, { replace = false } = {}) =>
      history[replace ? eventReplaceState : eventPushState](
        null,
        '',
        // handle nested routers and absolute paths
        to[0] === '~' ? to.slice(1) : base + to
      ),
    [base]
  )

  return [path, navigate]
}

// While History API does have `popstate` event, the only
// proper way to listen to changes via `push/replaceState`
// is to monkey-patch these methods.
//
// See https://stackoverflow.com/a/4585031
if (typeof history !== 'undefined') {
  for (const type of [eventPushState, eventReplaceState]) {
    const original = history[type]

    history[type] = function (...args: any[]) {
      const result = original.apply(this, args)
      const event = new Event(type)
      ;(event as any).arguments = args

      dispatchEvent(event)
      return result
    }
  }
}

const currentPathname = (base, path = location.pathname) =>
  !path.toLowerCase().indexOf(base.toLowerCase()) ? path.slice(base.length) || '/' : '~' + path

// custom wouter location management hook that uses React Concurrent Mode transitions to change location nicely for the user
export const useTransitionLocation: LocationHook = (options: any) => {
  const [location, setLocationSync] = useLocation(options)
  const [startTransition] = useTransition()

  const setLocation = (to: string, navigationOptions: any) => {
    startTransition(() => {
      setLocationSync(to, navigationOptions)
    })
  }

  return [location, setLocation]
}
