import React from 'react'
import { Link, useLocation } from 'fastify-renderer/client/react'

const NavigationHistoryTest = () => {
  const [path, navigate] = useLocation()

  return (
    <>
      <h1>Navigation Test</h1>
      <p>Leaving this page will set the navigation details on the window for inspection in the tests</p>
      <br />
      <Link href="/navigation-history-test#section">
        <a id="section-link">Go to the content</a>
      </Link>
      <br />
      <Link href="/">
        <a id="home-link">Home</a>
      </Link>
      <br />
      <button
        id="section-link-replace"
        onClick={() => {
          navigate('/navigation-history-test#section', { replace: true })
        }}
      >
        Update url without scrolling
      </button>
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <h2 id="section">Another Section</h2>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga earum maiores, excepturi aspernatur perspiciatis
        doloribus suscipit voluptates ipsam nam in nostrum vel obcaecati cum illum ex quasi quo est at.
      </p>
    </>
  )
}

export default NavigationHistoryTest
