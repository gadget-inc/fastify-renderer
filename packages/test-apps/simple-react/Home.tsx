import React from 'react'
import { Link } from 'wouter'

const Home = (props: { time: number }) => {
  return (
    <>
      <h1>Hello</h1>
      <p>Hi.</p>
      <p suppressHydrationWarning={true}>This page was rendered at {props.time}</p>
      <Link href="about">
        <a>About</a>
      </Link>
      <br />
      <Link href="/red/about">
        <a>Red About</a>
      </Link>
    </>
  )
}

export default Home
