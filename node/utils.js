"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newStringStream = exports.escapeRegex = exports.mapFilepathToEntrypointName = exports.unthunk = void 0;
const stream_1 = require("stream");
const unthunk = (value, ...args) => {
    if (value instanceof Function) {
        return value(...args);
    }
    else {
        return value;
    }
};
exports.unthunk = unthunk;
const longestCommonPrefix = (...input) => {
    const strings = input.concat().sort();
    const shortest = strings[0];
    const longest = strings[strings.length - 1];
    const shortestLength = shortest.length;
    let i = 0;
    while (i < shortestLength && shortest.charAt(i) === longest.charAt(i))
        i++;
    return shortest.substring(0, i);
};
const cwd = process.cwd();
const mapFilepathToEntrypointName = (filepath) => {
    const prefix = longestCommonPrefix(cwd, filepath);
    filepath = filepath.slice(prefix.length);
    return filepath.replace(/\//g, '~');
};
exports.mapFilepathToEntrypointName = mapFilepathToEntrypointName;
const escapeRegex = (string) => {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};
exports.escapeRegex = escapeRegex;
const newStringStream = () => {
    const stream = new stream_1.Readable();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    stream._read = () => { };
    return stream;
};
exports.newStringStream = newStringStream;
//# sourceMappingURL=utils.js.map