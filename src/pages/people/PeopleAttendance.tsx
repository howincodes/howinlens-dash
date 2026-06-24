import { CalendarDays } from 'lucide-react'
import ComingSoon from '@/components/ComingSoon'

export default function PeopleAttendance() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Attendance"
      intro="Daily check-in/out grid for employees. Auto-derived from existing activity events where possible, with manual override."
      bullets={[
        'Day-by-day attendance grid for the whole team.',
        'Auto-presence: first activity event of the day = check-in.',
        'Half-day, leave, holiday, and absent statuses.',
        'Per-person attendance history on the Person Profile.',
      ]}
      footnote="Lands in the HR build phase. See docs/future-modules.md."
    />
  )
}
