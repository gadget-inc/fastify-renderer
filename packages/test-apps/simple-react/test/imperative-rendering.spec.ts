import { Page } from 'playwright-chromium'
import { newTestPage, reactReady, rootURL } from '../../helpers'

describe('imperative rendering', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
    await page.goto(`${rootURL}/navigation-test`)
    await reactReady(page)
  })

  test('the next navigation destination is passed to the currently rendered page when navigating away from it', async () => {
    await page.goto(`${rootURL}/imperative`)
    await reactReady(page)
  })
})
