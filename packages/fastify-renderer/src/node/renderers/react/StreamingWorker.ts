import { parentPort } from 'worker_threads'
import { StreamWorkerEvent, WorkerRenderInput } from '../../types'
import { streamingRender } from './ssr'

if (!parentPort) throw new Error('Missing parentPort')
const port = parentPort

port.on('message', (args: WorkerRenderInput) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { content, head, tail } = streamingRender({ ...args, module: require(args.modulePath).default })

  const stackStream = (stack: 'tail' | 'content' | 'head', stream: NodeJS.ReadableStream) => {
    const send = ({ stack, content }: StreamWorkerEvent) => {
      port.postMessage({ stack, content } satisfies StreamWorkerEvent)
    }
    stream.on('data', (content) => {
      send({ stack, content })
    })
    // stream.on('close', () => {
    //   send({ stack, type: 'close' })
    // })
    // stream.on('error', (content) => {
    //   send({ stack, type: 'error', content })
    // })

    // stream.on('end', () => {
    //   send({ stack, type: 'end' })
    // })
  }

  stackStream('head', head)
  stackStream('content', content)
  stackStream('tail', tail)
})
