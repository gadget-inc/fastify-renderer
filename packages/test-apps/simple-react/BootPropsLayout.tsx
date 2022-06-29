import React, { Suspense } from 'react'

const Layout = (props: { children: React.ReactNode; bootProps: Record<string, any> }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <pre id="bootprops">
        <code>{props.bootProps.someValue}</code>
      </pre>
      {props.children}
    </Suspense>
  )
}

export default Layout
