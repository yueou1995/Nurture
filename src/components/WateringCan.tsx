import type { CSSProperties } from 'react'
import { POUR_ANGLE, WATERING_TIMING, type ActiveWatering, type WateringSpot } from '../lib/watering'
import { artworkImageStyle, wateringCanArtwork } from '../lib/artwork'

type CanStyle = CSSProperties & {
  '--can-facing': number
  '--arrival-x': string
  '--arrival-y': string
  '--rest-angle': string
  '--pour-angle': string
  '--phase-duration': string
  '--can-pivot-x': string
  '--can-pivot-y': string
}

export function CanArt() {
  const { frame } = wateringCanArtwork
  return (
    <div className="can-art" style={{ aspectRatio: `${frame.width} / ${frame.height}` }} aria-hidden="true">
      <img src={wateringCanArtwork.src} style={artworkImageStyle(wateringCanArtwork, frame.width, frame.height)} alt="" draggable={false} />
    </div>
  )
}

export function WateringCan({ watering, spot, width }: {
  watering: ActiveWatering
  spot: WateringSpot
  width: number
}) {
  const { frame, pivot } = wateringCanArtwork
  const style: CanStyle = {
    left: spot.point.x, top: spot.point.y, width, height: width * frame.height / frame.width,
    '--can-facing': spot.facing,
    '--arrival-x': `${width * 0.68 * spot.facing}px`,
    '--arrival-y': `${-width * 0.44}px`,
    '--rest-angle': `${-6 * spot.facing}deg`,
    '--pour-angle': `${POUR_ANGLE * spot.facing}deg`,
    '--phase-duration': `${WATERING_TIMING[watering.phase]}ms`,
    '--can-pivot-x': `${(pivot.x - frame.x) / frame.width * 100}%`,
    '--can-pivot-y': `${(pivot.y - frame.y) / frame.height * 100}%`,
  }
  return (
    <div className={`watering-can is-${watering.phase}`} style={style} aria-hidden="true"
      data-phase={watering.phase} data-target={watering.plantId}>
      <div className="can-motion">
        <CanArt />
      </div>
    </div>
  )
}
