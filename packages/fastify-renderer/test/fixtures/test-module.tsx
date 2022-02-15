import React from 'react'

// eslint-disable-next-line react/display-name
export default function (props: { a: string; b: number }) {
  if (typeof props.a == 'undefined') {
    throw new Error('expected to be passed props from render function')
  }
  return (
    <>
      <h1>{props.a}</h1>
      <p>{props.b}</p>
    </>
  )
}
