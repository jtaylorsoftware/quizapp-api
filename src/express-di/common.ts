// export type Constructor = new (...args: any[]) => {}
export type Constructor<T = {}> = new (...args: any[]) => T
export type Callable = (...any: any) => any
