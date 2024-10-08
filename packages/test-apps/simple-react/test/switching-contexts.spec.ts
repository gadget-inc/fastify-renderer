import { Page } from 'playwright-chromium'
import { newTestPage, reactReady, rootURL } from '../helpers'
import { describe, test, beforeEach, expect } from 'vitest'

describe('navigation details', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
    await page.goto(rootURL)
    await reactReady(page)
    await page.waitForLoadState('networkidle')
  })

  test('navigating between pages of the same context doesnt trigger a server side render request', async () => {
    page.on('request', (request) => {
      if (request.url().includes('/.vite/')) return
      if (request.headers().accept !== 'application/json') {
        throw new Error(
          `Expecting request to only fetch JSON props, but HTML request made: ${request.method()} ${request.url()} $`
        )
      }
    })

    await page.click('#about-link')
  })
})
