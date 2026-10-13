import { describe, expect, it } from 'vitest'
import {
  careForPlant, createGarden, findOpenPosition, habitName, isWatered,
  localDay, monthDays, nextMidnight, parseGarden,
} from './garden'

describe('a gentle, persistent garden', () => {
  const day = '2026-10-09'

  it('starts with three healthy, neutral plants and no invented history', () => {
    const garden = createGarden(day)
    expect(garden.plants.map((plant) => plant.habitName)).toEqual(['Self-care', 'Exercise', 'Reading'])
    expect(garden.plants.every((plant) => !isWatered(plant, day) && plant.history.length === 0)).toBe(true)
    expect(garden.hasWatered).toBe(false)
  })

  it('records care once per local day, immutably', () => {
    const original = createGarden(day)
    const cared = careForPlant(original, 'self-care', day)
    const again = careForPlant(cared, 'self-care', day)
    expect(again).toBe(cared)
    expect(original.plants[0].history).toEqual([])
    expect(cared.plants[0].history).toEqual([day])
    expect(cared.hasWatered).toBe(true)
    expect(cared.plants[0].growthStage).toBe('young')
    expect(cared.plants[1]).toBe(original.plants[1])
  })

  it('resets only the daily smile, keeping plants, positions, and care history', () => {
    const today = careForPlant(createGarden(day), 'self-care', day)
    const tomorrow = '2026-10-10'
    expect(isWatered(today.plants[0], tomorrow)).toBe(false)
    expect(today.plants).toHaveLength(3)
    expect(today.plants[0].position).toEqual({ x: 0.16, y: 0.65 })
    const nextCare = careForPlant(today, 'self-care', tomorrow)
    expect(nextCare.plants[0].history).toEqual([day, tomorrow])
    expect(nextCare.plants[0].growthStage).toBe(today.plants[0].growthStage)
  })

  it('does not duplicate history when the local clock revisits a day', () => {
    const first = careForPlant(createGarden(day), 'self-care', day)
    const next = careForPlant(first, 'self-care', '2026-10-10')
    expect(careForPlant(next, 'self-care', day).plants[0].history).toEqual([day, '2026-10-10'])
  })

  it('never silently waters a nonexistent plant', () => {
    expect(() => careForPlant(createGarden(day), 'missing', day)).toThrow('no longer')
  })

  it('round-trips all persistent data, including a deliberately empty garden', () => {
    const garden = careForPlant(createGarden(day), 'reading', day)
    garden.celebratedDate = day
    expect(parseGarden(JSON.stringify(garden))).toEqual(garden)
    expect(parseGarden(JSON.stringify({ ...garden, plants: [] })).plants).toEqual([])
  })

  it.each([
    ['fern', 'monstera'],
    ['tulip', 'cream-orchid'],
    ['wildflower', 'hydrangea'],
  ])('replaces legacy %s art with %s without losing the saved plant', (legacy, replacement) => {
    const garden = careForPlant(createGarden(day), 'self-care', day)
    const savedPlant = { ...garden.plants[0], habitName: 'My saved ritual', position: { x: 0.24, y: 0.56 }, plantType: legacy }
    const raw = JSON.stringify({ ...garden, plants: [savedPlant] })
    const migrated = parseGarden(raw)
    expect(migrated.plants[0]).toEqual({ ...savedPlant, plantType: replacement })
    expect(migrated.hasWatered).toBe(true)
    expect(parseGarden(JSON.stringify(migrated))).toEqual(migrated)
  })

  it.each([
    'not json',
    JSON.stringify({ version: 99 }),
    JSON.stringify({ ...createGarden(day), plants: [{ ...createGarden(day).plants[0], position: { x: 3, y: 0 } }] }),
    JSON.stringify({ ...createGarden(day), plants: [createGarden(day).plants[0], createGarden(day).plants[0]] }),
    JSON.stringify({ ...createGarden(day), plants: [{ ...createGarden(day).plants[0], history: ['2026-02-30'] }] }),
    JSON.stringify({ ...createGarden(day), plants: [{ ...createGarden(day).plants[0], wateredDate: day }] }),
    JSON.stringify({ ...createGarden(day), plants: [{ ...createGarden(day).plants[0], plantType: 'unrecognized-plant' }] }),
  ])('rejects corrupt storage rather than quietly replacing it (%#)', (raw) => {
    expect(() => parseGarden(raw)).toThrow()
  })

  it('accepts trimmed names but rejects empty or oversized ones', () => {
    expect(habitName('  Read a little  ')).toBe('Read a little')
    expect(habitName('a'.repeat(40))).toHaveLength(40)
    expect(() => habitName('   ')).toThrow('name')
    expect(() => habitName('a'.repeat(41))).toThrow('40')
  })

  it('makes room for a new plant without using an existing position', () => {
    const garden = createGarden(day)
    const point = findOpenPosition(garden.plants)
    expect(point.x).toBeGreaterThanOrEqual(0)
    expect(point.x).toBeLessThanOrEqual(1)
    expect(point.y).toBeGreaterThanOrEqual(0)
    expect(point.y).toBeLessThanOrEqual(1)
    expect(garden.plants.some((plant) => plant.position.x === point.x && plant.position.y === point.y)).toBe(false)
    expect(findOpenPosition([])).toEqual({ x: 0.49, y: 0.4 })
  })
})

describe('local calendar, not UTC streaks', () => {
  it('uses the actual local date on either side of midnight', () => {
    expect(localDay(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09')
    expect(localDay(new Date(2026, 9, 10, 0, 1))).toBe('2026-10-10')
  })

  it('schedules the next calendar midnight rather than assuming a 24-hour day', () => {
    const evening = new Date(2026, 2, 8, 23, 59, 59)
    expect(nextMidnight(evening)).toBe(new Date(2026, 2, 9).getTime())
    expect(nextMidnight(evening) - evening.getTime()).toBe(1000)
    const endOfYear = new Date(2026, 11, 31, 12)
    expect(nextMidnight(endOfYear)).toBe(new Date(2027, 0, 1).getTime())
  })

  it('renders real month lengths and Monday-first alignment', () => {
    expect(monthDays(2024, 1).days).toHaveLength(29)
    expect(monthDays(2026, 1).days).toHaveLength(28)
    expect(monthDays(2026, 9).offset).toBe(3)
    expect(monthDays(2026, 9).days.at(-1)).toBe('2026-10-31')
  })
})
