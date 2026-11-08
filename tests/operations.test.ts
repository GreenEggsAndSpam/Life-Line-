import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultThresholds, MINUTE } from '../src/operations/demo'
import { coordinatesFor, getEscalations, mapStatus, possibleDuplicates, reportErrors } from '../src/operations/incidents'
import { createDemoState, createEmptyState, incidentById, operationsReducer, teamStatus } from '../src/operations/store'
import type { ReportDraft } from '../src/operations/types'

const draft: ReportDraft = {
  location: 'Ballard, Seattle, WA', coordinates: coordinatesFor('Ballard, Seattle, WA'),
  description: 'A blocked path has cut off access to a relief point.', affected: 4, assistance: 'Evacuation', reporterType: 'Witness',
}

test('public report validation and shared ID creation preserve the original report', () => {
  const seed = createDemoState()
  const invalid = { ...draft, location: '', affected: 1.5 }
  assert.deepEqual(Object.keys(reportErrors(invalid)), ['location', 'affected'])
  assert.equal(operationsReducer(seed, { type: 'report', draft: invalid }), seed)
  const state = operationsReducer(seed, { type: 'report', draft })
  const incident = state.incidents[0]
  assert.deepEqual(incident.request, {
    Id: 'RP-1049',
    EmergencyType: 'Evacuation',
    Description: draft.description,
    Latitude: 47.6675,
    Longitude: -122.3846,
    Urgency: 'Routine',
    Time: new Date(seed.now).toISOString(),
    Status: 'Reported',
  })
  assert.deepEqual(incident.reports[0], { ...draft, id: 'RPT-1049', submittedAt: seed.now })
  assert.equal(mapStatus(incident), 'Unassigned')
  assert.equal(seed.incidents.length + 1, state.incidents.length)
  const location = 'Unknown address'
  const unmapped = operationsReducer(state, { type: 'report', draft: { ...draft, location, coordinates: coordinatesFor(location) } })
  assert.equal(unmapped.incidents[0].request.Latitude, null)
  assert.equal(unmapped.incidents[0].request.Longitude, null)
})

test('assignment is exclusive and only a coordinator can verify after delivery', () => {
  const seed = createDemoState()
  assert.equal(seed.assignments.find(assignment => assignment.incidentId === 'RP-1046')?.teamId, 'D')
  const incidentId = 'RP-1047'
  assert.equal(operationsReducer(seed, { type: 'verify', incidentId }), seed)
  assert.equal(operationsReducer(seed, { type: 'assign', incidentId, teamId: 'A' }), seed)
  assert.equal(operationsReducer(seed, { type: 'assign', incidentId, teamId: 'E' }), seed)
  const assigned = operationsReducer(seed, { type: 'assign', incidentId, teamId: 'B' })
  assert.equal(teamStatus(assigned, 'B'), 'Assigned')
  assert.equal(operationsReducer(assigned, { type: 'assign', incidentId: 'RP-1048', teamId: 'B' }), assigned)
  assert.equal(operationsReducer(assigned, { type: 'progress', incidentId, teamId: 'A' }), assigned)
  assert.equal(operationsReducer(assigned, { type: 'verify', incidentId }), assigned)
  const started = operationsReducer(assigned, { type: 'progress', incidentId, teamId: 'B' })
  const observed = operationsReducer(started, { type: 'observation', incidentId, teamId: 'B', note: 'Access from the west entrance.' })
  assert.match(incidentById(observed, incidentId)!.activity.at(-1)!.label, /Access from the west/)
  const delivered = operationsReducer(observed, { type: 'progress', incidentId, teamId: 'B' })
  assert.equal(incidentById(delivered, incidentId)?.request.Status, 'Assistance Delivered')
  assert.equal(operationsReducer(delivered, { type: 'progress', incidentId, teamId: 'B' }), delivered)
  const closed = operationsReducer(delivered, { type: 'verify', incidentId })
  assert.equal(incidentById(closed, incidentId)?.request.Status, 'Verified Closed')
  assert.equal(teamStatus(closed, 'B'), 'Available')
})

test('nearest dispatch skips unavailable and already assigned teams', () => {
  const report: ReportDraft = { ...draft, location: 'Madison Valley, Seattle, WA', coordinates: [47.6257, -122.2918] }
  const first = operationsReducer(createEmptyState(), { type: 'report', draft: report })
  const firstId = first.incidents[0].request.Id
  const assigned = operationsReducer(first, { type: 'assign', incidentId: firstId })
  assert.equal(assigned.assignments[0]?.teamId, 'C') // Team E is at these coordinates but is unavailable.
  assert.equal(incidentById(assigned, firstId)?.request.Status, 'Assigned')
  assert.equal(operationsReducer(assigned, { type: 'assign', incidentId: firstId }), assigned)

  const second = operationsReducer(assigned, { type: 'report', draft: report })
  const next = operationsReducer(second, { type: 'assign', incidentId: second.incidents[0].request.Id })
  assert.deepEqual(next.assignments.map(assignment => assignment.teamId), ['C', 'B'])

  const unmapped = operationsReducer(next, { type: 'report', draft: { ...report, coordinates: null } })
  const unmappedId = unmapped.incidents[0].request.Id
  assert.equal(operationsReducer(unmapped, { type: 'assign', incidentId: unmappedId }), unmapped)
  assert.equal(operationsReducer(unmapped, { type: 'assign', incidentId: unmappedId, teamId: 'A' }), unmapped)
})

test('acknowledgment clears only acknowledgment alerts, and wait thresholds use demo time', () => {
  const seed = createDemoState()
  const incidentId = 'RP-1042'
  const groups = (state: typeof seed, now = state.now) => getEscalations(state.incidents, now, defaultThresholds)
    .filter(alert => alert.incidentId === incidentId).map(alert => alert.group)
  assert.ok(groups(seed).includes('Unacknowledged Reports'))
  assert.ok(groups(seed).includes('Unassigned Incidents'))
  assert.ok(groups(seed).includes('Possible Duplicate Reports'))
  assert.ok(!groups(seed).includes('Overdue Incidents'))
  const next = operationsReducer(seed, { type: 'acknowledge', incidentId })
  assert.ok(!groups(next).includes('Unacknowledged Reports'))
  assert.ok(groups(next).includes('Unassigned Incidents'))
  const later = operationsReducer(next, { type: 'clock', now: next.now + 2 * MINUTE })
  assert.ok(groups(later).includes('Overdue Incidents'))
  const verification = getEscalations(seed.incidents, seed.now, defaultThresholds)
  assert.ok(verification.some(alert => alert.incidentId === 'RP-1041' && alert.group === 'Awaiting Verification'))
})

test('duplicate review keeps originals and resolves the old incident reference', () => {
  const seed = createDemoState()
  const incidentId = 'RP-1042'
  const otherId = 'RP-1048'
  assert.ok(possibleDuplicates(incidentById(seed, incidentId)!, seed.incidents).some(incident => incident.request.Id === otherId))
  const separate = operationsReducer(seed, { type: 'reviewDuplicate', incidentId, otherId, merge: false })
  assert.equal(possibleDuplicates(incidentById(separate, incidentId)!, separate.incidents).length, 0)
  assert.equal(possibleDuplicates(incidentById(separate, otherId)!, separate.incidents).length, 0)
  const linked = operationsReducer(seed, { type: 'reviewDuplicate', incidentId, otherId, merge: true })
  assert.equal(linked.incidents.length, seed.incidents.length - 1)
  assert.equal(incidentById(linked, incidentId)?.request.Id, otherId)
  assert.deepEqual(incidentById(linked, otherId)?.reports.map(report => report.id), ['RPT-1048', 'RPT-1042'])
})
