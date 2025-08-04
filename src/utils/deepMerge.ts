type PlainObject = Record<string, any>

/**
 * Deeply merges two objects A and B, returning a new object
 * whose type is the intersection A & B.
 */
export const deepMerge = <A extends PlainObject, B extends PlainObject>(a: A, b: B): A & B => {
  const result = { ...a } as PlainObject

  for (const key of Object.keys(b)) {
    const aVal = (a as PlainObject)[key]
    const bVal = b[key]

    // If both values are plain objects, recurse; otherwise, b overwrites
    if (
      aVal !== null &&
      bVal !== null &&
      typeof aVal === 'object' &&
      typeof bVal === 'object' &&
      !Array.isArray(aVal) &&
      !Array.isArray(bVal)
    ) {
      result[key] = deepMerge(aVal, bVal)
    } else {
      result[key] = bVal
    }
  }

  return result as A & B
}
