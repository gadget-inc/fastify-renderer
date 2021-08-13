import { FastifyInstance } from 'fastify'
import fs from 'fs-extra'
import { resolve } from 'path'
import { Page } from 'playwright-chromium'

process.env.NODE_ENV ??= 'test'

export function slash(p: string): string {
  return p.replace(/\\/g, '/')
}

// injected by the test env
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      page?: Page
    }
  }
}

let server: FastifyInstance
let err: Error

const logs: string[] = ((global as any).browserLogs = [])
const onConsole = (msg) => {
  logs.push(msg.text())
}

beforeAll(async () => {
  const page = global.page
  if (!page) {
    return
  }
  try {
    page.on('console', onConsole)

    const testPath = expect.getState().testPath
    const testName = slash(testPath).match(/test-apps\/([\w-]+)\//)?.[1]

    // if this is a test placed under test-apps/xxx/test/
    // start a vite server in that directory.
    if (testName) {
      const testAppsRoot = resolve(__dirname, '../packages/test-apps')
      const srcDir = resolve(testAppsRoot, testName)

      const serverEntrypoint = resolve(srcDir, 'server.ts')
      if (!fs.existsSync(serverEntrypoint)) {
        throw Error(`Missing server entrypoint file at: ${serverEntrypoint}`)
      }

      const { server: fastifyServer } = require(serverEntrypoint)
      server = await fastifyServer()
      await server.listen(3000)
      const url = `http://localhost:${3000}`
      await page.goto(url)
    }
  } catch (e) {
    // jest doesn't exit if our setup has error here
    // https://github.com/facebook/jest/issues/2713
    err = e

    // Closing the page since an error in the setup, for example a runtime error
    // when building the playground should skip further tests.
    // If the page remains open, a command like `await page.click(...)` produces
    // a timeout with an exception that hides the real error in the console.
    await page.close()
  }
}, 30000)

afterAll(async () => {
  global.page?.off('console', onConsole)
  await global.page?.close()
  await server?.close()
  if (err) {
    throw err
  }
})
