import React, { Suspense } from 'react';
const DefaultLayout = (props) => {
    return React.createElement(Suspense, { fallback: 'Loading...' }, props.children);
};
export default DefaultLayout;
