import { Readable } from 'stream'

export const unthunk = <T, Args extends any[]>(value: T | ((...args: Args) => T), ...args: Args): T => {
  if (value instanceof Function) {
    return (value as any)(...args)
  } else {
    return value
  }
}

const longestCommonPrefix = (...input: string[]) => {
  const strings = input.concat().sort()
  const shortest = strings[0]
  const longest = strings[strings.length - 1]
  const shortestLength = shortest.length
  let i = 0

  while (i < shortestLength && shortest.charAt(i) === longest.charAt(i)) i++
  return shortest.substring(0, i)
}

const cwd = process.cwd()

export const mapFilepathToEntrypointName = (filepath: string, base = '') => {
  const prefix = longestCommonPrefix(cwd, filepath)
  filepath = filepath.slice(prefix.length)
  return base.replace(/\//g, '~') + filepath.replace(/\//g, '~')
}

export const escapeRegex = (string: string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export const newStringStream = () => {
  const stream = new Readable()
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  stream._read = () => {}
  return stream
}
