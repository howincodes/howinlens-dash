import { TrendingUp } from 'lucide-react'
import ComingSoon from '@/components/ComingSoon'

export default function SalesHome() {
  return (
    <ComingSoon
      icon={TrendingUp}
      title="Sales hub"
      intro="Companies, leads, deals, and outreach. The hub is wired in. Pages fill in after the CRM brainstorm session."
      bullets={[
        'Contacts & companies — directory of external people + accounts.',
        'Leads — multi-source intake from ads, manual entry, referrals, web form.',
        'Deals — stages, kanban, won/lost outcomes, expected close.',
        'Outreach — email/call/meeting/note logged against contact + lead.',
        'Campaigns — ad campaign config + UTM attribution.',
        'Referrals — internal-user referrals with reward tracking.',
      ]}
      footnote="See docs/future-modules.md for the full scope."
    />
  )
}
