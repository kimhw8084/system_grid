export const parseCommaSeparatedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
