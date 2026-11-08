import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { IncidentActions } from './IncidentActions'
import { Badge, Empty, LocationLabel, Notice, PageTitle, PanelHeader, StatusBadge } from '../../components/ui'
import { useOperations } from '../../operations/OperationsContext'
import { teams } from '../../operations/demo'
import { formatDate, formatTime, possibleDuplicates, primaryReport } from '../../operations/incidents'
import { canAssign, incidentById } from '../../operations/store'
import type { Incident } from '../../operations/types'

function DuplicateReview({ incident, candidate }: { incident: Incident; candidate: Incident }) {
  const { dispatch, saving } = useOperations()
  const [confirm, setConfirm] = useState(false)
  return <div className="duplicate-item">
    <div><Link className="text-link mono" to={`/incidents/${candidate.request.Id}`}>{candidate.request.Id}</Link><strong>{candidate.title}</strong><p>{primaryReport(candidate).location}</p></div>
    <p>{primaryReport(candidate).description}</p>
    {confirm ? <div className="confirm-box"><p>Link all original reports from {incident.request.Id} to {candidate.request.Id}. The original incident URL will lead to the combined record.</p><div className="action-row">
      <button className="button primary" disabled={saving} onClick={() => dispatch({ type: 'reviewDuplicate', incidentId: incident.request.Id, otherId: candidate.request.Id, merge: true })}>Confirm Linking</button>
      <button className="button" onClick={() => setConfirm(false)}>Cancel</button>
    </div></div> : <div className="action-row">
      <button className="button compact" disabled={saving} onClick={() => dispatch({ type: 'reviewDuplicate', incidentId: incident.request.Id, otherId: candidate.request.Id, merge: false })}>Keep Separate</button>
      {canAssign(incident) && <button className="button compact" onClick={() => setConfirm(true)}>Link Original Reports</button>}
    </div>}
  </div>
}

export default function IncidentDetailsPage() {
  const { incidentId = '' } = useParams()
  const { state } = useOperations()
  const { hash } = useLocation()
  const duplicateSection = useRef<HTMLElement>(null)
  useEffect(() => {
    if (hash === '#duplicates') {
      const frame = window.requestAnimationFrame(() => {
        duplicateSection.current?.focus({ preventScroll: true })
        duplicateSection.current?.scrollIntoView({ block: 'start' })
      })
      return () => window.cancelAnimationFrame(frame)
    }
  }, [hash, incidentId])
  const incident = incidentById(state, incidentId)
  if (!incident) return <><PageTitle title="Incident unavailable" description="Choose an incident from the list." /><div className="panel"><Empty title="No matching incident" description={incidentId || 'Choose a record from the register.'} /></div><Link className="button back-button" to="/incidents"><ArrowLeft size={15} /> Incident register</Link></>
  const report = primaryReport(incident)
  const assigned = state.assignments.find(item => item.incidentId === incident.request.Id)
  const team = teams.find(item => item.id === assigned?.teamId)
  const duplicates = possibleDuplicates(incident, state.incidents)
  return <>
    <Link className="back-link" to="/incidents"><ArrowLeft size={15} /> Back to incidents</Link>
    <PageTitle title={incident.title} description={`${incident.request.Id} · ${report.location}`} actions={<StatusBadge status={incident.request.Status} />} />
    {incidentId !== incident.request.Id && <div className="section-space"><Notice tone="blue">{incidentId} was linked to {incident.request.Id} during coordinator review.</Notice></div>}
    <div className="detail-grid">
      <div className="stack">
        <section className="panel">
          <PanelHeader title="Original Report" subtitle="Reported information · as submitted" />
          <div className="panel-body stack">
            {incident.reports.map(original => <article className="original-report" key={original.id}>
              <div className="split-line"><strong className="mono">{original.id}</strong><Badge tone="neutral">{original.reporterType}</Badge></div>
              <p className="report-copy">{original.description}</p>
              <dl className="data-grid">
                <div><dt>Submitted location</dt><dd><LocationLabel>{original.location}</LocationLabel></dd></div>
                <div><dt>People affected</dt><dd>{original.affected}</dd></div>
                <div><dt>Assistance requested</dt><dd>{original.assistance}</dd></div>
                <div><dt>Reported at</dt><dd>{formatDate(original.submittedAt)} PT</dd></div>
                {original.reporterName && <div><dt>Demo reporter</dt><dd>{original.reporterName}</dd></div>}
                {original.contact && <div><dt>Demo contact</dt><dd>{original.contact}</dd></div>}
              </dl>
            </article>)}
          </div>
        </section>
        <details className="panel disclosure">
          <summary>Demo assessment</summary>
          <div className="panel-body stack">
            <Notice tone="blue"><strong>AI interpretation</strong><p>These interpretations and suggestions are synthetic and require coordinator review.</p></Notice>
            <dl className="data-grid">
              <div><dt>Analysis status</dt><dd>{incident.analysis.status}</dd></div><div><dt>Incident category</dt><dd>{incident.request.EmergencyType}</dd></div>
              <div><dt>Assistance requirements</dt><dd>{incident.analysis.requirements}</dd></div><div><dt>Reported safety concerns</dt><dd>{incident.analysis.safety}</dd></div>
              <div><dt>Potential mobility concerns</dt><dd>{incident.analysis.mobility}</dd></div><div><dt>Potential duplicates</dt><dd>{duplicates.length ? `${duplicates.length} possible match${duplicates.length === 1 ? '' : 'es'}` : 'No open matches'}</dd></div>
            </dl>
            <div><h3>Suggested actions</h3><ul className="suggestions">{incident.analysis.suggestions.map(suggestion => <li key={suggestion}>{suggestion}</li>)}</ul></div>
          </div>
        </details>
        {duplicates.length > 0 && <section className="panel" id="duplicates" ref={duplicateSection} tabIndex={-1}>
          <PanelHeader title="Duplicate Review" subtitle="Compare original reports before combining records" />
          <div className="panel-body stack">{duplicates.map(candidate => <DuplicateReview key={candidate.request.Id} incident={incident} candidate={candidate} />)}</div>
        </section>}
      </div>
      <div className="stack">
        <section className="panel">
          <PanelHeader title="Coordinator Actions" subtitle={team ? team.name : 'No active team assignment'} />
          <div className="panel-body"><IncidentActions key={incident.request.Id} incident={incident} /></div>
        </section>
        <section className="panel">
          <PanelHeader title="Human Verification" subtitle="Coordinator confirmation record" />
          <div className="panel-body"><dl className="data-grid single-column">
            <div><dt>Acknowledged</dt><dd>{incident.acknowledgedAt === undefined ? 'Awaiting acknowledgment' : `${formatDate(incident.acknowledgedAt)} PT`}</dd></div>
            <div><dt>Field delivery</dt><dd>{incident.deliveredAt === undefined ? 'Awaiting delivery' : `${formatDate(incident.deliveredAt)} PT`}</dd></div>
            <div><dt>Resolution verified</dt><dd>{incident.verifiedAt === undefined ? 'Awaiting coordinator verification' : `${formatDate(incident.verifiedAt)} PT`}</dd></div>
          </dl></div>
        </section>
        <section className="panel">
          <PanelHeader title="Activity Timeline" subtitle="Recorded actions for this incident" />
          <ol className="timeline panel-body">{[...incident.activity].reverse().map(event => <li key={event.id}><div><strong>{event.label}</strong><small>{event.actor} · {formatTime(event.at)} PT</small></div></li>)}</ol>
        </section>
      </div>
    </div>
  </>
}
