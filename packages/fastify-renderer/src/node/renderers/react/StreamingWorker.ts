import { parentPort } from 'worker_threads'
import { StreamWorkerEvent, WorkerRenderInput } from '../../types'
import { streamingRender } from './ssr'

if (!parentPort) throw new Error('Missing parentPort')
const port = parentPort

port.on('message', (args: WorkerRenderInput) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stream = streamingRender({ ...args, module: require(args.modulePath).default })

  const send = ({ content, type }: StreamWorkerEvent) => {
    port.postMessage({ type, content } satisfies StreamWorkerEvent)
  }
  stream.on('data', (content) => {
    send({ type: 'data', content })
  })
  stream.on('close', () => {
    send({ type: 'close' })
  })
  stream.on('error', (content) => {
    send({ type: 'error', content })
  })

  stream.on('end', () => {
    send({ type: 'end' })
  })
})
