import React, { Suspense } from 'react'

const Layout = (props: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div style={{ backgroundColor: 'rgba(100, 0, 0, 0.4)' }}>{props.children}</div>
    </Suspense>
  )
}

export default Layout
