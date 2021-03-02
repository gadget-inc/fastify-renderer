import React from 'react'

const Layout = (props: { children: React.ReactNode }) => {
  return <div style={{ backgroundColor: 'rgba(100, 0, 0, 0.4)' }}>{props.children}</div>
}

export default Layout
