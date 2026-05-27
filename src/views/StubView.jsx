import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const AGENT_MAP = {
  'Pipeline':         { path: '/rex',  agent: 'Rex',  role: 'CRO', desc: 'Full pipeline table, deal research, and stage management' },
  'Content Calendar': { path: '/andy', agent: 'Andy', role: 'CMO', desc: 'Content queue, draft editor, and LinkedIn publishing flow' },
  'Finance':          { path: '/finn', agent: 'Finn', role: 'CFO', desc: 'Invoice tracker, P&L summary, and pricing guidance'          },
}

export default function StubView({ title }) {
  const navigate = useNavigate()
  const agent = AGENT_MAP[title]

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <div className="font-display text-3xl text-text-sec tracking-wide">{title}</div>

        {agent ? (
          <>
            <p className="text-xs text-text-mut leading-relaxed">
              {agent.desc}
            </p>
            <button
              onClick={() => navigate(agent.path)}
              className="btn-primary text-sm flex items-center gap-2 mx-auto"
            >
              Open in {agent.agent} — {agent.role}
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <div className="text-xs text-text-mut font-mono">Coming soon</div>
        )}
      </div>
    </div>
  )
}
