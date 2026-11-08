import { Crosshair, Minus, Plus } from 'lucide-react'
import { divIcon, latLngBounds, type Marker as LeafletMarker, type TileLayer as LeafletTileLayer } from 'leaflet'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { areas, CENTER, REGION, teams } from '../../operations/demo'
import { mapStatus, primaryReport } from '../../operations/incidents'
import { categories, incidentStatuses, type Incident, type Position } from '../../operations/types'
import { StatusBadge } from '../../components/ui'
import 'leaflet/dist/leaflet.css'

const legend = [
  { label: 'Needs Review', tone: 'red', glyph: '<path d="M8 4v5m0 3h.01"/>' },
  { label: 'Unassigned', tone: 'amber', glyph: '<circle cx="8" cy="8" r="4"/><path d="M8 6v2l1.5 1"/>' },
  { label: 'Assigned / In Progress', tone: 'blue', glyph: '<path d="M3 8h10m-4-4 4 4-4 4"/>' },
  { label: 'Verified Closed', tone: 'green', glyph: '<path d="m4 8 2.5 2.5L12 5"/>' },
] as const
const icons = Object.fromEntries(legend.map(({ label, tone, glyph }) => [label, divIcon({
  className: 'map-pin-wrapper',
  html: `<span class="map-pin tone-${tone}"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph}</svg></span>`,
  iconSize: [29, 29], iconAnchor: [14, 14], popupAnchor: [0, -15],
})]))

const stationIcon = divIcon({
  className: 'map-pin-wrapper',
  html: '<span class="map-pin map-pin-station tone-violet"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 7l6-4 6 4v6H2zM6 13V9h4v4"/></svg></span>',
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -15],
})

const demoBounds = latLngBounds([...areas.map(area => area.position), ...teams.map(team => team.coordinates)])
const regionView = { padding: [29, 29] as [number, number], maxZoom: 12, animate: false }

function MapControls() {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(demoBounds, regionView)
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return <div className="map-controls" aria-label="Map controls" onDoubleClick={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()}>
    <div><button type="button" onClick={() => map.zoomIn()} aria-label="Zoom in"><Plus size={17} /></button><button type="button" onClick={() => map.zoomOut()} aria-label="Zoom out"><Minus size={17} /></button></div>
    <button type="button" onClick={() => map.fitBounds(demoBounds, regionView)} aria-label="Recenter on Seattle"><Crosshair size={16} /></button>
  </div>
}

function FocusReport({ markerRef, incidentId }: { markerRef: RefObject<LeafletMarker | null>; incidentId?: string }) {
  const map = useMap()
  useEffect(() => {
    const marker = markerRef.current
    if (!incidentId || !marker) return
    map.setView(marker.getLatLng(), 15, { animate: false })
    marker.openPopup()
  }, [incidentId, map, markerRef])
  return null
}

const osmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const osmTiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const tileUrl = import.meta.env.VITE_MAP_TILE_URL || osmTiles

export default function IncidentMap({ incidents, focusReportId }: { incidents: Incident[]; focusReportId: string | null }) {
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [tilesUnavailable, setTilesUnavailable] = useState(false)
  const displayed = useMemo(() => incidents.filter(incident => (!category || category === incident.request.EmergencyType)
    && (!status || status === incident.request.Status)), [category, incidents, status])
  const markerGroups = new Map<string, { position: Position; incidents: Incident[] }>()
  let mappedCount = 0
  for (const incident of displayed) {
    const { Latitude, Longitude } = incident.request
    if (Latitude === null || Longitude === null) continue
    const key = `${Latitude},${Longitude}`
    const group = markerGroups.get(key)
    if (group) group.incidents.push(incident)
    else markerGroups.set(key, { position: [Latitude, Longitude], incidents: [incident] })
    mappedCount++
  }
  const focusedIncident = focusReportId
    ? displayed.find(({ reports, request }) => request.Latitude !== null && request.Longitude !== null
      && reports.some(report => report.id === focusReportId))
    : undefined
  const focusedMarker = useRef<LeafletMarker>(null)
  const tileEvents = useMemo(() => ({
    load: (event: { target: LeafletTileLayer }) => {
      const tiles = Array.from(event.target.getContainer()?.querySelectorAll('img') ?? [])
      setTilesUnavailable(tiles.length > 0 && !tiles.some(tile => tile.naturalWidth > 0))
    },
  }), [])

  return <section className="panel map-panel" aria-labelledby="map-heading">
    <div className="panel-header map-header">
      <div><h2 id="map-heading">Incident map</h2><p>{REGION} · {mappedCount} mapped incidents</p></div>
      <div className="map-filters">
        <select aria-label="Map incident category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All types</option>{categories.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="Map incident status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{incidentStatuses.map(value => <option key={value}>{value}</option>)}</select>
      </div>
    </div>
    <div className="map-frame" role="region" aria-label="Interactive 2D Seattle incident map">
      <MapContainer center={CENTER} zoom={11} zoomControl={false} scrollWheelZoom={false} zoomSnap={0.25} minZoom={9} maxZoom={19} className="incident-map">
        <TileLayer url={tileUrl} attribution={osmAttribution} eventHandlers={tileEvents} maxNativeZoom={19} referrerPolicy="strict-origin-when-cross-origin" />
        <MapControls />
        {[...markerGroups].map(([key, group]) => {
          const focused = focusedIncident && group.incidents.includes(focusedIncident) ? focusedIncident : undefined
          const lead = focused ?? group.incidents[0]
          const popupIncidents = focused ? [focused, ...group.incidents.filter(incident => incident !== focused)] : group.incidents
          const title = group.incidents.length > 1
            ? `${group.incidents.length} incidents at this location`
            : `${lead.request.Id}: ${lead.title}, ${lead.request.Status}`
          return <Marker key={key} position={group.position} icon={icons[mapStatus(lead)]} title={title} alt={title} ref={focused ? focusedMarker : undefined}>
            <Popup maxHeight={200}>
              <div className="stack">
                {group.incidents.length > 1 && <strong>{title}</strong>}
                {popupIncidents.map(incident => {
                  const { Id, EmergencyType, Description, Status } = incident.request
                  const report = primaryReport(incident)
                  return <div key={Id} className="map-popup">
                    <span className="mono">{Id} · {EmergencyType} · Synthetic</span>
                    <strong>{incident.title}</strong>
                    <StatusBadge status={Status} />
                    <p>{Description}</p>
                    <span>{report.location} · {report.affected} affected</span>
                    <Link to={`/incidents/${Id}`}>View Details →</Link>
                  </div>
                })}
              </div>
            </Popup>
          </Marker>
        })}
        {teams.map(({ id, name, coordinates }) => <Marker key={`station-${id}`} position={coordinates} icon={stationIcon} title={`${name} station`}>
          <Popup><div className="map-popup"><span>Demo team station</span><strong>{name}</strong><span className="mono">{coordinates.join(', ')}</span></div></Popup>
        </Marker>)}
        <FocusReport markerRef={focusedMarker} incidentId={focusedIncident?.request.Id} />
      </MapContainer>
      {tilesUnavailable && <div className="map-tile-notice" role="status">Street tiles are temporarily unavailable. Map markers remain active.</div>}
      {mappedCount === 0 && <div className="map-empty" role="status">No mapped incidents match these filters.</div>}
    </div>
    <div className="map-legend">{legend.map(({ label, tone }) => <span key={label} className={`tone-${tone}`}><i className="status-dot" />{label}</span>)}<span className="tone-violet"><i className="status-dot map-pin-station" />Team station</span>{displayed.length > mappedCount && <span>{displayed.length - mappedCount} awaiting coordinates</span>}</div>
  </section>
}
