try {
  const tsWorkerPath = require.resolve('./StreamingWorker.ts')

  // Context: https://github.com/TypeStrong/ts-node/issues/676#issuecomment-470898116
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('ts-node').register({
    // Disable type-checking
    transpileOnly: true,
  })
  require(tsWorkerPath)
} catch {
  const jsWorkerPath = require.resolve('./StreamingWorker.js')
  require(jsWorkerPath)
}
