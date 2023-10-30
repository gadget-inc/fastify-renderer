import { FastifyInstance } from 'fastify'
import fs from 'fs-extra'
import { resolve } from 'path'
import { ConsoleMessage, Page } from 'playwright-chromium'

export function slash(p: string): string {
  return p.replace(/\\/g, '/')
}

const logs: string[] = ((global as any).browserLogs = [])
const onConsole = (msg: ConsoleMessage) => {
  logs.push(msg.text())
}
let pages: Page[] = []

let server: FastifyInstance
let err: Error

export const port = 3000 + parseInt(process.env.JEST_WORKER_ID!) - 1
export const rootURL = `http://localhost:${port}`

beforeAll(async () => {
  const testPath = expect.getState().testPath as string
  // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
  const testName = slash(testPath).match(/test-apps\/([\w-]+)\//)?.[1]

  // if this is a test placed under test-apps/xxx/test/
  // start a fastify server in that directory.
  if (testName) {
    const testAppsRoot = resolve(__dirname, './')
    const srcDir = resolve(testAppsRoot, testName)

    const serverEntrypoint = resolve(srcDir, 'server.ts')
    if (!fs.existsSync(serverEntrypoint)) {
      throw Error(`Missing server entrypoint file at: ${serverEntrypoint}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { server: fastifyServer } = require(serverEntrypoint)
    server = await fastifyServer()
    await server.listen(port)
  }
})

afterAll(async () => {
  await server?.close()
  if (err) {
    throw err
  }
})

afterEach(async () => {
  for (const page of pages) {
    // Closing the page since an error in the setup, for example a runtime error
    // when building the playground should skip further tests.
    // If the page remains open, a command like `await page.click(...)` produces
    // a timeout with an exception that hides the real error in the console.
    await page.close()
  }
  pages = []
})

/** Create a new playwright page for testing against */
export const newTestPage = async (): Promise<Page> => {
  const page: Page = await browser.newPage()
  page.on('console', onConsole)
  pages.push(page)

  return page
}

/** Block until the fastify-renderer app loaded at the page has successfully hydrated */
export const reactReady = async (page: Page) => {
  await page.waitForFunction('window.fastifyRendererReady')
}
