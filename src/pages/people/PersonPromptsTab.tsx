import { useCallback } from 'react'
import PromptList from '@/components/lens/PromptList'
import { lensGetUserPrompts, lensGetPrompt, type PromptFilters } from '@/lib/api'

interface Props {
  userId: number | string
}

/**
 * Prompts tab on a Person profile. Shows that person's Claude Code prompts.
 * Visible to anyone with prompts.view.all (gated by the caller).
 *
 * The list fetcher is memoised on userId so PromptList's internal effect
 * doesn't re-fire every render (it depends on the `list` reference).
 */
export default function PersonPromptsTab({ userId }: Props) {
  const list = useCallback(
    (f: PromptFilters) => lensGetUserPrompts(userId, f),
    [userId],
  )

  return (
    <PromptList
      list={list}
      detail={lensGetPrompt}
      showFilters
      emptyHint="No Claude Code prompts captured for this person yet."
    />
  )
}
