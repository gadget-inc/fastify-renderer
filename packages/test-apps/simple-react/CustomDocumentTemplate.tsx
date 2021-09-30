import { Template, TemplateData } from 'fastify-renderer/node/DocumentTemplate'
import template from 'stream-template'

export const CustomDocumentTemplate: Template = (data: TemplateData<any>) => template`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fastify Renderer Custom Template</title>
    ${data.head}
  </head>
  <body>
    <div id="fstrapp">${data.content}</div>
    ${data.tail}
  </body>
</html>
`
