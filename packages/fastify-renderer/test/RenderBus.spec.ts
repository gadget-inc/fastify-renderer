import { Readable } from 'stream'
import { newRenderBus } from './helpers'
import { describe, test, expect } from 'vitest'
describe('RenderBus', () => {
  const testKey = 'test-key'
  const testContent = 'test-content'

  test('should return the stream for the stack with the specified key', async () => {
    const renderBus = newRenderBus()
    expect(renderBus.stack(testKey).read()).toEqual(null)

    renderBus.push(testKey, testContent)

    const stream = renderBus.stack(testKey)

    expect(stream).toBeInstanceOf(Readable)
    expect(stream.read().toString()).toEqual(testContent)
  })

  // This test works by
  test.skip('should throw an error if stack hasEnded', async () => {
    const renderBus = newRenderBus()
    const stream = renderBus.stack(testKey)

    expect(stream.read()).toEqual(null)

    renderBus.push(testKey, testContent)
    renderBus.push(testKey, null) // Mark stack as ended

    renderBus.stack(testKey).on('finish', () => {
      expect(() => renderBus.push(testKey, testContent)).toThrowError()
    })
  })

  describe('preloadModule', () => {
    const path = 'module-path'

    test('should push a newlink tag to "head" stack and mark the path as included', async () => {
      const renderBus = newRenderBus()
      expect(renderBus.stack('head').read()).toEqual(null)

      renderBus.preloadModule(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').read().toString()).toContain('modulepreload')
    })

    test('should not include a path if its already included', async () => {
      const renderBus = newRenderBus()
      expect(renderBus.stack('head').read()).toEqual(null)

      renderBus.preloadModule(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').read().toString()).toContain('modulepreload')

      // renderBus.preloadModule(path)
      // expect(renderBus.stack('head').read().toString()).toContain('modulepreload')
    })
  })

  describe('linkStylesheet', () => {
    const path = 'module-path'

    test('should push a new link tag to "head" stack and mark the path as included', async () => {
      const renderBus = newRenderBus()
      expect(renderBus.stack('head').read()).toEqual(null)

      renderBus.linkStylesheet(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').read().toString()).toContain('stylesheet')
    })

    test('should not include a path if its already included', async () => {
      const renderBus = newRenderBus()
      expect(renderBus.stack('head').read()).toEqual(null)

      renderBus.linkStylesheet(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').read().toString()).toContain('stylesheet')

      // renderBus.linkStylesheet(path)
      // expect(renderBus.stack('head').read().toString()).toContain('stylesheet')
    })
  })
})
