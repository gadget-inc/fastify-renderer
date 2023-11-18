try {
  const tsWorkerPath = require.resolve('./StaticWorker.ts')

  // Context: https://github.com/TypeStrong/ts-node/issues/676#issuecomment-470898116
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('ts-node').register({
    // Disable type-checking
    transpileOnly: true,
  })
  require(tsWorkerPath)
} catch (e) {
  console.warn('Falling back to js', e)
  const jsWorkerPath = require.resolve('./StaticWorker.js')
  require(jsWorkerPath)
}
