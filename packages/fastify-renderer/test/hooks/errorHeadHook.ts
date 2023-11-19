import { defineRenderHook } from '../../src/node/defineRenderHook'

export default defineRenderHook(() => ({
  heads: () => {
    // throw new Error('Hook error!')
    return ''
  },
  tails: () => {
    // throw new Error('Hook error!')
    return ''
  },
}))
