import { ArrowRight, CheckCircle2, MapPin, Send } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle, SafetyNotice } from '../components/ui'
import { useOperations } from '../operations/OperationsContext'
import { areas } from '../operations/demo'
import { coordinatesFor, reportErrors } from '../operations/incidents'
import { assistanceOptions, type ReportDraft } from '../operations/types'

export default function ReportEmergencyPage() {
  const { state, submitReport, backend, saving } = useOperations()
  const [errors, setErrors] = useState<ReturnType<typeof reportErrors>>({})
  const [submitted, setSubmitted] = useState(false)
  const submittedId = submitted && state.latestPublicReportId
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const get = (key: string) => String(values.get(key) ?? '').trim()
    const assistance = assistanceOptions.find(value => value === get('assistance'))
    const location = get('location')
    const draft: ReportDraft = {
      location, coordinates: coordinatesFor(location), description: get('description'), affected: Number(get('affected')),
      assistance: assistance ?? 'Other', reporterType: 'Civilian', reporterName: get('name') || undefined, contact: get('contact') || undefined,
    }
    const validation = reportErrors(draft)
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
        <CheckCircle2 size={36} /><h2>Demo report recorded</h2><p>Your reference is <strong className="mono">{submittedId}</strong>. The incident is visible in this workspace.</p>
        <div className="action-row"><button className="button" onClick={() => setSubmitted(false)}>Submit another report</button><Link className="button primary" to={`/incidents?q=${submittedId}`}>Find report <ArrowRight size={15} /></Link></div>
      </section> : <section className="panel">
        <form className="form-body" ref={formRef} onSubmit={submit} noValidate>
          <div className="form-grid">
            <label className="full-field">Location or address <span className="required">*</span><input name="location" list="demo-areas" placeholder="e.g. Capitol Hill, Seattle" required maxLength={160} {...validationProps('location')} />{error('location')}
              <datalist id="demo-areas">{areas.map(area => <option key={area.name} value={`${area.name}, Seattle, WA`} />)}</datalist>
              <span className="field-hint"><MapPin size={13} /> Choose a listed Seattle neighborhood to place the incident on the map.</span>
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
