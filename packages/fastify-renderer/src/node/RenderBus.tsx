import { PassThrough, Readable } from 'stream'
import { scriptTag, stylesheetLinkTag } from './renderers/Renderer'

export interface Stack {
  content: string[]
  hasEnded: boolean
  contentStreamed: boolean
  stream: Readable
}

/** Holds groups of content during a render that eventually get pushed into the template. */
export class RenderBus {
  streams: Map<string, PassThrough> = new Map()
  included = new Set<string>()

  private createStack(key: string) {
    const stream = new PassThrough()
    this.streams.set(key, stream)

    return stream
  }

  push(key: string, content: string | null, throwIfEnded = true) {
    let stream = this.streams.get(key)
    if (!stream) stream = this.createStack(key)
    if (stream.closed) {
      if (throwIfEnded) throw new Error(`Stack with key=${key} has ended, no more content can be added`)
      return
    }

    if (content === null) {
      stream.end()
    } else {
      stream.write(content)
    }
  }

  stack(key: string) {
    let stream = this.streams.get(key)
    if (!stream) stream = this.createStack(key)
    return stream
  }

  preloadModule(path: string) {
    if (this.included.has(path)) return
    this.included.add(path)
    this.push('head', `<link rel="modulepreload" crossorigin href="${path}">`)
  }

  linkStylesheet(href: string, nonce?: string) {
    if (this.included.has(href)) return
    this.included.add(href)
    this.push('head', stylesheetLinkTag({ href, nonce }))
  }

  loadScript(src: string, nonce?: string) {
    this.push('tail', scriptTag(``, { src, nonce }))
  }

  endAll() {
    // End all streams (error handling helper)
    for (const stream of this.streams.values()) {
      if (!stream.closed) {
        stream.end()
        stream.destroy()
      }
    }
  }
}
