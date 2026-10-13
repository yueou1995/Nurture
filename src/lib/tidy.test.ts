import { describe, expect, it } from 'vitest'
import { plantArtwork } from './artwork'
import { createGarden, plantTypes, type GardenPlant } from './garden'
import { tidyGardenPositions } from './tidy'
import { gardenMetrics, plantPoint } from './watering'

function plants(count: number): GardenPlant[] {
  const starters = createGarden('2026-10-12').plants
  return Array.from({ length: count }, (_, index) => ({
    ...starters[index % starters.length],
    id: `plant-${index}`,
    habitName: `Plant ${index + 1}`,
    plantType: plantTypes[index % plantTypes.length],
    position: { x: (index * 0.37) % 1, y: (index * 0.61) % 1 },
  }))
}

describe('tidy garden layout', () => {
  const desktop = { width: 1440, height: 680 }
  const mobile = { width: 375, height: 595 }

  it.each([1, 3, 6, 9, 13])('places %i plants deterministically within the garden', (count) => {
    for (const size of [desktop, mobile]) {
      const input = plants(count)
      const first = tidyGardenPositions(input, size)
      const second = tidyGardenPositions(input, size)
      expect(first).toEqual(second)
      expect(first.map(({ id }) => id)).toEqual(input.map(({ id }) => id))
      expect(new Set(first.map(({ position }) => `${position.x}:${position.y}`)).size).toBe(count)
      for (const { position } of first) {
        expect(position.x).toBeGreaterThanOrEqual(0)
        expect(position.x).toBeLessThanOrEqual(1)
        expect(position.y).toBeGreaterThanOrEqual(0)
        expect(position.y).toBeLessThanOrEqual(1)
      }
    }
  })

  it('keeps nearby plants in order and aligns their names', () => {
    const input = plants(3)
    const placements = tidyGardenPositions(input, desktop)
    const originalOrder = [...input].sort((a, b) => a.position.x - b.position.x).map(({ id }) => id)
    const tidyOrder = [...placements].sort((a, b) => a.position.x - b.position.x).map(({ id }) => id)
    expect(tidyOrder).toEqual(originalOrder)

    const metrics = gardenMetrics(desktop)
    const labelTops = placements.map(({ id, position }) => {
      const plant = input.find((item) => item.id === id)!
      const artwork = plantArtwork[plant.plantType]
      const artHeight = (artwork.height - artwork.contentFrame.y) * metrics.plantWidth / artwork.width
      return plantPoint(position, desktop).y - metrics.plantHeight / 2 + artHeight + 10
    })
    expect(Math.max(...labelTops) - Math.min(...labelTops)).toBeLessThan(0.001)
    expect((Math.min(...placements.map(({ position }) => position.x)) +
      Math.max(...placements.map(({ position }) => position.x))) / 2).toBeCloseTo(0.5, 1)
  })

  it('adds balanced rows as the garden fills', () => {
    const placements = tidyGardenPositions(plants(13), desktop)
    const y = placements.map(({ position }) => position.y)
    expect(Math.max(...y) - Math.min(...y)).toBeGreaterThan(0.2)
    expect(Math.max(...placements.map(({ position }) => position.x))).toBeGreaterThan(0.65)
    expect(Math.min(...placements.map(({ position }) => position.x))).toBeLessThan(0.35)
  })

  it('keeps the bottom row names aligned on mobile', () => {
    const types = ['succulent', 'daisy', 'monstera', 'cream-orchid', 'hydrangea', 'ivy', 'sunflower', 'bonsai'] as const
    const input = plants(8).map((plant, index) => ({
      ...plant,
      plantType: types[index],
      habitName: ['Self-care', 'Exercise', 'Reading', 'hi', 'Create something', 'hi', 'Move my body', 'Meditate'][index],
    }))
    const placements = tidyGardenPositions(input, mobile)
    const metrics = gardenMetrics(mobile)
    const labelTops = placements.map(({ id, position }) => {
      const plant = input.find((item) => item.id === id)!
      const artwork = plantArtwork[plant.plantType]
      const artHeight = (artwork.height - artwork.contentFrame.y) * metrics.plantWidth / artwork.width
      return plantPoint(position, mobile).y - metrics.plantHeight / 2 + artHeight + 10
    })
    const bottom = Math.max(...labelTops)
    const bottomRow = labelTops.filter((top) => bottom - top < 1)
    expect(bottomRow.length).toBeGreaterThan(1)
    expect(Math.max(...bottomRow) - Math.min(...bottomRow)).toBeLessThan(0.001)
  })

  it('recalculates the arrangement for the available viewport', () => {
    const input = plants(8)
    expect(tidyGardenPositions(input, desktop)).not.toEqual(tidyGardenPositions(input, mobile))
  })

  it('returns no placements without plants or measurable space', () => {
    expect(tidyGardenPositions([], desktop)).toEqual([])
    expect(tidyGardenPositions(plants(3), { width: 0, height: 0 })).toEqual([])
  })
})
