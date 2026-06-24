import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMe, getTeam, updateTeam } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, AlertTriangle, CheckCircle2, LogOut, User, Shield } from 'lucide-react'

interface TeamSettings {
  collection_level?: string
  secret_scrub?: string
  collect_responses?: boolean
  prompt_retention_days?: number
  summary_interval?: number
  provider?: string
  api_key?: string
  custom_url?: string
  slack_webhook?: string
  discord_webhook?: string
  alert_on_block?: boolean
  alert_on_stuck?: boolean
  alert_on_secret?: boolean
  alert_on_kill?: boolean
  daily_digest?: boolean
  weekly_digest?: boolean
  target_version?: string
  [key: string]: unknown
}

export default function SettingsGeneral() {
  const { logout } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile state
  const [me, setMe] = useState<any>(null)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')

  // Team settings state
  const [teamName, setTeamName] = useState('')
  const [settings, setSettings] = useState<TeamSettings>({})

  useEffect(() => {
    async function load() {
      try {
        const [meData, teamData] = await Promise.all([
          getMe().catch(() => null),
          getTeam().catch(() => null),
        ])

        if (meData) {
          setMe(meData)
          setProfileName(meData.user?.name || '')
          setProfileEmail(meData.user?.email || '')
        }

        if (teamData) {
          setTeamName(teamData.name || '')
          let parsed: TeamSettings = {}
          if (typeof teamData.settings === 'string') {
            try { parsed = JSON.parse(teamData.settings) } catch { parsed = {} }
          } else if (teamData.settings && typeof teamData.settings === 'object') {
            parsed = teamData.settings as TeamSettings
          }
          setSettings(parsed)
        }
      } catch (_err) {
        console.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileMessage('')
    try {
      const res = await fetch('/api/admin/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setProfileMessage(err.error || 'Failed to update')
      } else {
        setProfileMessage('Profile updated')
        setCurrentPassword('')
        setNewPassword('')
      }
    } catch {
      setProfileMessage('Error updating profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    try {
      await updateTeam({ name: teamName, settings })
      setSaveMsg({ type: 'success', text: 'Settings saved successfully.' })
      setTimeout(() => setSaveMsg(null), 5000)
    } catch (_err) {
      setSaveMsg({ type: 'error', text: 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  const toggleSetting = (key: keyof TeamSettings) => {
    setSettings(s => ({ ...s, [key]: !s[key] }))
  }

  const updateSetting = (key: keyof TeamSettings, val: unknown) => {
    setSettings(s => ({ ...s, [key]: val }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">General</h1>
        <p className="text-muted-foreground">Profile, team configuration, and integrations.</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
          <CardDescription>Update your personal information and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="your@email.com" />
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Change Password</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              <Input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
          </div>
          {profileMessage && (
            <div className={`text-sm font-medium flex items-center gap-2 ${profileMessage.includes('Error') || profileMessage.includes('Failed') || profileMessage.includes('incorrect') || profileMessage.includes('required') ? 'text-red-600' : 'text-green-600'}`}>
              {profileMessage.includes('Error') || profileMessage.includes('Failed') ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {profileMessage}
            </div>
          )}
          <Button onClick={handleSaveProfile} disabled={profileSaving} size="sm">
            {profileSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {profileSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account
          </CardTitle>
          <CardDescription>Your account details and permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium">{me?.roles?.[0]?.roles?.name || me?.roles?.[0]?.roleName || 'User'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Permissions</span>
              <span className="font-medium">{me?.permissions?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-xs text-muted-foreground">{me?.user?.id || '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Settings Save Message */}
      {saveMsg && (
        <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
          saveMsg.type === 'success'
            ? 'bg-green-500/10 text-green-600 border border-green-200'
            : 'bg-red-500/10 text-red-600 border border-red-200'
        }`}>
          {saveMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {saveMsg.text}
        </div>
      )}

      <form onSubmit={handleSaveTeam} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Profile</CardTitle>
            <CardDescription>Basic information about your deployment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="Engineering Team"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Version (Auto Update)</Label>
              <Input
                value={settings.target_version || ''}
                onChange={e => updateSetting('target_version', e.target.value)}
                placeholder="e.g. 1.2.0 (Leave blank for latest)"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Collection & Privacy</CardTitle>
            <CardDescription>Determine what hooks pull from user machines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Collection Level</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={settings.collection_level || 'full'}
                  onChange={e => updateSetting('collection_level', e.target.value)}
                >
                  <option value="off">Off (No prompt text)</option>
                  <option value="full">Full Text</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Secret Scrubbing</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={settings.secret_scrub || 'redact'}
                  onChange={e => updateSetting('secret_scrub', e.target.value)}
                >
                  <option value="off">Off</option>
                  <option value="alert">Alert Only</option>
                  <option value="redact">Redact</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="space-y-0.5">
                <Label>Collect Responses</Label>
                <p className="text-xs text-muted-foreground">Store the full Claude response text</p>
              </div>
              <Button type="button" variant={settings.collect_responses ? 'default' : 'secondary'} size="sm" onClick={() => toggleSetting('collect_responses')}>
                {settings.collect_responses ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Prompt Retention (Days)</Label>
              <Input
                type="number"
                value={settings.prompt_retention_days || 90}
                onChange={e => updateSetting('prompt_retention_days', parseInt(e.target.value) || 90)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Summary Settings</CardTitle>
            <CardDescription>Configure how and when intelligence briefs are generated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Summary Interval (Hours)</Label>
                <Input type="number" value={settings.summary_interval || 0} onChange={e => updateSetting('summary_interval', parseInt(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">0 to disable auto-generation</p>
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={settings.provider || 'claude-code'}
                  onChange={e => updateSetting('provider', e.target.value)}
                >
                  <option value="claude-code">Claude Code Built-in</option>
                  <option value="anthropic-api">Anthropic API</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">Custom Endpoint</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input type="password" value={settings.api_key || ''} onChange={e => updateSetting('api_key', e.target.value)} placeholder="Enter API key..." />
            </div>
            {settings.provider === 'custom' && (
              <div className="space-y-2">
                <Label>Custom URL</Label>
                <Input type="url" value={settings.custom_url || ''} onChange={e => updateSetting('custom_url', e.target.value)} placeholder="https://..." />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts & Webhooks</CardTitle>
            <CardDescription>Get notified of team events directly where you work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Slack Webhook URL</Label>
              <Input
                type="url"
                value={settings.slack_webhook || ''}
                onChange={e => updateSetting('slack_webhook', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Discord Webhook URL</Label>
              <Input
                type="url"
                value={settings.discord_webhook || ''}
                onChange={e => updateSetting('discord_webhook', e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>

            <div className="grid gap-2 grid-cols-2 mt-4">
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-muted/30">
                <input type="checkbox" checked={!!settings.alert_on_block} onChange={() => toggleSetting('alert_on_block')} className="rounded accent-primary" />
                <span className="text-sm font-medium">Alert on Model Blocks</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-muted/30">
                <input type="checkbox" checked={!!settings.alert_on_stuck} onChange={() => toggleSetting('alert_on_stuck')} className="rounded accent-primary" />
                <span className="text-sm font-medium">Alert on Dev Stuck</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-muted/30">
                <input type="checkbox" checked={!!settings.alert_on_secret} onChange={() => toggleSetting('alert_on_secret')} className="rounded accent-primary" />
                <span className="text-sm font-medium">Alert on Secret Exposure</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-muted/30">
                <input type="checkbox" checked={!!settings.alert_on_kill} onChange={() => toggleSetting('alert_on_kill')} className="rounded accent-primary" />
                <span className="text-sm font-medium">Alert on User Deactivation</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-muted/30">
                <input type="checkbox" checked={!!settings.daily_digest} onChange={() => toggleSetting('daily_digest')} className="rounded accent-primary" />
                <span className="text-sm font-medium">Send Daily Digest</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-muted/30">
                <input type="checkbox" checked={!!settings.weekly_digest} onChange={() => toggleSetting('weekly_digest')} className="rounded accent-primary" />
                <span className="text-sm font-medium">Send Weekly Digest</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </div>
      </form>

      {/* System Settings (admin only) */}
      {me?.permissions?.includes('config.manage') && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">System</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Role for New Users</label>
              <p className="text-xs text-gray-500 mb-2">Manage roles and permissions in <Link to="/settings/roles" className="text-blue-600 hover:underline">Roles &amp; Permissions</Link>.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Schedule Defaults</label>
              <p className="text-xs text-gray-500">Work schedule configuration will be available in Phase 3 (Attendance module).</p>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <LogOut className="w-5 h-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Sign Out</div>
              <div className="text-xs text-muted-foreground">Log out of the dashboard</div>
            </div>
            <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
