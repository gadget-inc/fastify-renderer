import { Page } from 'playwright-chromium'
import { newTestPage, rootURL } from '../helpers'
import { describe, test, expect, beforeEach, vi } from 'vitest'

describe('boot props', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
  })

  test('should make the boot props available to the layout', async () => {
    await page.goto(`${rootURL}/bootprops/test`)

    await vi.waitFor(async () => expect(await page.textContent('#bootprops')).toContain('this is a boot prop'))
  })
})
