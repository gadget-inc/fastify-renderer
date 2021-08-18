import { Page } from 'playwright-chromium'
import { newTestPage, reactReady, rootURL } from '../../helpers'

describe('navigation details', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
    await page.goto(`${rootURL}/navigation-test`)
    await reactReady(page)
  })

  test('the next navigation destination is passed to the currently rendered page when navigating away from it', async () => {
    await page.click('#home-link')

    const testCalls: any[] = await page.evaluate('window.test')
    expect(testCalls).toBeDefined()
    expect(testCalls).toHaveLength(2)
    expect(testCalls[0].isNavigating).toBe(false)
    expect(testCalls[0].navigationDestination).toBe('/navigation-test')
    expect(testCalls[1].isNavigating).toBe(true)
    expect(testCalls[1].navigationDestination).toBe('/')
  })

  test('navigation to new anchors on the same page triggers a fastify-renderer navigation but no data fetch', async () => {
    page.on('request', (request) => {
      throw new Error(
        `Expecting no requests to be made during hash navigation, request made: ${request.method()} ${request.url()}`
      )
    })

    await page.click('#section-link')

    const testCalls: any[] = await page.evaluate('window.test')
    expect(testCalls).toBeDefined()
    expect(testCalls[0].isNavigating).toBe(false)
    expect(testCalls[0].navigationDestination).toBe('/navigation-test')
    expect(testCalls[1].isNavigating).toBe(true)
    expect(testCalls[1].navigationDestination).toBe('/navigation-test#section')
  })
})
