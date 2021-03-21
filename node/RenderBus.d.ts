/** Holds groups of content during a render that eventually get pushed into the template. */
export declare class RenderBus {
    stacks: Record<string, string[]>;
    included: Set<string>;
    push(key: string, content: string): void;
    stack(key: any): string[];
    preloadModule(path: string): void;
    linkStylesheet(path: string): void;
}
