import { parentPort } from 'worker_threads'
import { RenderBus } from '../../RenderBus'
import { StreamWorkerEvent, WorkerRenderInput } from '../../types'
import { staticRender } from './ssr'

if (!parentPort) throw new Error('Missing parentPort')
const port = parentPort

port.on('message', (args: WorkerRenderInput) => {
  const bus = new RenderBus()
  const stackStream = (stack: 'tail' | 'content' | 'head') => {
    const stream = bus.stack(stack)
    const send = ({ stack, content }: StreamWorkerEvent) => {
      port.postMessage({ stack, content } satisfies StreamWorkerEvent)
    }
    stream.on('data', (content: Uint8Array) => {
      send({ stack, content: Buffer.from(content).toString() })
    })

    stream.on('end', () => {
      send({ stack, content: null })
    })
  }

  stackStream('head')
  stackStream('content')
  stackStream('tail')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  staticRender({ bus, ...args, module: require(args.modulePath).default, mode: 'streaming' })
})
