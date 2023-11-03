import { parentPort } from 'worker_threads'
import { StreamWorkerEvent, WorkerRenderInput } from '../../types'
import { staticRender } from './ssr'

if (!parentPort) throw new Error('Missing parentPort')
const port = parentPort

port.on('message', (args: WorkerRenderInput) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { content, head, tail } = staticRender({ ...args, module: require(args.modulePath).default })
  const stackStream = (stack: 'tail' | 'content' | 'head', stream: NodeJS.ReadableStream) => {
    const send = ({ stack, content }: StreamWorkerEvent) => {
      port.postMessage({ stack, content } satisfies StreamWorkerEvent)
    }
    stream.on('data', (content: Uint8Array) => {
      send({ stack, content: content === null ? null : Buffer.from(content).toString() })
    })
    // stream.on('close', () => {
    //   send({ stack, type: 'close' })
    // })
    // stream.on('error', (content) => {
    //   send({ stack, type: 'error', content })
    // })

    stream.on('end', () => {
      send({ stack, content: null })
    })
  }

  stackStream('head', head)
  stackStream('content', content)
  stackStream('tail', tail)
})
