import { Readable } from 'stream'
import { RenderBus } from '../src/node/RenderBus'
import { newRenderBus } from './helpers'

describe('RenderBus', () => {
  let renderBus: RenderBus
  const testKey = 'test-key'
  const testContent = 'test-content'

  beforeEach(() => {
    renderBus = newRenderBus()
  })

  test('should add the content to the correct stack', async () => {
    expect(renderBus.stacks[testKey]).toBeUndefined()

    renderBus.push(testKey, testContent)

    expect(renderBus.stacks[testKey].content.length).toEqual(1)
    expect(renderBus.stacks[testKey].content[0]).toEqual(testContent)
  })

  test('should return the stream for the stack with the specified key', async () => {
    expect(renderBus.stack(testKey).read()).toEqual(null)

    renderBus.push(testKey, testContent)

    const stream = renderBus.stack(testKey)

    expect(stream).toBeInstanceOf(Readable)
    expect(stream.read().toString()).toEqual(testContent)
  })

  describe('preloadModule', () => {
    const path = 'module-path'

    test('should push a newlink tag to "head" stack and mark the path as included', async () => {
      expect(renderBus.stack('head').read()).toEqual(null)

      renderBus.preloadModule(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').read().toString()).toContain('modulepreload')
    })

    test('should not include a path if its already included', async () => {
      expect(renderBus.stack('head').read()).toEqual(null)

      renderBus.preloadModule(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').read().toString()).toContain('modulepreload')

      renderBus.preloadModule(path)
      expect(renderBus.stack('head').read().toString()).toContain('modulepreload')
    })
  })

  describe('linkStylesheet', () => {
    const path = 'module-path'

    test('should push a new link tag to "head" stack and mark the path as included', async () => {
      expect(renderBus.stack('head').read()).toEqual(null)

      renderBus.linkStylesheet(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').read().toString()).toContain('stylesheet')
    })

    test('should not include a path if its already included', async () => {
      expect(renderBus.stack('head').read()).toEqual(null)

      renderBus.linkStylesheet(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').read().toString()).toContain('stylesheet')

      renderBus.linkStylesheet(path)
      expect(renderBus.stack('head').read().toString()).toContain('stylesheet')
    })
  })
})
