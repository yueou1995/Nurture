import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { useWatering } from '../hooks/useWatering'
import type { GardenPlant, Point } from '../lib/garden'
import { tidyGardenPositions } from '../lib/tidy'
import { gardenMetrics, POUR_ANGLE, spoutPoint, wateringSpot } from '../lib/watering'
import { Plant } from './Plant'
import { WateringCan } from './WateringCan'
import { WaterEffect } from './WaterEffect'
import { Icon } from './Icon'
import { PlantMenu } from './PlantMenu'

export interface GardenHandle {
  water: (id: string) => void
  cancel: (id?: string) => void
  tidy: () => void
}

interface GardenProps {
  ref: Ref<GardenHandle>
  plants: GardenPlant[]
  day: string
  celebrating: boolean
  onWater: (id: string) => void
  onMove: (id: string, position: Point) => void
  onArrange: (positions: Readonly<Record<string, Point>>) => void
  onTidyComplete: () => void
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  onRequestRemove: (id: string) => void
  onGrow: () => void
}

const TIDY_DURATION = 650
const TIDY_STAGGER = 35

export function Garden({ ref, plants, day, celebrating, onWater, onMove, onArrange, onTidyComplete, onOpen, onEdit, onRequestRemove, onGrow }: GardenProps) {
  const stage = useRef<HTMLDivElement>(null)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const [menuPlantId, setMenuPlantId] = useState<string | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [tidying, setTidying] = useState(false)
  const tidyFrame = useRef<number | null>(null)
  const tidyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { active, queue, reaction, announcement, requestWater, cancel } = useWatering(plants, onWater)
  const { canWidth, canScale } = gardenMetrics(size)
  const target = plants.find((plant) => plant.id === active?.plantId)
  const spot = target ? wateringSpot(target, size) : null
  const menuPlant = plants.find((plant) => plant.id === menuPlantId)

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuPlantId(null)
    if (restoreFocus && menuTrigger.current?.isConnected) menuTrigger.current.focus({ preventScroll: true })
  }, [])

  const tidy = useCallback(() => {
    if (tidying || plants.length === 0 || size.width <= 0 || size.height <= 0) return
    const placements = tidyGardenPositions(plants, size)
    if (placements.length === 0) return
    const positions = Object.fromEntries(placements.map(({ id, position }) => [id, position]))
    const changed = plants.some((plant) => {
      const next = positions[plant.id]
      return next && (Math.abs(next.x - plant.position.x) > 0.001 || Math.abs(next.y - plant.position.y) > 0.001)
    })
    closeMenu()
    cancel()
    if (!changed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onArrange(positions)
      onTidyComplete()
      return
    }
    setTidying(true)
    tidyFrame.current = requestAnimationFrame(() => {
      tidyFrame.current = null
      onArrange(positions)
      tidyTimer.current = setTimeout(() => {
        tidyTimer.current = null
        setTidying(false)
        onTidyComplete()
      }, TIDY_DURATION + Math.max(0, plants.length - 1) * TIDY_STAGGER)
    })
  }, [cancel, closeMenu, onArrange, onTidyComplete, plants, size, tidying])

  useImperativeHandle(ref, () => ({ water: requestWater, cancel, tidy }), [requestWater, cancel, tidy])

  useEffect(() => {
    const element = stage.current!
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => {
    if (tidyFrame.current !== null) cancelAnimationFrame(tidyFrame.current)
    if (tidyTimer.current !== null) clearTimeout(tidyTimer.current)
  }, [])

  return (
    <section className={`garden ${celebrating ? 'garden--happy' : ''}`} aria-label="Your little garden">
      <div className="garden-stage" ref={stage} data-testid="garden-stage">
        <img className="garden-ground" src="/assets/objects/garden-ground.svg" alt="" draggable={false} />
        <svg className="garden-butterfly" viewBox="0 0 80 80" aria-hidden="true">
          <path className="butterfly-trail" d="M5 70C40 65 2 42 23 38s23 4 27-12" />
          <path className="butterfly-wing" d="M54 21C34-4 30 30 54 25c20 15 22-12 0-4Z" />
          <path d="m53 27 4-12m-1 2-3-6m4 5 4-3" />
        </svg>
        {plants.length === 0 && <div className="empty-garden"><Icon name="sprout" size={42} /><h2>Every garden starts with a little seed,</h2><button className="primary-button empty-garden-action" onClick={onGrow}><Icon name="plus" size={18} />Grow Something New</button></div>}
        {size.width > 0 && plants.map((plant, index) => (
          <Plant key={plant.id} plant={plant} day={day} size={size}
            noticed={active?.plantId === plant.id} pouring={active?.plantId === plant.id && active.phase === 'pouring'}
            reacting={reaction?.id === plant.id} celebrating={celebrating}
            tidying={tidying} tidyIndex={index}
            pending={active?.plantId === plant.id || queue.includes(plant.id)} menuOpen={menuPlantId === plant.id} menuId={menuId}
            onMove={onMove} onMoveStart={(id) => { closeMenu(); if (active?.plantId === id) cancel(id) }}
            onOpen={(id, trigger) => { menuTrigger.current = trigger; setMenuPlantId((current) => current === id ? null : id) }}
            onWater={requestWater} />
        ))}
        {active?.phase === 'pouring' && spot && <WaterEffect from={spoutPoint(spot.point, POUR_ANGLE * spot.facing, canScale, spot.facing)} to={spot.soil} />}
        {active && spot && <WateringCan key={active.plantId} watering={active} spot={spot} width={canWidth} />}
        {menuPlant && <PlantMenu key={menuPlant.id} id={menuId} plant={menuPlant} day={day}
          pending={active?.plantId === menuPlant.id || queue.includes(menuPlant.id)} size={size} stage={stage}
          trigger={menuTrigger} onClose={closeMenu} onWater={requestWater} onHistory={onOpen} onEdit={onEdit} onRemove={onRequestRemove} />}
        {celebrating && <div className="garden-fireflies" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ left: `${14 + i * 12}%`, top: `${25 + (i % 3) * 20}%`, animationDelay: `${i * 0.12}s` }} />)}</div>}
      </div>
      <p id="plant-keyboard-help" className="sr-only">Press Enter for Water, View history, Rename, and Remove. Press W to water directly, or use the arrow keys to move this plant. Hold Shift to move farther.</p>
      <p className="sr-only" role="status">{announcement}</p>
    </section>
  )
}
