import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Wider panel when listing saves */
  wide?: boolean
}

export function Overlay({ open, title, onClose, children, wide }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[8000] flex items-end md:items-center md:justify-end justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 border-0 cursor-default"
        aria-label="关闭遮罩"
        onClick={onClose}
      />
      <div
        className={`relative ui-frame flex flex-col max-h-[85vh] w-full md:w-[min(420px,100vw-2rem)] ${wide ? 'md:!w-[min(520px,100vw-2rem)]' : ''} animate-[slideUp_0.2s_ease-out] md:animate-none`}
        style={{ fontSize: 'var(--dot-size)' }}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--ui-frame-outer)] shrink-0">
          <h2 className="text-[var(--dot-muted)] m-0">{title}</h2>
          <button type="button" className="ui-btn px-3 py-1" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-3">{children}</div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.9; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
