import { expect } from '@playwright/test'
import { Page } from 'playwright-chromium'
import { newTestPage, reactReady, rootURL } from '../helpers'

describe('boot props', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
  })

  test('should make the boot props available to the layout', async () => {
    await page.goto(`${rootURL}/bootprops/test`)
    await reactReady(page)
    await expect(page).toMatchText('#bootprops', 'this is a boot prop')
  })
})
