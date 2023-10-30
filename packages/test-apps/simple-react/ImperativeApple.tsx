import React from 'react'
import { Link } from 'fastify-renderer/client/react'

const ImperativeApple = (props: { hostname: string; requestIP: string }) => {
  return (
    <>
      <h1>Imperative Apple</h1>
      <p>
        This page was rendered imperatively on {props.hostname} for {props.requestIP}
      </p>
      <br />
      <Link href="~/">Home</Link>
    </>
  )
}

export default ImperativeApple
