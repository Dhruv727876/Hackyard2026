const EARTH_RADIUS_KM = 6371
const RADIAN_PER_DEGREE = Math.PI / 180

/** Great-circle distance in km. Rounding (2 decimals) happens only at the boundary. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = (bLat - aLat) * RADIAN_PER_DEGREE
  const dLng = (bLng - aLng) * RADIAN_PER_DEGREE
  const sinHalfLat = Math.sin(dLat / 2)
  const sinHalfLng = Math.sin(dLng / 2)
  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(aLat * RADIAN_PER_DEGREE) * Math.cos(bLat * RADIAN_PER_DEGREE) * sinHalfLng * sinHalfLng
  const km = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
  return Math.round(km * 100) / 100
}
