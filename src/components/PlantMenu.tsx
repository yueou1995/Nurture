import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { clamp, isWatered, type GardenPlant } from '../lib/garden'
import { gardenMetrics, plantPoint, type GardenSize } from '../lib/watering'
import { Icon } from './Icon'

interface PlantMenuProps {
  id: string
  plant: GardenPlant
  day: string
  pending: boolean
  size: GardenSize
  stage: RefObject<HTMLDivElement | null>
  trigger: RefObject<HTMLButtonElement | null>
  onClose: (restoreFocus?: boolean) => void
  onWater: (id: string) => void
  onHistory: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
}

export function PlantMenu({ id, plant, day, pending, size, stage, trigger, onClose, onWater, onHistory, onEdit, onRemove }: PlantMenuProps) {
  const menu = useRef<HTMLDivElement>(null)
  const happy = isWatered(plant, day)
  const status = pending ? 'A little care is already on the way.' : happy ? 'Feeling cared for today.' : ''

  useLayoutEffect(() => {
    const element = menu.current!
    const bounds = stage.current!.getBoundingClientRect()
    const center = plantPoint(plant.position, size)
    const { plantWidth, plantHeight } = gardenMetrics(size)
    const gap = size.width < 600 ? 4 : 12
    const width = element.offsetWidth
    const height = element.offsetHeight
    const minX = Math.max(8, 8 - bounds.left)
    const maxX = Math.min(size.width - width - 8, innerWidth - bounds.left - width - 8)
    const minY = 8 - bounds.top
    const maxY = innerHeight - bounds.top - height - 8
    let x = center.x + plantWidth / 2 + gap
    let y = center.y - height / 2
    if (x > maxX) x = center.x - plantWidth / 2 - width - gap
    if (x < minX) {
      x = center.x - width / 2
      y = center.y + plantHeight / 2 + 10
      if (y > maxY) y = center.y - plantHeight / 2 - height - 10
    }
    element.style.left = `${clamp(x, minX, maxX)}px`
    element.style.top = `${clamp(y, minY, maxY)}px`
  }, [plant.position, size, stage])

  useLayoutEffect(() => {
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) {
        onClose(false)
      }
    }
    const close = () => onClose(false)
    document.addEventListener('pointerdown', dismiss, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', dismiss, true)
      window.removeEventListener('resize', close)
    }
  }, [onClose, trigger])

  function select(action: (id: string) => void) {
    onClose(true)
    action(plant.id)
  }

  return (
    <div id={id} ref={menu} className="plant-menu" role="menu" aria-label={`${plant.habitName} actions`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose(true)
        } else if (event.key === 'Tab') {
          onClose(true)
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
          const index = items.findIndex((item) => item === document.activeElement)
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
          items[next]?.focus({ preventScroll: true })
        }
      }}>
      <button role="menuitem" tabIndex={-1} disabled={pending} aria-describedby={status ? `${id}-water-status` : undefined} onClick={() => select(onWater)}><Icon name="water" size={20} /><span>Water</span></button>
      <button role="menuitem" tabIndex={-1} onClick={() => select(onHistory)}><Icon name="sprout" size={20} /><span>View history</span></button>
      <button role="menuitem" tabIndex={-1} onClick={() => select(onEdit)}><Icon name="edit" size={19} /><span>Rename</span></button>
      <button className="plant-menu-remove" role="menuitem" tabIndex={-1} onClick={() => select(onRemove)}><Icon name="trash" size={19} /><span>Remove</span></button>
      {status && <span id={`${id}-water-status`} className="sr-only">{status}</span>}
    </div>
  )
}
