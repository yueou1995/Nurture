import { Icon } from './Icon'

export function PlantRemovedToast({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="plant-removed-toast">
      <Icon name="sprout" size={17} />
      <span role="status" aria-live="polite">Plant removed</span>
      <button aria-label="Dismiss Plant removed notification" onClick={onDismiss}>
        <Icon name="close" size={14} />
      </button>
    </div>
  )
}
