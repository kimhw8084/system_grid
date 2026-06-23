export const parseCommaSeparatedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

export const isDeepEqual = (a: any, b: any): boolean => {
  if (a === b) return true
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (!keysB.includes(key) || !isDeepEqual(a[key], b[key])) return false
  }
  return true
}
