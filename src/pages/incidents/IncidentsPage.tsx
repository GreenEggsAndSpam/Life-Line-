import { useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Empty, PageTitle, PanelHeader, StatusBadge } from '../../components/ui'
import { useOperations } from '../../operations/OperationsContext'
import { teams } from '../../operations/demo'
import { formatTime, matchesIncident, primaryReport } from '../../operations/incidents'
import { canAssign } from '../../operations/store'
import { categories, incidentStatuses } from '../../operations/types'
import { prioritizeIncidents, type AIResult } from '../../services/aiService'


export default function IncidentsPage() {
  const { state, alerts } = useOperations()

  // Gemini AI state
  const [analyzing, setAnalyzing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiResults, setAiResults] = useState<AIResult[]>([])

  // Existing filters
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const status = params.get('status') ?? ''
  const assignment = params.get('assignment') ?? ''
  const escalation = params.get('escalation') ?? ''
  const oldest = params.get('sort') === 'oldest'
  const active = alerts.map(alert => alert.incidentId)
  const filtered = state.incidents.filter(incident => {
    const assigned = state.assignments.some(
      item => item.incidentId === incident.request.Id
    )

    const escalated =
      incident.flagged || active.includes(incident.request.Id)

    return matchesIncident(incident, search)
      && (!category || category === incident.request.EmergencyType)
      && (!status || status === incident.request.Status)
      && (!assignment ||
        (assignment === 'assigned' ? assigned : canAssign(incident)))
      && (!escalation ||
        (escalation === 'open' ? escalated : !escalated))
  }).sort((a, b) =>
    (oldest ? 1 : -1) *
    (Date.parse(a.request.Time) - Date.parse(b.request.Time))
  )

  // Gemini AI analysis
  async function analyzeIncidents() {
    if (analyzing || state.incidents.length === 0) return
    console.log('GEMINI BUTTON CLICKED')
    setAnalyzing(true)
    setAiError('')
    setAiResults([])

    try {
      const results = await prioritizeIncidents(state.incidents.map(incident => ({
        id: incident.request.Id,
        description: incident.reports
          .map(report => report.description)
          .join('\n')
      }))

      const result = await prioritizeIncidents(incidents)
      console.log('GEMINI RESPONSE:', result)
      alert(`Gemini returned ${result.incidents.length} assessments`)
      setAiResults(result.incidents)
      console.log('Gemini AI assessments:', result.incidents)
    } catch (error) {
      console.error('Gemini analysis failed:', error)
      setAiError(
        error instanceof Error ? error.message : 'AI analysis failed'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  function filter(key: string, value: string) {
    const next = new URLSearchParams(params)

    if (value) next.set(key, value)
    else next.delete(key)

    setParams(next, {
      replace: true,
      preventScrollReset: true
    })
  }

  return (
    <>
      <PageTitle title="Incidents" />

        {/* Gemini AI button */}
        <div
      style={{
        position: 'relative',
        zIndex: 1000,
        padding: '16px 0',
        pointerEvents: 'auto'
      }}
    >
      <button
        type="button"
        className="button"
        disabled={analyzing || state.incidents.length === 0}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          console.log('GEMINI BUTTON CLICKED')
          void analyzeIncidents()
        }}
        style={{
          position: 'relative',
          zIndex: 1001,
          pointerEvents: 'auto',
          cursor: 'pointer'
        }}
      >
        {analyzing ? 'Analyzing incidents...' : 'Analyze with Gemini AI'}
      </button>
    </div>

        {aiError && (
          <p role="alert" style={{ color: 'crimson' }}>
            Gemini analysis failed: {aiError}
          </p>
        )}

  {/* Gemini AI assessment panel */}
  {aiResults.length > 0 && (
    <section className="panel">
      <h2>Gemini AI Assessments ({aiResults.length})</h2>

      <div style={{ padding: '16px' }}>
        {aiResults.map((result, index) => (
          <div
            key={result.id ?? index}
            style={{
              borderBottom: '1px solid #ccc',
              padding: '16px 0'
            }}
          >
            <h3>
              Incident {result.id} — {result.urgency}
            </h3>

            <p><strong>Summary:</strong> {result.summary}</p>
            <p><strong>Reason:</strong> {result.reason}</p>
          </div>
        ))}
      </div>
    </section>
  )}

      {/* Original incident table */}
      <section className="panel">
        <PanelHeader
          title={`${filtered.length} of ${state.incidents.length} incidents`}
        />

        <div className="filter-bar">
          <label className="input-with-icon">
            <Search size={16} />
            <input
              value={search}
              onChange={event => filter('q', event.target.value)}
              placeholder="Search ID, description, or location…"
              aria-label="Search incident register"
            />
          </label>

          <select
            value={category}
            onChange={event => filter('category', event.target.value)}
            aria-label="Category filter"
          >
            <option value="">All categories</option>
            {categories.map(value => (
              <option key={value}>{value}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={event => filter('status', event.target.value)}
            aria-label="Status filter"
          >
            <option value="">All statuses</option>
            {incidentStatuses.map(value => (
              <option key={value}>{value}</option>
            ))}
          </select>

          <select
            value={assignment}
            onChange={event => filter('assignment', event.target.value)}
            aria-label="Assignment filter"
          >
            <option value="">All assignments</option>
            <option value="assigned">Assigned team</option>
            <option value="unassigned">Awaiting assignment</option>
          </select>

          <select
            value={escalation}
            onChange={event => filter('escalation', event.target.value)}
            aria-label="Escalation filter"
          >
            <option value="">All escalation states</option>
            <option value="open">Flagged or escalated</option>
            <option value="clear">No escalation</option>
          </select>

          {params.size > 0 && (
            <button
              className="button compact"
              onClick={() => setParams({})}
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <Empty
            title={
              state.incidents.length
                ? 'No matching incidents'
                : 'No incidents yet'
            }
            description={
              state.incidents.length
                ? 'Clear the filters or try a different search.'
                : 'Submit a report or generate a scenario to get started.'
            }
          />
        ) : (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Incident register table"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Incident ID</th>
                  <th scope="col">Report</th>
                  <th scope="col">Location</th>

                  <th
                    scope="col"
                    aria-sort={oldest ? 'ascending' : 'descending'}
                  >
                    <button
                      className="table-sort"
                      onClick={() =>
                        filter('sort', oldest ? '' : 'oldest')
                      }
                    >
                      Reported
                      {oldest
                        ? <ArrowUp size={13} />
                        : <ArrowDown size={13} />}
                    </button>
                  </th>

                  <th scope="col">Status</th>
                  <th scope="col">Responder</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(incident => {
                  const report = primaryReport(incident)

                  const teamId = state.assignments.find(
                    item => item.incidentId === incident.request.Id
                  )?.teamId

                  return (
                    <tr key={incident.request.Id}>
                      <td>
                        <Link
                          className="table-id mono"
                          to={`/incidents/${incident.request.Id}`}
                        >
                          {incident.request.Id}
                          <ArrowRight size={13} />
                        </Link>
                      </td>

                      <td className="table-description">
                        <strong>{incident.title}</strong>
                        <span>
                          {incident.request.EmergencyType}
                          {' · '}
                          {report.affected} affected
                        </span>
                      </td>

                      <td>{report.location}</td>

                      <td className="nowrap">
                        {formatTime(
                          Date.parse(incident.request.Time)
                        )} PT
                      </td>

                      <td>
                        <StatusBadge
                          status={incident.request.Status}
                        />
                      </td>

                      <td>
                        {teams.find(
                          team => team.id === teamId
                        )?.name ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
