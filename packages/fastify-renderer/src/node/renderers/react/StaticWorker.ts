import { parentPort } from 'worker_threads'
import { WorkerRenderInput } from '../../types'
import { staticRender } from './ssr'

if (!parentPort) throw new Error('Missing parentPort')
const port = parentPort

port.on('message', (args: WorkerRenderInput) => {
  const content = staticRender({ ...args, module: require(args.modulePath).default })
  port.postMessage(content)
})
