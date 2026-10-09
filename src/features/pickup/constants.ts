export const DEMO_HOUSEHOLD_ID = 'household-asha'
export const DEFAULT_LAT = 12.9352
export const DEFAULT_LNG = 77.6245
export const SLOT_OPTIONS = [
  'Tomorrow 9–11am',
  'Tomorrow 2–4pm',
  'This evening 6–8pm',
  'Flexible',
] as const

export type SlotOption = (typeof SLOT_OPTIONS)[number]
