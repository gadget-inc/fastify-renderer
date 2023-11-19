import { Page } from 'playwright-chromium'
import { describe, test, beforeEach, expect } from '@jest/globals'
import { newTestPage, reactReady, rootURL } from '../helpers'
import { describe, test, beforeEach, expect } from 'vitest'

describe('Custom Template', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
    await page.goto(`${rootURL}`)
    await reactReady(page)
  })

  test('should use the custom template provided', async () => {
    await page.goto(`${rootURL}/custom-template`)
    const title = await page.title()
    expect(title).toEqual('Fastify Renderer Custom Template')
    await reactReady(page)
  })
})
