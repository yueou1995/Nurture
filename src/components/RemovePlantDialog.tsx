import { useRef } from 'react'
import { isWatered, type GardenPlant } from '../lib/garden'
import { Dialog } from './Dialog'
import { PlantArt } from './PlantArt'

export function RemovePlantDialog({ plant, day, placement = 'center', onCancel, onConfirm, onClose, onBack, backLabel, showClose = false }: {
  plant: GardenPlant
  day: string
  placement?: 'center' | 'right'
  onCancel: () => void
  onConfirm: () => void
  onClose?: () => void
  onBack?: () => void
  backLabel?: string
  showClose?: boolean
}) {
  const cancelButton = useRef<HTMLButtonElement>(null)

  return (
    <Dialog title="Remove this plant?" onClose={onClose ?? onCancel} onBack={onBack} backLabel={backLabel}
      initialFocus={cancelButton} variant={placement === 'right' ? 'remove-right' : 'remove'} showClose={showClose}>
      <div className="remove-dialog-art">
        <PlantArt type={plant.plantType} happy={isWatered(plant, day)} stage={plant.growthStage} trimTop />
      </div>
      <p className="remove-dialog-copy"><strong>{plant.habitName}</strong> will be removed from your garden.</p>
      <div className="remove-dialog-actions">
        <button ref={cancelButton} className="secondary-button" onClick={onCancel}>Cancel</button>
        <button className="remove-button" onClick={onConfirm}>Remove</button>
      </div>
    </Dialog>
  )
}
