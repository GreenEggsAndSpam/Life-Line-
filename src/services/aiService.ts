import type { Urgency } from '../operations/types'

interface AIIncident {
  id: string
  description: string
}

export interface AIResult {
  id: string
  urgency: Urgency
  request_type: 'Emergency' | 'Assistance' | 'Information' | 'Uncertain'
  summary: string
  reason: string
  immediate_review: boolean
  missing_info: string[]
}

export async function prioritizeIncidents(incidents: AIIncident[]): Promise<AIResult[]> {
  const response = await fetch('http://localhost:8001/prioritize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidents }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error('AI assessment failed.')

  const result = await response.json() as { incidents: AIResult[] }
  if (!Array.isArray(result.incidents)) throw new Error('The analyzer returned an invalid assessment.')
  return result.incidents
}
