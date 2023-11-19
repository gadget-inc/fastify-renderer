import { newTestPage, rootURL } from '../helpers'
import { describe, test, expect, vi } from 'vitest'

describe('boot props', () => {
  test('should make the boot props available to the layout', async () => {
    const page = await newTestPage()
    await page.goto(`${rootURL}/bootprops/test`)

    await vi.waitFor(async () => expect(await page.textContent('#bootprops')).toContain('this is a boot prop'))
  })
})
