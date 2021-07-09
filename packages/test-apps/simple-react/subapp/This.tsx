import React from 'react'
import { Link } from 'wouter'

const This = (_props: { time: number }) => {
  return (
    <>
      <h1>This</h1>
      <Link href="/that">
        <a>That</a>
      </Link>
    </>
  )
}

export default This
