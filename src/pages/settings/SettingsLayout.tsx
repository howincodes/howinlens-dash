import { NavLink, Outlet } from 'react-router-dom'

interface Tab {
  to: string
  label: string
}

interface Section {
  label: string
  tabs: Tab[]
}

const SECTIONS: Section[] = [
  {
    label: 'Workspace',
    tabs: [
      { to: 'general', label: 'General' },
      { to: 'workspace', label: 'Organisation' },
    ],
  },
  {
    label: 'Security',
    tabs: [
      { to: 'roles', label: 'Roles & permissions' },
      { to: 'audit', label: 'Audit log' },
    ],
  },
  {
    label: 'Hubs',
    tabs: [
      { to: 'hr', label: 'HR' },
      { to: 'crm', label: 'CRM' },
      { to: 'lens', label: 'Lens client' },
    ],
  },
]

export default function SettingsLayout() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="w-60 border-r border-border p-4 shrink-0">
        <h2 className="text-lg font-semibold mb-4 px-2">Settings</h2>
        <nav className="flex flex-col gap-4">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-3 mb-1">
                {section.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {section.tabs.map((t) => (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded text-sm transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground/80'
                      }`
                    }
                  >
                    {t.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
