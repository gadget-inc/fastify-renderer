import React from 'react'
import { Link } from 'wouter'

const About = (props: { hostname: string; requestIP: string }) => {
  return (
    <>
      <h1>About</h1>
      <p>Cool app</p>
      <p>
        This page was rendered on {props.hostname} for {props.requestIP}
      </p>
      <br />
      <Link href="~/">Home</Link>
    </>
  )
}

export default About
