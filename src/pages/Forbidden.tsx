import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Forbidden() {
  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        You don't have access to this page
      </h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Your role doesn't include the permission required to view this area.
        If you think this is wrong, ask an Owner to check your role
        assignments.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link to="/overview">
          <Button>Back to Overview</Button>
        </Link>
      </div>
    </div>
  )
}
