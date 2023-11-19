import { parentPort } from 'worker_threads'
import { RenderBus } from '../../RenderBus'
import { StreamWorkerEvent, WorkerRenderInput } from '../../types'
import { staticRender } from './ssr'

if (!parentPort) throw new Error('Missing parentPort')
const port = parentPort

port.on('message', (args: WorkerRenderInput) => {
  const bus = new RenderBus()
  const stackStream = (stack: 'tail' | 'content' | 'head' | 'error') => {
    const stream = bus.stack(stack)
    const send = ({ stack, content }: StreamWorkerEvent) => {
      port.postMessage({ stack, content } satisfies StreamWorkerEvent)
    }
    stream.on('data', (content: Uint8Array) => {
      send({ stack, content: Buffer.from(content).toString() })
    })

    stream.on('end', () => {
      console.log('Stream ended for', stack)
      send({ stack, content: null })
    })
  }

  stackStream('error')
  stackStream('head')
  stackStream('content')
  stackStream('tail')
  void import(args.modulePath).then((module) => staticRender({ bus, ...args, module: module.default }))
})
