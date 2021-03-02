import React from 'react'

const About = (props: { hostname: string; requestIP: string }) => {
  return (
    <>
      <h1>About</h1>
      <p>Cool app</p>
      <p>
        This page was rendered on {props.hostname} for {props.requestIP}
      </p>
    </>
  )
}

export default About
