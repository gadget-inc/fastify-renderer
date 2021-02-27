import React from 'react';
export interface LayoutProps {
    isNavigating: boolean;
    children: React.ReactNode;
}
export declare const Root: <BootProps>(props: {
    Entrypoint: React.FunctionComponent<BootProps>;
    Layout: React.FunctionComponent<LayoutProps>;
    bootProps: BootProps;
    basePath: string;
    routes: Record<string, React.FunctionComponent<any>>;
}) => JSX.Element;
