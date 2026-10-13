import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import type { GardenPlant } from '../lib/garden'
import { nextWatering, WATERING_TIMING, type ActiveWatering, type WateringState } from '../lib/watering'

const followingPhase = {
  arriving: 'tilting',
  tilting: 'pouring',
  pouring: 'cared',
  cared: 'leaving',
} as const

export function useWatering(plants: GardenPlant[], onWater: (id: string) => void) {
  const [state, setState] = useState<WateringState>({ active: null, queue: [] })
  const current = useRef(state)
  const [reaction, setReaction] = useState<{ id: string; token: number } | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const update = useCallback((next: WateringState) => {
    current.current = next
    setState(next)
  }, [])

  const requestWater = useCallback((id: string) => {
    const plant = plants.find((item) => item.id === id)
    if (!plant) {
      console.warn('[Nurture] The requested plant is no longer available.')
      setAnnouncement('That plant has left the garden.')
      return
    }
    const pending = current.current
    if (pending.active?.plantId === id || pending.queue.includes(id)) {
      setAnnouncement(`${plant.habitName} already has a little care on the way.`)
      return
    }
    if (pending.active) {
      update({ ...pending, queue: [...pending.queue, id] })
      setAnnouncement(`${plant.habitName} will have a turn next.`)
    } else {
      update({ active: { plantId: id, phase: 'arriving' }, queue: [] })
      setAnnouncement(`Giving ${plant.habitName} a little care.`)
    }
  }, [plants, update])

  const cancel = useCallback((id?: string) => {
    const pending = current.current
    if (id) {
      const queue = pending.queue.filter((queuedId) => queuedId !== id)
      if (pending.active?.plantId === id) {
        update(nextWatering(queue, plants))
        setAnnouncement('That watering has been set aside. Your garden can wait.')
      } else if (queue.length !== pending.queue.length) {
        update({ ...pending, queue })
      }
    } else if (pending.active) {
      update({ active: null, queue: [] })
      setAnnouncement('Watering paused. Your garden can wait.')
    }
  }, [plants, update])

  const advance = useEffectEvent((expected: ActiveWatering) => {
    const pending = current.current
    if (pending.active !== expected) return
    const plant = plants.find((item) => item.id === expected.plantId)
    if (!plant) {
      console.warn('[Nurture] Watering stopped because the plant was removed.')
      setAnnouncement('That plant has left the garden.')
      update(nextWatering(pending.queue, plants))
      return
    }
    if (expected.phase === 'leaving') {
      const next = nextWatering(pending.queue, plants)
      update(next)
      if (next.active) {
        const nextPlant = plants.find((item) => item.id === next.active!.plantId)!
        setAnnouncement(`Giving ${nextPlant.habitName} a little care.`)
      }
      return
    }
    if (expected.phase === 'pouring') {
      onWater(plant.id)
      setReaction({ id: plant.id, token: Date.now() })
      setAnnouncement(`${plant.habitName} is feeling cared for today.`)
    }
    update({ ...pending, active: { ...expected, phase: followingPhase[expected.phase] } })
  })

  useEffect(() => {
    const active = state.active
    if (!active) return
    const timer = setTimeout(() => advance(active), WATERING_TIMING[active.phase])
    return () => clearTimeout(timer)
  }, [state.active])

  useEffect(() => {
    if (!reaction) return
    const timer = setTimeout(() => setReaction(null), 1800)
    return () => clearTimeout(timer)
  }, [reaction])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (event.target instanceof Element && event.target.closest('dialog, [role="menu"]')) return
      cancel()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [cancel])

  return { ...state, reaction, announcement, requestWater, cancel }
}
