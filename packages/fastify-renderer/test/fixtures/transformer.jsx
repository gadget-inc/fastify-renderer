import React from 'react'
export default function Wrapped(app) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return React.createElement(React.Fragment, null, React.createElement('h1', null, 'Transform Hook'), app)
}
