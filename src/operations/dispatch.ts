import type { Position, Responder } from './types'

type Coordinates = Readonly<Position>

export const teams = [
  { id: 'A', name: 'Team A', readiness: 'Available', coordinates: [47.6792, -122.3784] },
  { id: 'B', name: 'Team B', readiness: 'Available', coordinates: [47.6849, -122.3223] },
  { id: 'C', name: 'Team C', readiness: 'Available', coordinates: [47.6495, -122.2779] },
  { id: 'D', name: 'Team D', readiness: 'Available', coordinates: [47.5463, -122.3825] },
  { id: 'E', name: 'Team E', readiness: 'Unavailable', coordinates: [47.6257, -122.2918] },
  { id: 'F', name: 'Team F', readiness: 'Available', coordinates: [47.5361, -122.2762] },
] satisfies (Responder & { coordinates: Position })[]

const legacyTeamIds = new Map([
  ['alpha', 'A'], ['bravo', 'B'], ['charlie', 'C'],
  ['delta', 'D'], ['echo', 'E'], ['foxtrot', 'F'],
])

export function currentTeamId(id: string) {
  return legacyTeamIds.get(id) ?? id
}

export function haversineDistanceKm(
  [lat1, lon1]: Coordinates,
  [lat2, lon2]: Coordinates,
): number {
  const earthRadiusKm = 6371
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  return earthRadiusKm * angle
}

export function closestAvailableTeam(position: Coordinates | null, busyTeamIds: ReadonlySet<string>) {
  if (!position || !(Math.abs(position[0]) <= 90 && Math.abs(position[1]) <= 180)) return

  let nearest: { team: (typeof teams)[number]; distanceKm: number } | undefined
  for (const team of teams) {
    if (team.readiness !== 'Available' || busyTeamIds.has(team.id)) continue
    const distanceKm = haversineDistanceKm(position, team.coordinates)
    if (!nearest || distanceKm < nearest.distanceKm) nearest = { team, distanceKm }
  }
  return nearest
}
