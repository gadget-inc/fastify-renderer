import { pathToRegexp } from 'path-to-regexp'
import { Parser } from 'wouter'

const cache: Record<string, ReturnType<Parser>> = {}

export const parser: Parser = (path, _loose) => {
  if (cache[path]) return cache[path]

  try {
    const { regexp, keys } = pathToRegexp(path, {
      end: false, // we add our own, ok-with-a-query-string-or-hash-based end condition below
    })
    const pattern = new RegExp(`${regexp.source.replace('(?=\\/|$)', '')}(\\?.+)?(#.*)?$`)

    cache[path] = {
      pattern,
      keys: keys.map((k) => k.name).filter((k) => !!k),
    }

    return cache[path]
  } catch (error: any) {
    throw new Error(`Error parsing route syntax for '${path}' into regexp: ${error.message}`)
  }
}
