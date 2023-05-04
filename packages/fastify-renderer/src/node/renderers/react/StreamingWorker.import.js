// Context: https://github.com/TypeStrong/ts-node/issues/676#issuecomment-470898116
require('ts-node').register({
    // Disable type-checking
    transpileOnly: true
});
require(require.resolve('./StreamingWorker.ts'));
