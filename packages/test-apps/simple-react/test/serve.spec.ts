import validator from 'html-validator'
import { Page } from 'playwright-chromium'
import { describe, test, beforeEach, expect } from '@jest/globals'
import { newTestPage, reactReady, rootURL } from '../helpers'
import { describe, test, beforeEach, expect } from 'vitest'

describe('simple-react', () => {
  let page: Page
  beforeEach(async () => {
    page = await newTestPage()
  })

  test('Returns valid HTML content', async () => {
    await page.goto(rootURL)
    const html = await page.content()
    expect(() =>
      validator({
        data: html,
      })
    ).not.toThrow()

    await reactReady(page)
  })
})
