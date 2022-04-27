import { Page } from 'playwright-chromium'
import { newTestPage, reactReady, rootURL } from '../../helpers'

// For these tests, we don't use reactReady because the page is rendered server side so we don't need to wait on the client side
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
        expect(responseBody.includes('/imperative/true')).toBe(true)
      }
    })

    await page.goto(`${rootURL}/imperative/true`)
    await reactReady(page)
  })

  test('the route handler should redirect to a 404 page', async () => {
    await page.goto(`${rootURL}/imperative/false`)
    await reactReady(page)
    expect(await page.isVisible("text='Not Found'")).toBe(true)
  })

  test('the route handler should render the component', async () => {
    await page.goto(`${rootURL}/imperative/true`)
    await reactReady(page)
    expect(await page.isVisible("text='Imperatively renderable page'")).toBe(true)
  })
})
