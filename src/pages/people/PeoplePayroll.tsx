import { Banknote } from 'lucide-react'
import ComingSoon from '@/components/ComingSoon'

export default function PeoplePayroll() {
  return (
    <ComingSoon
      icon={Banknote}
      title="Payroll"
      intro="Period close, salary calculations from attendance + leave + adjustments, and pay slips."
      bullets={[
        'Per-period payroll runs with draft → locked → paid lifecycle.',
        'Auto-computed from attendance, leave, and configured salary.',
        'Bonuses, deductions, and reimbursements as adjustments.',
        'Salary history audit on the Person Profile.',
      ]}
      footnote="Lands in the HR build phase."
    />
  )
}
