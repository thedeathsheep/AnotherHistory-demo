/**
 * Hover / focus tooltip (player-facing copy). Portal + flip near viewport top.
 */

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

const SHOW_DELAY_MS = 150
const VIEWPORT_PAD = 8
const GAP = 8

export interface TooltipProps {
  content: string
  children: ReactElement<{ ref?: React.Ref<HTMLElement>; children?: ReactNode }>
  /** When true, never schedule show */
  disabled?: boolean
}

export function Tooltip({ content, children, disabled }: TooltipProps) {
  const rawId = useId()
  const tipId = `tt-${rawId.replace(/:/g, '')}`
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
  }, [])

  const scheduleShow = useCallback(() => {
    if (disabled || !content.trim()) return
    clearShowTimer()
    showTimerRef.current = setTimeout(() => setOpen(true), SHOW_DELAY_MS)
  }, [content, disabled, clearShowTimer])

  const hide = useCallback(() => {
    clearShowTimer()
    setOpen(false)
  }, [clearShowTimer])

  useEffect(() => () => clearShowTimer(), [clearShowTimer])

  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const bubble = bubbleRef.current
    if (!trigger || !bubble) return
    const tr = trigger.getBoundingClientRect()
    const br = bubble.getBoundingClientRect()
    let top = tr.top - GAP - br.height
    if (top < VIEWPORT_PAD) {
      top = tr.bottom + GAP
    }
    let left = tr.left + tr.width / 2 - br.width / 2
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - br.width - VIEWPORT_PAD))
    bubble.style.top = `${top}px`
    bubble.style.left = `${left}px`
  }, [open, content])

  const composeRef = (node: HTMLElement | null) => {
    triggerRef.current = node
    const childRef = (children as ReactElement & { ref?: React.Ref<HTMLElement | null> }).ref
    if (typeof childRef === 'function') childRef(node)
    else if (childRef && typeof childRef === 'object') {
      ;(childRef as React.MutableRefObject<HTMLElement | null>).current = node
    }
  }

  const childProps = children.props as Record<string, unknown>
  const trigger = cloneElement(children, {
    ref: composeRef,
    onMouseEnter: (e: React.MouseEvent) => {
      ;(childProps.onMouseEnter as ((ev: React.MouseEvent) => void) | undefined)?.(e)
      scheduleShow()
    },
    onMouseLeave: (e: React.MouseEvent) => {
      ;(childProps.onMouseLeave as ((ev: React.MouseEvent) => void) | undefined)?.(e)
      hide()
    },
    onFocus: (e: React.FocusEvent) => {
      ;(childProps.onFocus as ((ev: React.FocusEvent) => void) | undefined)?.(e)
      scheduleShow()
    },
    onBlur: (e: React.FocusEvent) => {
      ;(childProps.onBlur as ((ev: React.FocusEvent) => void) | undefined)?.(e)
      hide()
    },
    'aria-describedby': open ? tipId : (childProps['aria-describedby'] as string | undefined),
  } as Partial<Record<string, unknown>>)

  const portal =
    open && typeof document !== 'undefined' ? (
      createPortal(
        <div
          id={tipId}
          role="tooltip"
          ref={bubbleRef}
          className="pointer-events-none fixed z-[10000] max-w-[min(94vw,26rem)] rounded border border-[var(--ui-frame-outer)] bg-[#0a0a0a] px-3 py-2.5 text-[var(--dot-text)] shadow-md"
          style={{
            fontSize: 'calc(max(15px, var(--dot-size)) * 1.1)',
            lineHeight: 1.55,
            top: 0,
            left: 0,
          }}
        >
          {content}
        </div>,
        document.body
      )
    ) : null

  return (
    <>
      {trigger}
      {portal}
    </>
  )
}
