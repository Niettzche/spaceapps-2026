import { useCallback, useEffect, useRef } from 'react'

// Side sheet on a native <dialog>. It opens as a modal and, when closed by a click,
// leaves the way it came in (to the right) before the dialog actually closes.
// Escape closes it at once: keyboard actions should not wait on an animation.
export default function useSheet(onClose) {
  const ref = useRef(null)
  const closing = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (!d.open) d.showModal()
    const done = () => onClose()
    d.addEventListener('close', done)
    return () => d.removeEventListener('close', done)
  }, [onClose])

  const close = useCallback(() => {
    const d = ref.current
    if (!d || !d.open) return Promise.resolve()
    if (closing.current) return closing.current
    d.dataset.closing = ''
    // getAnimations() flushes styles, so the exit animation is already listed here.
    const anims = d.getAnimations ? d.getAnimations() : []
    closing.current = Promise.all(anims.map((a) => a.finished)).catch(() => {}).then(() => d.close())
    return closing.current
  }, [])

  // Only clicks on the dimmed area close it; the empty space inside the panel does not.
  const onBackdrop = useCallback((e) => {
    const d = ref.current
    if (e.target !== d) return
    const r = d.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close()
  }, [close])

  return { ref, close, onBackdrop }
}
