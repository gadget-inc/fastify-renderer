import { useNavigationDetails } from 'fastify-renderer/client/react'
import React, { useEffect } from 'react'
import { Link } from 'wouter'

const NavigationTest = () => {
  const [isNavigating, navigationDestination] = useNavigationDetails()

  useEffect(() => {
    if (typeof window != 'undefined') {
      ;(window as any).test || ((window as any).test = [])
      ;(window as any).test.push({ isNavigating, navigationDestination })
    }
  }, [isNavigating, navigationDestination])

  return (
    <>
      <h1>Navigation Test</h1>
      <p>Leaving this page will set the navigation details on the window for inspection in the tests</p>
      <br />
      <Link href="#section">
        <a id="section-link">Go to the content</a>
      </Link>
      <br />
      <Link href="/">
        <a id="home-link">Home</a>
      </Link>
      <br />
      <h2 id="section">Another Section</h2>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Fuga earum maiores, excepturi aspernatur perspiciatis
        doloribus suscipit voluptates ipsam nam in nostrum vel obcaecati cum illum ex quasi quo est at.
      </p>
    </>
  )
}

export default NavigationTest
