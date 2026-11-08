import { Check, Flag, Users } from 'lucide-react'
import { useState } from 'react'
import { useOperations } from '../../operations/OperationsContext'
import { primaryReport } from '../../operations/incidents'
import { availableTeams, canAssign, nearestAvailableTeam } from '../../operations/store'
import type { Incident } from '../../operations/types'

function AssignmentControl({ incident }: { incident: Incident }) {
  const { state, dispatch, saving, backend } = useOperations()
  if (!canAssign(incident)) return null

  const incidentId = incident.request.Id
  if (backend !== 'demo' && !primaryReport(incident).coordinates) {
    return <p className="muted">Dispatch requires coordinates on the saved incident.</p>
  }
  const nearest = nearestAvailableTeam(state, incident)
  if (nearest) return <div className="stack">
    <p>Nearest available team: <strong>{nearest.team.name}</strong> · {nearest.distanceKm.toFixed(1)} km straight-line distance</p>
    <div className="action-row">
      <button type="button" className="button" disabled={saving} onClick={() => dispatch({ type: 'assign', incidentId, teamId: nearest.team.id })}>
        <Users size={15} /> Dispatch nearest team
      </button>
    </div>
  </div>

  return <p className="muted">{availableTeams(state).length
    ? 'Dispatch requires valid incident coordinates.'
    : 'No response teams are currently available.'}</p>
}

export function IncidentActions({ incident }: { incident: Incident }) {
  const { dispatch, saving } = useOperations()
  const [confirmClose, setConfirmClose] = useState(false)
  if (incident.request.Status === 'Verified Closed') return <p className="muted">A coordinator verified this resolution. The activity timeline records the closure.</p>
  return <div className="stack">
    <div className="action-row">
      <button className="button" disabled={saving || incident.acknowledgedAt !== undefined} onClick={() => dispatch({ type: 'acknowledge', incidentId: incident.request.Id })}><Check size={15} />{incident.acknowledgedAt !== undefined ? 'Acknowledged' : 'Acknowledge Incident'}</button>
      <button className="button" disabled={saving} onClick={() => dispatch({ type: 'flag', incidentId: incident.request.Id })}><Flag size={15} />{incident.flagged ? 'Clear Review Flag' : 'Flag for Review'}</button>
    </div>
    <AssignmentControl incident={incident} />
    {incident.request.Status === 'Assigned' && <button className="button primary" disabled={saving} onClick={() => dispatch({ type: 'progress', incidentId: incident.request.Id })}>Update Status to In Progress</button>}
    {incident.request.Status === 'In Progress' && <button className="button primary" disabled={saving} onClick={() => dispatch({ type: 'progress', incidentId: incident.request.Id })}>Mark Assistance Delivered</button>}
    {incident.request.Status === 'Assistance Delivered' && (confirmClose ? <div className="confirm-box">
      <p>Confirm that you have reviewed the reported delivery and verified the resolution.</p>
      <div className="action-row"><button className="button primary" disabled={saving} onClick={() => { dispatch({ type: 'verify', incidentId: incident.request.Id }); setConfirmClose(false) }}>Confirm Closure</button><button className="button" onClick={() => setConfirmClose(false)}>Cancel</button></div>
    </div> : <button className="button primary" disabled={saving} onClick={() => setConfirmClose(true)}>Verify and Close</button>)}
  </div>
}
