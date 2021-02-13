export const unthunk = <T extends any, Args extends any[]>(value: T | ((...args: Args) => T), ...args: Args): T => {
  if (value instanceof Function) {
    return (value as any)(...args)
  } else {
    return value
  }
}
