/// <reference types="node" />
/** Data passed to the template function by the renderer */
export interface TemplateData<Props> {
    head: NodeJS.ReadableStream;
    tail: NodeJS.ReadableStream;
    content: string | NodeJS.ReadableStream;
    props: Props;
}
/** A template renders out a full HTML document given the content for the document and the scripts for the document, and can optionally grab values out of the props to use for other bits like the page title, metatags, or non-client-side-hydrated body content. */
export declare type Template = (data: TemplateData<any>) => NodeJS.ReadableStream;
export declare const DefaultDocumentTemplate: Template;
