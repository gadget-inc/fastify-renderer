import { Readable } from 'stream'

export interface Stack {
  content: string[]
  hasEnded: boolean
  stream: Readable
}

/** Holds groups of content during a render that eventually get pushed into the template. */
export class RenderBus {
  stacks: Record<string, Stack> = {}
  included = new Set<string>()

  private createStack(key) {
    const stack = (this.stacks[key] = {
      content: [],
      hasEnded: false,
      stream: new Readable(),
    })

    stack.stream._read = function () {
      this.push(stack.hasEnded ? null : stack.content.join('\n'))
    }

    return stack
  }

  push(key: string, content: string | null) {
    if (!this.stacks[key]) this.createStack(key)

    if (content === null) this.stacks[key].hasEnded = true
    else this.stacks[key].content.push(content)
  }

  stack(key) {
    if (!this.stacks[key]) this.createStack(key)
    return this.stacks[key].stream
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
