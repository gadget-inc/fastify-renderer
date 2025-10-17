import { match, MatchFunction } from 'path-to-regexp'
import { MatcherFn } from 'wouter'

type ParamData = Record<string, string | string[]>

/*
 * This function creates a matcher function for a given path pattern.
 *
 * @param {string} path — a path like "/:foo/:bar"
 * @return {MatchFunction<ParamData>} — a function that matches paths and extracts params
 */
const createMatcher = (path: string): MatchFunction<ParamData> => {
  return match(path, { decode: decodeURIComponent })
}

const cache: Record<string, MatchFunction<ParamData>> = {}

// obtains a cached matcher function for the pattern
const getMatcher = (pattern: string) => cache[pattern] || (cache[pattern] = createMatcher(pattern))

export const matcher: MatcherFn = (pattern, path) => {
  const matchFn = getMatcher(String(pattern || ''))
  const pathStr = String(path)
  const cleanPath = pathStr.split('#')[0].split('?')[0]
  const result = matchFn(cleanPath)

  if (!result) return [false, null]

  // return matched params
  return [true, result.params as Record<string, string>]
}
