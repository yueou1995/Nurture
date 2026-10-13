import { useRef, useState, type PointerEvent } from 'react'
import { isWatered, type GardenPlant } from '../lib/garden'
import { Dialog } from './Dialog'
import { PlantArt } from './PlantArt'
import { Icon } from './Icon'
import { RemovePlantDialog } from './RemovePlantDialog'
import { PlantRemovedToast } from './PlantRemovedToast'

const REMOVE_ACTION_WIDTH = 88
const SWIPE_SLOP = 6

function GardenListItem({ plant, day, revealed, onReveal, onClose, onOpen, onRequestRemove }: {
  plant: GardenPlant
  day: string
  revealed: boolean
  onReveal: () => void
  onClose: () => void
  onOpen: () => void
  onRequestRemove: () => void
}) {
  const drag = useRef<{
    pointerId: number
    startX: number
    startY: number
    origin: number
    offset: number
    swiping: boolean
    vertical: boolean
  } | null>(null)
  const suppressClick = useRef(false)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const offset = dragOffset ?? (revealed ? -REMOVE_ACTION_WIDTH : 0)

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    suppressClick.current = false
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: revealed ? -REMOVE_ACTION_WIDTH : 0,
      offset,
      swiping: false,
      vertical: false,
    }
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId || current.vertical) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (!current.swiping) {
      if (Math.hypot(dx, dy) < SWIPE_SLOP) return
      if (Math.abs(dy) > Math.abs(dx)) {
        current.vertical = true
        suppressClick.current = true
        return
      }
      current.swiping = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    current.offset = Math.max(-REMOVE_ACTION_WIDTH, Math.min(0, current.origin + dx))
    setDragOffset(current.offset)
  }

  function finishSwipe(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    if (current.swiping) {
      suppressClick.current = true
      if (!cancelled && current.offset <= -REMOVE_ACTION_WIDTH / 2) onReveal()
      else onClose()
    }
    drag.current = null
    setDragOffset(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div className={`garden-list-row ${revealed ? 'is-revealed' : ''} ${dragOffset !== null ? 'is-swiping' : ''}`}>
      <button className="garden-list-item" style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={(event) => finishSwipe(event)}
        onPointerCancel={(event) => finishSwipe(event, true)}
        onLostPointerCapture={(event) => finishSwipe(event, true)}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          if (revealed) onClose()
          else onOpen()
        }}>
        <span className="list-plant-art"><PlantArt type={plant.plantType} happy={isWatered(plant, day)} /></span>
        <span className="list-plant-copy"><strong>{plant.habitName}</strong><span>{isWatered(plant, day) ? 'Feeling cared for today' : "Here whenever you're ready"}</span></span>
        <Icon name="arrow" size={17} />
      </button>
      <button className="garden-list-remove" aria-label={`Remove ${plant.habitName}`}
        aria-hidden={!revealed} tabIndex={revealed ? 0 : -1}
        onClick={(event) => {
          event.currentTarget.blur()
          onRequestRemove()
        }}>
        <Icon name="trash" size={18} />
        <span>Remove</span>
      </button>
    </div>
  )
}

export function GardenManager({ plants, day, removedNotice, onClose, onOpen, onRemove, onGrow, onDismissRemoved }: {
  plants: GardenPlant[]
  day: string
  removedNotice: number | null
  onClose: () => void
  onOpen: (id: string) => void
  onRemove: (id: string) => void
  onGrow: () => void
  onDismissRemoved: () => void
}) {
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [removingPlant, setRemovingPlant] = useState<GardenPlant | null>(null)

  return (
    <>
      <Dialog title="My Garden" onClose={onClose}
        overlay={removedNotice !== null ? <PlantRemovedToast key={removedNotice} onDismiss={onDismissRemoved} /> : undefined}>
        <div className="garden-list">
          {plants.map((plant) => (
            <GardenListItem key={plant.id} plant={plant} day={day}
              revealed={revealedId === plant.id}
              onReveal={() => setRevealedId(plant.id)}
              onClose={() => setRevealedId(null)}
              onOpen={() => onOpen(plant.id)}
              onRequestRemove={() => {
                setRevealedId(null)
                setRemovingPlant(plant)
              }} />
          ))}
          {plants.length === 0 && <p className="empty-list">A little space for a new beginning.</p>}
        </div>
        <button className="primary-button full-width" onClick={onGrow}><Icon name="plus" size={18} />Grow something new</button>
      </Dialog>
      {removingPlant && <RemovePlantDialog plant={removingPlant} day={day}
        onCancel={() => { setRemovingPlant(null); setRevealedId(null) }}
        onConfirm={() => {
          setRemovingPlant(null)
          setRevealedId(null)
          onRemove(removingPlant.id)
        }} />}
    </>
  )
}
