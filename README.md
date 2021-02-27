# fastify-renderer

![Build Status](https://github.com/fastify/fastify-renderer/workflows/ci/badge.svg)
[![NPM version](https://img.shields.io/npm/v/fastify-renderer.svg?style=flat)](https://www.npmjs.com/package/fastify-renderer)

`fastify-renderer` renders client side JavaScript applications on the server to improve the user experience.

## What

TODO: make nice

- Render client side apps server side with minimal setup
- optional async work ahead of time using handy server side bits like a database connection or session stored in redis
- Serve server side props to client side pages as the navigations happen client side
- Control things outside the inner application like the `<head/>` tag when server rendering

## How

- mount a `vite` server as a fastify plugin that knows how to transform code to be run server side
- provide renderers that use vite for react and other popular frameworks
- provide a convention for async ahead of time work to pass data into renderers
- provide a router convention that the server and client agree on

## Why

TODO: make nice

- next.js has a great developer experience but blocks the main thread when rendering react
- next.js uses express and webpack underneath, both of which have much better performing alternatives
- next.js must be both the bundler and the server, it's hard to mount it into an existing system like fastify and play nice with all the other plugins you might want to use when doing :gasp: server side rendered :gasp: applications
- vite is awesome but also wants to be the server and keep the frontend entirely seperate from the backend
- server side rendering is hard and reinventing that wheel is no fun
- hot reloading in development is hard and reinventing that wheel is no fun
- bundling for production is hard and reinventing that wheel is no fun
- esbuild is very fast

## Status

Alpha. Pre-any-release.

## Installation

```shell
npm install fastify-renderer
```

## Example

```js
import renderer from 'fastify-renderer/react'

const server = fastify()
server.register(renderer)
```

## License

[MIT](./LICENSE)
