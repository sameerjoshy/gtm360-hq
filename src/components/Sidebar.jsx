import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Mic, Briefcase, Megaphone,
  DollarSign, Settings2, BarChart2, FileText,
  TrendingUp, Target, Zap, AlertTriangle, Settings,
  Circle,
} from 'lucide-react'

const AGENTS = [
  { path: '/sam',  icon: Mic,        label: 'Sam',  sub: 'CoS' },
  { path: '/rex',  icon: Briefcase,  label: 'Rex',  sub: 'CRO' },
  { path: '/andy', icon: Megaphone,  label: 'Andy', sub: 'CMO' },
  { path: '/finn', icon: DollarSign, label: 'Finn', sub: 'CFO' },
  { path: '/ola',  icon: Settings2,  label: 'Ola',  sub: 'COO' },
]

const WORKSPACE = [
  { path: '/pipeline', icon: BarChart2,   label: 'Pipeline' },
  { path: '/content',  icon: FileText,    label: 'Content' },
  { path: '/finance',  icon: TrendingUp,  label: 'Finance' },
  { path: '/okrs',     icon: Target,      label: 'OKRs' },
]

const SYSTEM = [
  { path: '/automations', icon: Zap,          label: 'Automations' },
  { path: '/errors',      icon: AlertTriangle, label: 'Errors' },
  { path: '/settings',    icon: Settings,      label: 'Settings' },
]

const AGENT_STATUS = ['Sam', 'Rex', 'Andy', 'Finn', 'Ola']

function NavItem({ path, icon: Icon, label, sub }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `nav-item ${isActive ? 'active' : ''}`
      }
    >
      <Icon size={15} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {sub && <span className="text-xs text-text-mut font-mono">{sub}</span>}
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-[200px] shrink-0 h-screen flex flex-col bg-bg-s1 border-r border-bdr fixed left-0 top-0 z-20">

      {/* Logo */}
      <div className="px-4 py-3 border-b border-bdr">
        <div className="flex items-center gap-2.5">
          <img
            src="/gtm360-logo.png"
            alt="GTM360"
            className="h-8 w-auto object-contain"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
          />
          {/* Fallback if logo file not found yet */}
          <div className="hidden items-center gap-2">
            <div className="w-6 h-6 rounded bg-gtm-orange flex items-center justify-center shrink-0">
              <span className="font-display text-white text-xs leading-none">G</span>
            </div>
            <div>
              <div className="font-display text-text-pri text-sm leading-none tracking-wide">GTM360</div>
              <div className="text-xxs text-text-mut font-mono">HQ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5">

        {/* Home */}
        <NavItem path="/" icon={LayoutDashboard} label="Command Center" />

        <div className="pt-3 pb-1">
          <span className="section-label">Agents</span>
        </div>

        {AGENTS.map(a => <NavItem key={a.path} {...a} />)}

        <div className="pt-3 pb-1">
          <span className="section-label">Workspace</span>
        </div>

        {WORKSPACE.map(a => <NavItem key={a.path} {...a} />)}

        <div className="pt-3 pb-1">
          <span className="section-label">System</span>
        </div>

        {SYSTEM.map(a => <NavItem key={a.path} {...a} />)}
      </nav>

      {/* Agent status bar */}
      <div className="border-t border-bdr px-3 py-2.5 space-y-2">
        <div className="flex gap-2 flex-wrap">
          {AGENT_STATUS.map(name => (
            <div key={name} className="agent-chip">
              <Circle size={6} className="fill-ok text-ok" />
              <span>{name}</span>
            </div>
          ))}
        </div>
        <div className="text-xxs text-text-mut font-mono">Last brief: 6:30 AM</div>

        {/* User */}
        <div className="flex items-center gap-2 pt-1">
          <div className="w-6 h-6 rounded-full bg-gtm-orange/20 border border-gtm-orange/40 flex items-center justify-center shrink-0">
            <span className="text-xxs font-display text-gtm-orange">SJ</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-text-pri truncate">Sameer Joshi</div>
            <div className="text-xxs text-text-mut truncate">gtm-360.com</div>
          </div>
        </div>
      </div>

    </aside>
  )
}
