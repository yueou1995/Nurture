import { useId, useRef, useState, type FormEvent } from 'react'
import { isWatered, MAX_HABIT_LENGTH, monthDays, type GardenPlant } from '../lib/garden'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { PlantArt } from './PlantArt'
import { RemovePlantDialog } from './RemovePlantDialog'

export function PlantDetail({ plant, day, initialEditing = false, historyOnly = false, onClose, onBack, onWater, onRename, onRemove }: {
  plant: GardenPlant
  day: string
  initialEditing?: boolean
  historyOnly?: boolean
  onClose: () => void
  onBack?: () => void
  onWater: (id: string) => void
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
}) {
  const [month, setMonth] = useState(() => new Date(`${day.slice(0, 7)}-01T12:00:00`))
  const [editing, setEditing] = useState(initialEditing)
  const [removing, setRemoving] = useState(false)
  const [name, setName] = useState(plant.habitName)
  const [error, setError] = useState('')
  const inputId = useId()
  const nameInput = useRef<HTMLInputElement>(null)
  const { offset, days } = monthDays(month.getFullYear(), month.getMonth())
  const monthKey = days[0].slice(0, 7)
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const caredDays = plant.history.filter((date) => date.startsWith(monthKey)).length
  const currentMonth = monthKey === day.slice(0, 7)
  const happy = isWatered(plant, day)

  function rename(event: FormEvent) {
    event.preventDefault()
    try {
      onRename(plant.id, name)
      setEditing(false)
      setError('')
      if (initialEditing) onClose()
    } catch (error) {
      if (!(error instanceof Error)) throw error
      setError(error.message)
    }
  }

  function cancelRename() {
    setEditing(false)
    setName(plant.habitName)
    setError('')
    if (initialEditing) onClose()
  }

  if (removing) {
    return <RemovePlantDialog plant={plant} day={day} placement="right"
      onBack={() => setRemoving(false)} backLabel={plant.habitName}
      onCancel={() => setRemoving(false)}
      onClose={onClose}
      showClose
      onConfirm={() => onRemove(plant.id)} />
  }

  return (
    <Dialog title={editing ? 'Rename plant' : plant.habitName} onClose={onClose}
      onBack={editing && !initialEditing ? cancelRename : onBack}
      backLabel={editing && !initialEditing ? plant.habitName : undefined}
      variant={initialEditing ? 'quick-edit' : editing ? 'edit' : 'detail'} initialFocus={initialEditing ? nameInput : undefined}>
      <div className={`detail-plant ${editing ? 'detail-plant--editing' : ''}`}><PlantArt type={plant.plantType} happy={happy} stage={plant.growthStage} trimTop={editing} /></div>
      {!editing && <><p className="care-story">You've cared for me on <strong>{caredDays} {caredDays === 1 ? 'day' : 'days'}</strong><br />{currentMonth ? 'this month.' : `in ${month.toLocaleDateString(undefined, { month: 'long' })}.`}</p>
      <section className="care-calendar" aria-label="A little history of care">
        <div className="calendar-heading">
          <button className="icon-button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}><Icon name="back" size={16} /></button>
          <h3>{monthLabel}</h3>
          <button className="icon-button" aria-label="Next month" disabled={monthKey >= day.slice(0, 7)} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}><Icon name="arrow" size={16} /></button>
        </div>
        <div className="calendar-grid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => <span className="weekday" key={`weekday-${index}`} aria-hidden="true">{label}</span>)}
          {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
          {days.map((date, index) => {
            const cared = plant.history.includes(date)
            return <time key={date} dateTime={date} aria-current={date === day ? 'date' : undefined}
              className={`calendar-day ${cared ? 'was-cared-for' : ''} ${date > day ? 'is-future' : ''}`} title={`${date}${cared ? ' - A little care' : ''}`}>
              <span>{index + 1}</span><span className="sr-only">{cared ? ', cared for' : ''}</span>
            </time>
          })}
        </div>
      </section>
      {!historyOnly && <button className="primary-button full-width" onClick={() => onWater(plant.id)}><Icon name="water" size={18} />Water</button>}</>}
      {editing && <form className="rename-form" onSubmit={rename}>
        <label htmlFor={inputId}>Plant name</label>
        <input ref={nameInput} id={inputId} value={name} maxLength={MAX_HABIT_LENGTH} autoFocus onChange={(event) => { setName(event.target.value); setError('') }} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} />
        {error && <p className="field-error" id={`${inputId}-error`} role="alert">{error}</p>}
        <div className="button-row"><button type="button" className="secondary-button" onClick={cancelRename}>Cancel</button><button className="primary-button" type="submit">Save</button></div>
      </form>}
      {!editing && !historyOnly && <div className="detail-actions">
        <button onClick={() => { setName(plant.habitName); setEditing(true) }}><Icon name="edit" size={14} />Rename</button>
        <button onClick={() => setRemoving(true)}><Icon name="trash" size={14} />Remove</button>
      </div>}
    </Dialog>
  )
}
