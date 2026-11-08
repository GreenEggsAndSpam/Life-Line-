import { Crosshair, Minus, Plus } from 'lucide-react'
import { divIcon, latLngBounds, type TileLayer as LeafletTileLayer } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { areas, CENTER, REGION } from '../../operations/demo'
import { mapStatus, primaryReport } from '../../operations/incidents'
import { categories, incidentStatuses, type Incident } from '../../operations/types'
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

const demoBounds = latLngBounds(areas.map(area => area.position))
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

const osmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const osmTiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const tileUrl = import.meta.env.VITE_MAP_TILE_URL || osmTiles

export default function IncidentMap({ incidents }: { incidents: Incident[] }) {
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [tilesUnavailable, setTilesUnavailable] = useState(false)
  const displayed = useMemo(() => incidents.filter(incident => (!category || category === incident.request.EmergencyType)
    && (!status || status === incident.request.Status)), [category, incidents, status])
  const mapped = displayed.filter(({ request }) => request.Latitude !== null && request.Longitude !== null)
  const tileEvents = useMemo(() => ({
    load: (event: { target: LeafletTileLayer }) => {
      const tiles = Array.from(event.target.getContainer()?.querySelectorAll('img') ?? [])
      setTilesUnavailable(tiles.length > 0 && !tiles.some(tile => tile.naturalWidth > 0))
    },
  }), [])

  return <section className="panel map-panel" aria-labelledby="map-heading">
    <div className="panel-header map-header">
      <div><h2 id="map-heading">Incident map</h2><p>{REGION} · {mapped.length} mapped</p></div>
      <div className="map-filters">
        <select aria-label="Map incident category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All types</option>{categories.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="Map incident status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{incidentStatuses.map(value => <option key={value}>{value}</option>)}</select>
      </div>
    </div>
    <div className="map-frame" role="region" aria-label="Interactive 2D Seattle incident map">
      <MapContainer center={CENTER} zoom={11} zoomControl={false} scrollWheelZoom={false} zoomSnap={0.25} minZoom={9} maxZoom={19} className="incident-map">
        <TileLayer url={tileUrl} attribution={osmAttribution} eventHandlers={tileEvents} maxNativeZoom={19} referrerPolicy="strict-origin-when-cross-origin" />
        <MapControls />
        {mapped.map(incident => {
          const { Id, EmergencyType, Description, Latitude, Longitude, Status } = incident.request
          const report = primaryReport(incident)
          if (Latitude === null || Longitude === null) return null
          return <Marker key={Id} position={[Latitude, Longitude]} icon={icons[mapStatus(incident)]} title={`${Id}: ${incident.title}, ${Status}`} alt={`${Id}: ${Status}`}>
            <Popup><div className="map-popup"><span className="mono">{Id} · {EmergencyType} · Synthetic</span><strong>{incident.title}</strong><StatusBadge status={Status} /><p>{Description}</p><span>{report.location} · {report.affected} affected</span><Link to={`/incidents/${Id}`}>View Details →</Link></div></Popup>
          </Marker>
        })}
      </MapContainer>
      {tilesUnavailable && <div className="map-tile-notice" role="status">Street tiles are temporarily unavailable. Incident markers remain active.</div>}
      {mapped.length === 0 && <div className="map-empty" role="status">No mapped incidents match these filters.</div>}
    </div>
    <div className="map-legend">{legend.map(({ label, tone }) => <span key={label} className={`tone-${tone}`}><i className="status-dot" />{label}</span>)}{displayed.length > mapped.length && <span>{displayed.length - mapped.length} awaiting coordinates</span>}</div>
  </section>
}
