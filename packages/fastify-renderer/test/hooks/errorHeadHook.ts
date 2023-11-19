import { defineRenderHook } from '../../src/node/defineRenderHook'

export default defineRenderHook(() => ({
  heads: (props) => {
    if (props.failheads) {
      throw new Error('Hook error!')
    }
    return ''
  },
}))
