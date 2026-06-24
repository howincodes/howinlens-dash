import { useCallback, useEffect, useRef } from 'react'

/**
 * Hook to wire up Enter-to-submit and Cmd/Ctrl-Enter-from-textarea-to-submit
 * on a form element. Pass a ref to your form root and a submit callback.
 *
 * Usage:
 *   const formRef = useRef<HTMLDivElement>(null)
 *   useFormSubmit(formRef, submit, submitting)
 */
export function useFormSubmit<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onSubmit: () => void,
  disabled = false,
) {
  const cb = useRef(onSubmit)
  cb.current = onSubmit

  const handler = useCallback((e: KeyboardEvent) => {
    if (disabled) return
    const target = e.target as HTMLElement | null
    if (!target) return

    // Enter in single-line input → submit
    if (e.key === 'Enter' && !e.shiftKey) {
      const tag = target.tagName.toLowerCase()
      if (tag === 'input' && (target as HTMLInputElement).type !== 'submit') {
        const isMultiSelect = (target as HTMLInputElement).type === 'search' && target.getAttribute('data-allow-enter') === 'false'
        if (!isMultiSelect) {
          e.preventDefault()
          cb.current()
        }
      }
      // Cmd/Ctrl-Enter in textarea → submit
      if (tag === 'textarea' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        cb.current()
      }
    }
  }, [disabled])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [ref, handler])
}

/**
 * Auto-focus the first focusable element inside a container on mount.
 */
export function useAutoFocus<T extends HTMLElement>(ref: React.RefObject<T | null>, when = true) {
  useEffect(() => {
    if (!when) return
    const el = ref.current
    if (!el) return
    const focusable = el.querySelector<HTMLElement>(
      'input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    )
    focusable?.focus()
    if (focusable && 'select' in focusable && (focusable as HTMLInputElement).type !== 'checkbox') {
      try { (focusable as HTMLInputElement).select() } catch { /* ignore */ }
    }
  }, [ref, when])
}
