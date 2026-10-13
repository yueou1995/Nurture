import { useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Icon } from './Icon'

export function Dialog({ title, eyebrow, children, overlay, onClose, onBack, backLabel = 'My Garden', initialFocus, variant = 'default', showClose = true }: {
  title: string
  eyebrow?: string
  children: ReactNode
  overlay?: ReactNode
  onClose: () => void
  onBack?: () => void
  backLabel?: string
  initialFocus?: RefObject<HTMLElement | null>
  variant?: string
  showClose?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const element = dialog.current!
    const opener = document.activeElement
    element.showModal()
    initialFocus?.current?.focus({ preventScroll: true })
    return () => {
      element.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [initialFocus])

  return (
    <dialog ref={dialog} className={`sheet sheet--${variant}`} aria-labelledby={titleId} aria-modal="true"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]',
        )].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first && last) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last && first) {
          event.preventDefault()
          first.focus()
        }
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="sheet-surface">
        <header className="sheet-header">
          <div>{onBack && <button className="text-back" onClick={onBack}><Icon name="back" size={15} />{backLabel}</button>}{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
          {showClose && <button className="icon-button close-button" autoFocus aria-label="Close panel" onClick={onClose}><Icon name="close" size={21} /></button>}
        </header>
        {children}
      </div>
      {overlay}
    </dialog>
  )
}
