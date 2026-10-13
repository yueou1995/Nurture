import { useId, useState, type FormEvent } from 'react'
import { habitIdeas, MAX_HABIT_LENGTH, plantCatalog, plantTypes, type PlantType } from '../lib/garden'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { PlantArt } from './PlantArt'

export function GrowPlant({ onClose, onBack, onAdd }: {
  onClose: () => void
  onBack?: () => void
  onAdd: (name: string, type: PlantType) => void
}) {
  const [mode, setMode] = useState<'ideas' | 'custom'>('ideas')
  const [name, setName] = useState('')
  const [type, setType] = useState<PlantType>('succulent')
  const [error, setError] = useState('')
  const inputId = useId()
  const canSubmit = mode === 'ideas'
    ? habitIdeas.some((idea) => idea.name === name && idea.plantType === type)
    : !!name.trim()

  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      onAdd(name, type)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      setError(error.message)
    }
  }

  return (
    <Dialog title="Grow something new" onBack={onBack} onClose={onClose} variant="grow">
      <div className="choice-switch" aria-label="Choose a habit or create your own">
        <button aria-pressed={mode === 'ideas'} onClick={() => { setMode('ideas'); setError('') }}>Inspiration</button>
        <button aria-pressed={mode === 'custom'} onClick={() => { setMode('custom'); setError('') }}>Customize</button>
      </div>
      <form onSubmit={submit}>
        {mode === 'ideas' ? <div className="habit-ideas">
          {habitIdeas.map((idea) => <button type="button" className="habit-idea" key={idea.name} aria-pressed={name === idea.name && type === idea.plantType}
            onClick={() => { setName(idea.name); setType(idea.plantType); setError('') }}>
            <span className="idea-art"><PlantArt type={idea.plantType} /></span><span>{idea.name}</span>
          </button>)}
        </div> : <>
          <div className="field-group"><label htmlFor={inputId}>What do you want to grow?</label><input id={inputId} value={name} autoFocus maxLength={MAX_HABIT_LENGTH} placeholder="A little time for myself..." onChange={(event) => { setName(event.target.value); setError('') }} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} /></div>
          <fieldset className="plant-choices"><legend>Choose your plant</legend><div className="plant-choice-grid">
            {plantTypes.map((plantType) => <button type="button" key={plantType} aria-label={`Choose ${plantCatalog[plantType].name.toLowerCase()}`} aria-pressed={type === plantType} className="plant-choice" onClick={() => setType(plantType)}><PlantArt type={plantType} /><span>{plantCatalog[plantType].name}</span></button>)}
          </div></fieldset>
        </>}
        {error && <p id={`${inputId}-error`} className="field-error" role="alert">{error}</p>}
        <button className="primary-button full-width" type="submit" disabled={!canSubmit}><Icon name="sprout" size={19} />Plant it</button>
      </form>
    </Dialog>
  )
}
