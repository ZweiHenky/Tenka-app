export const LOCATION_MAX_AGE_MS = 5 * 60 * 1000
export const LOCATION_REQUIRED_ACCURACY_M = 1000
export const LOCATION_TIMEOUT_MS = 8000
export const LOCATION_DECIMALS = 3

export interface NearbyCoordinates {
  latitude: number
  longitude: number
}

export interface LocationAddressLike {
  city?: string | null
  district?: string | null
  subregion?: string | null
  region?: string | null
}

interface LocationObjectLike {
  coords: { latitude: number; longitude: number }
}

export interface LocationAdapter {
  hasServicesEnabled(): Promise<boolean>
  getLastKnown(options: { maxAge: number; requiredAccuracy: number }): Promise<LocationObjectLike | null>
  getCurrent(): Promise<LocationObjectLike>
}

export class LocationResolutionError extends Error {
  constructor(public readonly kind: "services-disabled" | "timeout" | "temporary") {
    super(kind)
  }
}

export function normalizeCoordinates(latitude: number, longitude: number): NearbyCoordinates {
  const factor = 10 ** LOCATION_DECIMALS
  return {
    latitude: Math.round(latitude * factor) / factor,
    longitude: Math.round(longitude * factor) / factor,
  }
}

function currentWithTimeout(adapter: LocationAdapter): Promise<LocationObjectLike> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new LocationResolutionError("timeout")), LOCATION_TIMEOUT_MS)
    adapter.getCurrent().then(
      (location) => { clearTimeout(timer); resolve(location) },
      () => { clearTimeout(timer); reject(new LocationResolutionError("temporary")) },
    )
  })
}

export function formatLocationLabel(address: LocationAddressLike | undefined): string | undefined {
  if (!address) return undefined
  const municipality = address.city?.trim() || address.district?.trim() || address.subregion?.trim()
  const region = address.region?.trim()
  if (!municipality) return region || undefined
  if (!region || municipality.localeCompare(region, undefined, { sensitivity: "accent" }) === 0) return municipality
  return `${municipality}, ${region}`
}

export async function resolveNearbyCoordinates(
  adapter: LocationAdapter,
  options: { forceCurrent?: boolean } = {},
): Promise<NearbyCoordinates> {
  if (!await adapter.hasServicesEnabled()) throw new LocationResolutionError("services-disabled")

  const known = options.forceCurrent
    ? null
    : await adapter.getLastKnown({
        maxAge: LOCATION_MAX_AGE_MS,
        requiredAccuracy: LOCATION_REQUIRED_ACCURACY_M,
      })
  const location = known ?? await currentWithTimeout(adapter)
  return normalizeCoordinates(location.coords.latitude, location.coords.longitude)
}
