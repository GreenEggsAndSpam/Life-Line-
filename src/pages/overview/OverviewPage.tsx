import { ArrowRight } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Empty, PageTitle, PanelHeader, StatusBadge } from '../../components/ui'
import { useOperations } from '../../operations/OperationsContext'
import { primaryReport } from '../../operations/incidents'

const IncidentMap = lazy(() => import('./IncidentMap'))

export default function OverviewPage() {
  const { state, alerts } = useOperations()
  const { incidents } = state
  const active = incidents.filter(incident => incident.request.Status !== 'Verified Closed').length
  const followUps = new Set(alerts.map(alert => alert.incidentId)).size
  const recent = [...incidents].sort((a, b) => Date.parse(b.request.Time) - Date.parse(a.request.Time)).slice(0, 4)

  return <>
    <PageTitle title="Incident overview" description="Seattle, WA · Demo workspace" />
    <div className="overview-summary" aria-label="Incident counts">
      <Link to="/incidents"><strong>{incidents.length}</strong> Total incidents</Link>
      <span><strong>{active}</strong> Open</span>
      <Link to="/nobody-forgotten"><strong>{followUps}</strong> Need follow-up</Link>
    </div>
    <Suspense fallback={<section className="panel map-loading" role="status">Loading map…</section>}>
      <IncidentMap incidents={incidents} />
    </Suspense>
    <section className="panel recent-panel">
      <PanelHeader title="Recent incidents" action={<Link to="/incidents" className="text-link">View all <ArrowRight size={14} /></Link>} />
      {recent.length ? <ul className="recent-list">{recent.map(incident => {
        const report = primaryReport(incident)
        return <li key={incident.request.Id}><Link to={`/incidents/${incident.request.Id}`}>
          <div><strong>{incident.title}</strong><span>{report.location}</span></div>
          <StatusBadge status={incident.request.Status} />
        </Link></li>
      })}</ul> : <Empty title="No incidents yet" description="Demo reports will appear here." />}
    </section>
  </>
}
