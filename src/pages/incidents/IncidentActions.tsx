import { Check, Flag, Users } from 'lucide-react'
import { useState } from 'react'
import { useOperations } from '../../operations/OperationsContext'
import { availableTeams, canAssign } from '../../operations/store'
import type { Incident } from '../../operations/types'

function AssignmentControl({ incident }: { incident: Incident }) {
  const { state, dispatch, saving } = useOperations()
  const [selected, setSelected] = useState('')
  const available = availableTeams(state)
  if (!canAssign(incident)) return null
  return <form className="assignment-form" onSubmit={event => {
    event.preventDefault()
    if (available.some(team => team.id === selected)) {
      dispatch({ type: 'assign', incidentId: incident.request.Id, teamId: selected })
      setSelected('')
    }
  }}>
    <label>Assign responder<select value={available.some(team => team.id === selected) ? selected : ''} onChange={event => setSelected(event.target.value)} disabled={!available.length}>
      <option value="">{available.length ? 'Select an available team' : 'No available teams'}</option>{available.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
    </select></label>
    <button type="submit" className="button" disabled={saving || !available.some(team => team.id === selected)}><Users size={15} /> Assign Responder</button>
  </form>
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
