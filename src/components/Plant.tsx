import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { clamp, isWatered, plantCatalog, type GardenPlant, type Point } from '../lib/garden'
import { gardenMetrics, normalizedPosition, plantPoint, type GardenSize } from '../lib/watering'
import { PlantArt } from './PlantArt'

interface PlantProps {
  plant: GardenPlant
  day: string
  size: GardenSize
  noticed: boolean
  pouring: boolean
  reacting: boolean
  celebrating: boolean
  tidying: boolean
  tidyIndex: number
  pending: boolean
  menuOpen: boolean
  menuId: string
  onMove: (id: string, position: Point) => void
  onMoveStart: (id: string) => void
  onOpen: (id: string, trigger: HTMLButtonElement) => void
  onWater: (id: string) => void
}

type PlantStyle = CSSProperties & { '--tidy-delay': string }

export function Plant({ plant, day, size, noticed, pouring, reacting, celebrating, tidying, tidyIndex, pending, menuOpen, menuId, onMove, onMoveStart, onOpen, onWater }: PlantProps) {
  const [preview, setPreview] = useState<Point | null>(null)
  const drag = useRef<{ id: number; start: Point; origin: Point; position: Point; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const center = preview ?? plantPoint(plant.position, size)
  const { plantWidth, plantHeight } = gardenMetrics(size)
  const happy = isWatered(plant, day)
  const style: PlantStyle = {
    left: center.x,
    top: center.y,
    width: plantWidth,
    height: plantHeight,
    '--tidy-delay': `${tidyIndex * 35}ms`,
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (tidying || !event.isPrimary || event.button !== 0) return
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    suppressClick.current = false
    drag.current = {
      id: event.pointerId, start: { x: event.clientX, y: event.clientY },
      origin: center, position: plant.position, moved: false,
    }
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    const dx = event.clientX - current.start.x
    const dy = event.clientY - current.start.y
    if (!current.moved && Math.hypot(dx, dy) < 7) return
    if (!current.moved) onMoveStart(plant.id)
    current.moved = true
    current.position = normalizedPosition({ x: current.origin.x + dx, y: current.origin.y + dy }, size)
    setPreview(plantPoint(current.position, size))
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    suppressClick.current = current.moved || cancel
    if (current.moved && !cancel) onMove(plant.id, current.position)
    drag.current = null
    setPreview(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <button
      className={`plant-node ${preview ? 'is-dragging' : ''} ${noticed ? 'is-noticed' : ''} ${pouring ? 'is-drinking' : ''} ${reacting ? 'is-reacting' : ''} ${celebrating ? 'is-celebrating' : ''} ${tidying ? 'is-tidying' : ''}`}
      style={style}
      data-plant-id={plant.id}
      data-watered={happy}
      data-tidying={tidying || undefined}
      aria-label={`${plant.habitName}, ${plantCatalog[plant.plantType].name.toLowerCase()}. ${happy ? 'Feeling cared for today.' : 'Ready for a little care.'}`}
      aria-describedby="plant-keyboard-help"
      aria-keyshortcuts="W Enter ArrowUp ArrowDown ArrowLeft ArrowRight"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      aria-controls={menuOpen ? menuId : undefined}
      aria-busy={pending || tidying}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={(event) => finishDrag(event)}
      onPointerCancel={(event) => finishDrag(event, true)}
      onLostPointerCapture={(event) => finishDrag(event, true)}
      onClick={(event) => {
        if (tidying) return
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        onOpen(plant.id, event.currentTarget)
      }}
      onKeyDown={(event) => {
        if (tidying) {
          event.preventDefault()
          return
        }
        if (event.key.toLowerCase() === 'w' && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault()
          onWater(plant.id)
        }
        const directions: Record<string, Point> = {
          ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
          ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        }
        const direction = directions[event.key]
        if (direction) {
          event.preventDefault()
          onMoveStart(plant.id)
          const step = event.shiftKey ? 0.1 : 0.035
          onMove(plant.id, { x: clamp(plant.position.x + direction.x * step), y: clamp(plant.position.y + direction.y * step) })
        }
        if (event.key === 'Escape' && drag.current) {
          event.preventDefault()
          event.stopPropagation()
          suppressClick.current = true
          drag.current = null
          setPreview(null)
        }
      }}
    >
      <PlantArt type={plant.plantType} happy={happy} stage={plant.growthStage} trimTop />
      <span className="plant-ground-shadow" />
      <span className="plant-label">{plant.habitName}</span>
      {reacting && <img className="plant-heart" src="assets/effects/heart.svg" alt="" />}
      <svg className="notice-lines" viewBox="0 0 200 250" aria-hidden="true">
        <path d="m22 85-8-5m12-8-4-9m155 23 8-6m-12-6 4-9" />
      </svg>
    </button>
  )
}
