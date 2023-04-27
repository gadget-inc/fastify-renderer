// Context: https://github.com/TypeStrong/ts-node/issues/676#issuecomment-470898116
require('ts-node').register()
require(require.resolve('./Worker.ts'))
