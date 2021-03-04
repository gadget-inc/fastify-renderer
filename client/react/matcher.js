import FindMyWay from 'find-my-way';
// eslint-disable-next-line @typescript-eslint/no-empty-function
const empty = () => { };
export const makeMatcher = (routes) => {
    const router = FindMyWay();
    for (const [pattern, component] of Object.entries(routes)) {
        router.on('GET', pattern, empty, { component, route: pattern });
    }
    return (pattern, path) => {
        const match = router.find('GET', path);
        if (match && (match === null || match === void 0 ? void 0 : match.store.pattern) == pattern) {
            return [true, match.params];
        }
        else {
            return [false, null];
        }
    };
};
