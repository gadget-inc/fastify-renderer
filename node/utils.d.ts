/// <reference types="node" />
import { Readable } from 'stream';
export declare const unthunk: <T extends unknown, Args extends any[]>(value: T | ((...args: Args) => T), ...args: Args) => T;
export declare const mapFilepathToEntrypointName: (filepath: string) => string;
export declare const escapeRegex: (string: string) => string;
export declare const newStringStream: () => Readable;
