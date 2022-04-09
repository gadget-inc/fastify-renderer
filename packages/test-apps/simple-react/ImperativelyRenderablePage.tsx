import React from 'react'
import { Link } from 'wouter'

const ImperativelyRenderablePage = (props: { hostname: string; requestIP: string }) => {
  return (
    <>
      <h1>Imperatively renderable page</h1>
      <p>Cool app</p>
      <p>
        This page was rendered imperatively on {props.hostname} for {props.requestIP}
      </p>
      <br />
      <Link href="~/">Home</Link>
    </>
  )
}

export default ImperativelyRenderablePage
