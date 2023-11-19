import { Page } from 'playwright-chromium'
import { describe, test, beforeEach, expect } from '@jest/globals'
import { newTestPage, reactReady, rootURL } from '../helpers'
import { describe, test, beforeEach, expect } from 'vitest'

describe('navigation details', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
    await page.goto(`${rootURL}/navigation-history-test`)
    await reactReady(page)
  })

  test('navigating to an anchor will scroll down to the anchor', async () => {
    const visibleBeforeClick = await isIntersectingViewport(page, '#section')
    expect(visibleBeforeClick).toBe(false)

    await page.click('#section-link')

    const visibleAfterClick = await isIntersectingViewport(page, '#section')
    expect(visibleAfterClick).toBe(true)
  })

  test('navigating to an anchor that is on the same page via replace: true will not scroll to the anchor', async () => {
    const visibleBeforeClick = await isIntersectingViewport(page, '#section')
    expect(visibleBeforeClick).toBe(false)

    await page.click('#section-link-replace')

    const visibleAfterClick = await isIntersectingViewport(page, '#section')
    expect(visibleAfterClick).toBe(false)
  })
})

const isIntersectingViewport = (page: Page, selector: string): Promise<boolean> => {
  return page.$eval(selector, async (element) => {
    const visibleRatio: number = await new Promise((resolve) => {
      const observer = new IntersectionObserver((entries) => {
        resolve(entries[0].intersectionRatio)
        observer.disconnect()
      })
      observer.observe(element)
      // Firefox doesn't call IntersectionObserver callback unless
      // there are rafs.
      requestAnimationFrame(() => {
        /**/
      })
    })
    return visibleRatio > 0
  })
}
