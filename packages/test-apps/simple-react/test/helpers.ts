import { Page } from 'playwright-chromium'

export const reactReady = async (page: Page) => {
  await page.waitForFunction('window.fastifyRendererReady')
}
