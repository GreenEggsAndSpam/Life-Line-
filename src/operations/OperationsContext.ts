import { createContext, useContext, type Dispatch } from 'react'
import type { Action, OperationsState } from './store'
import type { EscalationAlert, ReportDraft } from './types'

interface OperationsContextValue {
  state: OperationsState
  alerts: EscalationAlert[]
  dispatch: Dispatch<Action>
  submitReport: (draft: ReportDraft) => Promise<boolean>
  backend: 'demo' | 'connecting' | 'ready' | 'unavailable'
  saving: boolean
  error: string
  clearError: () => void
}

export const OperationsContext = createContext<OperationsContextValue | null>(null)

export function useOperations() {
  const context = useContext(OperationsContext)
  if (!context) throw new Error('OperationsProvider is required')
  return context
}
