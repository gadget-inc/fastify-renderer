import { match, MatchFunction } from 'path-to-regexp'
import { MatcherFn } from 'wouter'

type ParamData = Record<string, string | string[]>

const normalizePattern = (pattern: string): string => {
  return (
    pattern
      // path-to-regexp <8 legacy wildcard params (e.g. "/:splat*")
      // path-to-regexp 8 wildcard params (e.g. "/*splat")
      .replace(/:([A-Za-z0-9_]+)\*/g, '*$1')
      // find-my-way wildcard routes use unnamed "*" so give them a stable name
      .replace(/(^|\/)\*(?=\/|$)/g, '$1*splat')
  )
}

/*
 * This function creates a matcher function for a given path pattern.
 *
 * @param {string} path — a path like "/:foo/:bar"
 * @return {MatchFunction<ParamData>} — a function that matches paths and extracts params
 */
const createMatcher = (path: string): MatchFunction<ParamData> => {
  return match(normalizePattern(path), { decode: decodeURIComponent })
}

const cache: Record<string, MatchFunction<ParamData>> = {}

// obtains a cached matcher function for the pattern
const getMatcher = (pattern: string) => {
  const normalizedPattern = normalizePattern(pattern)
  return cache[normalizedPattern] || (cache[normalizedPattern] = createMatcher(normalizedPattern))
}

export const matcher: MatcherFn = (pattern, path) => {
  const matchFn = getMatcher(String(pattern || ''))
  const pathStr = String(path)
  const cleanPath = pathStr.split('#')[0].split('?')[0]
  const result = matchFn(cleanPath)

  if (!result) return [false, null]

  // return matched params
  return [true, result.params as Record<string, string>]
}
