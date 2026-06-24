import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { lazy } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/Login'
import { useAuthStore } from './store/authStore'

// ─── Eager imports (initial bundle) ───────────────────────────────────
// Hub homes and shells — the navigation backbone. Keep these eager so the
// rail + sidebar render instantly; everything else is lazy.
import Overview from './pages/Overview'
import PeopleDirectory from './pages/people/PeopleDirectory'
import PersonDetail from './pages/people/PersonDetail'
import WorkHome from './pages/work/WorkHome'
import ReportsHome from './pages/reports/ReportsHome'
import SalesPlaceholder from './pages/sales/SalesPlaceholder'
import SettingsLayout from './pages/settings/SettingsLayout'
import Forbidden from './pages/Forbidden'
import { HandCoins, Building2 } from 'lucide-react'

// ─── Lazy imports (split into per-route chunks) ───────────────────────
const TasksPage = lazy(() => import('./pages/TasksPage'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const SalesLeads = lazy(() => import('./pages/sales/Leads'))
const SalesLeadDetail = lazy(() => import('./pages/sales/LeadDetail'))
const SalesOverview = lazy(() => import('./pages/sales/SalesOverview'))
const SalesContacts = lazy(() => import('./pages/sales/Contacts'))
const SalesContactDetail = lazy(() => import('./pages/sales/ContactDetail'))
const SalesCampaigns = lazy(() => import('./pages/sales/Campaigns'))
const SalesReferrers = lazy(() => import('./pages/sales/Referrers'))
const SalesCampaignDetail = lazy(() => import('./pages/sales/CampaignDetail'))
const SalesCampaignCategories = lazy(() => import('./pages/sales/settings/CampaignCategories'))
const SalesMediaLimits = lazy(() => import('./pages/sales/settings/MediaLimits'))
const SalesOutreach = lazy(() => import('./pages/sales/Outreach'))
const SalesFunnelReport = lazy(() => import('./pages/reports/sales/Funnel'))
const SalesSourceRoiReport = lazy(() => import('./pages/reports/sales/SourceRoi'))
const SalesOwnerLeaderboardReport = lazy(() => import('./pages/reports/sales/OwnerLeaderboard'))
const SalesReferrerLeaderboardReport = lazy(() => import('./pages/reports/sales/ReferrerLeaderboard'))
const PeopleAttendance = lazy(() => import('./pages/people/PeopleAttendance'))
const PeopleLeave = lazy(() => import('./pages/people/PeopleLeave'))
const PeoplePayroll = lazy(() => import('./pages/people/PeoplePayroll'))
const SettingsGeneral = lazy(() => import('./pages/settings/SettingsGeneral'))
const SettingsWorkspace = lazy(() => import('./pages/settings/SettingsWorkspace'))
const SettingsHr = lazy(() => import('./pages/settings/SettingsHr'))
const SettingsCrm = lazy(() => import('./pages/settings/SettingsCrm'))
const SettingsAudit = lazy(() => import('./pages/settings/SettingsAudit'))
const SettingsRoles = lazy(() => import('./pages/settings/SettingsRoles'))
const SettingsLens = lazy(() => import('./pages/settings/SettingsLens'))
const ReportsPrompts = lazy(() => import('./pages/reports/ReportsPrompts'))
const MyProfile = lazy(() => import('./pages/MyProfile'))


/**
 * `/work/tasks/:id` legacy redirect — preserve the kanban-with-drawer
 * pattern by passing the id through `?task=`.
 */
function LegacyTaskRedirect() {
  const { id } = useParams()
  return <Navigate to={`/work/tasks?task=${id}`} replace />
}

/**
 * Smart landing: admins and users with cross-hub permissions land on
 * /overview; everyone else (e.g. sales-only roles) goes to their first
 * accessible hub instead so they don't bounce off a forbidden page.
 */
function DefaultLanding() {
  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const canSeeOverview =
    user?.role === 'Admin' ||
    perms.some((p) => p === 'config.view' || p === 'users.view')
  if (canSeeOverview) return <Navigate to="/overview" replace />
  if (perms.some((p) => p.startsWith('crm.'))) return <Navigate to="/sales/overview" replace />
  if (perms.some((p) => p.startsWith('tasks.') || p.startsWith('projects.'))) return <Navigate to="/work/tasks" replace />
  return <Navigate to="/overview" replace />
}

/**
 * Preserve query/hash when redirecting an old top-level path to its new home.
 * `<Navigate>` does not auto-thread search/hash on a string `to`.
 */
function LegacyRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}

function LegacyDynamicRedirect({
  template,
  param,
}: {
  template: string
  param: string
}) {
  const params = useParams()
  const id = params[param] ?? ''
  const { search, hash } = useLocation()
  return <Navigate to={`${template.replace(`:${param}`, id)}${search}${hash}`} replace />
}

export default function App() {
  const token = useAuthStore((s) => s.token)

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/" replace /> : <Login />}
      />

      <Route element={<AppShell />}>
        {/* ─── Cross-hub landing ──────────────────────────────────── */}
        <Route path="/" element={<DefaultLanding />} />
        <Route path="/overview" element={<Overview />} />

        {/* ─── People hub ─────────────────────────────────────────── */}
        {/* Single Employees directory. Old lens paths fold back into it. */}
        <Route path="/people" element={<PeopleDirectory />} />
        <Route path="/people/attendance" element={<PeopleAttendance />} />
        <Route path="/people/leave" element={<PeopleLeave />} />
        <Route path="/people/payroll" element={<PeoplePayroll />} />
        <Route path="/people/:id" element={<PersonDetail />} />
        {/* Retired lens routes → directory */}
        <Route path="/people/employees" element={<Navigate to="/people" replace />} />
        <Route path="/people/developers" element={<Navigate to="/people" replace />} />
        <Route path="/people/admins" element={<Navigate to="/people" replace />} />
        <Route path="/people/sales" element={<Navigate to="/people" replace />} />
        <Route path="/people/contacts" element={<Navigate to="/sales/contacts" replace />} />
        <Route path="/people/usage" element={<Navigate to="/people" replace />} />

        {/* ─── Work hub ───────────────────────────────────────────── */}
        <Route path="/work" element={<WorkHome />} />
        <Route path="/work/projects" element={<Projects />} />
        <Route path="/work/projects/:id" element={<ProjectDetail />} />
        <Route path="/work/tasks" element={<TasksPage />} />
        <Route path="/work/tasks/:id" element={<LegacyTaskRedirect />} />
        {/* Retired: focus sessions + linked directories */}
        <Route path="/work/focus-sessions" element={<Navigate to="/work/tasks" replace />} />
        <Route path="/work/linked-directories" element={<Navigate to="/work/projects" replace />} />

        {/* ─── Sales hub (CRM) ────────────────────────────────────── */}
        <Route path="/sales" element={<Navigate to="/sales/overview" replace />} />
        <Route path="/sales/overview" element={<SalesOverview />} />
        <Route path="/sales/leads" element={<SalesLeads />} />
        <Route path="/sales/leads/:id" element={<SalesLeadDetail />} />
        <Route path="/sales/contacts" element={<SalesContacts />} />
        <Route path="/sales/contacts/:id" element={<SalesContactDetail />} />
        <Route path="/sales/campaigns" element={<SalesCampaigns />} />
        <Route path="/sales/campaigns/:id" element={<SalesCampaignDetail />} />
        <Route path="/sales/settings/categories" element={<SalesCampaignCategories />} />
        <Route path="/sales/settings/limits" element={<SalesMediaLimits />} />
        <Route path="/sales/outreach" element={<SalesOutreach />} />
        <Route path="/sales/referrers" element={<SalesReferrers />} />
        <Route
          path="/sales/deals"
          element={
            <SalesPlaceholder
              icon={HandCoins}
              title="Deals"
              intro="Lead-only v1 — value lives on the lead itself. Deal entity ships in v2 if the services pipeline outgrows it."
              bullets={[
                'Use Leads with status=qualified/negotiating for now.',
                'Filter by pipeline=services for service deals.',
              ]}
            />
          }
        />
        <Route
          path="/sales/companies"
          element={
            <SalesPlaceholder
              icon={Building2}
              title="Companies"
              intro="Free-text company name on each contact in v1. Dedicated Companies entity ships in v2 when needed."
              bullets={[
                'See companies via Contacts → company column.',
              ]}
            />
          }
        />

        {/* ─── Reports hub ────────────────────────────────────────── */}
        <Route path="/reports" element={<ReportsHome />} />
        <Route path="/reports/prompts" element={<ReportsPrompts />} />
        <Route path="/reports/sales" element={<Navigate to="/reports/sales/funnel" replace />} />
        <Route path="/reports/sales/funnel" element={<SalesFunnelReport />} />
        <Route path="/reports/sales/source-roi" element={<SalesSourceRoiReport />} />
        <Route path="/reports/sales/owner-leaderboard" element={<SalesOwnerLeaderboardReport />} />
        <Route path="/reports/sales/referrer-leaderboard" element={<SalesReferrerLeaderboardReport />} />
        {/* Retired AI/usage reports */}
        <Route path="/reports/analytics" element={<Navigate to="/reports/sales/funnel" replace />} />
        <Route path="/reports/ai-insights" element={<Navigate to="/reports/sales/funnel" replace />} />

        {/* ─── Settings (trimmed) ─────────────────────────────────── */}
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="general" replace />} />
          <Route path="general" element={<SettingsGeneral />} />
          <Route path="workspace" element={<SettingsWorkspace />} />
          <Route path="roles" element={<SettingsRoles />} />
          <Route path="audit" element={<SettingsAudit />} />
          <Route path="hr" element={<SettingsHr />} />
          <Route path="crm" element={<SettingsCrm />} />
          <Route path="lens" element={<SettingsLens />} />
          {/* Retired AI/tracking/github tabs → general */}
          <Route path="ai-engine" element={<Navigate to="/settings/general" replace />} />
          <Route path="ai-insights" element={<Navigate to="/settings/general" replace />} />
          <Route path="tracking" element={<Navigate to="/settings/general" replace />} />
          <Route path="github" element={<Navigate to="/settings/general" replace />} />
          <Route path="models" element={<Navigate to="/settings/general" replace />} />
        </Route>

        <Route path="/forbidden" element={<Forbidden />} />

        {/* ─── Legacy redirects (preserve old bookmarks) ──────────── */}
        <Route path="/users" element={<LegacyRedirect to="/people" />} />
        <Route
          path="/users/:id"
          element={<LegacyDynamicRedirect template="/people/:id" param="id" />}
        />
        <Route path="/roles" element={<LegacyRedirect to="/settings/roles" />} />
        <Route path="/projects" element={<LegacyRedirect to="/work/projects" />} />
        <Route
          path="/projects/:id"
          element={<LegacyDynamicRedirect template="/work/projects/:id" param="id" />}
        />
        <Route path="/tasks" element={<LegacyRedirect to="/work/tasks" />} />
        <Route path="/tasks/:id" element={<LegacyTaskRedirect />} />
        <Route path="/audit-log" element={<LegacyRedirect to="/settings/audit" />} />
        <Route path="/hr" element={<Navigate to="/people/attendance" replace />} />
        <Route path="/hr/*" element={<Navigate to="/people/attendance" replace />} />
        <Route path="/crm" element={<Navigate to="/sales" replace />} />
        <Route path="/crm/*" element={<Navigate to="/sales" replace />} />

        {/* Retired AI-ops surfaces → overview (kept so old links don't 404) */}
        <Route path="/usage" element={<Navigate to="/overview" replace />} />
        <Route path="/credentials" element={<Navigate to="/overview" replace />} />
        <Route path="/credentials/add" element={<Navigate to="/overview" replace />} />
        <Route path="/subscriptions" element={<Navigate to="/overview" replace />} />
        <Route path="/subscriptions-manager" element={<Navigate to="/overview" replace />} />
        <Route path="/linked-directories" element={<Navigate to="/work/projects" replace />} />
        <Route path="/server-machines" element={<Navigate to="/overview" replace />} />
        <Route path="/server-machines/:id" element={<Navigate to="/overview" replace />} />
        <Route path="/leases" element={<Navigate to="/overview" replace />} />
        <Route path="/focus-sessions" element={<Navigate to="/work/tasks" replace />} />
        <Route path="/commits" element={<Navigate to="/overview" replace />} />
        <Route path="/commits/unmapped" element={<Navigate to="/overview" replace />} />
        <Route path="/ai-insights" element={<Navigate to="/overview" replace />} />
        <Route path="/prompts" element={<Navigate to="/overview" replace />} />
        <Route path="/analytics" element={<Navigate to="/overview" replace />} />
        <Route path="/playground" element={<Navigate to="/overview" replace />} />
        <Route path="/system/health" element={<Navigate to="/overview" replace />} />
        <Route path="/ai-logs" element={<Navigate to="/overview" replace />} />
        <Route path="/summaries" element={<Navigate to="/overview" replace />} />
        <Route path="/activity" element={<Navigate to="/overview" replace />} />
        <Route path="/activity/*" element={<Navigate to="/overview" replace />} />
        <Route path="/tools" element={<Navigate to="/overview" replace />} />
        <Route path="/tools/*" element={<Navigate to="/overview" replace />} />
        {/* ─── My profile (self-service: prompts + devices) ───────── */}
        <Route path="/me/profile" element={<MyProfile />} />
        <Route path="/me" element={<Navigate to="/me/profile" replace />} />
        <Route path="/me/*" element={<Navigate to="/me/profile" replace />} />
        <Route path="/ops/*" element={<Navigate to="/overview" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  )
}
