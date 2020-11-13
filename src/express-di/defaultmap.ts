export default class DefaultMap<K, V> extends Map<K, V> {
  constructor(
    public defaultValueFn: (...args: any) => V,
    iterable?: readonly (readonly [K, V])[] | undefined | null
  ) {
    super(iterable)
  }

  get(key: K): V {
    if (this.has(key)) {
      return super.get(key)!
    }
    const newValue = this.defaultValueFn()
    this.set(key, newValue)
    return newValue
  }
}
