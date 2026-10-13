export const STORAGE_KEY = 'nurture.garden.v1'
export const MAX_HABIT_LENGTH = 40

export const plantTypes = [
  'succulent', 'daisy', 'monstera', 'sunflower',
  'cactus', 'cream-orchid', 'bonsai', 'hydrangea',
  'snake-plant', 'potted-bamboo', 'ivy', 'bird-of-paradise', 'aloe-vera',
] as const

export type PlantType = (typeof plantTypes)[number]
export type GrowthStage = 'seedling' | 'young' | 'full' | 'blooming'
export type Point = { x: number; y: number }

export interface GardenPlant {
  id: string
  habitName: string
  plantType: PlantType
  position: Point
  wateredDate: string | null
  history: string[]
  growthStage: GrowthStage
  createdDate: string
}

export interface GardenData {
  version: 1
  plants: GardenPlant[]
  hasWatered: boolean
  celebratedDate: string | null
}

export const plantCatalog: Record<PlantType, { name: string }> = {
  succulent: { name: 'Azulita succulent' },
  daisy: { name: 'Daisy' },
  monstera: { name: 'Monstera' },
  sunflower: { name: 'Sunflower' },
  cactus: { name: 'Columnar cactus' },
  'cream-orchid': { name: 'Cream orchid' },
  bonsai: { name: 'Bonsai' },
  hydrangea: { name: 'Hydrangea' },
  'snake-plant': { name: 'Snake plant' },
  'potted-bamboo': { name: 'Potted bamboo' },
  ivy: { name: 'Ivy' },
  'bird-of-paradise': { name: 'Bird of paradise' },
  'aloe-vera': { name: 'Aloe vera' },
}

export const habitIdeas: { name: string; plantType: PlantType }[] = [
  { name: 'Take care of myself', plantType: 'succulent' },
  { name: 'Move my body', plantType: 'daisy' },
  { name: 'Read', plantType: 'monstera' },
  { name: 'Go outside', plantType: 'sunflower' },
  { name: 'Sleep well', plantType: 'cream-orchid' },
  { name: 'Drink water', plantType: 'cactus' },
  { name: 'Create something', plantType: 'hydrangea' },
  { name: 'Meditate', plantType: 'bonsai' },
]

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function nextMidnight(date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime()
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

export function createGarden(day = localDay()): GardenData {
  const starters: Pick<GardenPlant, 'id' | 'habitName' | 'plantType' | 'position'>[] = [
    { id: 'self-care', habitName: 'Self-care', plantType: 'succulent', position: { x: 0.16, y: 0.65 } },
    { id: 'exercise', habitName: 'Exercise', plantType: 'daisy', position: { x: 0.49, y: 0.04 } },
    { id: 'reading', habitName: 'Reading', plantType: 'monstera', position: { x: 0.80, y: 0.62 } },
  ]
  return {
    version: 1,
    hasWatered: false,
    celebratedDate: null,
    plants: starters.map((plant): GardenPlant => ({
      ...plant,
      wateredDate: null,
      history: [],
      growthStage: 'young',
      createdDate: day,
    })),
  }
}

export function isWatered(plant: GardenPlant, day: string): boolean {
  return plant.wateredDate === day
}

export function careForPlant(data: GardenData, id: string, day: string): GardenData {
  const plant = data.plants.find((item) => item.id === id)
  if (!plant) throw new Error('This plant is no longer in the garden.')
  if (isWatered(plant, day)) return data

  return {
    ...data,
    hasWatered: true,
    plants: data.plants.map((item) => item.id === id ? {
      ...item,
      wateredDate: day,
      history: [...new Set([...item.history, day])].sort(),
    } : item),
  }
}

export function habitName(value: string): string {
  const name = value.trim()
  if (!name) throw new Error('Give your little plant a name first.')
  if (name.length > MAX_HABIT_LENGTH) {
    throw new Error(`Keep your plant's name to ${MAX_HABIT_LENGTH} characters or fewer.`)
  }
  return name
}

export function findOpenPosition(plants: GardenPlant[]): Point {
  if (plants.length === 0) return { x: 0.49, y: 0.4 }
  let best = { x: 0.5, y: 0.5 }
  let largestGap = -1
  for (let i = 0; i < 64; i++) {
    const candidate = {
      x: 0.06 + ((i * 0.61803398875) % 1) * 0.88,
      y: 0.08 + ((i * 0.41421356237) % 1) * 0.83,
    }
    const gap = Math.min(...plants.map(({ position }) =>
      Math.hypot((candidate.x - position.x) * 0.8, candidate.y - position.y)))
    if (gap > largestGap) {
      best = candidate
      largestGap = gap
    }
  }
  return best
}

export function monthDays(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const length = new Date(year, month + 1, 0).getDate()
  return {
    offset,
    days: Array.from({ length }, (_, index) => localDay(new Date(year, month, index + 1))),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return localDay(parsed) === value
}

function isPlant(value: unknown): value is GardenPlant {
  if (!isRecord(value) || !isRecord(value.position)) return false
  return typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.habitName === 'string' && value.habitName.trim().length > 0 &&
    value.habitName.length <= MAX_HABIT_LENGTH &&
    plantTypes.some((type) => type === value.plantType) &&
    typeof value.position.x === 'number' && Number.isFinite(value.position.x) &&
    typeof value.position.y === 'number' && Number.isFinite(value.position.y) &&
    value.position.x >= 0 && value.position.x <= 1 &&
    value.position.y >= 0 && value.position.y <= 1 &&
    (value.wateredDate === null || isDay(value.wateredDate)) &&
    Array.isArray(value.history) && value.history.every(isDay) &&
    new Set(value.history).size === value.history.length &&
    (value.wateredDate === null || value.history.includes(value.wateredDate)) &&
    ['seedling', 'young', 'full', 'blooming'].includes(String(value.growthStage)) &&
    isDay(value.createdDate)
}

export function parseGarden(raw: string): GardenData {
  const value: unknown = JSON.parse(raw)
  if (!isRecord(value) || value.version !== 1 ||
    !Array.isArray(value.plants) ||
    typeof value.hasWatered !== 'boolean' ||
    !(value.celebratedDate === null || isDay(value.celebratedDate))) {
    throw new Error('The saved garden has an unrecognized format.')
  }
  const plants = value.plants.map((plant: unknown) => {
    if (!isRecord(plant)) return plant
    const plantType = plant.plantType === 'fern' ? 'monstera'
      : plant.plantType === 'tulip' ? 'cream-orchid'
      : plant.plantType === 'wildflower' ? 'hydrangea' : plant.plantType
    return { ...plant, plantType }
  })
  if (!plants.every(isPlant) || new Set(plants.map((plant) => plant.id)).size !== plants.length) {
    throw new Error('The saved garden has an unrecognized format.')
  }
  return {
    version: 1,
    plants,
    hasWatered: value.hasWatered,
    celebratedDate: value.celebratedDate,
  }
}
