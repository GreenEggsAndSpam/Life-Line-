import { ArrowRight, CheckCircle2, MapPin, Send } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle, SafetyNotice } from '../components/ui'
import { useOperations } from '../operations/OperationsContext'
import { areas, REGION } from '../operations/demo'
import { reportErrors } from '../operations/incidents'
import { assistanceOptions, type ReportDraft } from '../operations/types'

type FormErrors = ReturnType<typeof reportErrors> & Partial<Record<'neighborhood' | 'latitude' | 'longitude', string>>

function parseCoordinate(value: string, limit: number) {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null
  const coordinate = Number(value)
  return Math.abs(coordinate) <= limit ? coordinate : null
}

export default function ReportEmergencyPage() {
  const { state, submitReport, backend, saving } = useOperations()
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const submittedId = submitted && state.latestPublicReportId
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const get = (key: string) => String(values.get(key) ?? '').trim()
    const assistance = assistanceOptions.find(value => value === get('assistance'))
    const neighborhood = areas.find(area => area.name === get('neighborhood'))
    const latitudeText = get('latitude')
    const longitudeText = get('longitude')
    const usesCoordinates = latitudeText !== '' || longitudeText !== ''
    const latitude = parseCoordinate(latitudeText, 90)
    const longitude = parseCoordinate(longitudeText, 180)
    const exactPosition: ReportDraft['coordinates'] = latitude !== null && longitude !== null ? [latitude, longitude] : null
    const address = get('location')
    const location = exactPosition
      ? address || exactPosition.join(', ')
      : [address, neighborhood?.name, REGION].filter(Boolean).join(', ')
    const draft: ReportDraft = {
      location, coordinates: usesCoordinates ? exactPosition : neighborhood?.position ?? null,
      description: get('description'), affected: Number(get('affected')),
      assistance: assistance ?? 'Other', reporterType: 'Civilian', reporterName: get('name') || undefined, contact: get('contact') || undefined,
    }
    const validation: FormErrors = reportErrors(draft)
    if (usesCoordinates) {
      if (latitude === null) validation.latitude = 'Enter a latitude between −90 and 90.'
      if (longitude === null) validation.longitude = 'Enter a longitude between −180 and 180.'
    } else if (!neighborhood) {
      validation.neighborhood = 'Choose a neighborhood or enter both coordinates.'
    }
    if (!assistance) validation.assistance = 'Choose the type of assistance needed.'
    setErrors(validation)
    const firstError = Object.keys(validation)[0]
    if (firstError) {
      const field = formRef.current?.elements.namedItem(firstError)
      if (field instanceof HTMLElement) field.focus()
      return
    }
    if (await submitReport(draft)) setSubmitted(true)
  }

  function error(name: keyof typeof errors) {
    return errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>
  }

  function validationProps(name: keyof typeof errors) {
    return { 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined }
  }

  return <>
    <PageTitle title="Report an incident" />
    <div className="narrow-stack">
      <SafetyNotice />
      {submittedId ? <section className="panel submission-success" role="status">
        <CheckCircle2 size={36} /><h2>Demo report recorded</h2><p>Your reference is <strong className="mono">{submittedId}</strong>.</p>
        <div className="action-row">
          <Link className="button primary" to={`/?report=${encodeURIComponent(submittedId)}`}><MapPin size={15} /> Show on map</Link>
          <Link className="button" to={`/incidents?q=${encodeURIComponent(submittedId)}`}>Find report <ArrowRight size={15} /></Link>
          <button type="button" className="button" onClick={() => setSubmitted(false)}>Submit another report</button>
        </div>
      </section> : <section className="panel">
        <form className="form-body" ref={formRef} onSubmit={submit} noValidate>
          <div className="form-grid">
            <p className="full-field field-hint"><MapPin size={13} /> Enter both coordinates for an exact pin, or choose a neighborhood for an approximate pin.</p>
            <label>Latitude
              <input name="latitude" inputMode="decimal" placeholder="e.g. 47.6241" {...validationProps('latitude')} />
              {error('latitude')}
            </label>
            <label>Longitude
              <input name="longitude" inputMode="decimal" placeholder="e.g. -122.3157" {...validationProps('longitude')} />
              {error('longitude')}
            </label>
            <label>Seattle neighborhood
              <select name="neighborhood" defaultValue="" {...validationProps('neighborhood')}>
                <option value="">Select a neighborhood</option>
                {areas.map(area => <option key={area.name}>{area.name}</option>)}
              </select>
              {error('neighborhood')}
            </label>
            <label>Street address or landmark <small>Optional</small>
              <input name="location" maxLength={120} placeholder="e.g. Near the community center" {...validationProps('location')} />
              {error('location')}
            </label>
            <label>Type of assistance <span className="required">*</span><select name="assistance" defaultValue="" required {...validationProps('assistance')}><option value="" disabled>Select assistance</option>{assistanceOptions.map(item => <option key={item}>{item}</option>)}</select>{error('assistance')}</label>
            <label>People affected <span className="required">*</span><input name="affected" type="number" inputMode="numeric" min={1} max={9999} placeholder="e.g. 4" required {...validationProps('affected')} />{error('affected')}</label>
            <label className="full-field">Emergency description <span className="required">*</span><textarea name="description" rows={5} placeholder="Describe what happened and what assistance the group needs." required maxLength={1000} {...validationProps('description')} />{error('description')}</label>
          </div>
          {backend === 'demo' && <details className="optional-fields"><summary>Optional reporter details</summary><div className="form-grid">
            <label>Reporter name <small>Optional</small><input name="name" placeholder="Synthetic name or alias" maxLength={80} /></label>
            <label>Contact information <small>Optional</small><input name="contact" placeholder="Synthetic phone or email" maxLength={100} autoComplete="off" /></label>
          </div></details>}
          <button className="button primary" type="submit" disabled={saving || backend === 'connecting' || backend === 'unavailable'}><Send size={16} /> {saving ? 'Saving…' : 'Submit Report'}</button>
        </form>
      </section>}
    </div>
  </>
}
