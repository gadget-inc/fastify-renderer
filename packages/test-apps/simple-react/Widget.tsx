import React from 'react'
import { Link } from 'wouter'

const Widget = (props: { widget: { id: string } }) => {
  return (
    <>
      <h1>Widget {props.widget.id}</h1>
      <p>Very cool widget</p>
      <ul>
        {[1, 2, 3].map((id) => (
          <li key={id}>
            <Link href={`/widget/${id}`}>Go to {id}</Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export default Widget
