import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Mic, Briefcase, Megaphone,
  DollarSign, Settings2, BarChart2, FileText,
  TrendingUp, Target, Zap, AlertTriangle, Settings,
  Circle, Send,
} from 'lucide-react'

const AGENTS = [
  { path: '/sam',  icon: Mic,        label: 'Sam',  sub: 'CoS' },
  { path: '/rex',  icon: Briefcase,  label: 'Rex',  sub: 'CRO' },
  { path: '/andy', icon: Megaphone,  label: 'Andy', sub: 'CMO' },
  { path: '/finn', icon: DollarSign, label: 'Finn', sub: 'CFO' },
  { path: '/ola',  icon: Settings2,  label: 'Ola',  sub: 'COO' },
]

const WORKSPACE = [
  { path: '/pipeline', icon: BarChart2,   label: 'Pipeline'  },
  { path: '/outreach', icon: Send,        label: 'Outreach'  },
  { path: '/content',  icon: FileText,    label: 'Content'   },
  { path: '/finance',  icon: TrendingUp,  label: 'Finance'   },
  { path: '/okrs',     icon: Target,      label: 'OKRs'      },
]

const SYSTEM = [
  { path: '/automations', icon: Zap,          label: 'Automations' },
  { path: '/errors',      icon: AlertTriangle, label: 'Errors'      },
  { path: '/settings',    icon: Settings,      label: 'Settings'    },
]

const AGENT_STATUS = ['Sam', 'Rex', 'Andy', 'Finn', 'Ola']

function NavItem({ path, icon: Icon, label, sub }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer mx-1
         border-l-[3px]
         ${isActive
           ? 'bg-white/[0.15] text-white border-l-white/60 font-medium'
           : 'text-blue-100/75 hover:bg-white/[0.08] hover:text-white border-l-transparent'
         }`
      }
    >
      <Icon size={15} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {sub && <span className="text-xxs text-blue-200/50 font-mono">{sub}</span>}
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside
      className="w-[200px] shrink-0 h-screen flex flex-col fixed left-0 top-0 z-20"
      style={{ background: '#1E40AF' }}
    >

      {/* Logo */}
      <div className="px-4 py-3.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <img
            src="/gtm360-logo.png"
            alt="GTM360"
            className="h-7 w-auto object-contain brightness-0 invert"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
          />
          {/* Fallback */}
          <div className="hidden items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center shrink-0">
              <span className="font-display text-white text-xs leading-none">G</span>
            </div>
            <div>
              <div className="font-display text-white text-sm leading-none tracking-wide">GTM360</div>
              <div className="text-xxs text-blue-200/60 font-mono">HQ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">

        {/* Home */}
        <NavItem path="/" icon={LayoutDashboard} label="Command Center" />

        <div className="pt-4 pb-1">
          <span
            className="text-xxs font-mono text-blue-200/40 uppercase px-4 py-1"
            style={{ letterSpacing: '2px' }}
          >
            Agents
          </span>
        </div>

        {AGENTS.map(a => <NavItem key={a.path} {...a} />)}

        <div className="pt-4 pb-1">
          <span
            className="text-xxs font-mono text-blue-200/40 uppercase px-4 py-1"
            style={{ letterSpacing: '2px' }}
          >
            Workspace
          </span>
        </div>

        {WORKSPACE.map(a => <NavItem key={a.path} {...a} />)}

        <div className="pt-4 pb-1">
          <span
            className="text-xxs font-mono text-blue-200/40 uppercase px-4 py-1"
            style={{ letterSpacing: '2px' }}
          >
            System
          </span>
        </div>

        {SYSTEM.map(a => <NavItem key={a.path} {...a} />)}
      </nav>

      {/* Agent status bar */}
      <div className="border-t border-white/10 px-3 py-3 space-y-2 shrink-0">
        <div className="flex gap-2 flex-wrap">
          {AGENT_STATUS.map(name => (
            <div key={name} className="flex items-center gap-1 text-xxs font-mono text-blue-200/60">
              <Circle size={6} className="fill-emerald-400 text-emerald-400" />
              <span>{name}</span>
            </div>
          ))}
        </div>
        <div className="text-xxs text-blue-200/40 font-mono">Last brief: 6:30 AM</div>

        {/* User */}
        <div className="flex items-center gap-2 pt-1">
          <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
            <span className="text-xxs font-display text-white">SJ</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-blue-50 truncate font-medium">Sameer Joshi</div>
            <div className="text-xxs text-blue-200/50 truncate">gtm-360.com</div>
          </div>
        </div>
      </div>

    </aside>
  )
}
