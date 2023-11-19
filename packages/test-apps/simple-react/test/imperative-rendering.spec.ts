import { Page } from 'playwright-chromium'
import { describe, test, beforeEach, expect } from '@jest/globals'
import { newTestPage, reactReady, rootURL } from '../helpers'
import { describe, test, beforeEach, expect } from 'vitest'

describe('imperative rendering', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
  })

  test('the route table should include the imperative route', async () => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    page.on('response', async (response) => {
      if (response.url().includes('@fstr!route-table.js')) {
        const responseBody = await response.text()
        expect(responseBody).toBeDefined()
        expect(responseBody.includes('/imperative/apple')).toBe(true)
      }
    })

    await page.goto(`${rootURL}/imperative/apple`)
    await reactReady(page)
  })

  test('the route handler should redirect to a 404 page', async () => {
    await page.goto(`${rootURL}/imperative/banana`)
    expect(await page.isVisible("text='Not found'")).toBe(true)
  })

  test('the route handler should render the component', async () => {
    await page.goto(`${rootURL}/imperative/apple`)
    await reactReady(page)
    expect(await page.isVisible("text='Imperative Apple'")).toBe(true)

    await page.goto(`${rootURL}/imperative/orange`)
    await reactReady(page)
    expect(await page.isVisible("text='Imperative Orange'")).toBe(true)
  })
})
