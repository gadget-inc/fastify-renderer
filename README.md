# fastify-renderer

![Build Status](https://github.com/gadget-inc/fastify-renderer/workflows/ci/badge.svg)
[![NPM version](https://img.shields.io/npm/v/fastify-renderer.svg?style=flat)](https://www.npmjs.com/package/fastify-renderer)

`fastify-renderer` renders client side JavaScript applications on the server to improve user experience. `fastify-renderer` is a standard Fastify plugin that mounts into an existing fastify application, so it's easy to use for only some routes.

`fastify-renderer` works similarly to `next.js` and other SSR frameworks, where the first pageload a user makes is server side rendered, and then a client side app is booted. Subsequent navigations are handled client side, where the client makes a `fetch` call to retrieve the next set of `props` for the next page as JSON data, instead of re-rendering the whole page server side.

Features:

- React SSR for fastify using `vite`
- Allows async work ahead of time to produce props for the page, which means you can use a database connection, redis, or whatever else you have server side in Fastify
- Support for rich React component layouts wrapping each page
- Support for fastify plugin encapsulation contexts, so can be used to support different "areas" of an app within the same fastify server
- Support for managing the full document shape using EJS templates

## Installation

```shell
# Using npm
npm install fastify-renderer --save
# Using yarn
yarn install fastify-renderer
```

## Registering the plugin

```js
import fastify from 'fastify'
import renderer from 'fastify-renderer'

const server = fastify()
server.register(renderer)
```

After registering the plugin, you need to set a render config for a Fastify encapsulation context.

```js
// at the root, you can set the render config for the whole server
server.setRenderConfig({
  layout: '../client/Layout.jsx',
})

// or within a context, you can set the render config for just routes defined in that context
server.register(async (server) => {
  server.setRenderConfig({
    base: '/auth',
    layout: '../client/auth/AuthLayout',
  })

  server.get('/auth/login', { render: require.resolve('../client/auth/LoginPage') }, async (request) => ({}))
})
```

## Rendering from routes

Once the plugin is registered, any route in your Fastify application can render components. To make a route render a component, pass a component path as the `render` option to the route options:

```js
server.get('/sample-route', { render: require.resolve('../client/ExampleComponent') }, async (_request) => {
  const props = { hello: 'world' }
  return props
})
```

Unlike a normal Fastify route handler, render route functions don't use `reply.send` to return HTML content. Instead, your route handler function should return a `props` object. This `props` object will be passed to the rendered component when being rendered server side, and will be fetched from this route and passed to the component when being rendered client side.

### Configuration options

You can optionally provide configuration options to the plugin:

- `renderer` - Object that provides the rendering options
  - `type` - Only value supported currently is 'react'
  - `mode` - Specifies whether we want to render in sync or streaming mode
- `vite` - Vite [InlineConfig](https://vitejs.dev/guide/api-javascript.html#inlineconfig) options
- `base` - The base path we want our renderer to use
- `layout` - The path to a layout component inside of which other routes will be rendered
- `document` - HTML template inside of which everything is rendered. The `template` option accepts a function which should return a `ReadableStream` to produce the output HTML.
- `devMode` - Boolean, when true a vite devServer is created
- `outDir` - The directory where the files generated by the Vite build will be created
- `assetsHost` - The host url from which files will be accessible to the browser
- `hooks` - Array of FastifyRendererHook
  - `name` - Optional string value
  - `heads` - Function that will return html tags to be appended to the document head tag
  - `tails` - Function that will return html tags to be appended to the document body tag
  - `transform` - Function that will be run to transform the root react element
  - `postRenderHeads` - Function (called after render) that will return html tags to be appended to the document head tag. Useful when injecting styles that rely on rendering first.

The plugin will render the component server side and return it, where as the route handler will return the props to the frontend when needed.

#### Controlling the document template

The raw HTML wrapper for each SSR page can be controlled with the `document` option passed at the root level plugin config or with `.setRenderConfig`. The `document` option accepts a function which is given render data, and should return a `ReadableStream` object for piping to the browser. We use a streaming interface in order to stream the result efficiently to the browser before the whole render is complete.

The function is passed a `data` object which should be used for interpolating values into your output stream. Here's the shape of the `data` object:

```typescript
/** Data passed to the template function by the renderer */
interface TemplateData<Props> {
  /** The content for including in the `<head/>` tag of the rendered document */
  head: NodeJS.ReadableStream
  /** The content for including after the app just before the `</body>` tag of the rendered document */
  tail: NodeJS.ReadableStream
  /** The main content for the app */
  content: string | NodeJS.ReadableStream
  /** The props object generated by the route handler for this render */
  props: Props
}
```

Usually, the `stream-template` package is used for this for super easy interpolation of streams.

Here's the default template source:

```typescript
import template from 'stream-template'

export const DefaultDocumentTemplate: Template = (data: TemplateData<any>) => template`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${data.props.title || 'Fastify Renderer App'}</title>
    ${data.head}
  </head>
  <body>
    <div id="fstrapp">${data.content}</div>
    ${data.tail}
  </body>
</html>
`
```

## Imperatively rendering a component

Imperative rendering allows routes to dynamically render a component based on specific conditions, instead of always rendering the same component. To do so, we still require that the component is registered to allow Vite to bundle it.

Note that the route which renders the component is a normal route that doesn't need any special route options configuration.

To register a component, you can do the following:

```js
// The return value needs to be passed down to the reply.render() function
const Renderable = server.registerRenderable(require.resolve('./ImperativelyRenderablePage'))
```

And then you can render it imperatively in your routes:

```js
server.get('/imperative', async (request, reply) => {
  return reply.render(Renderable, {
    hostname: os.hostname(),
    requestIP: request.ip,
  })
})
```

A big reason why you might want to imperatively render routes is for conditional rendering, where you only want to render if the user has permission or if some header is correctly passed. Imperative rendering works fine for routes that only sometimes use `reply.render`, and otherwise do normal `reply.send`s:

```js
server.get('/imperative/:bool', async (request: FastifyRequest<{ Params: { bool: string } }>, reply) => {
  if (request.params.bool == 'true') {
    return reply.render(Renderable, {
      hostname: os.hostname(),
      requestIP: request.ip,
    })
  } else {
    return reply.redirect('/not-found')
  }
})
```

## How it works

- mounts a `vite` server as a fastify plugin that knows how to transform code to be run server side.
- provides renderers that use vite for react and other popular frameworks (Currently only React is supported)
- provides a convention for async ahead of time work to pass data into renderers
- provides a router convention that the server and client agree on

## Why was it created

The goal of fastify-renderer is to bring a great developer/user experience and improve the performance of frontend applications by leveraging existing technologies.

- next.js has a great developer experience but blocks the main thread when rendering react.
- next.js uses express and webpack underneath, both of which have much better performing alternatives
- next.js must be both the bundler and the server, it's hard to mount it into an existing system like fastify and play nice with all the other plugins you might want to use when doing :gasp: server side rendered :gasp: applications
- vite is awesome but also wants to be the server and keep the frontend entirely separate from the backend
- server side rendering is hard and reinventing that wheel is no fun
- hot reloading in development is hard and reinventing that wheel is no fun
- bundling for production is hard and reinventing that wheel is no fun
- esbuild is very fast

## Additional details

- [Navigating between routes from different Fastify contexts](./docs/fastify-contexts)

## Roadmap

- Add support for rendering outside the main thread by using Piscina.js
- Add support for Vue and other frontend frameworks

## License

[MIT](./LICENSE)
