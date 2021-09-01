import { Page } from 'playwright-chromium'
import { newTestPage, reactReady, rootURL } from '../../helpers'

describe('navigation details', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
    await page.goto(`${rootURL}`)
    await reactReady(page)
  })

  test('navigating between pages of the same context doesnt trigger a server side render request', async () => {
    page.on('request', (request) => {
      if (request.headers().accept !== 'application/json') {
        throw new Error(`Expecting request to only fetch props, request made: ${request.method()} ${request.url()}`)
      }
    })

    await page.click('#about-link')
  })

  test('navigating between pages of different contexts triggers a server side render request', async () => {
    page.on('request', (request) => {
      console.log(request.headers())
      if (request.headers().accept === 'application/json') {
        throw new Error(`Expecting request to trigger SSR, request made: ${request.method()} ${request.url()}`)
      }
    })

    await page.click('#red-about-link')
  })
})
