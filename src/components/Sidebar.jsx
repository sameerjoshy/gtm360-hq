import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Mic, Briefcase, Megaphone,
  DollarSign, Settings2, BarChart2, FileText,
  TrendingUp, Target, Zap, AlertTriangle, Settings,
  Circle, Send, ClipboardList, Search, Bell, ShieldCheck,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useUI } from '../context/UIContext'

// ─── Navigation data ─────────────────────────────────────────────────────────

const AGENTS = [
  { path: '/sam',  icon: Mic,        label: 'Sam',  sub: 'CoS' },
  { path: '/rex',  icon: Briefcase,  label: 'Rex',  sub: 'CRO' },
  { path: '/andy', icon: Megaphone,  label: 'Andy', sub: 'CMO' },
  { path: '/finn', icon: DollarSign, label: 'Finn', sub: 'CFO' },
  { path: '/ola',  icon: Settings2,  label: 'Ola',  sub: 'COO' },
]

const WORKSPACE = [
  { path: '/pipeline',  icon: BarChart2,     label: 'Pipeline'  },
  { path: '/outreach',  icon: Send,          label: 'Outreach'  },
  { path: '/prospects', icon: Search,        label: 'Prospects' },
  { path: '/nurture',   icon: Bell,          label: 'Nurture'   },
  { path: '/trends',    icon: TrendingUp,    label: 'Trends'    },
  { path: '/memo',      icon: ClipboardList, label: 'Meetings'  },
  { path: '/proposals', icon: FileText,      label: 'Proposals' },
  { path: '/content',   icon: FileText,      label: 'Content'   },
]

const SYSTEM = [
  { path: '/okrs',        icon: Target,       label: 'OKRs'        },
  { path: '/cleanup',     icon: ShieldCheck,  label: 'CRM Quality' },
  { path: '/automations', icon: Zap,          label: 'Automations' },
  { path: '/errors',      icon: AlertTriangle, label: 'Errors'      },
  { path: '/settings',    icon: Settings,      label: 'Settings'    },
]

const AGENT_STATUS = [
  { name: 'Sam',  live: true  },
  { name: 'Rex',  live: true  },
  { name: 'Andy', live: true  },
  { name: 'Finn', live: true  },
  { name: 'Ola',  live: true  },
  { name: 'Memo', live: false },
]

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ path, icon: Icon, label, sub, collapsed }) {
  return (
    <NavLink
      to={path}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg text-xs transition-all cursor-pointer mx-1.5
         border-l-[2px] group relative
         ${collapsed ? 'px-3 py-3 justify-center' : 'px-2.5 py-2.5'}
         ${isActive
           ? 'bg-sidebar-active text-gtm-orange border-l-gtm-orange font-medium'
           : 'text-white/60 hover:bg-sidebar-hover hover:text-white/90 border-l-transparent'
         }`
      }
    >
      <Icon size={15} className="shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 leading-none">{label}</span>
          {sub && <span className="text-xxs text-white/30 font-mono">{sub}</span>}
        </>
      )}
      {/* Collapsed tooltip */}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2 py-1 bg-bg-s1 border border-bdr rounded-md
                        text-xs text-text-pri whitespace-nowrap opacity-0 pointer-events-none
                        group-hover:opacity-100 transition-opacity z-50 shadow-panel">
          {label}
        </div>
      )}
    </NavLink>
  )
}

function SectionLabel({ label, collapsed }) {
  if (collapsed) return (
    <div className="h-px bg-white/8 mx-3 my-2" />
  )
  return (
    <div className="pt-4 pb-1 px-4">
      <span className="text-xxs font-mono text-white/30 uppercase" style={{ letterSpacing: '2px' }}>
        {label}
      </span>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUI()
  const w = sidebarCollapsed ? 'w-[48px]' : 'w-[200px]'

  return (
    <aside
      className={`${w} shrink-0 h-screen flex flex-col fixed left-0 top-0 z-20
                  transition-all duration-200 overflow-hidden`}
      style={{ background: '#0F1624', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >

      {/* Logo / Collapse header */}
      <div className="flex items-center justify-between px-3 py-3 shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: 48 }}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className="font-display tracking-widest whitespace-nowrap"
              style={{ fontSize: 16, color: '#fff', letterSpacing: '3px' }}
            >
              GTM<span style={{ color: '#FF4D00' }}>360</span> HQ
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
          className="text-white/30 hover:text-white/70 transition-colors p-1 rounded cursor-pointer
                     shrink-0 flex items-center justify-center"
        >
          {sidebarCollapsed
            ? <PanelLeftOpen  size={14} />
            : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5">

        {/* Command Center */}
        <div className={sidebarCollapsed ? 'mt-1' : 'mt-1'}>
          <NavItem path="/dashboard" icon={LayoutDashboard} label="Command Center" collapsed={sidebarCollapsed} />
        </div>

        <SectionLabel label="Agents" collapsed={sidebarCollapsed} />
        {AGENTS.map(a => <NavItem key={a.path} {...a} collapsed={sidebarCollapsed} />)}

        <SectionLabel label="Workspace" collapsed={sidebarCollapsed} />
        {WORKSPACE.map(a => <NavItem key={a.path} {...a} collapsed={sidebarCollapsed} />)}

        <SectionLabel label="System" collapsed={sidebarCollapsed} />
        {SYSTEM.map(a => <NavItem key={a.path} {...a} collapsed={sidebarCollapsed} />)}
      </nav>

      {/* Agent status bar */}
      {!sidebarCollapsed && (
        <div className="shrink-0 px-3 py-3 space-y-2"
             style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-x-2 gap-y-1 flex-wrap">
            {AGENT_STATUS.map(({ name, live }) => (
              <div key={name} className="flex items-center gap-1 text-xxs font-mono text-white/40">
                <span className={`w-1.5 h-1.5 rounded-full ${live ? 'live-dot bg-ok' : 'bg-warn/70'}`} />
                <span>{name}</span>
              </div>
            ))}
          </div>
          <div className="text-xxs text-white/25 font-mono">Last brief: 6:30 AM</div>

          {/* User */}
          <div className="flex items-center gap-2 pt-1">
            <div className="w-6 h-6 rounded-full bg-gtm-orange/20 border border-gtm-orange/30
                            flex items-center justify-center shrink-0">
              <span className="text-xxs font-display text-gtm-orange">SJ</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-white/80 truncate font-medium">Sameer Joshi</div>
              <div className="text-xxs text-white/30 truncate font-mono">gtm-360.com</div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed: just avatar */}
      {sidebarCollapsed && (
        <div className="shrink-0 px-2 py-3 flex justify-center"
             style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-7 h-7 rounded-full bg-gtm-orange/20 border border-gtm-orange/30
                          flex items-center justify-center cursor-pointer">
            <span className="text-xxs font-display text-gtm-orange">SJ</span>
          </div>
        </div>
      )}
    </aside>
  )
}
