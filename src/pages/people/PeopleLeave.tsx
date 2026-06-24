import { CalendarOff } from 'lucide-react'
import ComingSoon from '@/components/ComingSoon'

export default function PeopleLeave() {
  return (
    <ComingSoon
      icon={CalendarOff}
      title="Leave"
      intro="Leave types, balances, and approval inbox. Approvals happen here; the request shows up on the Person Profile too."
      bullets={[
        'Leave types and accrual policies (paid / unpaid).',
        'Per-employee balance tracking.',
        'Pending approval queue with one-click approve / reject.',
        'Leave calendar overlay on attendance.',
      ]}
      footnote="Lands in the HR build phase."
    />
  )
}
