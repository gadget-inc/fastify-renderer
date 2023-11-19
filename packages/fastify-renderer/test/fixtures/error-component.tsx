import React from 'react'

// eslint-disable-next-line react/display-name
export default function ({ fail }: { fail: boolean }) {
  if (fail) throw new Error('Failed component fixture')

  return <div>Did not fail!</div>
}
