import { describe, expect, it } from 'vitest'
import { plantArtwork } from './artwork'
import { careForPlant, createGarden, plantTypes } from './garden'
import {
  canBounds, gardenMetrics, nextWatering, normalizedPosition, plantPoint, POUR_ANGLE,
  spoutPoint, wateringSpot, WATER_DROP_COUNT, WATER_DROP_DURATION,
  WATER_DROP_STAGGER, WATERING_TIMING,
} from './watering'

describe.each([
  { width: 1100, height: 460 },
  { width: 350, height: 555 },
])('automatic watering at $width x $height', (size) => {
  const plant = createGarden().plants[0]
  const metrics = gardenMetrics(size)

  it('preserves free plant arrangement and clamps positions inside the garden', () => {
    expect(normalizedPosition(plantPoint(plant.position, size, plant), size, plant).x).toBeCloseTo(plant.position.x)
    expect(normalizedPosition(plantPoint(plant.position, size, plant), size, plant).y).toBeCloseTo(plant.position.y)
    expect(normalizedPosition({ x: -100, y: -100 }, size, plant)).toEqual({ x: 0, y: 0 })
    expect(normalizedPosition({ x: 2000, y: 2000 }, size, plant)).toEqual({ x: 1, y: 1 })
  })

  it('keeps every rendered plant footprint inside all four garden edges', () => {
    const compact = size.width < 600
    const labelWidth = metrics.plantWidth + 34
    const labelHeight = 2 * (compact ? 18 : 22) * 1.1
    for (const plantType of plantTypes) {
      const artwork = plantArtwork[plantType]
      const artHeight = (artwork.height - artwork.contentFrame.y) * metrics.plantWidth / artwork.width
      const visualBottom = -metrics.plantHeight / 2 + artHeight + 10 + labelHeight
      const edgePlant = { ...plant, plantType, habitName: 'A long habit name using two full lines' }

      for (const position of [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 },
      ]) {
        const point = plantPoint(position, size, edgePlant)
        expect(point.x - labelWidth / 2).toBeGreaterThanOrEqual(8)
        expect(point.x + labelWidth / 2).toBeLessThanOrEqual(size.width - 8)
        expect(point.y - metrics.plantHeight / 2).toBeGreaterThanOrEqual(8)
        expect(point.y + visualBottom).toBeLessThanOrEqual(size.height - 8)
      }
    }
  })

  it.each(plantTypes)('waters the illustrated soil of %s without clipping the can at either edge', (plantType) => {
    for (const x of [0, 0.5, 1]) {
      const spot = wateringSpot({ ...plant, plantType, position: { x, y: 0.5 } }, size)
      const spout = spoutPoint(spot.point, POUR_ANGLE * spot.facing, metrics.canScale, spot.facing)
      expect(spout.x).toBeCloseTo(spot.soil.x)
      expect(spout.y).toBeLessThanOrEqual(spot.soil.y - 48)
      const bounds = canBounds(spot.point, POUR_ANGLE * spot.facing, metrics.canScale, spot.facing)
      expect(bounds.left).toBeGreaterThanOrEqual(8)
      expect(bounds.right).toBeLessThanOrEqual(size.width - 8)
    }
  })

  it('mirrors the can at the right edge instead of hiding its handle off-screen', () => {
    expect(wateringSpot({ ...plant, position: { x: 0, y: 0.5 } }, size).facing).toBe(1)
    expect(wateringSpot({ ...plant, position: { x: 1, y: 0.5 } }, size).facing).toBe(-1)
    expect(spoutPoint({ x: 0, y: 0 }, 0, 1)).toEqual({ x: -171, y: -60 })
    expect(spoutPoint({ x: 0, y: 0 }, 0, 1, -1)).toEqual({ x: 171, y: -60 })
  })
})

describe('one gentle watering at a time', () => {
  const day = '2026-10-09'
  const plants = createGarden(day).plants

  it('takes the next requested plant in order without mutating the queue', () => {
    const queue = ['reading', 'exercise', 'self-care']
    expect(nextWatering(queue, plants)).toEqual({
      active: { plantId: 'reading', phase: 'arriving' }, queue: ['exercise', 'self-care'],
    })
    expect(queue).toEqual(['reading', 'exercise', 'self-care'])
  })

  it('skips removed and duplicate requests but keeps already-watered plants', () => {
    const cared = careForPlant(createGarden(day), 'self-care', day)
    expect(nextWatering(['missing', 'self-care', 'reading', 'reading', 'exercise'], cared.plants)).toEqual({
      active: { plantId: 'self-care', phase: 'arriving' }, queue: ['reading', 'exercise'],
    })
  })

  it('returns to an empty scene when no eligible requests remain', () => {
    expect(nextWatering([], plants)).toEqual({ active: null, queue: [] })
    expect(nextWatering(['removed'], plants)).toEqual({ active: null, queue: [] })
  })

  it('allows later turns for the same plant without changing its recorded care days', () => {
    const cared = careForPlant(createGarden(day), 'self-care', day)
    expect(nextWatering(['self-care'], cared.plants).active?.plantId).toBe('self-care')
    expect(nextWatering(['self-care'], cared.plants).active?.plantId).toBe('self-care')
    expect(cared.plants[0].history).toEqual([day])
  })

  it('finishes exactly four single drops before revealing the smile', () => {
    expect(WATER_DROP_COUNT).toBe(4)
    const lastDropLands = WATER_DROP_DURATION + (WATER_DROP_COUNT - 1) * WATER_DROP_STAGGER
    expect(lastDropLands).toBeLessThan(WATERING_TIMING.pouring)
    expect(WATERING_TIMING.pouring - lastDropLands).toBeLessThan(150)
    expect(Object.keys(WATERING_TIMING)).toEqual(['arriving', 'tilting', 'pouring', 'cared', 'leaving'])
  })
})
