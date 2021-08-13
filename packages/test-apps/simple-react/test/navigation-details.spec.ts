import { reactReady } from './helpers'

describe('navigation details', () => {
  test('the next navigation destination is passed to the currently rendered page when navigating away from it', async () => {
    await page.goto(`http://localhost:3000/navigation-test`)
    await reactReady(page)
    await page.click('#home-link')

    const testCalls: any[] = await page.evaluate('window.test')
    expect(testCalls).toBeDefined()
    expect(testCalls[0].isNavigating).toBe(false)
    expect(testCalls[0].navigationDestination).toBe('/navigation-test')
    expect(testCalls[1].isNavigating).toBe(true)
    expect(testCalls[1].navigationDestination).toBe('/')
  })
})
