import validator from 'html-validator'
import { reactReady } from './helpers'

describe('simple-react', () => {
  test('Returns valid HTML content', async () => {
    await page.goto(`http://localhost:${3000}`)
    const html = await page.content()
    expect(() =>
      validator({
        data: html,
      })
    ).not.toThrow()

    await reactReady(page)
  })
})
