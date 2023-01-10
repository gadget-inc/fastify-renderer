import { Readable } from 'stream';
export declare const unthunk: <T, Args extends any[]>(value: T | ((...args: Args) => T), ...args: Args) => T;
export declare const mapFilepathToEntrypointName: (filepath: string, base?: string) => string;
export declare const escapeRegex: (string: string) => string;
export declare const newStringStream: () => Readable;
