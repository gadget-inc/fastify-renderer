let thunkId = 0
export default () => {
  const id = thunkId++

  return {
    heads: () => {
      return `<style>#${id} {}</style>`
    },
    postRenderHeads: () => {
      return ''
    },
  }
}
