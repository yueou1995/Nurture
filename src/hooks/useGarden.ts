import { useCallback, useEffect, useRef, useState } from 'react'
import {
  careForPlant, createGarden, findOpenPosition, habitName, localDay, nextMidnight,
  parseGarden, STORAGE_KEY, type GardenData, type PlantType, type Point,
} from '../lib/garden'

interface LoadedGarden {
  data: GardenData
  error: string | null
  readBlocked: boolean
}

function loadGarden(): LoadedGarden {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return { data: raw === null ? createGarden() : parseGarden(raw), error: null, readBlocked: false }
  } catch (error) {
    console.error('[Nurture] Could not open the saved garden.', error)
    return {
      data: createGarden(),
      error: "We couldn't open your saved garden. Your original is untouched; this temporary garden won't replace it.",
      readBlocked: true,
    }
  }
}

function saveGarden(data: GardenData): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return null
  } catch (error) {
    console.error('[Nurture] Could not save this garden.', error)
    return "Your garden couldn't be saved on this device. Keep this page open and try saving again."
  }
}

export function useLocalDay() {
  const [day, setDay] = useState(localDay)
  useEffect(() => {
    let midnight: ReturnType<typeof setTimeout>
    function checkDay() {
      const now = new Date()
      setDay(localDay(now))
      clearTimeout(midnight)
      midnight = setTimeout(checkDay, nextMidnight(now) - now.getTime() + 50)
    }
    checkDay()
    const clockCheck = setInterval(checkDay, 60_000)
    window.addEventListener('focus', checkDay)
    document.addEventListener('visibilitychange', checkDay)
    return () => {
      clearTimeout(midnight)
      clearInterval(clockCheck)
      window.removeEventListener('focus', checkDay)
      document.removeEventListener('visibilitychange', checkDay)
    }
  }, [])
  return day
}

export function useGarden() {
  const [state, setState] = useState(loadGarden)
  const snapshot = useRef(state)
  const day = useLocalDay()

  const update = useCallback((change: (data: GardenData) => GardenData) => {
    const current = snapshot.current
    const data = change(current.data)
    const next = { ...current, data, error: current.readBlocked ? current.error : saveGarden(data) }
    snapshot.current = next
    setState(next)
  }, [])

  const water = useCallback((id: string) => {
    update((current) => careForPlant(current, id, localDay()))
  }, [update])

  const move = useCallback((id: string, position: Point) => {
    update((current) => ({
      ...current,
      plants: current.plants.map((plant) => plant.id === id ? { ...plant, position } : plant),
    }))
  }, [update])

  const arrange = useCallback((positions: Readonly<Record<string, Point>>) => {
    update((current) => ({
      ...current,
      plants: current.plants.map((plant) => positions[plant.id] ? { ...plant, position: positions[plant.id] } : plant),
    }))
  }, [update])

  function add(name: string, plantType: PlantType) {
    const cleanedName = habitName(name)
    const id = crypto.randomUUID()
    update((current) => ({
      ...current,
      plants: [...current.plants, {
        id, habitName: cleanedName, plantType,
        position: findOpenPosition(current.plants),
        wateredDate: null, history: [], growthStage: 'young', createdDate: localDay(),
      }],
    }))
    return id
  }

  function rename(id: string, name: string) {
    const cleanedName = habitName(name)
    update((current) => ({
      ...current,
      plants: current.plants.map((plant) => plant.id === id ? { ...plant, habitName: cleanedName } : plant),
    }))
  }

  function remove(id: string) {
    update((current) => ({ ...current, plants: current.plants.filter((plant) => plant.id !== id) }))
  }

  const markCelebrated = useCallback((celebratedDate: string) => {
    update((current) => ({ ...current, celebratedDate }))
  }, [update])

  function retryStorage() {
    const current = snapshot.current
    const next = current.readBlocked ? loadGarden() : { ...current, error: saveGarden(current.data) }
    snapshot.current = next
    setState(next)
  }

  return {
    data: state.data, day, water, move, arrange, add, rename, remove, markCelebrated,
    storageError: state.error, retryStorage,
  }
}
