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
  streams: Record<string, PassThrough> = {}
  included = new Set<string>()

  private createStack(key: string) {
    const stream = (this.streams[key] = new PassThrough())

    return stream
  }

  push(key: string, content: string | null) {
    if (!this.streams[key]) this.createStack(key)
    if (this.streams[key].writableEnded)
      throw new Error(`Stack with key=${key} has ended, no more content can be added`)

    if (content === null) {
      this.streams[key].end()
    } else {
      this.streams[key].write(content)
    }
  }

  stack(key: string) {
    if (!this.streams[key]) this.createStack(key)
    return this.streams[key]
  }

  preloadModule(path: string) {
    if (this.included.has(path)) return
    this.included.add(path)
    this.push('head', `<link rel="modulepreload" crossorigin href="${path}">`)
  }

  linkStylesheet(path: string) {
    if (this.included.has(path)) return
    this.included.add(path)
    this.push('head', stylesheetLinkTag(path))
  }

  loadScript(src: string) {
    this.push('tail', scriptTag(``, { src }))
  }
}
