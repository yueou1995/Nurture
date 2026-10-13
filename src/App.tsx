import { useCallback, useEffect, useRef, useState } from 'react'
import { Garden, type GardenHandle } from './components/Garden'
import { GardenManager } from './components/GardenManager'
import { GrowPlant } from './components/GrowPlant'
import { PlantDetail } from './components/PlantDetail'
import { RemovePlantDialog } from './components/RemovePlantDialog'
import { PlantRemovedToast } from './components/PlantRemovedToast'
import { Icon } from './components/Icon'
import { useGarden } from './hooks/useGarden'
import { isWatered, localDay, type GardenPlant } from './lib/garden'
import './App.css'

type Sheet = { type: 'manager' } | { type: 'grow'; fromHome?: boolean } | { type: 'plant'; id: string; edit?: boolean; historyOnly?: boolean }

export default function App() {
  const garden = useGarden()
  const canvas = useRef<GardenHandle>(null)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [homeRemovalId, setHomeRemovalId] = useState<string | null>(null)
  const [celebrationDay, setCelebrationDay] = useState<string | null>(null)
  const [tidyNotice, setTidyNotice] = useState<number | null>(null)
  const [removedNotice, setRemovedNotice] = useState<number | null>(null)
  const celebrating = celebrationDay === garden.day
  const { water, markCelebrated, day, data } = garden

  const celebrateIfHappy = useCallback((plants: GardenPlant[], justWatered?: string) => {
    const today = localDay()
    const allHappy = plants.length > 0 && plants.every((plant) => plant.id === justWatered || isWatered(plant, today))
    if (allHappy && data.celebratedDate !== today) {
      markCelebrated(today)
      setCelebrationDay(today)
    }
  }, [data.celebratedDate, markCelebrated])

  const waterPlant = useCallback((id: string) => {
    water(id)
    celebrateIfHappy(data.plants, id)
  }, [water, data.plants, celebrateIfHappy])

  useEffect(() => {
    if (!celebrationDay) return
    const timer = setTimeout(() => setCelebrationDay(null), 5200)
    return () => clearTimeout(timer)
  }, [celebrationDay])

  useEffect(() => {
    if (tidyNotice === null) return
    const timer = setTimeout(() => setTidyNotice(null), 2600)
    return () => clearTimeout(timer)
  }, [tidyNotice])

  useEffect(() => {
    if (removedNotice === null) return
    const timer = setTimeout(() => setRemovedNotice(null), 2600)
    return () => clearTimeout(timer)
  }, [removedNotice])

  function open(next: Sheet) {
    setSheet(next)
  }

  function deletePlant(id: string) {
    canvas.current?.cancel(id)
    garden.remove(id)
    celebrateIfHappy(data.plants.filter((plant) => plant.id !== id))
    setRemovedNotice(Date.now())
  }

  function removePlant(id: string) {
    deletePlant(id)
    setSheet({ type: 'manager' })
  }

  const selected = sheet?.type === 'plant' ? data.plants.find((plant) => plant.id === sheet.id) : undefined
  const homeRemovalPlant = homeRemovalId ? data.plants.find((plant) => plant.id === homeRemovalId) : undefined

  return (
    <div className="app">
      <a className="skip-link" href="#garden-main">Skip to your garden</a>
      <header className="app-header">
        <a className="brand" href="./" aria-label="Nurture home"><span className="brand-mark"><Icon name="sprout" size={29} /></span><span>Nurture<span className="brand-period">.</span></span></a>
        <nav aria-label="Garden tools">
          <button className="garden-menu-button" onClick={() => open({ type: 'manager' })}>My Garden</button>
          <button className="icon-button tidy-button" aria-label="Tidy garden" data-tooltip="Tidy garden"
            disabled={data.plants.length === 0} onClick={() => canvas.current?.tidy()}>
            <Icon name="tidy" size={19} />
          </button>
        </nav>
      </header>

      {garden.storageError && <div className="storage-warning" role="alert"><p>{garden.storageError}</p><button onClick={garden.retryStorage}>Try again</button></div>}

      <main id="garden-main" tabIndex={-1}>
        <div className="garden-intro">
          <h1>Your habits are growing.</h1>
          <svg className="intro-sun" viewBox="0 0 64 64" aria-hidden="true"><path d="M43 28c4 11-1 20-12 20-12 0-19-9-14-20 5-13 22-13 26 0Z" /><path d="m31 8 1-5m17 13 5-4m0 21 6 1M46 51l4 5M29 56l-1 5M9 47l-5 3M7 29l-5-1m12-13-4-4" /></svg>
        </div>
        <Garden ref={canvas} plants={data.plants} day={day}
          celebrating={celebrating} onWater={waterPlant} onMove={garden.move} onArrange={garden.arrange}
          onTidyComplete={() => setTidyNotice(Date.now())}
          onOpen={(id) => open({ type: 'plant', id, historyOnly: true })}
          onEdit={(id) => open({ type: 'plant', id, edit: true })}
          onRequestRemove={setHomeRemovalId}
          onGrow={() => open({ type: 'grow', fromHome: true })} />
      </main>

      <div className={`celebration ${celebrating ? 'is-visible' : ''}`} role="status">
        {celebrating && <><Icon name="sprout" size={21} /><span>Your garden is happy today. <span className="little-heart">&#9825;</span></span></>}
      </div>
      {tidyNotice !== null && <div className="tidy-toast" key={tidyNotice} role="status" aria-live="polite">Garden tidied 🌱</div>}
      {removedNotice !== null && sheet?.type !== 'manager' && <PlantRemovedToast key={removedNotice} />}

      {sheet?.type === 'manager' && <GardenManager plants={data.plants} day={day} removedNotice={removedNotice} onClose={() => setSheet(null)}
        onOpen={(id) => setSheet({ type: 'plant', id })}
        onRemove={removePlant}
        onGrow={() => setSheet({ type: 'grow' })} />}
      {sheet?.type === 'grow' && <GrowPlant onClose={() => setSheet(null)}
        onBack={sheet.fromHome ? undefined : () => setSheet({ type: 'manager' })}
        onAdd={(name, type) => { garden.add(name, type); setSheet(null) }} />}
      {selected && <PlantDetail key={`${selected.id}-${sheet?.type === 'plant' && sheet.edit ? 'edit' : sheet?.type === 'plant' && sheet.historyOnly ? 'history-only' : 'detail'}`} plant={selected} day={day}
        initialEditing={sheet?.type === 'plant' && !!sheet.edit} historyOnly={sheet?.type === 'plant' && !!sheet.historyOnly}
        onClose={() => setSheet(null)} onBack={sheet?.type === 'plant' && (sheet.historyOnly || sheet.edit) ? undefined : () => setSheet({ type: 'manager' })} onRename={garden.rename}
        onRemove={removePlant}
        onWater={(id) => { setSheet(null); canvas.current?.water(id) }} />}
      {homeRemovalPlant && <RemovePlantDialog plant={homeRemovalPlant} day={day}
        onCancel={() => setHomeRemovalId(null)}
        showClose
        onConfirm={() => {
          deletePlant(homeRemovalPlant.id)
          setHomeRemovalId(null)
        }} />}
    </div>
  )
}
