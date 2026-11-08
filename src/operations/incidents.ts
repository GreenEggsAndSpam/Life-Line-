import { areas, MINUTE } from './demo'
import type { EscalationAlert, Incident, IncidentStatus, ReportDraft, Thresholds } from './types'

export const primaryReport = (incident: Incident) => incident.reports[0]

export function coordinatesFor(location: string) {
  const normalized = location.toLowerCase()
  return areas.find(area => normalized.includes(area.name.toLowerCase()))?.position ?? null
}

export function reportErrors(draft: ReportDraft) {
  const errors: Partial<Record<'location' | 'description' | 'affected' | 'assistance', string>> = {}
  if (draft.location.trim().length < 3) errors.location = 'Enter an address or neighborhood with at least 3 characters.'
  if (draft.description.trim().length < 12) errors.description = 'Describe the emergency in at least 12 characters.'
  if (!Number.isInteger(draft.affected) || draft.affected < 1 || draft.affected > 9999) errors.affected = 'Enter a whole number from 1 to 9,999.'
  return errors
}

export function nextStatus(status: IncidentStatus): IncidentStatus | undefined {
  if (status === 'Assigned') return 'In Progress'
  if (status === 'In Progress') return 'Assistance Delivered'
  if (status === 'Assistance Delivered') return 'Verified Closed'
}

export function mapStatus(incident: Incident) {
  if (incident.request.Status === 'Verified Closed') return 'Verified Closed'
  if (incident.flagged || incident.request.Status === 'Under Review' || incident.request.Status === 'Assistance Delivered') return 'Needs Review'
  if (incident.request.Status === 'Assigned' || incident.request.Status === 'In Progress') return 'Assigned / In Progress'
  return 'Unassigned'
}

function reportsOverlap(left: Incident, right: Incident) {
  return left.reports.some(a => right.reports.some(b => {
    if (a.assistance !== b.assistance || Math.abs(a.submittedAt - b.submittedAt) > 60 * MINUTE) return false
    const sentence = (value: string) => value.toLowerCase().split(/[.!?]/, 1)[0].trim()
    if (sentence(a.description) !== sentence(b.description)) return false
    if (a.coordinates && b.coordinates) {
      return Math.hypot((a.coordinates[0] - b.coordinates[0]) * 111, (a.coordinates[1] - b.coordinates[1]) * 75) < 2.5
    }
    return a.location.toLowerCase() === b.location.toLowerCase()
  }))
}

export function possibleDuplicates(incident: Incident, incidents: Incident[]) {
  if (incident.request.Status === 'Verified Closed') return []
  return incidents.filter(other => other.request.Id !== incident.request.Id
    && other.request.Status !== 'Verified Closed'
    && other.request.EmergencyType === incident.request.EmergencyType
    && !incident.duplicateReviewed.includes(other.request.Id)
    && reportsOverlap(incident, other))
}

export function getEscalations(incidents: Incident[], now: number, thresholds: Thresholds): EscalationAlert[] {
  return incidents.flatMap(incident => {
    if (incident.request.Status === 'Verified Closed') return []
    const waiting = Math.max(0, Math.floor((now - Date.parse(incident.request.Time)) / MINUTE))
    const alerts: EscalationAlert[] = []
    if (incident.acknowledgedAt === undefined && waiting >= thresholds.acknowledgment) {
      alerts.push({ incidentId: incident.request.Id, group: 'Unacknowledged Reports', waiting, reason: 'No coordinator acknowledgment' })
    }
    if ((incident.request.Status === 'Reported' || incident.request.Status === 'Under Review') && waiting >= thresholds.assignment) {
      alerts.push({ incidentId: incident.request.Id, group: 'Unassigned Incidents', waiting, reason: 'No responder assigned' })
    }
    if (incident.request.Status !== 'Assistance Delivered' && waiting >= thresholds.overdue) {
      alerts.push({ incidentId: incident.request.Id, group: 'Overdue Incidents', waiting, reason: 'Assistance has not been marked delivered' })
    }
    if (incident.deliveredAt !== undefined) {
      const sinceDelivery = Math.floor((now - incident.deliveredAt) / MINUTE)
      if (sinceDelivery >= thresholds.verification) alerts.push({ incidentId: incident.request.Id, group: 'Awaiting Verification', waiting: sinceDelivery, reason: 'Delivery requires coordinator confirmation' })
    }
    const duplicate = possibleDuplicates(incident, incidents)[0]
    if (duplicate) alerts.push({ incidentId: incident.request.Id, group: 'Possible Duplicate Reports', waiting, reason: `Possible match with ${duplicate.request.Id}`, duplicateId: duplicate.request.Id })
    return alerts
  }).sort((a, b) => b.waiting - a.waiting)
}

export function matchesIncident(incident: Incident, query: string) {
  const value = query.toLowerCase().trim()
  return [incident.request.Id, incident.title, ...incident.reports.flatMap(report => [report.id, report.description, report.location])]
    .some(field => field.toLowerCase().includes(value))
}

export const formatTime = (time: number) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit',
}).format(time)

export const formatDate = (time: number) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short',
}).format(time)

export function ageLabel(minutes: number) {
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}
