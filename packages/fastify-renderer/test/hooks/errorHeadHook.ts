export default () => ({
  heads: () => {
    throw new Error('Hook error!')
    return ''
  },
  tails: () => {
    // throw new Error('Hook error!')
    return ''
  },
})
