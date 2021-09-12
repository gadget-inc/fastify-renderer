import { Readable } from 'stream'

export interface Stack {
  content: string[]
  hasEnded: boolean
  contentStreamed: boolean
  stream: Readable
}

/** Holds groups of content during a render that eventually get pushed into the template. */
export class RenderBus {
  stacks: Record<string, Stack> = {}
  included = new Set<string>()

  private createStack(key) {
    const stack: Stack = (this.stacks[key] = {
      content: [],
      hasEnded: false,
      contentStreamed: false,
      stream: new Readable(),
    })

    stack.stream._read = function () {
      if (stack.hasEnded && stack.contentStreamed) {
        this.push(null)
      } else {
        this.push(stack.content.join('\n'))
        stack.contentStreamed = true
      }
    }

    return stack
  }

  push(key: string, content: string | null) {
    if (!this.stacks[key]) this.createStack(key)
    if (this.stacks[key].hasEnded) throw new Error(`Stack with key=${key} has ended, no more content can be added`)

    if (content === null) {
      this.stacks[key].hasEnded = true
    } else if (!this.stacks[key].hasEnded) {
      this.stacks[key].content.push(content)
    }
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
