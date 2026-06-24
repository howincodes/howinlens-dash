import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle, Mail, Phone, IdCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PersonAuditTimeline from './PersonAuditTimeline'
import PersonSalesTab from './PersonSalesTab'
import PersonPromptsTab from './PersonPromptsTab'
import { getUser } from '@/lib/api'
import { useHasPermission } from '@/store/authStore'

interface PersonUser {
  id?: number
  name?: string
  email?: string
  phone?: string
  role?: string
  status?: string
  employeeId?: string
  joinedAt?: string
  createdAt?: string
}

/**
 * Minimal employee detail. Identity card + tabs for audit history and sales
 * (leads owned / referred). Replaced the old 3,250-line AI-ops UserDetail —
 * no credentials, prompts, sessions, or usage surfaces.
 */
export default function PersonDetail() {
  const { id } = useParams()
  const [user, setUser] = useState<PersonUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const canViewPrompts = useHasPermission('prompts.view.all')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    getUser(id)
      .then((u: any) => {
        if (u && typeof u === 'object' && (u.id || u.email)) setUser(u)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/people" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to employees
        </Link>
        <Card className="p-8 flex flex-col items-center text-center gap-2">
          <AlertCircle className="w-6 h-6 text-destructive" />
          <p className="text-sm text-muted-foreground">This person could not be found.</p>
        </Card>
      </div>
    )
  }

  const initial = (user.name || user.email || '?').slice(0, 1).toUpperCase()
  const joined = user.joinedAt || user.createdAt

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/people" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to employees
      </Link>

      {/* Identity card */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold truncate">{user.name || user.email}</h1>
              {user.role ? <Badge variant="secondary">{user.role}</Badge> : null}
              {user.status ? (
                <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
                  {user.status}
                </Badge>
              ) : null}
            </div>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {user.email ? (
                <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user.email}</span>
              ) : null}
              {user.phone ? (
                <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{user.phone}</span>
              ) : null}
              {user.employeeId ? (
                <span className="inline-flex items-center gap-1.5"><IdCard className="w-3.5 h-3.5" />{user.employeeId}</span>
              ) : null}
            </div>
            {joined ? (
              <p className="mt-1 text-xs text-muted-foreground/70">
                Joined {new Date(joined).toLocaleDateString()}
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/roles">Manage role</Link>
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Activity &amp; audit</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          {canViewPrompts && <TabsTrigger value="prompts">Prompts</TabsTrigger>}
        </TabsList>
        <TabsContent value="audit" className="mt-4">
          {id ? <PersonAuditTimeline personId={Number(id)} /> : null}
        </TabsContent>
        <TabsContent value="sales" className="mt-4">
          {id ? <PersonSalesTab userId={id} /> : null}
        </TabsContent>
        {canViewPrompts && (
          <TabsContent value="prompts" className="mt-4">
            {id ? <PersonPromptsTab userId={id} /> : null}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
