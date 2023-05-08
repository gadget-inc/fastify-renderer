import { parentPort } from 'worker_threads'
import { WorkerRenderInput } from '../../types'
import { staticRender } from './ssr'

if (!parentPort) throw new Error('Missing parentPort')
const port = parentPort

port.on('message', (args: WorkerRenderInput) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const content = staticRender({ ...args, module: require(args.modulePath).default })
  port.postMessage(content satisfies string)
})
