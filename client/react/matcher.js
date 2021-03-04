import { pathToRegexp } from 'path-to-regexp';
/*
 * This function specifies how strings like /app/:users/:items* are transformed into regular expressions to pass into path-to-regexp.
 *
 * @param {string} path — a path like "/:foo/:bar"
 * @return {{ keys: [], regexp: RegExp }}
 */
const convertPathToRegexp = (path) => {
    const keys = [];
    const regexp = pathToRegexp(path, keys, { strict: true });
    return { keys, regexp };
};
const cache = {};
// obtains a cached regexp version of the pattern
const getRegexp = (pattern) => cache[pattern] || (cache[pattern] = convertPathToRegexp(pattern));
export const matcher = (pattern, path) => {
    const { regexp, keys } = getRegexp(pattern || '');
    const out = regexp.exec(path);
    if (!out)
        return [false, null];
    // formats an object with matched params
    const params = keys.reduce((params, key, i) => {
        params[key.name] = out[i + 1];
        return params;
    }, {});
    return [true, params];
};
