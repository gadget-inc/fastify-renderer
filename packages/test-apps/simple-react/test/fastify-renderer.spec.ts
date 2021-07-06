import { FastifyInstance } from 'fastify'
import validator from 'html-validator'
import { server } from '../server'

describe('fastify-renderer', () => {
  let instance: FastifyInstance
  beforeEach(async () => {
    instance = await server()
  })
  afterEach(async () => {
    await instance.close()
  })

  test('it should render a simple route', async () => {
    const response = await instance.inject({
      path: '/',
    })

    expect(response.statusCode).toEqual(200)
    expect(() =>
      validator({
        data: response.body,
      })
    ).not.toThrow()
  })
})
