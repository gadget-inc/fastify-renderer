import { FastifyRendererHook } from './types'

type RenderHookParam = FastifyRendererHook | (() => FastifyRendererHook)

export const defineRenderHook = (arg: RenderHookParam) => arg
