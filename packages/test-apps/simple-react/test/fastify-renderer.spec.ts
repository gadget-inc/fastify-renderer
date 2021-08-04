import validator from 'html-validator'

describe('simple-react', () => {
  test('Returns valid HTML content', async () => {
    const html = await page.content()
    expect(() =>
      validator({
        data: html,
      })
    ).not.toThrow()
  })
})
