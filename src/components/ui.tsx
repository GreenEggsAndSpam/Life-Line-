import { Activity, AlertTriangle, Check, CircleHelp, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { IncidentStatus } from '../operations/types'

const statusTones: Record<IncidentStatus, string> = {
  Reported: 'amber', 'Under Review': 'red', Assigned: 'blue', 'In Progress': 'blue',
  'Assistance Delivered': 'violet', 'Verified Closed': 'green',
}

export function Brand() {
  return <Link to="/" className="brand" aria-label="Life Line home"><span className="brand-mark"><Activity size={18} /></span>Life Line</Link>
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge tone={statusTones[status]}>{status}</Badge>
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-title">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="action-row">{actions}</div>}
  </div>
}

export function PanelHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
}

export function Empty({ title, description }: { title: string; description: string }) {
  return <div className="empty"><strong>{title}</strong><p>{description}</p></div>
}

export function Notice({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'green' | 'blue' }) {
  const Icon = tone === 'green' ? Check : tone === 'blue' ? CircleHelp : AlertTriangle
  return <div className={`notice tone-${tone}`}><Icon size={17} aria-hidden="true" /><div>{children}</div></div>
}

export function LocationLabel({ children }: { children: ReactNode }) {
  return <span className="location-label"><MapPin size={14} aria-hidden="true" />{children}</span>
}

export function SafetyNotice() {
  return <Notice><strong>Demo only</strong><p>Use fictional information. Submitting a report does not contact emergency services. In a real emergency, contact them directly.</p></Notice>
}
