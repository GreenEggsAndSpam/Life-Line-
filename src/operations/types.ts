export const assistanceOptions = ['Rescue', 'Medical Assistance', 'Evacuation', 'Food and Water', 'Shelter', 'Other'] as const
export const categories = ['Flooding', 'Medical', 'Infrastructure', 'Evacuation', 'Fire', 'Supplies'] as const
export const incidentStatuses = ['Reported', 'Under Review', 'Assigned', 'In Progress', 'Assistance Delivered', 'Verified Closed'] as const

export type Assistance = typeof assistanceOptions[number]
export type Category = typeof categories[number]
export type IncidentStatus = typeof incidentStatuses[number]
export type Urgency = 'Critical' | 'Elevated' | 'Routine'

export interface Request {
  Id: string
  EmergencyType: Category
  Description: string
  Latitude: number | null
  Longitude: number | null
  Urgency: Urgency
  /** ISO 8601 submission timestamp in UTC. */
  Time: string
  Status: IncidentStatus
}
export type Position = [number, number]
export type ReporterType = 'Civilian' | 'Witness' | 'Responder'

export interface ReportDraft {
  description: string
  location: string
  coordinates: Position | null
  affected: number
  assistance: Assistance
  reporterType: ReporterType
  reporterName?: string
  contact?: string
}

export interface EmergencyReport extends ReportDraft {
  id: string
  submittedAt: number
}

export interface AIAnalysis {
  status: 'Mock analysis complete'
  requirements: string
  safety: string
  mobility: string
  suggestions: string[]
}

export interface IncidentActivity {
  id: string
  at: number
  actor: string
  label: string
}

export interface Incident {
  request: Request
  title: string
  reports: EmergencyReport[]
  analysis: AIAnalysis
  acknowledgedAt?: number
  deliveredAt?: number
  verifiedAt?: number
  flagged: boolean
  duplicateReviewed: string[]
  activity: IncidentActivity[]
}

export interface Responder {
  id: string
  name: string
  readiness: 'Available' | 'Unavailable'
}

export interface Assignment {
  teamId: string
  incidentId: string
  assignedAt: number
}

export const escalationGroups = ['Unacknowledged Reports', 'Unassigned Incidents', 'Overdue Incidents', 'Awaiting Verification', 'Possible Duplicate Reports'] as const
export type EscalationGroup = typeof escalationGroups[number]
export interface EscalationAlert {
  incidentId: string
  group: EscalationGroup
  waiting: number
  reason: string
  duplicateId?: string
}

export interface Thresholds {
  acknowledgment: number
  assignment: number
  overdue: number
  verification: number
}
