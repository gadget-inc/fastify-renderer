import { parentPort, workerData } from 'worker_threads'
import { staticRender } from './ssr'

// if (!isMainThread) throw new Error('Worker spawned in Main thread')

const args = workerData as {
  modulePath: string
  renderBase: string
  destination: string
  bootProps: Record<string, any>
  mode: string
}

const content = staticRender({ ...args, module: require(args.modulePath).default })
if (!parentPort) throw new Error('Missing parentPort')

parentPort.postMessage(content)
