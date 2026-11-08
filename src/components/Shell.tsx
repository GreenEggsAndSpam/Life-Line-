import { Suspense, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useOperations } from '../operations/OperationsContext'
import { Brand, Notice } from './ui'

const links = [
  { to: '/', label: 'Overview' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/nobody-forgotten', label: 'Follow-up' },
  { to: '/responder', label: 'Responders' },
]

export default function Shell() {
  const { backend, error, saving, clearError } = useOperations()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef<string>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    const previous = previousPath.current
    previousPath.current = pathname
    if (previous === null || previous === pathname) return
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname])

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-identity"><Brand /><span className="demo-label">{backend === 'demo' ? 'Demo' : 'DB demo'}</span></div>
        <nav className="site-nav" aria-label="Main navigation">
          {links.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
        </nav>
        <NavLink className="button primary header-report" to="/report">Report an incident</NavLink>
      </div>
    </header>
    <main className="main-content" ref={mainRef} id="main-content" tabIndex={-1}>
      {(backend === 'connecting' || saving) && <p role="status" className="muted section-space">{saving ? 'Saving to SpacetimeDB…' : 'Connecting to SpacetimeDB…'}</p>}
      {backend === 'unavailable' && <div className="section-space" role="status"><Notice>SpacetimeDB is unavailable. Check the local server and browser configuration, then reload.</Notice></div>}
      {error && <div className="section-space" role="alert"><Notice>{error} <button className="text-link" onClick={clearError}>Dismiss</button></Notice></div>}
      <Suspense fallback={<p className="loading-page" role="status">Loading page…</p>}><Outlet /></Suspense>
    </main>
  </>
}
