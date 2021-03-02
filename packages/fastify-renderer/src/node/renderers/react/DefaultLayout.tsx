import React, { Suspense } from 'react'

const DefaultLayout = (props: { children: React.ReactNode }) => {
  return <Suspense fallback={'Loading...'}>{props.children}</Suspense>
}

export default DefaultLayout
