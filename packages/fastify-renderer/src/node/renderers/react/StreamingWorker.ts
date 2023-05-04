import { parentPort, workerData } from 'worker_threads'
import { streamingRender } from './ssr'

// if (!isMainThread) throw new Error('Worker spawned in Main thread')

const args = workerData as {
  modulePath: string
  renderBase: string
  destination: string
  bootProps: Record<string, any>
  mode: string
}

const stream = streamingRender({ ...args, module: require(args.modulePath).default })

async function main() {
  stream.on('data', (content) => {
    if (!parentPort) throw new Error('Missing parentPort')
    parentPort.postMessage(content)
  })
}

main()
