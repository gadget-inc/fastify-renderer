import { match } from 'path-to-regexp';
/*
 * This function creates a matcher function for a given path pattern.
 *
 * @param {string} path — a path like "/:foo/:bar"
 * @return {MatchFunction<ParamData>} — a function that matches paths and extracts params
 */
const createMatcher = (path) => {
    return match(path, { decode: decodeURIComponent });
};
const cache = {};
// obtains a cached matcher function for the pattern
const getMatcher = (pattern) => cache[pattern] || (cache[pattern] = createMatcher(pattern));
export const matcher = (pattern, path) => {
    const matchFn = getMatcher(String(pattern || ''));
    const pathStr = String(path);
    const cleanPath = pathStr.split('#')[0].split('?')[0];
    const result = matchFn(cleanPath);
    if (!result)
        return [false, null];
    // return matched params
    return [true, result.params];
};
