/**
 * Display formatting helpers for the UI. Pure string concerns — no domain logic.
 */

/** ₹ with Indian digit grouping (lakh/crore style), e.g. ₹1,23,456. Rounds to the nearest rupee. */
export function formatINR(value: number): string {
  const rounded = Math.round(value)
  const sign = rounded < 0 ? '-' : ''
  const digits = Math.abs(rounded).toString()

  let grouped = digits
  if (digits.length > 3) {
    const last3 = digits.slice(-3)
    let rest = digits.slice(0, -3)
    const leadingGroups: string[] = []
    while (rest.length > 2) {
      leadingGroups.unshift(rest.slice(-2))
      rest = rest.slice(0, -2)
    }
    if (rest.length > 0) leadingGroups.unshift(rest)
    grouped = `${leadingGroups.join(',')},${last3}`
  }

  return `₹${sign}${grouped}`
}

/** Kilograms with one decimal, e.g. "12.5 kg". */
export function formatKg(kg: number): string {
  return `${kg.toFixed(1)} kg`
}
