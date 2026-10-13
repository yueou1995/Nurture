import type { PlantType, Point } from './garden'

export interface ArtworkFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageArtwork {
  src: string
  width: number
  height: number
  frame: ArtworkFrame
}

export interface PlantArtwork extends ImageArtwork {
  happySrc: string
  contentFrame: ArtworkFrame
  soil: Point
}

export const PLANT_ART_SIZE = { width: 200, height: 250 }
const FULL_IMAGE_FRAME: ArtworkFrame = { x: 0, y: 0, width: 768, height: 768 }

function plantImage(
  prefix: string,
  contentFrame: [number, number, number, number],
  soil: [number, number],
): PlantArtwork {
  return {
    src: `assets/plants/${prefix}-plain-transparent.png`,
    happySrc: `assets/plants/${prefix}-doodle-transparent.png`,
    width: 768,
    height: 768,
    frame: FULL_IMAGE_FRAME,
    contentFrame: { x: contentFrame[0], y: contentFrame[1], width: contentFrame[2], height: contentFrame[3] },
    soil: { x: soil[0], y: soil[1] },
  }
}

export const plantArtwork: Record<PlantType, PlantArtwork> = {
  succulent: plantImage('succulent-azulita', [250, 423, 268, 323], [384, 581]),
  daisy: plantImage('daisy', [194, 248, 380, 498], [384, 591]),
  monstera: plantImage('monstera', [147, 160, 473, 586], [384, 523]),
  sunflower: plantImage('sunflower', [180, 248, 408, 498], [384, 580]),
  cactus: plantImage('succulent-columnar-cactus', [280, 423, 207, 323], [384, 607]),
  'cream-orchid': plantImage('cream-orchid', [135, 276, 498, 470], [384, 531]),
  bonsai: plantImage('bonsai', [165, 248, 437, 498], [384, 587]),
  hydrangea: plantImage('hydrangea', [240, 423, 287, 323], [384, 629]),
  'snake-plant': plantImage('snake-plant', [213, 160, 342, 586], [384, 526]),
  'potted-bamboo': plantImage('potted-bamboo', [243, 248, 282, 498], [384, 569]),
  ivy: plantImage('ivy', [135, 333, 498, 413], [384, 463]),
  'bird-of-paradise': plantImage('bird-of-paradise', [214, 160, 340, 586], [384, 541]),
  'aloe-vera': plantImage('aloe-vera', [183, 248, 402, 498], [384, 519]),
}

export const wateringCanArtwork: ImageArtwork & { pivot: Point; spout: Point } = {
  src: 'assets/objects/watering-can-no-drops-transparent.png',
  width: 768,
  height: 768,
  frame: { x: 228, y: 522, width: 311, height: 224 },
  pivot: { x: 416, y: 649 },
  spout: { x: 245, y: 589 },
}

export const waterDropArtwork: ImageArtwork = {
  src: 'assets/effects/water-drop-transparent.png',
  width: 768,
  height: 768,
  frame: { x: 170, y: 433, width: 30, height: 41 },
}

export function fitArtwork(artwork: ImageArtwork, width: number, height: number) {
  const { frame } = artwork
  const scale = Math.min(width / frame.width, height / frame.height)
  return {
    scale,
    left: (width - frame.width * scale) / 2 - frame.x * scale,
    top: height - frame.height * scale - frame.y * scale,
    width: artwork.width * scale,
    height: artwork.height * scale,
  }
}

export function artworkImageStyle(artwork: ImageArtwork, width: number, height: number) {
  const layout = fitArtwork(artwork, width, height)
  return {
    left: `${layout.left / width * 100}%`,
    top: `${layout.top / height * 100}%`,
    width: `${layout.width / width * 100}%`,
    height: `${layout.height / height * 100}%`,
  }
}

export function topTrimmedArtworkStyle(artwork: PlantArtwork) {
  const visibleHeight = artwork.height - artwork.contentFrame.y
  return {
    container: { aspectRatio: `${artwork.width} / ${visibleHeight}` },
    image: {
      left: '0%',
      top: `${-artwork.contentFrame.y / visibleHeight * 100}%`,
      width: '100%',
      height: `${artwork.height / visibleHeight * 100}%`,
    },
  }
}
