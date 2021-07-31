import validator from 'html-validator'

describe('simple-react', () => {
  test('Returns valid HTML content', async () => {
    await page.goto(fastifyRendererTestUrl)
    const html = await page.content()
    expect(() =>
      validator({
        data: html,
      })
    ).not.toThrow()
  })
})
