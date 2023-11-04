import { expect } from '@playwright/test'
import { test, describe } from '@jest/globals'
import { newTestPage, reactReady, rootURL } from '../helpers'

describe('boot props', () => {
  test('should make the boot props available to the layout', async () => {
    const page = await newTestPage()
    await page.goto(`${rootURL}/bootprops/test`)
    await reactReady(page)
    await expect(page).toMatchText('#bootprops', 'this is a boot prop')
  })
})
