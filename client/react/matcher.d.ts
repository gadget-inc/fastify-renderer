import type { Match, Path } from 'wouter';
export type MatcherFn = (pattern: Path, path: Path) => Match;
export declare const matcher: MatcherFn;
