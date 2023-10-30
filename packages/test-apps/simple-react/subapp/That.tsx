import React from 'react'
import { Link } from 'fastify-renderer/client/react'

const That = () => {
  return (
    <>
      <h1>That</h1>
      <Link href="/this">
        <a>This</a>
      </Link>
    </>
  )
}

export default That
