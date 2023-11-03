import React, { ReactElement } from 'react'

export default {
  name: 'Test transform hook',
  transform: (app: ReactElement) =>
    React.createElement(React.Fragment, null, React.createElement('h1', null, 'Transform Hook'), app),
}
