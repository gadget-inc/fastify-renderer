import { Key, pathToRegexp } from 'path-to-regexp'
import { MatcherFn } from 'wouter/matcher'

/*
 * This function specifies how strings like /app/:users/:items* are transformed into regular expressions to pass into path-to-regexp.
 *
 * @param {string} path — a path like "/:foo/:bar"
 * @return {{ keys: [], regexp: RegExp }}
 */
const convertPathToRegexp = (path: string) => {
  const keys: Key[] = []
  const regexp = pathToRegexp(path, keys)
  return { keys, regexp }
}

const cache: Record<string, ReturnType<typeof convertPathToRegexp>> = {}

// obtains a cached regexp version of the pattern
const getRegexp = (pattern: string) => cache[pattern] || (cache[pattern] = convertPathToRegexp(pattern))

export const matcher: MatcherFn = (pattern, path) => {
  const { regexp, keys } = getRegexp(pattern || '')
  const out = regexp.exec(path.split('#')[0].split('?')[0])

  if (!out) return [false, null]

  // formats an object with matched params
  const params = keys.reduce((params, key, i) => {
    params[key.name] = out[i + 1]
    return params
  }, {})

  return [true, params]
}
