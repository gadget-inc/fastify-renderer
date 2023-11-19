import { defineRenderHook } from '../../src/node/defineRenderHook'

let thunkId = 0
export default defineRenderHook(() => {
  const id = thunkId++

  return {
    heads: () => {
      return `<style>#${id} {}</style>`
    },
    postRenderHeads: () => {
      return ''
    },
  }
})
