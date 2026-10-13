import { plantArtwork } from './artwork'
import type { GardenPlant, Point } from './garden'
import { gardenMetrics, normalizedPosition, plantMargins, plantPoint, type GardenSize } from './watering'

export interface TidyPlacement {
  id: string
  position: Point
}

interface Footprint {
  width: number
  artHeight: number
  labelHeight: number
  height: number
}

function plantFootprint(plant: GardenPlant, size: GardenSize): Footprint {
  const { plantWidth } = gardenMetrics(size)
  const compact = size.width < 600
  const artwork = plantArtwork[plant.plantType]
  const scale = plantWidth / artwork.width
  const fontSize = compact ? 18 : 22
  const maxLabelWidth = plantWidth + 34
  const estimatedLabelWidth = Math.max(fontSize * 2, plant.habitName.length * fontSize * 0.52)
  const labelLines = Math.min(2, Math.max(1, Math.ceil(estimatedLabelWidth / maxLabelWidth)))
  const artHeight = (artwork.height - artwork.contentFrame.y) * scale
  const labelHeight = labelLines * fontSize * 1.1
  return {
    width: Math.max(artwork.contentFrame.width * scale, Math.min(maxLabelWidth, estimatedLabelWidth)),
    artHeight,
    labelHeight,
    height: artHeight + 10 + labelHeight,
  }
}

function chooseColumns(count: number, available: GardenSize, footprint: Pick<Footprint, 'width' | 'height'>, compact: boolean) {
  if (count <= 3) return count
  const maxColumns = Math.min(count, compact ? 4 : 8)
  const gapX = compact ? 12 : 24
  const gapY = compact ? 16 : 24
  const gardenAspect = available.width / Math.max(1, available.height)
  let best = { columns: 1, cost: Number.POSITIVE_INFINITY }

  for (let columns = 1; columns <= maxColumns; columns++) {
    const rows = Math.ceil(count / columns)
    const requiredWidth = columns * footprint.width + (columns - 1) * gapX
    const requiredHeight = rows * footprint.height + (rows - 1) * gapY
    const compressionX = Math.max(0, requiredWidth - available.width) / requiredWidth
    const compressionY = Math.max(0, requiredHeight - available.height) / requiredHeight
    const emptySlots = (columns * rows - count) / (columns * rows)
    const gridAspect = columns / rows
    const shapeCost = Math.abs(Math.log(gridAspect / gardenAspect))
    const cost = compressionX * 4 + compressionY * 6 +
      Math.max(compressionX, compressionY) * 2 + emptySlots * 0.35 + shapeCost * 0.12
    if (cost < best.cost) best = { columns, cost }
  }

  return best.columns
}

function nearestSlotAssignment(cost: number[][]) {
  const count = cost.length
  const rowPotential = Array(count + 1).fill(0)
  const columnPotential = Array(count + 1).fill(0)
  const matchedRow = Array(count + 1).fill(0)
  const previousColumn = Array(count + 1).fill(0)

  for (let row = 1; row <= count; row++) {
    matchedRow[0] = row
    let column = 0
    const minimum = Array(count + 1).fill(Number.POSITIVE_INFINITY)
    const used = Array(count + 1).fill(false)
    do {
      used[column] = true
      const currentRow = matchedRow[column]
      let delta = Number.POSITIVE_INFINITY
      let nextColumn = 0
      for (let candidate = 1; candidate <= count; candidate++) {
        if (used[candidate]) continue
        const value = cost[currentRow - 1][candidate - 1] -
          rowPotential[currentRow] - columnPotential[candidate]
        if (value < minimum[candidate]) {
          minimum[candidate] = value
          previousColumn[candidate] = column
        }
        if (minimum[candidate] < delta) {
          delta = minimum[candidate]
          nextColumn = candidate
        }
      }
      for (let candidate = 0; candidate <= count; candidate++) {
        if (used[candidate]) {
          rowPotential[matchedRow[candidate]] += delta
          columnPotential[candidate] -= delta
        } else {
          minimum[candidate] -= delta
        }
      }
      column = nextColumn
    } while (matchedRow[column] !== 0)

    do {
      const nextColumn = previousColumn[column]
      matchedRow[column] = matchedRow[nextColumn]
      column = nextColumn
    } while (column !== 0)
  }

  const assignment = Array(count).fill(0)
  for (let column = 1; column <= count; column++) {
    assignment[matchedRow[column] - 1] = column - 1
  }
  return assignment
}

export function tidyGardenPositions(plants: GardenPlant[], size: GardenSize): TidyPlacement[] {
  if (plants.length === 0 || size.width <= 0 || size.height <= 0) return []
  const metrics = gardenMetrics(size)
  const edge = size.width < 600 ? 8 : 12
  const available = {
    width: Math.max(1, size.width - edge * 2),
    height: Math.max(1, size.height - edge * 2),
  }
  const compact = size.width < 600
  const footprints = plants.map((plant) => plantFootprint(plant, size))
  const margins = plants.map((plant) => plantMargins(plant, size))
  const footprint = {
    width: Math.max(...footprints.map((item) => item.width)),
    height: Math.max(...footprints.map((item) => item.height)),
  }
  const columns = chooseColumns(plants.length, available, footprint, compact)
  const rows = Math.ceil(plants.length / columns)
  const maxArtHeight = Math.max(...footprints.map((item) => item.artHeight))
  const maxLabelHeight = Math.max(...footprints.map((item) => item.labelHeight))
  const rowHeight = maxArtHeight + 10 + maxLabelHeight
  const targetGapY = compact ? 12 : 22
  const availableGapY = rows === 1 ? 0 : Math.max(0, (available.height - rowHeight * rows) / (rows - 1))
  const gapY = Math.min(targetGapY, availableGapY)
  const totalHeight = rowHeight * rows + gapY * (rows - 1)
  const naturalStart = edge + Math.max(0, (available.height - totalHeight) * 0.15)
  const firstLabelOffset = maxArtHeight + 10
  const lastLabelOffset = firstLabelOffset + (rows - 1) * (rowHeight + gapY)
  const minimumLabelTop = Math.max(...footprints.map((item, index) =>
    margins[index].marginTop - metrics.plantHeight / 2 + item.artHeight + 10))
  const maximumLabelTop = Math.min(...footprints.map((item, index) =>
    size.height - margins[index].marginBottom - metrics.plantHeight / 2 + item.artHeight + 10))
  const startTop = Math.max(minimumLabelTop - firstLabelOffset,
    Math.min(naturalStart, maximumLabelTop - lastLabelOffset))
  const spacingX = columns === 1 ? 0 :
    Math.min(footprint.width + (compact ? 12 : 24), (available.width - footprint.width) / (columns - 1))
  const slots = Array.from({ length: rows }, (_, row) => {
    const rowCount = Math.min(columns, plants.length - row * columns)
    const rowWidth = (rowCount - 1) * spacingX
    const startX = size.width / 2 - rowWidth / 2
    const labelTop = startTop + row * (rowHeight + gapY) + maxArtHeight + 10
    return Array.from({ length: rowCount }, (_, column) => ({
      x: startX + column * spacingX,
      labelTop,
    }))
  }).flat()
  const current = plants.map((plant) => plantPoint(plant.position, size, plant))
  const cost = plants.map((_, plantIndex) => slots.map((slot) => {
    const centerY = slot.labelTop + metrics.plantHeight / 2 - footprints[plantIndex].artHeight - 10
    const dx = (current[plantIndex].x - slot.x) / size.width
    const dy = (current[plantIndex].y - centerY) / size.height
    return dx * dx + dy * dy
  }))
  const assignment = nearestSlotAssignment(cost)

  return plants.map((plant, index) => {
    const slot = slots[assignment[index]]
    const point = {
      x: slot.x,
      y: slot.labelTop + metrics.plantHeight / 2 - footprints[index].artHeight - 10,
    }
    return { id: plant.id, position: normalizedPosition(point, size, plant) }
  })
}
