import template from 'stream-template'

/** Data passed to the template function by the renderer */
export interface TemplateData<Props> {
  head: string
  tail: string
  content: string | NodeJS.ReadableStream
  props: Props
}

/** A template renders out a full HTML document given the content for the document and the scripts for the document, and can optionally grab values out of the props to use for other bits like the page title, metatags, or non-client-side-hydrated body content. */
export type Template = (data: TemplateData<any>) => NodeJS.ReadableStream

export const DefaultDocumentTemplate: Template = (data: TemplateData<any>) => template`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${data.props.title || 'Fastify Renderer App'}</title>
    ${data.head}
  </head>
  <body>
    <div id="fstrapp">${data.content}</div>
    ${data.tail}
  </body>
</html>
`
