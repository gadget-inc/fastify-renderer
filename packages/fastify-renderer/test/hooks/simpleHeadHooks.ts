import { defineRenderHook } from '../../src/node/defineRenderHook'

export default defineRenderHook({
  heads: () => {
    return 'head'
  },
  postRenderHeads: () => {
    return 'postRenderHead'
  },
})
