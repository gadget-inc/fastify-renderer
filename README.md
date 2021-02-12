# fastify-renderer

![Build Status](https://github.com/fastify/fastify-renderer/workflows/ci/badge.svg)
[![NPM version](https://img.shields.io/npm/v/fastify-renderer.svg?style=flat)](https://www.npmjs.com/package/fastify-renderer)

`fastify-renderer` renders client side JavaScript applications on the server to improve the user experience.

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
