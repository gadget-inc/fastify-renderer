import { parentPort } from 'worker_threads'
import { streamingRender } from './ssr'

// if (!isMainThread) throw new Error('Worker spawned in Main thread')

interface Input {
  modulePath: string
  renderBase: string
  destination: string
  bootProps: Record<string, any>
  mode: string
}

if (!parentPort) throw new Error('Missing parentPort')
const port = parentPort

port.on('message', (args: Input) => {
  const stream = streamingRender({ ...args, module: require(args.modulePath).default })

  stream.on('data', (content) => {
    port.postMessage(content)
  })

  stream.on('end', () => port.postMessage(null))
})
