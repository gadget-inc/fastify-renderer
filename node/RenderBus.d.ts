/// <reference types="node" />
import { Readable } from 'stream';
import { Render } from './renderers/Renderer';
export interface Stack {
    content: string[];
    hasEnded: boolean;
    contentStreamed: boolean;
    stream: Readable;
}
/** Holds groups of content during a render that eventually get pushed into the template. */
export declare class RenderBus {
    readonly render: Render;
    stacks: Record<string, Stack>;
    included: Set<string>;
    constructor(render: Render);
    private createStack;
    push(key: string, content: string | null): void;
    stack(key: any): Readable;
    preloadModule(path: string): void;
    linkStylesheet(path: string): void;
    loadScript(src: string): void;
}
