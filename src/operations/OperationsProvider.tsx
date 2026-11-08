import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { defaultThresholds } from './demo'
import { getEscalations, reportErrors } from './incidents'
import { createDemoState, createEmptyState, incidentById, operationsReducer, type Action } from './store'
import type { connectRequests } from '../services/spacetimeService'
import type { ReportDraft } from './types'
import { OperationsContext } from './OperationsContext'

const spacetimeUrl = import.meta.env.VITE_SPACETIME_URL
const spacetimeDatabase = import.meta.env.VITE_SPACETIME_DATABASE

export function OperationsProvider({ children }: { children: ReactNode }) {
  const configured = Boolean(spacetimeUrl || spacetimeDatabase)
  const [state, apply] = useReducer(operationsReducer, undefined, () => configured ? createEmptyState() : createDemoState())
  const [backend, setBackend] = useState<'demo' | 'connecting' | 'ready' | 'unavailable'>(
    configured ? spacetimeUrl && spacetimeDatabase ? 'connecting' : 'unavailable' : 'demo',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const remote = useRef<ReturnType<typeof connectRequests>>(null)

  useEffect(() => {
    if (!spacetimeUrl || !spacetimeDatabase) return
    let cancelled = false
    import('../services/spacetimeService').then(({ connectRequests }) => {
      if (cancelled) return
      remote.current = connectRequests(spacetimeUrl, spacetimeDatabase, snapshot => {
        if (!cancelled) apply({ type: 'syncRequests', ...snapshot })
      }, status => {
        if (!cancelled) setBackend(status)
      })
    }).catch(() => {
      if (!cancelled) setBackend('unavailable')
    })
    return () => {
      cancelled = true
      remote.current?.close()
      remote.current = null
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => apply({ type: 'clock', now: Date.now() }), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  async function save(operation: (connection: ReturnType<typeof connectRequests>) => Promise<void>) {
    const connection = remote.current
    if (backend !== 'ready' || !connection) {
      setError('SpacetimeDB is unavailable. Check the connection and reload.')
      return false
    }
    if (pending.current) return false
    pending.current = true
    setSaving(true)
    setError('')
    try {
      await operation(connection)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SpacetimeDB could not save the change.')
      return false
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  function dispatch(action: Action) {
    if (!configured || !('incidentId' in action)) {
      apply(action)
      return
    }
    if (pending.current) return
    const before = incidentById(state, action.incidentId)?.request.Status
    const after = incidentById(operationsReducer(state, action), action.incidentId)?.request.Status
    if (before && after && before !== after) {
      void save(connection => connection.setStatus(action.incidentId, before, after, action.type === 'assign' ? action.teamId : undefined))
    } else {
      apply(action)
    }
  }

  async function submitReport(draft: ReportDraft) {
    if (Object.keys(reportErrors(draft)).length) return false
    if (!configured) {
      apply({ type: 'report', draft })
      return true
    }
    return save(async connection => {
      const reportId = await connection.submit(draft)
      apply({ type: 'reportRecorded', reportId })
    })
  }

  const alerts = useMemo(() => getEscalations(state.incidents, state.now, defaultThresholds), [state.incidents, state.now])
  const value = { state, alerts, dispatch, submitReport, backend, saving, error, clearError: () => setError('') }
  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>
}
