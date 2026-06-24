import { type LucideIcon } from 'lucide-react'
import ComingSoon from '@/components/ComingSoon'

export default function SalesPlaceholder({
  icon,
  title,
  intro,
  bullets,
}: {
  icon: LucideIcon
  title: string
  intro: string
  bullets?: string[]
}) {
  return (
    <ComingSoon
      icon={icon}
      title={title}
      intro={intro}
      bullets={bullets}
      footnote="Lands in the CRM build phase."
    />
  )
}
