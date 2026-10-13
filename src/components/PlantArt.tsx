import type { GrowthStage, PlantType } from '../lib/garden'
import { artworkImageStyle, plantArtwork, PLANT_ART_SIZE, topTrimmedArtworkStyle } from '../lib/artwork'

interface PlantArtProps {
  type: PlantType
  happy?: boolean
  stage?: GrowthStage
  trimTop?: boolean
}

export function PlantArt({ type, happy = false, stage = 'young', trimTop = false }: PlantArtProps) {
  const artwork = plantArtwork[type]
  const trimmed = trimTop ? topTrimmedArtworkStyle(artwork) : null
  const style = trimmed?.image ?? artworkImageStyle(artwork, PLANT_ART_SIZE.width, PLANT_ART_SIZE.height)
  return (
    <div className={`plant-art plant-art--${type}`} style={trimmed?.container}
      data-plant-type={type} data-growth-stage={stage} data-trimmed={trimTop || undefined} aria-hidden="true">
      <img className={`plant-image plant-neutral ${happy ? 'is-hidden' : ''}`} style={style} src={artwork.src} alt="" draggable={false} />
      <img className={`plant-image plant-happy ${happy ? 'is-happy' : ''}`} style={style} src={artwork.happySrc} alt="" draggable={false} />
    </div>
  )
}
