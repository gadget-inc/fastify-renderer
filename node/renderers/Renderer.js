"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stylesheetLinkTag = exports.scriptTag = void 0;
function scriptTag(render, content, attrs = {}) {
    var _a;
    if ('cspNonce' in render.reply) {
        (_a = attrs.nonce) !== null && _a !== void 0 ? _a : (attrs.nonce = render.reply.cspNonce.script);
    }
    const attrsString = Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
    return `<script type="module" ${attrsString}>${content}</script>`;
}
exports.scriptTag = scriptTag;
function stylesheetLinkTag(render, href) {
    const nonceString = 'cspNonce' in render.reply ? `nonce="${render.reply.cspNonce.style}"` : '';
    return `<link rel="stylesheet" href="${href}" ${nonceString}>`;
}
exports.stylesheetLinkTag = stylesheetLinkTag;
//# sourceMappingURL=Renderer.js.map