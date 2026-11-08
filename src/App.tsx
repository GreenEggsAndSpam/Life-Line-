import { lazy } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import { OperationsProvider } from './operations/OperationsProvider'

const OverviewPage = lazy(() => import('./pages/overview/OverviewPage'))
const IncidentsPage = lazy(() => import('./pages/incidents/IncidentsPage'))
const IncidentDetailsPage = lazy(() => import('./pages/incidents/IncidentDetailsPage'))
const ReportEmergencyPage = lazy(() => import('./pages/ReportEmergencyPage'))
const NobodyForgottenPage = lazy(() => import('./pages/NobodyForgottenPage'))
const ResponderPortalPage = lazy(() => import('./pages/ResponderPortalPage'))

export default function App() {
  return <OperationsProvider><Routes>
    <Route element={<Shell />}>
      <Route index element={<OverviewPage />} />
      <Route path="incidents" element={<IncidentsPage />} />
      <Route path="incidents/:incidentId" element={<IncidentDetailsPage />} />
      <Route path="report" element={<ReportEmergencyPage />} />
      <Route path="nobody-forgotten" element={<NobodyForgottenPage />} />
      <Route path="responder" element={<ResponderPortalPage />} />
      <Route path="*" element={<section className="panel empty"><h1>Page unavailable</h1><p>This route could not be found.</p><Link className="button" to="/">Back to overview</Link></section>} />
    </Route>
  </Routes></OperationsProvider>
}
