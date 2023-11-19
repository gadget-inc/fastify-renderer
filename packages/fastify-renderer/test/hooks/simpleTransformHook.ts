import React, { ReactElement } from 'react'
import { defineRenderHook } from '../../src/node/defineRenderHook'

export default defineRenderHook({
  name: 'Test transform hook',
  transform: (app: ReactElement) =>
    React.createElement(React.Fragment, null, React.createElement('h1', null, 'Transform Hook'), app),
})
