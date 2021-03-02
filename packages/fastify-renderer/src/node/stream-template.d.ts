declare module 'stream-template' {
  function streamTemplate(
    literals: ReadonlyArray<string> | Readonly<string>,
    ...placeholders: any[]
  ): NodeJS.ReadableStream

  export default streamTemplate
}
