import { createContext } from 'react'

/** Per-render group of content produced by the render that can be accessed after rendering */
export class RenderBus {
  static context = createContext<RenderBus>(null as any)

  stacks: Record<string, any[]> = {}

  pushContent(key: string, content: any) {
    this.stacks[key] ??= []
    this.stacks[key].push(content)
  }

  stack(key) {
    return this.stacks[key] || []
  }
}
