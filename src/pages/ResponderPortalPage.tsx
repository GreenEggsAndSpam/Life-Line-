import { MessageSquarePlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Empty, LocationLabel, Notice, PageTitle, PanelHeader, StatusBadge } from '../components/ui'
import { useOperations } from '../operations/OperationsContext'
import { teams } from '../operations/demo'
import { formatTime, primaryReport } from '../operations/incidents'
import { incidentById } from '../operations/store'
import type { Incident } from '../operations/types'

function FieldAssignment({ incident, teamId }: { incident: Incident; teamId: string }) {
  const { dispatch, saving } = useOperations()
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const report = primaryReport(incident)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!note.trim()) return
    dispatch({ type: 'observation', incidentId: incident.request.Id, teamId, note })
    setNote('')
    setSaved(true)
  }

  return <div className="panel-body stack">
    <div className="split-line"><div><span className="mono muted">{incident.request.Id} · SYNTHETIC</span><h3 className="assignment-title">{incident.title}</h3></div><StatusBadge status={incident.request.Status} /></div>
    <LocationLabel>{report.location}</LocationLabel><p className="report-copy">{report.description}</p>
    <dl className="data-grid"><div><dt>Requested assistance</dt><dd>{report.assistance}</dd></div><div><dt>People affected</dt><dd>{report.affected}</dd></div></dl>
    <div className="action-row">
      {incident.request.Status === 'Assigned' && <button className="button primary" disabled={saving} onClick={() => dispatch({ type: 'progress', incidentId: incident.request.Id, teamId })}>Update Status to In Progress</button>}
      {incident.request.Status === 'In Progress' && <button className="button primary" disabled={saving} onClick={() => dispatch({ type: 'progress', incidentId: incident.request.Id, teamId })}>Report Assistance Delivered</button>}
      {incident.request.Status === 'Assistance Delivered' && <Notice tone="green">Delivery reported. A coordinator will review the resolution.</Notice>}
    </div>
    <form className="stack observation-form" onSubmit={submit}><label>Report field observation<textarea rows={4} maxLength={500} value={note} required placeholder="Describe a synthetic observation for the coordinator." onChange={event => { setNote(event.target.value); setSaved(false) }} /></label>
      <button className="button" disabled={saving || !note.trim()}><MessageSquarePlus size={16} /> Save Observation</button>
      {saved && <p className="success-text" role="status">Observation recorded in the shared timeline.</p>}
    </form>
    <div><h3>Recent activity</h3><ol className="timeline field-timeline">{[...incident.activity].reverse().slice(0, 4).map(event => <li key={event.id}><div><strong>{event.label}</strong><small>{event.actor} · {formatTime(event.at)} PT</small></div></li>)}</ol></div>
  </div>
}

export default function ResponderPortalPage() {
  const { state } = useOperations()
  const [teamId, setTeamId] = useState(teams[0].id)
  const assignment = state.assignments.find(item => item.teamId === teamId)
  const incident = assignment && incidentById(state, assignment.incidentId)
  return <>
    <PageTitle title="Responder portal" />
    <div className="narrow-stack">
      <section className="panel">
        <div className="panel-body"><label className="select-label">Demo team<select value={teamId} onChange={event => setTeamId(event.target.value)}>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div>
      </section>
      <section className="panel">
        <PanelHeader title="My Assignments" subtitle="Current assignment and incident details" />
        {incident ? <FieldAssignment key={`${teamId}-${incident.request.Id}`} incident={incident} teamId={teamId} /> : <Empty title="No active assignment" description="When a coordinator assigns this team an incident, it will appear here." />}
      </section>
    </div>
  </>
}
