"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const ssr_1 = require("./ssr");
if (!worker_threads_1.parentPort)
    throw new Error('Missing parentPort');
const port = worker_threads_1.parentPort;
port.on('message', (args) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stream = (0, ssr_1.streamingRender)({ ...args, module: require(args.modulePath).default });
    const send = ({ content, type }) => {
        port.postMessage({ type, content });
    };
    stream.on('data', (content) => {
        send({ type: 'data', content });
    });
    stream.on('close', () => {
        send({ type: 'close' });
    });
    stream.on('error', (content) => {
        send({ type: 'error', content });
    });
    stream.on('end', () => {
        send({ type: 'end' });
    });
});
//# sourceMappingURL=StreamingWorker.js.map