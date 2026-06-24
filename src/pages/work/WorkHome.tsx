import { Link } from 'react-router-dom'
import {
  ArrowRight,
  FolderKanban,
  CheckSquare,
  Target,
  FolderGit2,
} from 'lucide-react'

const TILES = [
  {
    to: '/work/projects',
    icon: FolderKanban,
    title: 'Projects',
    blurb: 'Internal work containers — members, tasks, linked directories, commits.',
  },
  {
    to: '/work/tasks',
    icon: CheckSquare,
    title: 'Tasks',
    blurb: 'All tasks across projects — list and kanban with the drawer detail.',
  },
  {
    to: '/work/focus-sessions',
    icon: Target,
    title: 'Focus sessions',
    blurb: 'Self-reported invisible-work windows. Review queue + AI task match.',
  },
  {
    to: '/work/linked-directories',
    icon: FolderGit2,
    title: 'Linked directories',
    blurb: 'Repos linked to projects. Cross-project view of every tracked path.',
  },
]

export default function WorkHome() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Work</h1>
        <p className="text-muted-foreground max-w-prose">
          Projects, tasks, and the linked directories + focus sessions that
          back them. Pick an entity to dive in.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {TILES.map((t) => {
          const Icon = t.icon
          return (
            <Link
              key={t.to}
              to={t.to}
              className="group rounded-lg border bg-card/50 hover:bg-card hover:shadow-md transition-all p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-semibold text-base mb-1">{t.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.blurb}
              </p>
              <div className="mt-4 pt-4 border-t flex items-center text-xs font-medium text-primary">
                Open
                <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
