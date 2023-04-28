import path from 'path'
import FastifyRenderer from '../src/node'
import { unthunk } from '../src/node/utils'
import { newFastify } from './helpers'

const testComponent = require.resolve(path.join(__dirname, 'fixtures', 'test-module.tsx'))
const testLayoutComponent = require.resolve(path.join(__dirname, 'fixtures', 'test-layout.tsx'))
let thunkId = 0

const options = {
  vite: { root: __dirname, logLevel: (process.env.LOG_LEVEL ?? 'info') as any },
  devMode: true,
  renderer: {
    mode: 'sync' as const,
    type: 'react' as const,
  },
  hooks: [
    {
      heads: () => {
        return 'head'
      },
      transform: (app) => {
        return app
      },
      postRenderHeads: () => {
        return 'postRenderHead'
      },
    },
    () => {
      const id = thunkId++

      return {
        heads: () => {
          return `<style>#${id} {}</style>`
        },
        transform: (app) => {
          return app
        },
        postRenderHeads: () => {
          return ''
        },
      }
    },
  ],
}

describe('FastifyRenderer', () => {
  let server
  beforeAll(async () => {
    server = await newFastify()
    await server.register(FastifyRenderer, options)
    server.setRenderConfig({
      base: '',
      layout: testLayoutComponent,
    })

    server.get('/plain', async (_request, reply) => reply.send('Hello'))
    server.get('/render-test', { render: testComponent }, async (_request, _reply) => ({ a: 1, b: 2 }))
    server.get(
      '/early-hook-reply',
      {
        preValidation: async (_request, reply) => {
          await reply.code(201).send('hello')
        },
        render: testComponent,
      },
      async (_request, _reply) => ({ a: 1, b: 2 })
    )
    server.get('/early-handler-reply', { render: testComponent }, async (request, reply) => {
      await reply.code(201).send('hello')
      return { a: 1, b: 2 }
    })
    await server.ready()
  })

  beforeEach(() => {
    thunkId = 0
  })

  test('should return the route props if content-type is application/json', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/render-test',
      headers: { Accept: 'application/json' },
    })

    expect(response.body).toEqual(JSON.stringify({ props: { a: 1, b: 2 } }))
  })

  test('should render and return html if content-type is text/html', async () => {
    const response = await server.inject({ method: 'GET', url: '/render-test', headers: { Accept: 'text/html' } })

    expect(response.body).toMatch('<h1>1</h1><p>2</p>')
  })
  test('for unknown content types should set content-type to text/plain and return a message', async () => {
    const response = await server.inject({ method: 'GET', url: '/render-test', headers: { Accept: 'other' } })

    expect(response.body).toEqual('Content type not supported')
  })

  test('should not render anything if a hook replies before the render phase is reached', async () => {
    const response = await server.inject({ method: 'GET', url: '/early-hook-reply', headers: { Accept: 'text/html' } })

    expect(response.statusCode).toEqual(201)
    expect(response.body).toEqual('hello')
  })

  test('should not render anything if the handler replies before its end', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/early-handler-reply',
      headers: { Accept: 'text/html' },
    })

    expect(response.statusCode).toEqual(201)
    expect(response.body).toEqual('hello')
  })

  // TODO: Re-introduce transformation hooks
  test.skip('should call hooks in correct order', async () => {
    const callOrder: string[] = []
    const hook = unthunk(options.hooks[0])
    jest.spyOn(hook, 'heads').mockImplementation(() => {
      callOrder.push('heads')
      return 'head'
    })
    jest.spyOn(hook, 'transform').mockImplementation((app) => {
      callOrder.push('transforms')
      return app
    })
    jest.spyOn(hook, 'postRenderHeads').mockImplementation(() => {
      callOrder.push('postRenders')
      return 'postRender'
    })

    await server.inject({
      method: 'GET',
      url: '/render-test',
      headers: { Accept: 'text/html' },
    })

    expect(callOrder).toEqual(['transforms', 'heads', 'postRenders'])
  })

  test('should unthunk hooks on every render', async () => {
    const firstResponse = await server.inject({
      method: 'GET',
      url: '/render-test',
      headers: { Accept: 'text/html' },
    })

    const secondResponse = await server.inject({
      method: 'GET',
      url: '/render-test',
      headers: { Accept: 'text/html' },
    })

    expect(firstResponse.body).toMatch('<style>#0 {}</style>')
    expect(secondResponse.body).toMatch('<style>#1 {}</style>')
  })
})
