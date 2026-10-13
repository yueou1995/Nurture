import { clamp, type GardenPlant, type Point } from './garden'
import { plantArtwork, PLANT_ART_SIZE, wateringCanArtwork } from './artwork'

export const POUR_ANGLE = -48
export const WATER_DROP_COUNT = 4
export const WATER_DROP_DURATION = 520
export const WATER_DROP_STAGGER = 120
export const WATERING_TIMING = {
  arriving: 440,
  tilting: 260,
  pouring: 920,
  cared: 520,
  leaving: 380,
} as const

export type WateringPhase = keyof typeof WATERING_TIMING
export interface ActiveWatering {
  plantId: string
  phase: WateringPhase
}
export interface WateringState {
  active: ActiveWatering | null
  queue: string[]
}
export interface WateringSpot {
  point: Point
  soil: Point
  facing: 1 | -1
}

export interface GardenSize {
  width: number
  height: number
}

export function gardenMetrics(size: GardenSize) {
  const compact = size.width < 600
  const plantWidth = compact ? 126 : 176
  const plantHeight = plantWidth * PLANT_ART_SIZE.height / PLANT_ART_SIZE.width + 40
  const canWidth = compact ? 51 : 100
  const edgeGap = 8
  const labelWidth = plantWidth + 34
  return {
    plantWidth, plantHeight, canWidth,
    marginX: Math.ceil(labelWidth / 2 + edgeGap),
    marginTop: plantHeight / 2 + edgeGap,
    canScale: canWidth / wateringCanArtwork.frame.width,
  }
}

export function plantMargins(plant: GardenPlant, size: GardenSize) {
  const { plantWidth, plantHeight, marginX, marginTop } = gardenMetrics(size)
  const artwork = plantArtwork[plant.plantType]
  const artHeight = (artwork.height - artwork.contentFrame.y) * plantWidth / artwork.width
  const labelHeight = 2 * (size.width < 600 ? 18 : 22) * 1.1
  // Mirrors the shadow, label gap, and two-line label below the trimmed artwork.
  const visualBottom = -plantHeight / 2 + artHeight + 10 + labelHeight
  return {
    marginX,
    marginTop,
    marginBottom: Math.ceil(visualBottom + 8),
  }
}

export function plantPoint(position: Point, size: GardenSize, plant: GardenPlant): Point {
  const { marginX, marginTop, marginBottom } = plantMargins(plant, size)
  return {
    x: marginX + position.x * Math.max(1, size.width - marginX * 2),
    y: marginTop + position.y * Math.max(1, size.height - marginTop - marginBottom),
  }
}

export function normalizedPosition(point: Point, size: GardenSize, plant: GardenPlant): Point {
  const { marginX, marginTop, marginBottom } = plantMargins(plant, size)
  return {
    x: clamp((point.x - marginX) / Math.max(1, size.width - marginX * 2)),
    y: clamp((point.y - marginTop) / Math.max(1, size.height - marginTop - marginBottom)),
  }
}

export function soilPoint(plant: GardenPlant, size: GardenSize): Point {
  const center = plantPoint(plant.position, size, plant)
  const { plantWidth, plantHeight } = gardenMetrics(size)
  const artwork = plantArtwork[plant.plantType]
  const scale = plantWidth / artwork.width
  return {
    x: center.x - plantWidth / 2 + artwork.soil.x * scale,
    y: center.y - plantHeight / 2 + (artwork.soil.y - artwork.contentFrame.y) * scale,
  }
}

function rotatedOffset(x: number, y: number, angle: number): Point {
  const radians = angle * Math.PI / 180
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  }
}

export function spoutPoint(point: Point, angle: number, scale: number, facing: 1 | -1 = 1): Point {
  const { pivot, spout } = wateringCanArtwork
  const offset = rotatedOffset((spout.x - pivot.x) * scale * facing, (spout.y - pivot.y) * scale, angle)
  return { x: point.x + offset.x, y: point.y + offset.y }
}

export function canBounds(point: Point, angle: number, scale: number, facing: 1 | -1) {
  const { frame, pivot } = wateringCanArtwork
  const corners = [frame.x, frame.x + frame.width].flatMap((x) =>
    [frame.y, frame.y + frame.height].map((y) =>
      rotatedOffset((x - pivot.x) * scale * facing, (y - pivot.y) * scale, angle)))
  return {
    left: point.x + Math.min(...corners.map((corner) => corner.x)),
    right: point.x + Math.max(...corners.map((corner) => corner.x)),
    top: point.y + Math.min(...corners.map((corner) => corner.y)),
    bottom: point.y + Math.max(...corners.map((corner) => corner.y)),
  }
}

export function wateringSpot(plant: GardenPlant, size: GardenSize): WateringSpot {
  const soil = soilPoint(plant, size)
  const { canScale, plantWidth } = gardenMetrics(size)
  function placement(facing: 1 | -1) {
    const offset = spoutPoint({ x: 0, y: 0 }, POUR_ANGLE * facing, canScale, facing)
    const point = { x: soil.x - offset.x, y: soil.y - Math.max(48, plantWidth * 0.43) - offset.y }
    const bounds = [-6, -27, POUR_ANGLE].map((angle) => canBounds(point, angle * facing, canScale, facing))
    const overflow = Math.max(0, 8 - Math.min(...bounds.map((bound) => bound.left))) +
      Math.max(0, Math.max(...bounds.map((bound) => bound.right)) - size.width + 8)
    return { point, soil, facing, overflow }
  }
  const right = placement(1)
  const left = placement(-1)
  if (left.overflow === right.overflow) return soil.x > size.width / 2 ? left : right
  return left.overflow < right.overflow ? left : right
}

export function nextWatering(queue: string[], plants: GardenPlant[]): WateringState {
  const remaining = [...new Set(queue)].filter((id) =>
    plants.some((plant) => plant.id === id))
  const [plantId, ...rest] = remaining
  return {
    active: plantId ? { plantId, phase: 'arriving' } : null,
    queue: rest,
  }
}
