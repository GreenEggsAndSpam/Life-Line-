import { areas, MINUTE, REGION, seedReports, teams } from './demo'
import type { Assignment, Category, Incident, IncidentActivity, IncidentStatus, ReportDraft, Urgency } from './types'
import { analyzeIncident, emergencyTypeFor } from './assessment'
import { nextStatus, possibleDuplicates, reportErrors } from './incidents'
import { closestAvailableTeam } from './dispatch'

export interface OperationsState {
  now: number
  nextId: number
  latestPublicReportId?: string
  incidents: Incident[]
  assignments: Assignment[]
  redirects: Record<string, string>
}

export type Action =
  | { type: 'report'; draft: ReportDraft }
  | { type: 'acknowledge' | 'flag'; incidentId: string }
  | { type: 'assign'; incidentId: string; teamId?: string }
  | { type: 'progress'; incidentId: string; teamId?: string }
  | { type: 'verify'; incidentId: string }
  | { type: 'observation'; incidentId: string; teamId: string; note: string }
  | { type: 'reviewDuplicate'; incidentId: string; otherId: string; merge: boolean }
  | { type: 'clock'; now: number }
  | { type: 'syncRequests'; incidents: Incident[]; assignments: Assignment[] }
  | { type: 'reportRecorded'; reportId: string }

const reportId = (id: number) => `RPT-${id}`

function createIncident(
  id: number,
  at: number,
  draft: ReportDraft,
  category: Category = emergencyTypeFor(draft.assistance),
  urgency: Urgency = 'Routine',
  status: IncidentStatus = 'Reported',
): Incident {
  return {
    request: {
      Id: `RP-${id}`,
      EmergencyType: category,
      Description: draft.description,
      Latitude: draft.coordinates?.[0] ?? null,
      Longitude: draft.coordinates?.[1] ?? null,
      Urgency: urgency,
      Time: new Date(at).toISOString(),
      Status: status,
    },
    title: `${category} · ${draft.assistance}`,
    reports: [{ ...draft, id: reportId(id), submittedAt: at }],
    analysis: analyzeIncident(draft, category),
    flagged: false,
    duplicateReviewed: [],
    activity: [
      { id: `${id}-report`, at, actor: draft.reporterType, label: 'Report submitted' },
      { id: `${id}-ai`, at, actor: 'Demo assessment', label: 'Advisory analysis completed' },
    ],
  }
}

function withActivity(incident: Incident, at: number, actor: string, label: string): Incident {
  const event: IncidentActivity = { id: `${incident.request.Id}-${incident.activity.length}`, at, actor, label }
  return { ...incident, activity: [...incident.activity, event] }
}

export function createDemoState(now = Date.now()): OperationsState {
  const assignments: Assignment[] = []
  const incidents: Incident[] = []
  const busyTeamIds = new Set<string>()
  for (let index = seedReports.length - 1; index >= 0; index--) {
    const seed = seedReports[index]
    const at = now - seed.age * MINUTE
    const area = areas[seed.area]
    const needsTeam = seed.status === 'Assigned' || seed.status === 'In Progress' || seed.status === 'Assistance Delivered'
    const nearest = needsTeam ? closestAvailableTeam(area.position, busyTeamIds) : undefined
    const status = needsTeam && !nearest ? 'Under Review' : seed.status
    let incident = {
      ...createIncident(1048 - index, at, {
        description: seed.description, location: `${area.name}, ${REGION}`, coordinates: area.position,
        affected: seed.affected, assistance: seed.assistance,
        reporterType: index % 3 === 0 ? 'Witness' : index % 3 === 1 ? 'Civilian' : 'Responder',
      }, seed.category, seed.priority, status),
      title: seed.title,
      flagged: !!seed.flagged,
    }
    if (status !== 'Reported') {
      incident = withActivity({ ...incident, acknowledgedAt: at + MINUTE }, at + MINUTE, 'Coordinator', 'Incident acknowledged')
    }
    if (nearest) {
      busyTeamIds.add(nearest.team.id)
      assignments.push({ teamId: nearest.team.id, incidentId: incident.request.Id, assignedAt: at + 3 * MINUTE })
      incident = withActivity(incident, at + 3 * MINUTE, 'Coordinator', `${nearest.team.name} assigned`)
    }
    if (['In Progress', 'Assistance Delivered', 'Verified Closed'].includes(status)) {
      incident = withActivity(incident, at + 5 * MINUTE, 'Field team', 'Response in progress')
    }
    if (status === 'Assistance Delivered' || status === 'Verified Closed') {
      incident = withActivity({ ...incident, deliveredAt: at + 12 * MINUTE }, at + 12 * MINUTE, 'Field team', 'Assistance marked delivered')
    }
    if (status === 'Verified Closed') {
      incident = withActivity({ ...incident, verifiedAt: at + 20 * MINUTE }, at + 20 * MINUTE, 'Coordinator', 'Resolution verified and incident closed')
    }
    incidents.push(incident)
  }
  return { ...createEmptyState(now), incidents: incidents.reverse(), assignments }
}

export function createEmptyState(now = Date.now()): OperationsState {
  return { now, nextId: 1049, incidents: [], assignments: [], redirects: {} }
}

export function incidentById(state: OperationsState, id: string) {
  let target = id
  while (state.redirects[target]) target = state.redirects[target]
  return state.incidents.find(incident => incident.request.Id === target)
}

export function canAssign(incident: Incident) {
  return incident.request.Status === 'Reported' || incident.request.Status === 'Under Review'
}

export function teamStatus(state: OperationsState, teamId: string) {
  const assignment = state.assignments.find(item => item.teamId === teamId)
  if (!assignment) return teams.find(team => team.id === teamId)?.readiness ?? 'Unavailable'
  return incidentById(state, assignment.incidentId)?.request.Status === 'Assigned' ? 'Assigned' : 'Busy'
}

export function availableTeams(state: OperationsState) {
  return teams.filter(team => teamStatus(state, team.id) === 'Available')
}

export function nearestAvailableTeam(state: OperationsState, incident: Incident) {
  const { Latitude, Longitude } = incident.request
  const position = Latitude === null || Longitude === null ? null : [Latitude, Longitude] as const
  return closestAvailableTeam(position, new Set(state.assignments.map(assignment => assignment.teamId)))
}

function replaceIncident(state: OperationsState, incident: Incident): OperationsState {
  return { ...state, incidents: state.incidents.map(item => item.request.Id === incident.request.Id ? incident : item) }
}

function applyIncidentAction(state: OperationsState, action: Extract<Action, { incidentId: string }>): OperationsState {
  const incident = state.incidents.find(item => item.request.Id === action.incidentId)
  if (!incident || incident.request.Status === 'Verified Closed') return state
  const { Id: id, Status: currentStatus } = incident.request
  const update = (changes: Partial<Incident>, label: string, actor = 'Coordinator') =>
    replaceIncident(state, withActivity({ ...incident, ...changes }, state.now, actor, label))

  switch (action.type) {
    case 'acknowledge':
      return incident.acknowledgedAt === undefined
        ? update({ acknowledgedAt: state.now, request: { ...incident.request, Status: currentStatus === 'Reported' ? 'Under Review' : currentStatus } }, 'Incident acknowledged')
        : state
    case 'flag':
      return update({ flagged: !incident.flagged }, incident.flagged ? 'Review flag cleared' : 'Flagged for coordinator review')
    case 'assign': {
      if (!canAssign(incident) || state.assignments.some(item => item.incidentId === id)) return state
      const team = nearestAvailableTeam(state, incident)?.team
      if (!team || (action.teamId !== undefined && action.teamId !== team.id)) return state
      const acknowledged = incident.acknowledgedAt === undefined
        ? withActivity({ ...incident, acknowledgedAt: state.now }, state.now, 'Coordinator', 'Incident acknowledged during assignment')
        : incident
      const assigned = withActivity({ ...acknowledged, request: { ...acknowledged.request, Status: 'Assigned' } }, state.now, 'Coordinator', `${team.name} assigned`)
      return {
        ...replaceIncident(state, assigned),
        assignments: [...state.assignments, { teamId: team.id, incidentId: id, assignedAt: state.now }],
      }
    }
    case 'progress':
    case 'observation': {
      const team = action.teamId ? teams.find(item => item.id === action.teamId) : undefined
      if (action.teamId && (!team || !state.assignments.some(item => item.incidentId === id && item.teamId === action.teamId))) return state
      if (action.type === 'observation') {
        const note = action.note.trim()
        return note && note.length <= 500 ? update({}, `Field observation: ${note}`, team?.name) : state
      }
      const status = nextStatus(currentStatus)
      if (status === 'In Progress') return update({ request: { ...incident.request, Status: status } }, 'Response in progress', team?.name)
      if (status === 'Assistance Delivered') return update({ request: { ...incident.request, Status: status }, deliveredAt: state.now }, 'Assistance marked delivered', team?.name)
      return state
    }
    case 'verify':
      if (currentStatus !== 'Assistance Delivered' || incident.deliveredAt === undefined) return state
      return {
        ...update({ request: { ...incident.request, Status: 'Verified Closed' }, verifiedAt: state.now, flagged: false }, 'Resolution verified and incident closed'),
        assignments: state.assignments.filter(item => item.incidentId !== id),
      }
    case 'reviewDuplicate': {
      const target = possibleDuplicates(incident, state.incidents).find(item => item.request.Id === action.otherId)
      if (!target) return state
      if (!action.merge) {
        return replaceIncident(
          update({ duplicateReviewed: [...incident.duplicateReviewed, target.request.Id] }, `Reviewed ${target.request.Id} and kept incidents separate`),
          withActivity({ ...target, duplicateReviewed: [...target.duplicateReviewed, id] }, state.now, 'Coordinator', `Reviewed ${id} and kept incidents separate`),
        )
      }
      if (!canAssign(incident)) return state
      const combined = withActivity({
        ...target,
        reports: [...target.reports, ...incident.reports],
        activity: [...target.activity, ...incident.activity].sort((a, b) => a.at - b.at),
        flagged: target.flagged || incident.flagged,
        request: {
          ...target.request,
          Latitude: target.request.Latitude ?? incident.request.Latitude,
          Longitude: target.request.Longitude ?? incident.request.Longitude,
          Urgency: incident.request.Urgency === 'Critical' || (incident.request.Urgency === 'Elevated' && target.request.Urgency === 'Routine')
            ? incident.request.Urgency : target.request.Urgency,
        },
      }, state.now, 'Coordinator', `Linked original reports from ${id}`)
      return {
        ...state,
        incidents: state.incidents.filter(item => item.request.Id !== id).map(item => item.request.Id === target.request.Id ? combined : item),
        redirects: { ...state.redirects, [id]: target.request.Id },
      }
    }
  }
}

function syncRequests(state: OperationsState, snapshot: Extract<Action, { type: 'syncRequests' }>): OperationsState {
  const existing = new Map(state.incidents.map(incident => [incident.request.Id, incident]))
  const incidents = snapshot.incidents.filter(incident => !state.redirects[incident.request.Id]).map(incident => {
    const previous = existing.get(incident.request.Id)
    if (!previous) return incident
    const activity = new Map([...previous.activity, ...incident.activity].map(event => [event.id, event]))
    const { request } = incident
    return {
      ...incident,
      request: {
        ...request,
        Latitude: request.Latitude ?? previous.request.Latitude,
        Longitude: request.Longitude ?? previous.request.Longitude,
        Urgency: previous.reports.length > 1 ? previous.request.Urgency : request.Urgency,
      },
      reports: previous.reports,
      flagged: request.Status !== 'Verified Closed' && previous.flagged,
      duplicateReviewed: previous.duplicateReviewed,
      activity: [...activity.values()].sort((a, b) => a.at - b.at),
    }
  })
  return { ...state, incidents, assignments: snapshot.assignments.filter(item => !state.redirects[item.incidentId]) }
}

export function operationsReducer(state: OperationsState, action: Action): OperationsState {
  if ('incidentId' in action) return applyIncidentAction(state, action)
  if (action.type === 'syncRequests') return syncRequests(state, action)
  if (action.type === 'reportRecorded') return { ...state, latestPublicReportId: action.reportId }
  if (action.type === 'clock') return action.now > state.now ? { ...state, now: action.now } : state
  if (Object.keys(reportErrors(action.draft)).length) return state
  const incident = createIncident(state.nextId, state.now, action.draft)
  return {
    ...state,
    nextId: state.nextId + 1,
    latestPublicReportId: incident.reports[0].id,
    incidents: [incident, ...state.incidents],
  }
}
