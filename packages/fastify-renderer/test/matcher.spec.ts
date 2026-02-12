import { matcher } from '../src/client/react/matcher'

describe('matcher', () => {
  test('supports legacy wildcard params from path-to-regexp <8', () => {
    const [matched, params] = matcher(
      '/app/:tenant/:env/schema/:namespace/:splat*',
      '/app/acme/prod/schema/core/getting-started/intro'
    )

    expect(matched).toBe(true)
    expect(params).toEqual({
      tenant: 'acme',
      env: 'prod',
      namespace: 'core',
      splat: ['getting-started', 'intro'],
    })
  })

  test('matches catch-all route', () => {
    const [matched, params] = matcher('/*', '/totally/unknown/path')

    expect(matched).toBe(true)
    expect(params).toEqual({
      splat: ['totally', 'unknown', 'path'],
    })
  })

  test('matches route with named segment and wildcard tail', () => {
    const [matched, params] = matcher('/app/:tenant/:env/schema/:namespace/*', '/app/my-app/development/schema/catalog/orders')

    expect(matched).toBe(true)
    expect(params).toEqual({
      tenant: 'my-app',
      env: 'development',
      namespace: 'catalog',
      splat: ['orders'],
    })
  })

  test('matches route with fixed number of named segments', () => {
    const [matched, params] = matcher('/app/:tenant/:env/schema/:resource', '/app/my-app/development/schema/order')

    expect(matched).toBe(true)
    expect(params).toEqual({
      tenant: 'my-app',
      env: 'development',
      resource: 'order',
    })
  })

  test('query and hash do not affect matching', () => {
    const [matched, params] = matcher('/app/:tenant/:env/schema/:resource', '/app/my-app/development/schema/order?tab=fields#actions')

    expect(matched).toBe(true)
    expect(params).toEqual({
      tenant: 'my-app',
      env: 'development',
      resource: 'order',
    })
  })

  test('does not overmatch non-wildcard route', () => {
    const [matched, params] = matcher('/app/:tenant/:env/schema/:resource', '/app/my-app/development/schema/order/extra')

    expect(matched).toBe(false)
    expect(params).toBeNull()
  })

  test('matches base route with two params', () => {
    const [matched, params] = matcher('/app/:tenant/:env', '/app/my-app/development')

    expect(matched).toBe(true)
    expect(params).toEqual({
      tenant: 'my-app',
      env: 'development',
    })
  })

  test('markdown path still matches route pattern', () => {
    const [matched, params] = matcher('/app/:tenant/:env/schema/:resource', '/app/my-app/development/schema/order.md')

    expect(matched).toBe(true)
    expect(params).toEqual({
      tenant: 'my-app',
      env: 'development',
      resource: 'order.md',
    })
  })
})
