import validator from 'html-validator'
import { Page } from 'playwright-chromium'
import { newTestPage, reactReady, rootURL } from '../helpers'
import { describe, test, beforeEach, expect, vi } from 'vitest'

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

  test('Can render on client if fails on server', async () => {
    await page.goto(rootURL + '/error')
    expect(await page.content()).to.contain('Loading')
    await reactReady(page)
    expect(await page.content()).to.contain('Failed on server but I live on!')
  })
})
