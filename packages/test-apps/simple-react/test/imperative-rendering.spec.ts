import { Page } from 'playwright-chromium'
import { newTestPage, rootURL } from '../../helpers'

// For these tests, we don't use reactReady because the page is rendered server side so we don't need to wait on the client side
describe('imperative rendering', () => {
  let page: Page

  beforeEach(async () => {
    page = await newTestPage()
  })

  test('the route should not fetch props and hydrate on the client side', async () => {
    page.on('request', (request) => {
      if (request.headers().accept === 'application/json') {
        throw new Error(
          `Expecting request to only be rendered server side, props request made: ${request.method()} ${request.url()}`
        )
      }
    })

    await page.goto(`${rootURL}/imperative-true`)
  })

  test('the route handler should redirect to a 404 page', async () => {
    await page.goto(`${rootURL}/imperative/false`)
    expect(await page.isVisible("text='Not Found'")).toBe(true)
  })

  test('the route handler should render the component', async () => {
    await page.goto(`${rootURL}/imperative/true`)
    expect(await page.isVisible("text='Imperatively renderable page'")).toBe(true)
  })
})
