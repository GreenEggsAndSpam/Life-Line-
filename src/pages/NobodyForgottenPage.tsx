import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, PageTitle, PanelHeader, StatusBadge } from '../components/ui'
import { useOperations } from '../operations/OperationsContext'
import { teams } from '../operations/demo'
import { ageLabel } from '../operations/incidents'
import { escalationGroups, type EscalationGroup } from '../operations/types'

export default function NobodyForgottenPage() {
  const { state, alerts, dispatch, saving } = useOperations()
  const [selected, setSelected] = useState<EscalationGroup | ''>('')
  const filtered = alerts.filter(alert => !selected || alert.group === selected)
  return <>
    <PageTitle title="Nobody Forgotten" description="Open incidents that need a response or review." />
    <section className="panel">
      <PanelHeader title="Follow-up queue" subtitle={`${filtered.length} open alerts`} action={
        <select aria-label="Filter by follow-up reason" value={selected} onChange={event => setSelected(event.target.value as EscalationGroup | '')}>
          <option value="">All reasons</option>
          {escalationGroups.map(group => <option key={group} value={group}>{group} ({alerts.filter(alert => alert.group === group).length})</option>)}
        </select>
      } />
      {filtered.length === 0 ? <Empty title="No open alerts" description="No incidents match this escalation group at the current demo time." /> :
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Escalation queue table">
          <table><thead><tr>{['Incident', 'Waiting', 'Responder', 'Reason', 'Status', 'Action'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{filtered.map(alert => {
              const incident = state.incidents.find(item => item.request.Id === alert.incidentId)
              if (!incident) return null
              const assigned = state.assignments.find(item => item.incidentId === incident.request.Id)
              const to = `/incidents/${incident.request.Id}`
              return <tr key={`${alert.incidentId}-${alert.group}`}>
                <td className="table-description"><Link to={to} className="mono text-link">{incident.request.Id}</Link><strong>{incident.title}</strong></td><td className="nowrap">{ageLabel(alert.waiting)}</td>
                <td>{teams.find(team => team.id === assigned?.teamId)?.name ?? '—'}</td><td>{alert.reason}</td><td><StatusBadge status={incident.request.Status} /></td>
                <td>{alert.group === 'Unacknowledged Reports'
                  ? <button className="button compact" disabled={saving} onClick={() => dispatch({ type: 'acknowledge', incidentId: incident.request.Id })}><Check size={14} /> Acknowledge Incident</button>
                  : <Link className="button compact" to={`${to}${alert.group === 'Possible Duplicate Reports' ? '#duplicates' : ''}`}>{
                    alert.group === 'Unassigned Incidents' ? 'Assign Responder' : alert.group === 'Awaiting Verification' ? 'Verify Resolution' : alert.group === 'Possible Duplicate Reports' ? 'Review Duplicate' : 'View Incident'
                  } <ArrowRight size={13} /></Link>}</td>
              </tr>
            })}</tbody>
          </table>
        </div>}
    </section>
  </>
}
