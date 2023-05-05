import { parentPort } from 'worker_threads'
import { staticRender } from './ssr'

interface Input {
  modulePath: string
  renderBase: string
  destination: string
  bootProps: Record<string, any>
  mode: string
  hooks: string[]
}

if (!parentPort) throw new Error('Missing parentPort')
const port = parentPort

port.on('message', (args: Input) => {
  const content = staticRender({ ...args, module: require(args.modulePath).default })
  port.postMessage(content)
})
