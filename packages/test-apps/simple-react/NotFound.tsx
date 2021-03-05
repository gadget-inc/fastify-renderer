import React from 'react'

const NotFound = (props: { params: any }) => {
  return (
    <>
      <h1>Not Found</h1>
      <pre>{JSON.stringify(props.params)}</pre>
    </>
  )
}

export default NotFound
