import { createContext } from 'react'

/** Holds groups of content during a render that eventually get pushed into the template. */
export class RenderBus {
  static Context = createContext<RenderBus>(null as any)

  stacks: Record<string, string[]> = {}
  included = new Set<string>()

  push(key: string, content: string) {
    this.stacks[key] ??= []
    this.stacks[key].push(content)
  }

  stack(key) {
    return this.stacks[key] || []
  }

  preloadModule(path: string) {
    if (this.included.has(path)) return
    this.included.add(path)
    this.push('head', `<link rel="modulepreload" crossorigin href="${path}">`)
  }

  linkStylesheet(path: string) {
    if (this.included.has(path)) return
    this.included.add(path)
    this.push('head', `<link rel="stylesheet" href="${path}">`)
  }
}
