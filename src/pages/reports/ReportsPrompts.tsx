import { MessagesSquare } from 'lucide-react'
import PromptList from '@/components/lens/PromptList'
import { lensGetPrompts, lensGetPrompt } from '@/lib/api'

/**
 * Reports → Prompts. Team-wide Claude Code prompt feed (requires
 * prompts.view.all). Route + sidebar item are both gated.
 */
export default function ReportsPrompts() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessagesSquare className="h-6 w-6 text-primary" />
          Claude Prompts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          What the team has been asking Claude Code, newest first. Click any row to read the full prompt.
        </p>
      </div>

      <PromptList list={lensGetPrompts} detail={lensGetPrompt} showUser showFilters />
    </div>
  )
}
