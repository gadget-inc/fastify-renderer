import { RenderInput } from '../../types'
interface RenderArgs extends RenderInput {
  module: any
}
export declare function staticRender({ bootProps, destination, renderBase, module, hooks }: RenderArgs): string
export declare function streamingRender({
  bootProps,
  destination,
  renderBase,
  module,
}: RenderArgs): NodeJS.ReadableStream
export {}
