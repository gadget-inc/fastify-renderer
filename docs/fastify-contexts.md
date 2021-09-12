# Fastify encapsulation contexts

## Overview
One of the main features of Fastify is its support for different [encapsulation contexts](https://www.fastify.io/docs/latest/Encapsulation/), the context at which a route is registered determines which hooks, plugins, and decorators are available to it. 

For `fastify-renderer`, contexts are used to allow more customization and configuration for `vite` rendering options.

More specifically, it is possible to provide a custom `layout` to be used for rendering routes in a specific context.

*Note: Providing a different `layout` requires that you specifiy a new `base` as well.*

## Navigating between contexts
Since the router instance is only aware of routes in the current context, navigating to a route in a different context requires bypassing the router. 

This can be done in a couple of ways:
1. Using a `<Link>` tag but specifying the href property as an absolute path by prefixing it with a `~`
2. Using an `<a>` tag instead of a `<Link>` tag from `wouter`

## Example

```html
<!-- The router requests the page from the server -->
<Link href="~/">Home</Link>
<!-- The browser requests the page from the server without going through the router -->
<a href="/">Home</a>
```
