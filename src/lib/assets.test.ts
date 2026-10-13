import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { plantTypes } from './garden'
import { fitArtwork, plantArtwork, PLANT_ART_SIZE, waterDropArtwork, wateringCanArtwork } from './artwork'

const imageFiles = [
  ...plantTypes.flatMap((type) => [plantArtwork[type].src, plantArtwork[type].happySrc]),
  wateringCanArtwork.src, '/assets/objects/watering-can-plain-transparent.png', waterDropArtwork.src,
]

function readAsset(src: string) {
  return readFileSync(new URL(`../../public${src}`, import.meta.url))
}

describe('supplied artwork contract', () => {
  it('uses all thirteen supplied plant pairs, both cans, and the water effect', () => {
    expect(plantTypes).toHaveLength(13)
    expect(Object.keys(plantArtwork)).toEqual(plantTypes)
    expect(new Set(imageFiles).size).toBe(29)
  })

  it.each(imageFiles)('%s is an original-size transparent PNG', (src) => {
    const file = readAsset(src)
    expect(src).toMatch(/-transparent\.png$/)
    expect(file.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(file.toString('ascii', 12, 16)).toBe('IHDR')
    expect(file.readUInt32BE(16)).toBe(768)
    expect(file.readUInt32BE(20)).toBe(768)
    expect(file[25]).toBe(6)
  })

  it.each(plantTypes)('%s has distinct, aligned neutral and happy artwork', (type) => {
    const artwork = plantArtwork[type]
    expect(readAsset(artwork.src).equals(readAsset(artwork.happySrc))).toBe(false)
    const { frame, contentFrame, soil } = artwork
    expect(frame.x).toBeGreaterThanOrEqual(0)
    expect(frame.y).toBeGreaterThanOrEqual(0)
    expect(frame.x + frame.width).toBeLessThanOrEqual(artwork.width)
    expect(frame.y + frame.height).toBeLessThanOrEqual(artwork.height)
    expect(contentFrame.x).toBeGreaterThanOrEqual(frame.x)
    expect(contentFrame.y).toBeGreaterThanOrEqual(frame.y)
    expect(contentFrame.x + contentFrame.width).toBeLessThanOrEqual(frame.x + frame.width)
    expect(contentFrame.y + contentFrame.height).toBeLessThanOrEqual(frame.y + frame.height)
    expect(soil.x).toBeGreaterThan(frame.x)
    expect(soil.x).toBeLessThan(frame.x + frame.width)
    expect(soil.y).toBeGreaterThan(frame.y)
    expect(soil.y).toBeLessThan(frame.y + frame.height)
    const layout = fitArtwork(artwork, PLANT_ART_SIZE.width, PLANT_ART_SIZE.height)
    expect(layout.left + frame.x * layout.scale).toBeGreaterThanOrEqual(-0.001)
    expect(layout.left + (frame.x + frame.width) * layout.scale).toBeLessThanOrEqual(PLANT_ART_SIZE.width + 0.001)
    expect(layout.top + frame.y * layout.scale).toBeGreaterThanOrEqual(-0.001)
    expect(layout.top + (frame.y + frame.height) * layout.scale).toBeCloseTo(PLANT_ART_SIZE.height)
    expect(layout.width / artwork.width).toBeCloseTo(layout.height / artwork.height)
  })

  it('has no placeholder plant, pot, face, or watering-can image left', () => {
    const files = readdirSync(new URL('../../public/assets/plants/', import.meta.url), { recursive: true, encoding: 'utf8' })
    expect(files.some((file) => file.endsWith('.svg'))).toBe(false)
    for (const path of ['objects/watering-can.svg', 'objects/pot-terracotta.svg', 'effects/smile.svg']) {
      expect(existsSync(new URL(`../../public/assets/${path}`, import.meta.url))).toBe(false)
    }
  })

  it.each(['objects/garden-ground.svg', 'effects/heart.svg'])('%s remains separate decorative artwork', (file) => {
    const svg = readFileSync(new URL(`../../public/assets/${file}`, import.meta.url), 'utf8')
    expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/)
    for (const [, path] of svg.matchAll(/\sd="([^"]+)"/g)) {
      expect(path).toMatch(/^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\s-]+$/)
    }
  })
})
