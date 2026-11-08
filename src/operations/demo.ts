import type { Assistance, Category, IncidentStatus, Position, Responder, Thresholds, Urgency } from './types'

export const REGION = 'Seattle, WA'
export const CENTER: Position = [47.6065, -122.331]
export const MINUTE = 60_000

export const areas: { name: string; position: Position }[] = [
  { name: 'South Park', position: [47.5305, -122.3251] },
  { name: 'Harbor Island', position: [47.5775, -122.3533] },
  { name: 'SODO', position: [47.578, -122.3301] },
  { name: 'Capitol Hill', position: [47.6241, -122.3157] },
  { name: 'Ballard', position: [47.6675, -122.3846] },
  { name: 'Georgetown', position: [47.5488, -122.3194] },
  { name: 'Pioneer Square', position: [47.6002, -122.3325] },
  { name: 'Queen Anne', position: [47.6375, -122.3561] },
  { name: 'West Seattle', position: [47.5621, -122.3865] },
  { name: 'Fremont', position: [47.651, -122.35] },
  { name: 'University District', position: [47.6617, -122.3131] },
  { name: 'Central District', position: [47.606, -122.3052] },
  { name: 'Magnolia', position: [47.638, -122.4016] },
  { name: 'Beacon Hill', position: [47.5795, -122.3097] },
  { name: 'Belltown', position: [47.6165, -122.3474] },
]

export const teams: Responder[] = [
  { id: 'alpha', name: 'Rescue Team Alpha', readiness: 'Available' },
  { id: 'bravo', name: 'Medical Team Bravo', readiness: 'Available' },
  { id: 'charlie', name: 'Evacuation Team Charlie', readiness: 'Available' },
  { id: 'delta', name: 'Supply Team Delta', readiness: 'Available' },
  { id: 'echo', name: 'Support Team Echo', readiness: 'Unavailable' },
  { id: 'foxtrot', name: 'Field Team Foxtrot', readiness: 'Available' },
]

export const defaultThresholds: Thresholds = { acknowledgment: 10, assignment: 18, overdue: 40, verification: 8 }

interface Seed {
  area: number
  title: string
  description: string
  category: Category
  assistance: Assistance
  status: IncidentStatus
  affected: number
  age: number
  priority: Urgency
  team?: string
  flagged?: boolean
}

export const seedReports: Seed[] = [
  { area: 1, title: 'Flooding at Harbor Island', description: 'Water is covering the access road near the east gate. Two vehicles are stranded and occupants are waiting on higher ground.', category: 'Flooding', assistance: 'Rescue', status: 'Under Review', affected: 6, age: 4, priority: 'Critical', flagged: true },
  { area: 3, title: 'Medical assistance requested', description: 'A resident at a temporary gathering point reports a leg injury and is unable to walk to the first-aid station.', category: 'Medical', assistance: 'Medical Assistance', status: 'Reported', affected: 1, age: 9, priority: 'Elevated' },
  { area: 8, title: 'Evacuation support needed', description: 'Residents are gathering near the community center. A flooded crossing has cut off the usual pickup route.', category: 'Evacuation', assistance: 'Evacuation', status: 'In Progress', affected: 14, age: 16, priority: 'Elevated', team: 'charlie' },
  { area: 4, title: 'Downed power line', description: 'A tree has brought a line down across the street. Witnesses are keeping others clear and waiting for a utility assessment.', category: 'Infrastructure', assistance: 'Other', status: 'Under Review', affected: 8, age: 21, priority: 'Critical', flagged: true },
  { area: 7, title: 'Water delivery confirmed', description: 'The neighborhood relief point requested replacement water after its morning inventory ran low.', category: 'Supplies', assistance: 'Food and Water', status: 'Verified Closed', affected: 27, age: 31, priority: 'Routine' },
  { area: 0, title: 'Flooded residential access', description: 'Water has entered the ground floor of a duplex. Residents moved upstairs and report that the front steps are submerged.', category: 'Flooding', assistance: 'Rescue', status: 'Assigned', affected: 5, age: 35, priority: 'Critical', team: 'alpha' },
  { area: 2, title: 'Harbor access road blocked', description: 'Water is covering the access road near the east gate. Two vehicles are stranded and occupants are waiting near the gate.', category: 'Flooding', assistance: 'Rescue', status: 'Reported', affected: 6, age: 38, priority: 'Elevated' },
  { area: 6, title: 'First aid delivery pending review', description: 'Volunteer staff requested bandages and an assessment after a minor fall near the relief desk.', category: 'Medical', assistance: 'Medical Assistance', status: 'Assistance Delivered', affected: 2, age: 43, priority: 'Routine', team: 'bravo' },
  { area: 10, title: 'Temporary shelter requested', description: 'An apartment building has lost power and several tenants need an accessible place to stay for the evening.', category: 'Evacuation', assistance: 'Shelter', status: 'Under Review', affected: 11, age: 47, priority: 'Routine' },
  { area: 5, title: 'Supplies needed at relief station', description: 'The relief station has enough water for the afternoon but expects a shortage of boxed meals.', category: 'Supplies', assistance: 'Food and Water', status: 'Reported', affected: 32, age: 51, priority: 'Routine' },
  { area: 9, title: 'Road clearance verified', description: 'Debris from a fallen branch blocked the lane used by emergency vehicles. A local team requested clearance.', category: 'Infrastructure', assistance: 'Other', status: 'Verified Closed', affected: 4, age: 54, priority: 'Routine' },
  { area: 11, title: 'Building smoke report', description: 'Light smoke was reported from a utility room. Occupants waited outside while a field team investigated.', category: 'Fire', assistance: 'Rescue', status: 'Verified Closed', affected: 9, age: 59, priority: 'Critical' },
  { area: 12, title: 'Shelter placement verified', description: 'A volunteer requested a temporary placement for residents displaced by a damaged stairwell.', category: 'Evacuation', assistance: 'Shelter', status: 'Verified Closed', affected: 3, age: 62, priority: 'Routine' },
  { area: 13, title: 'Medical transport verified', description: 'A neighborhood volunteer reported that a resident needed transport to the temporary medical station.', category: 'Medical', assistance: 'Medical Assistance', status: 'Verified Closed', affected: 1, age: 70, priority: 'Routine' },
  { area: 14, title: 'Food distribution in progress', description: 'A community volunteer asked for a food drop at the temporary relief point after a power interruption.', category: 'Supplies', assistance: 'Food and Water', status: 'In Progress', affected: 20, age: 76, priority: 'Routine', team: 'delta' },
]
