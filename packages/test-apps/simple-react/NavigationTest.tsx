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
      <Link href="/">
        <a id="home-link">Home</a>
      </Link>
    </>
  )
}

export default NavigationTest
