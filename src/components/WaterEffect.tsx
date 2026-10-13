import type { Point } from '../lib/garden'
import { WATER_DROP_COUNT, WATER_DROP_DURATION, WATER_DROP_STAGGER } from '../lib/watering'
import { waterDropArtwork } from '../lib/artwork'

export function WaterEffect({ from, to }: { from: Point; to: Point }) {
  const curve = `M ${from.x} ${from.y} Q ${from.x - 11} ${(from.y + to.y) / 2} ${to.x} ${to.y}`
  const { frame } = waterDropArtwork
  const dropWidth = 8
  const dropHeight = dropWidth * frame.height / frame.width
  return (
    <svg className="water-effect" aria-hidden="true">
      <path className="water-still" d={curve} />
      <g className="water-flow">
        {Array.from({ length: WATER_DROP_COUNT }, (_, index) => (
          <g key={index} className="water-drop" opacity="0">
            <svg x={-dropWidth / 2} y={-dropHeight / 2} width={dropWidth} height={dropHeight}
              viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`} overflow="hidden">
              <image href={waterDropArtwork.src} width={waterDropArtwork.width} height={waterDropArtwork.height} />
            </svg>
            <animateMotion dur={`${WATER_DROP_DURATION}ms`} begin={`${index * WATER_DROP_STAGGER}ms`} repeatCount="1" fill="freeze" path={curve} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.88;1" dur={`${WATER_DROP_DURATION}ms`} begin={`${index * WATER_DROP_STAGGER}ms`} repeatCount="1" fill="freeze" />
          </g>
        ))}
      </g>
      <g className="soil-splash" transform={`translate(${to.x} ${to.y})`}>
        <path d="m-10 0-5-6M0-3v-7m9 9 6-5" />
      </g>
    </svg>
  )
}
