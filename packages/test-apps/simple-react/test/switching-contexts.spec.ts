import { newTestPage, reactReady, rootURL } from '../helpers'
import { describe, test } from 'vitest'

describe('navigation details', () => {
  test(
    'navigating between pages of the same context doesnt trigger a server side render request',
    async () => {
      const page = await newTestPage()
      await page.goto(`${rootURL}`)
      await reactReady(page)
      page.on('request', (request) => {
        if (request.url().includes('/.vite/')) return
        if (request.headers().accept !== 'application/json') {
          throw new Error(`Expecting request to only fetch props, request made: ${request.method()} ${request.url()} $`)
        }
      })
      await page.click('#about-link')
    },
    { timeout: 50000 }
  )

  test('navigating between pages of different contexts triggers a server side render request', async () => {
    const page = await newTestPage()
    await page.goto(`${rootURL}`)
    await reactReady(page)
    page.on('request', (request) => {
      if (request.url().includes('/.vite/')) return

      if (request.headers().accept === 'application/json') {
        throw new Error(`Expecting request to trigger SSR, request made: ${request.method()} ${request.url()}`)
      }
    })

    await page.click('#red-about-link')
  })
})
