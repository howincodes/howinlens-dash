import { Circle, type LucideIcon } from 'lucide-react'

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  intro: string
  bullets?: string[]
  footnote?: string
}

export default function ComingSoon({
  icon: Icon,
  title,
  intro,
  bullets,
  footnote,
}: ComingSoonProps) {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="text-center mb-10">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Icon className="w-7 h-7" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border px-2 py-0.5 rounded">
          Coming soon
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto leading-relaxed">
          {intro}
        </p>
      </div>

      {bullets && bullets.length > 0 ? (
        <div className="rounded-lg border bg-card/40 divide-y">
          {bullets.map((b) => (
            <div key={b} className="flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5 text-muted-foreground/60">
                <Circle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 text-sm text-foreground/90 leading-relaxed">
                {b}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {footnote ? (
        <p className="mt-6 text-xs text-muted-foreground text-center">
          {footnote}
        </p>
      ) : null}
    </div>
  )
}
