import path from 'path'
import { Readable } from 'stream'
import { RenderBus } from './RenderBus'
import { ResolvedOptions } from './types'

export const unthunk = <T extends any, Args extends any[]>(value: T | ((...args: Args) => T), ...args: Args): T => {
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

export const mapFilepathToEntrypointName = (filepath: string) => {
  const prefix = longestCommonPrefix(cwd, filepath)
  filepath = filepath.slice(prefix.length)
  return filepath.replace(/\//g, '~')
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

/**
 * Implements the backend integration logic for vite -- pulls out the chain of imported modules from the vite manifest and generates <script/> or <link/> tags to source the assets in the browser.
 **/
export const pushImportTagsFromManifest = (
  options: ResolvedOptions,
  bus: RenderBus,
  entryName: string,
  root = true
) => {
  const manifestEntry = options.clientManifest![entryName]
  if (!manifestEntry) {
    throw new Error(`Module id ${entryName} was not found in the built assets manifest. Was it included in the build?`)
  }

  if (manifestEntry.imports) {
    for (const submodule of manifestEntry.imports) {
      pushImportTagsFromManifest(options, bus, submodule, false)
    }
  }
  if (manifestEntry.css) {
    for (const css of manifestEntry.css) {
      bus.linkStylesheet(path.join(options.base, css))
    }
  }

  const file = path.join(options.base, manifestEntry.file)

  if (file.endsWith('.js')) {
    if (root) {
      bus.push('tail', `<script type="module" src="${file}"></script>`)
    } else {
      bus.preloadModule(file)
    }
  } else if (file.endsWith('.css')) {
    bus.linkStylesheet(file)
  }
}
