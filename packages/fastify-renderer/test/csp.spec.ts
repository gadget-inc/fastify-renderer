import * as cheerio from 'cheerio'
import path from 'path'
import { expect, test, describe, beforeAll } from '@jest/globals'
import FastifyRenderer from '../src/node'
import { newFastify } from './helpers'

const testComponent = require.resolve(path.join(__dirname, 'fixtures', 'test-style-importer.tsx'))
const testLayoutComponent = require.resolve(path.join(__dirname, 'fixtures', 'test-layout.tsx'))

const options = {
  vite: { root: __dirname, logLevel: (process.env.LOG_LEVEL ?? 'info') as any },
  devMode: true,
  renderer: {
    mode: 'sync' as const,
    type: 'react' as const,
  },
}

describe('csp nonce handling', () => {
  let server
  beforeAll(async () => {
    server = await newFastify()
    await server.register(FastifyRenderer, options)
    server.setRenderConfig({
      base: '',
      layout: testLayoutComponent,
    })

    server.decorateReply('cspNonce', {
      style: 'style-nonce',
      script: 'script-nonce',
    })
    server.get('/render-test', { render: testComponent }, async (_request, _reply) => ({ a: 1, b: 2 }))
  })

  test('should script and style tags with csp nonces if available', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/render-test',
      headers: { Accept: 'text/html' },
    })

    expect(response.statusCode).toEqual(200)
    const $ = cheerio.load(response.body as string)
    const scripts = $('script')
    expect(scripts).toHaveLength(3)
    for (const tag of scripts) {
      expect(tag.attribs.nonce).toEqual('script-nonce')
    }
  })
})
