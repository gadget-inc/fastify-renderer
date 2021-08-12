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
      <a href="/imperative">Imperative About</a>
      <br />
      <Link href="/widget/1">
        <a>Widget 1</a>
      </Link>
      <br />
      <Link href="/widget/2">
        <a>Widget 2</a>
      </Link>
      <br />
      <Link href="/red/about">
        <a>Red About</a>
      </Link>
    </>
  )
}

export default Home
