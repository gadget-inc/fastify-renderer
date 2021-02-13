import template from 'stream-template'

/** Data passed to the template function by the renderer */
export interface TemplateData<Props> {
  scripts: NodeJS.ReadableStream
  content: NodeJS.ReadableStream
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
  </head>
  <body>
    <div id="fstrapp" style="display: 'contents'">${data.content}</div>
    ${data.scripts}
  </body>
</html>
`
