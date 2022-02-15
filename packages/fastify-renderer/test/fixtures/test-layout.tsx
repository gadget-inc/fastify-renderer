import React, { Suspense } from 'react'
import { LayoutProps } from '../../src/client/react'

// eslint-disable-next-line react/display-name
export default function (props: LayoutProps) {
  return <Suspense fallback={'Loading'}>{props.children}</Suspense>
}
