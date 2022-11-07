import React from 'react';
export interface LayoutProps {
    isNavigating: boolean;
    navigationDestination: string;
    children: React.ReactNode;
    bootProps: Record<string, any>;
}
export declare function Root<BootProps>(props: {
    Entrypoint: React.FunctionComponent<BootProps>;
    Layout: React.FunctionComponent<LayoutProps>;
    bootProps: BootProps;
    basePath: string;
    routes: [string, React.FunctionComponent<any>][];
}): JSX.Element;
