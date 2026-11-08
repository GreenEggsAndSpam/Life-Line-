import { DbConnection, tables } from '../module_bindings'
import type { MyRescueRequest } from '../module_bindings/types'
import { assistanceOptions, categories, incidentStatuses, type Assignment, type Incident, type IncidentActivity, type IncidentStatus, type ReportDraft } from '../operations/types'
import { analyzeIncident, emergencyTypeFor } from '../operations/assessment'
import { currentTeamId } from '../operations/dispatch'

export interface RequestSnapshot {
  incidents: Incident[]
  assignments: Assignment[]
}

const requestId = (id: bigint) => `DB-${id}`
const reportId = (id: bigint) => `RPT-DB-${id}`

function statusFor(value: string): IncidentStatus {
  return incidentStatuses.find(status => status === value) ?? 'Reported'
}

export function requestSnapshot(rows: Iterable<MyRescueRequest>): RequestSnapshot {
  const incidents: Incident[] = []
  const assignments: Assignment[] = []
  for (const row of rows) {
    const Id = requestId(row.id)
    const EmergencyType = categories.find(category => category === row.emergencyType) ?? 'Infrastructure'
    const assistance = assistanceOptions.find(option => option === row.assistance) ?? 'Other'
    const submittedAt = row.createdAt.toDate().getTime()
    const draft: ReportDraft = {
      assistance,
      description: row.description,
      coordinates: row.hasCoordinates ? [row.latitude, row.longitude] : null,
      location: row.location || (row.hasCoordinates ? `${row.latitude}, ${row.longitude}` : 'Location unavailable'),
      affected: row.affected,
      reporterType: 'Civilian',
    }
    const acknowledgedAt = row.acknowledgedAt?.toDate().getTime()
    const deliveredAt = row.deliveredAt?.toDate().getTime()
    const verifiedAt = row.verifiedAt?.toDate().getTime()
    const assignedAt = row.assignedAt?.toDate().getTime()
    const activity: IncidentActivity[] = []
    function addEvent(key: string, at: number | undefined, actor: string, label: string) {
      if (at !== undefined) activity.push({ id: `${Id}-remote-${key}`, at, actor, label })
    }
    addEvent('report', submittedAt, 'Civilian', 'Report submitted')
    addEvent('acknowledged', acknowledgedAt, 'Coordinator', 'Incident acknowledged')
    addEvent('assigned', assignedAt, 'Coordinator', 'Responder assigned')
    addEvent('started', row.startedAt?.toDate().getTime(), 'Field team', 'Response in progress')
    addEvent('delivered', deliveredAt, 'Field team', 'Assistance marked delivered')
    addEvent('closed', verifiedAt, 'Coordinator', 'Resolution verified and incident closed')

    const Status = statusFor(row.status)
    if (row.teamId && assignedAt !== undefined && Status !== 'Verified Closed') {
      assignments.push({ incidentId: Id, teamId: currentTeamId(row.teamId), assignedAt })
    }
    incidents.push({
      request: {
        Id, EmergencyType,
        Description: row.description,
        Latitude: draft.coordinates?.[0] ?? null,
        Longitude: draft.coordinates?.[1] ?? null,
        Urgency: row.urgency === 'Critical' || row.urgency === 'Elevated' ? row.urgency : 'Routine',
        Time: new Date(submittedAt).toISOString(),
        Status,
      },
      title: `${EmergencyType} · ${assistance}`,
      reports: [{ ...draft, id: reportId(row.id), submittedAt }],
      analysis: analyzeIncident(draft, EmergencyType),
      acknowledgedAt, deliveredAt, verifiedAt, activity,
      flagged: false,
      duplicateReviewed: [],
    })
  }
  return { incidents, assignments }
}

export function connectRequests(
  url: string,
  database: string,
  onRows: (snapshot: RequestSnapshot) => void,
  onState: (state: 'ready' | 'unavailable') => void,
) {
  const tokenKey = `life-line-spacetime:${url}/${database}`
  let token: string | undefined
  try { token = localStorage.getItem(tokenKey) ?? undefined } catch { /* Browser storage may be disabled. */ }

  let closed = false
  let applied = false
  let queued = false
  const unavailable = () => {
    applied = false
    if (!closed) onState('unavailable')
  }
  const conn = DbConnection.builder().withUri(url).withDatabaseName(database).withToken(token)
    .onConnect((connection, _identity, newToken) => {
      if (closed) return
      try { localStorage.setItem(tokenKey, newToken) } catch { /* Browser storage may be disabled. */ }
      const view = connection.db.myRescueRequests
      const changed = () => {
        if (!applied || queued || closed) return
        queued = true
        queueMicrotask(() => {
          queued = false
          if (!closed && applied) onRows(requestSnapshot(view.iter()))
        })
      }
      view.onInsert(changed)
      view.onUpdate(changed)
      view.onDelete(changed)
      connection.subscriptionBuilder()
        .onApplied(() => {
          if (closed) return
          applied = true
          onRows(requestSnapshot(view.iter()))
          onState('ready')
        })
        .onError(unavailable)
        .subscribe(tables.myRescueRequests)
    })
    .onConnectError(unavailable)
    .onDisconnect(unavailable)
    .build()

  function requireConnection() {
    if (!applied || closed) throw new Error('SpacetimeDB is unavailable. Reload to reconnect.')
  }

  return {
    close() {
      closed = true
      conn.disconnect()
    },
    async submit(draft: ReportDraft) {
      requireConnection()
      const submissionId = crypto.randomUUID()
      await conn.reducers.submitBrowserRequest({
        submissionId,
        emergencyType: emergencyTypeFor(draft.assistance),
        description: draft.description,
        latitude: draft.coordinates?.[0] ?? 0,
        longitude: draft.coordinates?.[1] ?? 0,
        hasCoordinates: draft.coordinates !== null,
        urgency: 'Routine',
        location: draft.location,
        affected: draft.affected,
        assistance: draft.assistance,
      })
      const row = [...conn.db.myRescueRequests.iter()].find(item => item.submissionId === submissionId)
      if (!row) throw new Error('The request was submitted, but its confirmation could not be loaded.')
      return reportId(row.id)
    },
    async setStatus(id: string, from: IncidentStatus, status: IncidentStatus, teamId?: string) {
      requireConnection()
      const dbId = BigInt(id.slice('DB-'.length))
      const row = conn.db.myRescueRequests.id.find(dbId)
      if (!row || statusFor(row.status) !== from) throw new Error('The request changed. Review it and try again.')
      await conn.reducers.coordinateBrowserRequest({ id: dbId, expectedStatus: row.status, status, teamId })
    },
  }
}
