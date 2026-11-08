import type { AIAnalysis, Assistance, Category, ReportDraft } from './types'

const assistanceCategories: Record<Assistance, Category> = {
  Rescue: 'Infrastructure',
  'Medical Assistance': 'Medical',
  Evacuation: 'Evacuation',
  'Food and Water': 'Supplies',
  Shelter: 'Evacuation',
  Other: 'Infrastructure',
}

export function emergencyTypeFor(assistance: Assistance): Category {
  return assistanceCategories[assistance]
}

function suggestResponseActions(category: Category): string[] {
  const checks: Record<Category, string> = {
    Flooding: 'Confirm water depth and an accessible approach with a field team.',
    Medical: 'Confirm the reported injuries and whether an accessible pickup point is available.',
    Infrastructure: 'Ask the field team to confirm the obstruction and a safe access route.',
    Evacuation: 'Confirm pickup access and available spaces with the receiving team.',
    Fire: 'Confirm the reported hazard and keep the approach clear for assessment.',
    Supplies: 'Confirm the requested quantities and a receiving contact in the field.',
  }
  return [checks[category], 'Check nearby reports and confirm team availability before assignment.']
}

export function analyzeIncident(report: ReportDraft, category: Category): AIAnalysis {
  return {
    status: 'Mock analysis complete',
    requirements: `Likely requires coordination for ${report.assistance.toLowerCase()} based on the original request.`,
    safety: category === 'Flooding' ? 'Water may obstruct access. Depth and current have yet to be confirmed.' : 'Ask a coordinator to review the conditions described in the original report.',
    mobility: report.affected > 5 ? 'Group movement may require accessible transport. Confirm individual needs in the field.' : 'Confirm mobility and accessibility needs with the reporting party.',
    suggestions: suggestResponseActions(category),
  }
}
