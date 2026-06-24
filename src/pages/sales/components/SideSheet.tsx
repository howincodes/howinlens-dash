import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  /** Width on md+: sm=380, md=480, lg=640 */
  width?: 'sm' | 'md' | 'lg'
}

const WIDTHS = {
  sm: 'md:w-[380px]',
  md: 'md:w-[480px]',
  lg: 'md:w-[640px]',
}

export function SideSheet({ open, onClose, title, description, children, width = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/40 backdrop-blur-sm"
      />
      {/* Panel */}
      <div className={cn(
        'w-full bg-background border-l shadow-2xl flex flex-col',
        WIDTHS[width],
      )}>
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold leading-tight">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
