import React from 'react'
const ErrorPage = () => {
  const canUseDOM = !!(typeof window !== 'undefined' && window.document)
  if (!canUseDOM) throw new Error('Something went wrong!')

  return <p>Failed on server but I live on!</p>
}

export default ErrorPage
