"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultDocumentTemplate = void 0;
const stream_template_1 = __importDefault(require("stream-template"));
const DefaultDocumentTemplate = (data) => (0, stream_template_1.default) `
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
`;
exports.DefaultDocumentTemplate = DefaultDocumentTemplate;
//# sourceMappingURL=DocumentTemplate.js.map