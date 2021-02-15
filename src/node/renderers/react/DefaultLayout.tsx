import React, { Suspense } from 'react'

export const DefaultLayout = (props: { children: React.ReactNode }) => {
  return <Suspense fallback={'Loading...'}>{props.children}</Suspense>
}
