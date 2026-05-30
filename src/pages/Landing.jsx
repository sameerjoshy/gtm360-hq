import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'

// ─── Injected styles ──────────────────────────────────────────────────────────
const CSS = `
  @keyframes dashFlow {
    from { stroke-dashoffset: 48; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes statusPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.8); }
  }
  @keyframes orb1Float {
    0%, 100% { transform: translate(0, 0); }
    50%       { transform: translate(40px, -30px); }
  }
  @keyframes orb2Float {
    0%, 100% { transform: translate(0, 0); }
    50%       { transform: translate(-30px, 20px); }
  }
  @keyframes heroReveal {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes counterIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.75s ease, transform 0.75s ease; }
  .reveal.in { opacity: 1; transform: translateY(0); }
  .node-card { transform-style: preserve-3d; transition: transform 0.12s ease, box-shadow 0.2s ease; }
  .panel-slide {
    transition: transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.42s ease;
  }
  .panel-slide.closed { transform: translateX(100%); opacity: 0; pointer-events: none; }
  .panel-slide.open   { transform: translateX(0);    opacity: 1; }
  .flow-line {
    position: absolute; left: 100%; top: 50%;
    width: 40px; height: 2px;
    background: linear-gradient(90deg, rgba(255,77,0,0.6), rgba(255,77,0,0.2));
    transform: translateY(-50%);
  }
  .flow-dot {
    position: absolute; left: 100%; top: 50%;
    width: 6px; height: 6px; border-radius: 50%;
    background: #FF4D00;
    transform: translate(0, -50%);
    animation: flowDot 2s ease-in-out infinite;
  }
  @keyframes flowDot {
    0%   { left: 100%; opacity: 1; }
    80%  { left: calc(100% + 34px); opacity: 1; }
    100% { left: calc(100% + 40px); opacity: 0; }
  }
`

// ─── Agent profiles ───────────────────────────────────────────────────────────
const AGENTS = [
  {
    id: 'sameer', name: 'SAMEER JOSHI', role: 'Founder & CEO',
    type: 'Human', status: 'always-on', dept: 'Executive',
    desc: 'The only human in the org. Sets direction, approves outputs, closes deals. Everything else runs autonomously.',
    owns: ['Strategic decisions', 'Client relationships', 'Final approvals', 'Deal closing'],
    output: ['Direction setting', 'Output approval', 'Deal closing', 'Monday strategy session'],
    kras: ['All outputs reviewed within 24hrs', 'Every deal personally closed', 'Strategic direction set each Monday'],
    talksTo: ['Sam', 'Rex', 'Andy', 'Finn', 'Ola'],
  },
  {
    id: 'sam', name: 'SAM', role: 'Chief of Staff',
    status: 'live', dept: 'Executive',
    desc: 'Cross-agent orchestrator. Reads everything, surfaces what matters, keeps Sameer one step ahead.',
    owns: ['Daily morning brief', 'Cross-agent orchestration', 'Escalation management', 'Priority setting'],
    output: ['Morning brief at 6:30 AM (pipeline + OKRs + flag)', 'Real-time escalation flags', 'Priority action list'],
    kras: ['Brief delivered by 6:30 AM every day', 'Zero escalations older than 24hrs unresolved', 'All agent outputs surfaced to Sameer within 1 hour'],
    talksTo: ['Rex', 'Andy', 'Finn', 'Ola'],
  },
  {
    id: 'ola', name: 'OLA', role: 'Chief Operating Officer',
    status: 'live', dept: 'Operations',
    desc: 'System health. OKR tracking. Automation scheduling. Keeps the OS running.',
    owns: ['OKR tracking and pulse', 'System health monitoring', 'Automation scheduling', 'Tool stack management'],
    output: ['OKR pulse report (Monday)', 'System health check', 'Agent status report', 'Error log review'],
    kras: ['OKR data updated every Monday', 'Zero agent failures undetected >1hr', 'All automations running on schedule'],
    talksTo: ['Sam', 'All agents', 'Cleo'],
  },
  {
    id: 'rex', name: 'REX', role: 'Chief Revenue Officer',
    status: 'live', dept: 'Revenue',
    desc: 'Pipeline intelligence engine. Every prospect researched. Every deal tracked. Every call prepped.',
    owns: ['Pipeline intelligence', 'Account research (/research)', 'Account intelligence (/intel)', 'Meeting prep (/prep)', 'Campaign planning'],
    output: ['Stale deal signals → escalations', 'Research briefs on demand', 'Meeting prep 2hrs before calls', 'Account Intelligence Package'],
    kras: ['Every prospect researched before first contact', 'Pipeline never more than 24hrs stale', 'Zero discovery calls without a pre-call brief'],
    talksTo: ['Sam', 'Memo', 'Oz', 'Prop'],
  },
  {
    id: 'andy', name: 'ANDY', role: 'Chief Marketing Officer',
    status: 'live', dept: 'Marketing',
    desc: 'Content engine. Raw observations → LinkedIn posts. QC scored before Sameer ever sees it.',
    owns: ['LinkedIn content strategy', 'Post drafting and QC', 'Voice consistency', 'Newsletter'],
    output: ['Draft posts from observations', 'QC scoring (4-test framework)', 'Content queue management'],
    kras: ['20 LinkedIn posts published per quarter', 'QC score never below 7/10 before Sameer sees it', 'Every observation drafted within 48hrs'],
    talksTo: ['Sam', 'Aria', 'Sameer'],
  },
  {
    id: 'finn', name: 'FINN', role: 'Chief Financial Officer',
    status: 'live', dept: 'Finance',
    desc: 'Revenue visibility. Invoice tracking. Pricing frameworks. Zero overdue without an escalation.',
    owns: ['Invoice tracking', 'Pricing recommendations', 'P&L visibility', 'Commercial negotiation framework'],
    output: ['Invoice status report (Monday)', 'Overdue invoice escalations', 'Pricing recommendation per deal'],
    kras: ['Zero invoices overdue >7 days without escalation', 'Pricing ready before every proposal', 'MTD revenue visible at all times'],
    talksTo: ['Sam', 'Prop', 'Sameer'],
  },
  {
    id: 'memo', name: 'MEMO', role: 'Head of Meeting Intelligence',
    status: 'coming-soon', dept: 'Revenue',
    desc: 'Post-call intelligence. Every meeting → commitments, signals, follow-up email, CRM update. Human gate on all outputs.',
    owns: ['Post-call intelligence extraction', 'CRM updates post-meeting', 'Follow-up email drafting', 'Deal progression tracking'],
    output: ['Extracted: commitments, signals, objections, next steps', 'HubSpot update (pending approval)', 'Follow-up email draft', "Sam's brief update"],
    kras: ['Every call processed within 2hrs', 'CRM updated same day as every meeting', 'Zero follow-up emails delayed >24hrs'],
    talksTo: ['Rex', 'Prop', 'Sam'],
  },
  {
    id: 'oz', name: 'OZ', role: 'Head of Outreach',
    status: 'coming-soon', dept: 'Revenue',
    desc: '5-touch outreach sequences. Personalized per contact using Rex intel. Nothing sends without your approval.',
    owns: ['Multi-touch sequence drafting', 'Outreach queue management', 'Response tracking', 'Campaign execution'],
    output: ['5-touch sequence (LinkedIn + email)', 'Personalized per contact', 'Queued with scheduled dates', 'Presented for approval before sending'],
    kras: ['Zero messages sent without explicit approval', 'Every sequence personalized — no generic copy', 'All responses logged within 2hrs'],
    talksTo: ['Rex', 'Nara', 'Sam'],
  },
  {
    id: 'prop', name: 'PROP', role: 'Head of Proposals',
    status: 'coming-soon', dept: 'Revenue',
    desc: "Client words → problem statement → scope → investment. Ready within 24hrs of discovery. Finn prices it before it leaves.",
    owns: ['Proposal writing', 'Scope definition', 'Investment framing', 'Proposal versioning'],
    output: ["Problem statement (client's words)", 'Proposed scope and deliverables', 'Timeline and process', 'Investment with structure'],
    kras: ['Proposal ready within 24hrs of discovery call', 'Every proposal includes financial pain hook from Rex', "Zero proposals sent without Finn's pricing approval"],
    talksTo: ['Rex', 'Memo', 'Finn', 'Sameer'],
  },
  {
    id: 'pip', name: 'PIP', role: 'Head of Prospecting',
    status: 'coming-soon', dept: 'Revenue',
    desc: 'ICP signal monitoring. Funding rounds. Hiring sprees. Qualified prospects proposed — never added without approval.',
    owns: ['ICP signal monitoring', 'New prospect identification', 'Signal scoring and qualification', 'Pipeline proposals'],
    output: ['Funding signal scan (Wednesday)', 'Hiring signal scan (Wednesday)', 'Qualified prospects proposed to Sameer'],
    kras: ['5+ qualified signals identified per week', 'ICP score 7+ before any prospect proposed', 'Zero duplicates with existing pipeline'],
    talksTo: ['Rex', 'Sam', 'Sameer'],
  },
  {
    id: 'nara', name: 'NARA', role: 'Head of Nurture',
    status: 'coming-soon', dept: 'Revenue',
    desc: 'Engagement signal monitor. Email replies. Meeting bookings. Warm prospects never go cold undetected.',
    owns: ['Engagement signal monitoring', 'Contextual follow-up drafting', 'Stage movement recommendations', 'Prospect activity tracking'],
    output: ['Email reply detection from prospect domains', 'Meeting booking signals', 'Engagement-triggered follow-up drafts'],
    kras: ['Every engagement signal detected within 2hrs', 'Follow-up draft ready before Sameer sees signal', 'Zero warm prospects going cold undetected'],
    talksTo: ['Rex', 'Oz', 'Sam'],
  },
  {
    id: 'aria', name: 'ARIA', role: 'Head of Trend Research',
    status: 'coming-soon', dept: 'Marketing',
    desc: 'Weekly trend intelligence. Reddit + web search. Emerging vs crowded. Raw observations into content hooks for Andy.',
    owns: ['Weekly trend monitoring', 'Emerging vs crowded topic identification', 'Content hook generation', 'Market gap identification'],
    output: ['Trend report (Monday): Emerging / Crowded / Gaps', '3-5 raw observations → content queue', 'Hook angles for each topic'],
    kras: ['Trend report delivered every Monday', 'Minimum 3 actionable observations per week', 'Zero crowded topics drafted by Andy'],
    talksTo: ['Andy', 'Sam', 'Sameer'],
  },
  {
    id: 'cleo', name: 'CLEO', role: 'Head of CRM Quality',
    status: 'coming-soon', dept: 'Operations',
    desc: 'CRM data quality. Duplicates. Missing fields. Cleanup proposals. Never auto-executes without explicit approval.',
    owns: ['CRM data quality', 'Duplicate detection', 'Missing data flags', 'Cleanup proposals'],
    output: ['CRM health report (Monday)', 'Critical issues list', 'Cleanup proposals (never auto-executes)', 'Data quality score'],
    kras: ['Zero critical CRM issues undetected >7 days', 'Data quality score above 80% at all times', 'Never deletes or modifies without explicit approval'],
    talksTo: ['Ola', 'Sam', 'Rex'],
  },
]

// ─── Org chart layout — [left%, top%] ────────────────────────────────────────
const POS = {
  sameer: [50,  8],
  sam:    [30, 28], ola:  [72, 28],
  rex:    [18, 50], andy: [48, 50], finn: [64, 50],
  memo:   [ 4, 74], oz:   [11, 74], prop: [18, 74],
  pip:    [25, 74], nara: [32, 74], aria: [48, 74], cleo: [72, 74],
}

const EDGES = [
  ['sameer','sam'], ['sameer','ola'],
  ['sam','rex'], ['sam','andy'], ['sam','finn'],
  ['rex','memo'], ['rex','oz'], ['rex','prop'], ['rex','pip'], ['rex','nara'],
  ['andy','aria'], ['ola','cleo'],
]

// Pre-computed animation durations to avoid Math.random() in render
const EDGE_DURATIONS = [3.5, 4.0, 3.2, 3.8, 3.6, 3.0, 4.0, 3.4, 3.7, 3.2, 3.9, 3.5]

// ─── Helper: is agent live? ───────────────────────────────────────────────────
const isLive = (a) => a.status === 'live' || a.status === 'always-on'
const isHuman = (a) => a.status === 'always-on'

// ─── Component: Agent node ────────────────────────────────────────────────────
function AgentNode({ agent, selected, onClick }) {
  const tiltRef = useRef(null)
  const live = isLive(agent)
  const human = isHuman(agent)
  const [left, top] = POS[agent.id]

  const onMove = (e) => {
    const el = tiltRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 2
    const dy = ((e.clientY - r.top)  / r.height - 0.5) * 2
    el.style.transform = `perspective(700px) rotateY(${dx * 9}deg) rotateX(${-dy * 9}deg) scale(1.04)`
  }
  const onLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = ''
  }

  const glowColor  = human ? 'rgba(255,255,255,0.5)'
                   : live  ? 'rgba(255,77,0,0.55)'
                   :         'rgba(245,158,11,0.35)'
  const borderColor= human ? 'rgba(255,255,255,0.4)'
                   : live  ? (selected ? '#FF4D00' : 'rgba(255,77,0,0.35)')
                   :         'rgba(245,158,11,0.25)'
  const dotColor   = human ? '#a78bfa' : live ? '#22c55e' : '#f59e0b'
  const dotLabel   = human ? 'HUMAN'   : live ? 'LIVE'    : 'SOON'
  const isExec     = ['memo','oz','prop','pip','nara','aria','cleo'].includes(agent.id)

  return (
    <div
      onClick={onClick}
      style={{ position:'absolute', left:`${left}%`, top:`${top}%`,
               transform:'translate(-50%,-50%)', zIndex: selected ? 20 : 10,
               cursor:'pointer' }}
    >
      <div
        ref={tiltRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="node-card select-none"
        style={{
          background: selected
            ? 'rgba(255,77,0,0.12)'
            : human ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${borderColor}`,
          borderRadius: 14,
          backdropFilter: 'blur(16px)',
          boxShadow: selected
            ? `0 0 30px 6px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`
            : `0 0 16px 0 ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`,
          padding: human ? '12px 22px' : isExec ? '8px 14px' : '10px 18px',
          minWidth: human ? 170 : isExec ? 108 : 138,
          textAlign: 'center',
        }}
      >
        {/* status dot + label */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginBottom:4 }}>
          <div style={{
            width:7, height:7, borderRadius:'50%', background:dotColor, flexShrink:0,
            boxShadow:`0 0 8px ${dotColor}`,
            animation:'statusPulse 2.4s ease-in-out infinite',
          }} />
          <span style={{ fontFamily:'"DM Mono",monospace', fontSize:9, letterSpacing:'1.5px', color:dotColor }}>
            {dotLabel}
          </span>
        </div>
        {/* name */}
        <div style={{
          fontFamily:'"Bebas Neue",sans-serif',
          fontSize: human ? 17 : isExec ? 13 : 15,
          color:'#FFFFFF', letterSpacing:'1.5px', lineHeight:1,
        }}>
          {agent.name}
        </div>
        {/* role */}
        <div style={{
          fontFamily:'"DM Sans",sans-serif',
          fontSize: isExec ? 9 : 10,
          color: live ? 'rgba(255,150,80,0.85)' : 'rgba(255,255,255,0.38)',
          marginTop:3, lineHeight:1.25,
        }}>
          {agent.role}
        </div>
      </div>
    </div>
  )
}

// ─── Component: SVG connection lines ─────────────────────────────────────────
function OrgLines({ selected }) {
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible', zIndex:1 }}>
      {EDGES.map(([a, b], i) => {
        const [x1, y1] = POS[a]
        const [x2, y2] = POS[b]
        const active = selected === a || selected === b
        return (
          <g key={`${a}-${b}`}>
            <line
              x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
              stroke={active ? 'rgba(255,77,0,0.45)' : 'rgba(255,255,255,0.08)'}
              strokeWidth={active ? 2 : 1}
            />
            <line
              x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
              stroke={active ? '#FF4D00' : 'rgba(255,100,30,0.35)'}
              strokeWidth={active ? 2 : 1.2}
              strokeDasharray="6 10"
              style={{ animation:`dashFlow ${EDGE_DURATIONS[i % EDGE_DURATIONS.length]}s linear infinite` }}
            />
          </g>
        )
      })}
    </svg>
  )
}

// ─── Component: Profile panel ─────────────────────────────────────────────────
function ProfilePanel({ agent, onClose }) {
  const open = !!agent
  const live = agent ? isLive(agent) : false
  const statusColor = !agent ? '#888'
    : isHuman(agent) ? '#a78bfa'
    : live            ? '#22c55e'
    :                   '#f59e0b'
  const statusLabel = !agent ? '' : isHuman(agent) ? 'HUMAN' : live ? 'LIVE' : 'COMING SOON'

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position:'fixed', inset:0, zIndex:45, background:'rgba(0,0,0,0.4)' }}
        />
      )}
      {/* Panel */}
      <div
        className={`panel-slide ${open ? 'open' : 'closed'}`}
        style={{
          position:'fixed', top:0, right:0, height:'100vh', width:440,
          background:'rgba(8,6,14,0.97)', backdropFilter:'blur(24px)',
          borderLeft:'1px solid rgba(255,77,0,0.18)',
          zIndex:50, overflowY:'auto', padding:'36px 32px 60px',
        }}
      >
        {agent && (
          <>
            {/* Close */}
            <button
              onClick={onClose}
              style={{ position:'absolute', top:20, right:20, background:'rgba(255,255,255,0.06)',
                       border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
                       color:'rgba(255,255,255,0.5)', width:32, height:32,
                       display:'flex', alignItems:'center', justifyContent:'center',
                       cursor:'pointer', fontSize:18, lineHeight:1 }}
            >
              ×
            </button>

            {/* Status */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:statusColor,
                            boxShadow:`0 0 10px ${statusColor}`,
                            animation:'statusPulse 2s infinite' }} />
              <span style={{ fontFamily:'"DM Mono",monospace', fontSize:10,
                             letterSpacing:'2px', color:statusColor }}>
                {statusLabel}
              </span>
              <span style={{ fontFamily:'"DM Sans",sans-serif', fontSize:11,
                             color:'rgba(255,255,255,0.3)', marginLeft:4 }}>
                {agent.dept}
              </span>
            </div>

            {/* Name */}
            <div style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:42,
                          color:'#FFFFFF', letterSpacing:'3px', lineHeight:1, marginBottom:6 }}>
              {agent.name}
            </div>
            <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:14,
                          color:'rgba(255,150,80,0.85)', marginBottom:20, lineHeight:1.4 }}>
              {agent.role}
            </div>

            {/* Divider */}
            <div style={{ height:1, background:'rgba(255,255,255,0.08)', marginBottom:24 }} />

            {/* Description */}
            <p style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13, lineHeight:1.65,
                        color:'rgba(255,255,255,0.55)', marginBottom:28 }}>
              {agent.desc}
            </p>

            {/* Owns */}
            <PanelSection title="OWNS" color="#FF4D00" items={agent.owns} />
            {/* Output */}
            <PanelSection title="DAILY OUTPUT" color="rgba(255,200,100,0.9)" items={agent.output} />
            {/* KRAs */}
            <PanelSection title="KRAs" color="#22c55e" items={agent.kras} />

            {/* Talks to */}
            <div style={{ marginTop:24 }}>
              <div style={{ fontFamily:'"DM Mono",monospace', fontSize:10, letterSpacing:'2px',
                            color:'rgba(255,255,255,0.3)', marginBottom:10 }}>
                TALKS TO
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {agent.talksTo.map(t => (
                  <span key={t} style={{
                    fontFamily:'"DM Sans",sans-serif', fontSize:11,
                    color:'rgba(255,255,255,0.7)',
                    background:'rgba(255,77,0,0.1)', border:'1px solid rgba(255,77,0,0.2)',
                    borderRadius:6, padding:'3px 10px',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function PanelSection({ title, color, items }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontFamily:'"DM Mono",monospace', fontSize:10, letterSpacing:'2px',
                    color:'rgba(255,255,255,0.3)', marginBottom:10 }}>
        {title}
      </div>
      <ul style={{ margin:0, padding:0, listStyle:'none' }}>
        {items.map((item, i) => (
          <li key={i} style={{ display:'flex', gap:10, alignItems:'flex-start',
                                marginBottom:8, fontFamily:'"DM Sans",sans-serif',
                                fontSize:12.5, lineHeight:1.5,
                                color:'rgba(255,255,255,0.7)' }}>
            <span style={{ color, marginTop:2, flexShrink:0, fontSize:10 }}>▸</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Component: Scroll reveal ─────────────────────────────────────────────────
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setTimeout(() => el.classList.add('in'), delay)
        obs.disconnect()
      }
    }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])
  return <div ref={ref} className="reveal" style={style}>{children}</div>
}

// ─── Component: Flow step ─────────────────────────────────────────────────────
function FlowStep({ label, time, last }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, position:'relative' }}>
      <div style={{
        background:'rgba(255,77,0,0.08)', border:'1px solid rgba(255,77,0,0.25)',
        borderRadius:10, padding:'10px 16px', whiteSpace:'nowrap',
      }}>
        {time && (
          <div style={{ fontFamily:'"DM Mono",monospace', fontSize:9,
                        color:'rgba(255,77,0,0.7)', letterSpacing:'1px', marginBottom:4 }}>
            {time}
          </div>
        )}
        <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:12,
                      color:'rgba(255,255,255,0.8)', lineHeight:1.3 }}>
          {label}
        </div>
      </div>
      {!last && (
        <div style={{ width:32, height:1, background:'linear-gradient(90deg,rgba(255,77,0,0.5),rgba(255,77,0,0.1))',
                      flexShrink:0, position:'relative' }}>
          <div style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
                        color:'rgba(255,77,0,0.5)', fontSize:10 }}>›</div>
        </div>
      )}
    </div>
  )
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function Landing() {
  const [selectedAgent, setSelectedAgent] = useState(null)

  const selectAgent = useCallback((agent) => {
    setSelectedAgent(prev => prev?.id === agent.id ? null : agent)
  }, [])

  const closePanel = useCallback(() => setSelectedAgent(null), [])

  // Inject CSS
  useEffect(() => {
    const tag = document.createElement('style')
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => document.head.removeChild(tag)
  }, [])

  const BG = '#0A0A0F'
  const ORANGE = '#FF4D00'

  return (
    <div style={{ background:BG, color:'#fff', fontFamily:'"DM Sans",sans-serif', overflowX:'hidden' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:40,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 48px', height:64,
        background:'rgba(10,10,15,0.8)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:22,
                      letterSpacing:'3px', color:'#fff' }}>
          GTM<span style={{ color:ORANGE }}>360</span> HQ
        </div>
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          <a href="#org" style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13,
                                   color:'rgba(255,255,255,0.55)', textDecoration:'none' }}
             onClick={e => { e.preventDefault(); document.getElementById('org')?.scrollIntoView({ behavior:'smooth' }) }}>
            The Org
          </a>
          <a href="#intel" style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13,
                                     color:'rgba(255,255,255,0.55)', textDecoration:'none' }}
             onClick={e => { e.preventDefault(); document.getElementById('intel')?.scrollIntoView({ behavior:'smooth' }) }}>
            /intel
          </a>
          <Link
            to="/dashboard"
            style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13, fontWeight:500,
                     color:'rgba(255,255,255,0.8)', textDecoration:'none',
                     border:'1px solid rgba(255,255,255,0.15)', borderRadius:8,
                     padding:'6px 16px', background:'rgba(255,255,255,0.05)' }}
          >
            Enter HQ →
          </Link>
        </div>
      </nav>

      {/* ── Section 1: Hero ────────────────────────────────────────────────── */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex',
                        flexDirection:'column', alignItems:'center', justifyContent:'center',
                        paddingTop:64, overflow:'hidden' }}>

        {/* Animated mesh background */}
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          {/* Grid lines */}
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:`linear-gradient(rgba(255,77,0,0.05) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,77,0,0.05) 1px, transparent 1px)`,
            backgroundSize:'56px 56px',
          }} />
          {/* Grid node dots at intersections */}
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:`radial-gradient(circle, rgba(255,77,0,0.25) 1px, transparent 1px)`,
            backgroundSize:'56px 56px',
            backgroundPosition:'0 0',
          }} />
          {/* Glow orb 1 */}
          <div style={{
            position:'absolute', width:800, height:800, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(255,77,0,0.12) 0%, transparent 70%)',
            top:'0%', left:'-10%', animation:'orb1Float 9s ease-in-out infinite',
          }} />
          {/* Glow orb 2 */}
          <div style={{
            position:'absolute', width:600, height:600, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(255,77,0,0.08) 0%, transparent 70%)',
            bottom:'5%', right:'-5%', animation:'orb2Float 12s ease-in-out infinite',
          }} />
          {/* Center vignette glow */}
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse at 50% 40%, rgba(255,77,0,0.06) 0%, transparent 60%)',
          }} />
          {/* Fade to dark at bottom */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:240,
                        background:`linear-gradient(to bottom, transparent, ${BG})` }} />
        </div>

        {/* Hero content */}
        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:900, padding:'0 32px' }}>
          {/* Eyebrow */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8, marginBottom:32,
            fontFamily:'"DM Mono",monospace', fontSize:11, letterSpacing:'3px',
            color:'rgba(255,77,0,0.8)',
            animation:'heroReveal 0.6s ease both', animationDelay:'0.1s', opacity:0,
          }}>
            <div style={{ width:28, height:1, background:ORANGE, opacity:0.6 }} />
            GTM360 HQ — AI-NATIVE COMMERCIAL ORGANIZATION
            <div style={{ width:28, height:1, background:ORANGE, opacity:0.6 }} />
          </div>

          {/* Main headline */}
          <h1 style={{ margin:'0 0 0', lineHeight:0.95 }}>
            <div style={{
              fontFamily:'"Bebas Neue",sans-serif', fontSize:'clamp(72px,10vw,130px)',
              color:'#FFFFFF', letterSpacing:'4px',
              animation:'heroReveal 0.8s ease both', animationDelay:'0.3s', opacity:0,
            }}>
              We didn't build
            </div>
            <div style={{
              fontFamily:'"Bebas Neue",sans-serif', fontSize:'clamp(72px,10vw,130px)',
              color:'#FFFFFF', letterSpacing:'4px',
              animation:'heroReveal 0.8s ease both', animationDelay:'0.5s', opacity:0,
            }}>
              AI <span style={{ color:ORANGE }}>tools.</span>
            </div>
            <div style={{
              fontFamily:'"Bebas Neue",sans-serif', fontSize:'clamp(72px,10vw,130px)',
              color:'#FFFFFF', letterSpacing:'4px',
              animation:'heroReveal 0.8s ease both', animationDelay:'0.7s', opacity:0,
            }}>
              We built a <span style={{ color:ORANGE }}>company.</span>
            </div>
          </h1>

          {/* Subtext */}
          <p style={{
            fontFamily:'"DM Sans",sans-serif', fontSize:'clamp(15px,2vw,19px)',
            color:'rgba(255,255,255,0.5)', maxWidth:620, margin:'28px auto 44px',
            lineHeight:1.65,
            animation:'heroReveal 0.8s ease both', animationDelay:'1.0s', opacity:0,
          }}>
            GTM360 HQ is a fully staffed AI-native commercial organization.
            Every role. Every function. 12 agents. Running 24/7.
          </p>

          {/* CTAs */}
          <div style={{
            display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap',
            animation:'heroReveal 0.8s ease both', animationDelay:'1.2s', opacity:0,
          }}>
            <button
              onClick={() => document.getElementById('org')?.scrollIntoView({ behavior:'smooth' })}
              style={{
                fontFamily:'"DM Sans",sans-serif', fontWeight:600, fontSize:15,
                color:'#fff', background:ORANGE, border:'none', borderRadius:10,
                padding:'14px 32px', cursor:'pointer',
                boxShadow:`0 0 30px rgba(255,77,0,0.4)`,
              }}
            >
              Meet the Team →
            </button>
            <a
              href="mailto:sameer@gtm-360.com?subject=GTM360 HQ Demo Request"
              style={{
                fontFamily:'"DM Sans",sans-serif', fontWeight:500, fontSize:15,
                color:'rgba(255,255,255,0.75)', textDecoration:'none',
                border:'1px solid rgba(255,255,255,0.15)', borderRadius:10,
                padding:'14px 32px', background:'rgba(255,255,255,0.04)',
                display:'inline-block',
              }}
            >
              Request a Demo
            </a>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position:'absolute', bottom:36, left:'50%', transform:'translateX(-50%)',
          display:'flex', flexDirection:'column', alignItems:'center', gap:6,
          animation:'heroReveal 0.8s ease both', animationDelay:'1.6s', opacity:0,
        }}>
          <span style={{ fontFamily:'"DM Mono",monospace', fontSize:10,
                         letterSpacing:'2px', color:'rgba(255,255,255,0.25)' }}>SCROLL</span>
          <div style={{ width:1, height:32, background:'linear-gradient(to bottom, rgba(255,77,0,0.4), transparent)' }} />
        </div>
      </section>

      {/* ── Section 2: Org Chart ───────────────────────────────────────────── */}
      <section id="org" style={{ background:'#06050C', padding:'80px 0 60px', position:'relative' }}>
        {/* Section header */}
        <Reveal style={{ textAlign:'center', marginBottom:56, padding:'0 32px' }}>
          <div style={{ fontFamily:'"DM Mono",monospace', fontSize:10, letterSpacing:'3px',
                        color:'rgba(255,77,0,0.7)', marginBottom:16 }}>
            YOUR COMMERCIAL ORGANIZATION
          </div>
          <h2 style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:'clamp(40px,6vw,70px)',
                       color:'#fff', letterSpacing:'3px', margin:'0 0 16px' }}>
            Fully staffed. Running 24/7.
          </h2>
          <p style={{ fontFamily:'"DM Sans",sans-serif', fontSize:15,
                      color:'rgba(255,255,255,0.4)', maxWidth:480, margin:'0 auto' }}>
            Click any agent to see their job profile, KRAs, and how they talk to the rest of the org.
          </p>
        </Reveal>

        {/* Org chart container */}
        <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:24 }}>
          <div style={{
            position:'relative', minWidth:1200, height:920,
            margin:'0 auto', maxWidth:1600,
          }}>
            <OrgLines selected={selectedAgent?.id} />
            {AGENTS.map(agent => (
              <AgentNode
                key={agent.id}
                agent={agent}
                selected={selectedAgent?.id === agent.id}
                onClick={() => selectAgent(agent)}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <Reveal style={{ display:'flex', justifyContent:'center', gap:32, marginTop:40, flexWrap:'wrap' }}>
          {[
            { dot:'#22c55e', label:'Live — In production today' },
            { dot:'#f59e0b', label:'Coming Soon — In roadmap' },
            { dot:'#a78bfa', label:'Human — Sameer' },
          ].map(({ dot, label }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:dot,
                            boxShadow:`0 0 8px ${dot}` }} />
              <span style={{ fontFamily:'"DM Sans",sans-serif', fontSize:12,
                             color:'rgba(255,255,255,0.4)' }}>{label}</span>
            </div>
          ))}
        </Reveal>

        {/* Scroll hint */}
        <div style={{ textAlign:'center', marginTop:32, paddingBottom:16,
                      display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <span style={{ fontFamily:'"DM Mono",monospace', fontSize:9, letterSpacing:'2.5px',
                         color:'rgba(255,255,255,0.18)' }}>CONTINUE</span>
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none"
               style={{ animation:'orb2Float 2.4s ease-in-out infinite', opacity:0.35 }}>
            <path d="M10 2 L10 22" stroke="#FF4D00" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M4 16 L10 22 L16 16" stroke="#FF4D00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ── Profile Panel ─────────────────────────────────────────────────── */}
      <ProfilePanel agent={selectedAgent} onClose={closePanel} />

      {/* ── Section 3: How they work together ─────────────────────────────── */}
      <section style={{ background:BG, padding:'100px 48px' }}>
        <Reveal style={{ textAlign:'center', marginBottom:64 }}>
          <div style={{ fontFamily:'"DM Mono",monospace', fontSize:10, letterSpacing:'3px',
                        color:'rgba(255,77,0,0.7)', marginBottom:16 }}>
            HOW THE SYSTEM WORKS
          </div>
          <h2 style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:'clamp(40px,6vw,70px)',
                       color:'#fff', letterSpacing:'3px', margin:0 }}>
            The system runs itself.
          </h2>
        </Reveal>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',
                      gap:24, maxWidth:1200, margin:'0 auto' }}>
          {[
            {
              title:'Morning Flow',
              subtitle:'Every day at 6 AM',
              color:'rgba(255,77,0,0.8)',
              steps:[
                { label:'HubSpot → Supabase sync', time:'6:00 AM' },
                { label:'Rex checks stale deals', time:'6:15 AM' },
                { label:'Sam reads everything, writes brief', time:'6:25 AM' },
                { label:'Sameer opens cockpit — brief is ready', time:'6:30 AM' },
              ],
            },
            {
              title:'Content Flow',
              subtitle:'Every Monday, then on demand',
              color:'rgba(245,158,11,0.8)',
              steps:[
                { label:'Aria finds trend', time:'MON' },
                { label:'Andy drafts + QC scores', time:'+1HR' },
                { label:"Sam flags: 'Post awaiting approval'", time:'+2HR' },
                { label:'Sameer approves → scheduled', time:'ON REVIEW' },
              ],
            },
            {
              title:'Deal Flow',
              subtitle:'After every meeting',
              color:'rgba(34,197,94,0.8)',
              steps:[
                { label:'Sameer has meeting', time:'DAY 0' },
                { label:'Memo processes transcript', time:'+2HR' },
                { label:'Prop generates proposal', time:'+24HR' },
                { label:'Finn prices it → Sameer approves', time:'+25HR' },
              ],
            },
          ].map(({ title, subtitle, color, steps }) => (
            <Reveal key={title}>
              <div style={{
                background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                borderRadius:16, padding:'32px 28px', height:'100%',
              }}>
                <div style={{ fontFamily:'"DM Mono",monospace', fontSize:9,
                              letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:8 }}>
                  {subtitle}
                </div>
                <div style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:26,
                              letterSpacing:'2px', color:'#fff', marginBottom:24 }}>
                  {title}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, position:'relative',
                                          paddingBottom: i < steps.length - 1 ? 16 : 0 }}>
                      {/* Timeline dot + line */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, marginTop:4 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:color,
                                      boxShadow:`0 0 8px ${color}`, flexShrink:0 }} />
                        {i < steps.length - 1 && (
                          <div style={{ width:1, flex:1, background:`linear-gradient(to bottom,${color.replace('0.8','0.3')}, transparent)`,
                                        minHeight:24 }} />
                        )}
                      </div>
                      <div>
                        {step.time && (
                          <div style={{ fontFamily:'"DM Mono",monospace', fontSize:9,
                                        letterSpacing:'1px', color:color, marginBottom:3 }}>
                            {step.time}
                          </div>
                        )}
                        <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13,
                                      color:'rgba(255,255,255,0.7)', lineHeight:1.4 }}>
                          {step.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Section 4: /intel feature ─────────────────────────────────────── */}
      <section id="intel" style={{ background:'#06050C', padding:'100px 48px', position:'relative', overflow:'hidden' }}>
        {/* Glow */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                      width:800, height:400, borderRadius:'50%',
                      background:'radial-gradient(circle, rgba(255,77,0,0.08) 0%, transparent 70%)',
                      pointerEvents:'none' }} />

        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <Reveal style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ fontFamily:'"DM Mono",monospace', fontSize:10, letterSpacing:'3px',
                          color:'rgba(255,77,0,0.7)', marginBottom:16 }}>
              /intel — POWERED BY REX
            </div>
            <h2 style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:'clamp(40px,7vw,80px)',
                         color:'#fff', letterSpacing:'3px', margin:'0 0 16px', lineHeight:0.95 }}>
              Any company.
              <br/>
              <span style={{ color:ORANGE }}>30 seconds.</span>
              <br/>
              Complete intelligence.
            </h2>
            <p style={{ fontFamily:'"DM Sans",sans-serif', fontSize:15,
                        color:'rgba(255,255,255,0.4)', maxWidth:520, margin:'20px auto 0', lineHeight:1.6 }}>
              What took 3 people and 30 days — GTM360 HQ does on demand.
              Type <code style={{ color:ORANGE, background:'rgba(255,77,0,0.1)',
                                   borderRadius:4, padding:'1px 6px', fontSize:13 }}>/intel [company]</code> in Rex.
            </p>
          </Reveal>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:20 }}>
            {[
              { title:'Company Snapshot', desc:'Size, funding, revenue model, ICP fit score, business model classification', icon:'◎' },
              { title:'Financial Pain Hook', desc:'The specific commercial pain this company has right now. One sentence. Devastating.', icon:'◈' },
              { title:'Buying Committee', desc:'Who signs, who blocks, who uses. LinkedIn profiles. Priority ranking.', icon:'◉' },
              { title:'Access Strategy', desc:'Opening line, warm paths, what to say in the first 30 seconds.', icon:'◐' },
            ].map(({ title, desc, icon }) => (
              <Reveal key={title}>
                <div style={{
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,77,0,0.15)',
                  borderRadius:14, padding:'28px 24px',
                  boxShadow:'0 0 24px rgba(255,77,0,0.06)',
                }}>
                  <div style={{ fontSize:24, color:ORANGE, marginBottom:14, lineHeight:1 }}>{icon}</div>
                  <div style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:20,
                                letterSpacing:'2px', color:'#fff', marginBottom:10 }}>
                    {title}
                  </div>
                  <p style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13,
                               color:'rgba(255,255,255,0.45)', lineHeight:1.6, margin:0 }}>
                    {desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Numbers ───────────────────────────────────────────────── */}
      <section style={{ background:BG, borderTop:'1px solid rgba(255,255,255,0.06)',
                        borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'64px 48px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',
                      gap:32, maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
          {[
            { num:'5',   label:'Live Agents'      },
            { num:'7',   label:'Coming Soon'      },
            { num:'12',  label:'Auto Workflows'   },
            { num:'121', label:'Tests Passing'    },
            { num:'$0',  label:'Monthly AI Cost'  },
            { num:'1',   label:'Human Running It' },
          ].map(({ num, label }, i) => (
            <Reveal key={label} delay={i * 80}>
              <div>
                <div style={{ fontFamily:'"Bebas Neue",sans-serif',
                              fontSize:'clamp(48px,6vw,72px)', color:ORANGE,
                              letterSpacing:'2px', lineHeight:1 }}>
                  {num}
                </div>
                <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13,
                              color:'rgba(255,255,255,0.4)', marginTop:8, letterSpacing:'0.5px' }}>
                  {label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Section 6: Built for ───────────────────────────────────────────── */}
      <section style={{ background:'#06050C', padding:'100px 48px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <Reveal>
            <div style={{ fontFamily:'"DM Mono",monospace', fontSize:10, letterSpacing:'3px',
                          color:'rgba(255,77,0,0.7)', marginBottom:24 }}>
              BUILT FOR
            </div>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {[
              {
                title:"Early-stage founders who are still the sales team.",
                desc:"You're the CRO, the CMO, and the closer. GTM360 HQ gives you a full commercial function without the headcount.",
              },
              {
                title:"Scale-up CROs who need to grow without headcount.",
                desc:"Your pipeline needs intelligence. Your outreach needs personalization. Your calls need follow-through. All automated.",
              },
            ].map(({ title, desc }) => (
              <Reveal key={title}>
                <div style={{
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:16, padding:'36px 32px',
                }}>
                  <p style={{ fontFamily:'"DM Sans",sans-serif', fontSize:18, fontWeight:600,
                               color:'rgba(255,255,255,0.85)', lineHeight:1.4, margin:'0 0 16px' }}>
                    "{title}"
                  </p>
                  <p style={{ fontFamily:'"DM Sans",sans-serif', fontSize:14,
                               color:'rgba(255,255,255,0.4)', lineHeight:1.65, margin:0 }}>
                    {desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 7: CTA ────────────────────────────────────────────────── */}
      <section style={{ background:BG, padding:'120px 48px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        {/* Glow */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                      width:600, height:400, borderRadius:'50%',
                      background:'radial-gradient(circle, rgba(255,77,0,0.1) 0%, transparent 70%)',
                      pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <Reveal>
            <div style={{ fontFamily:'"DM Mono",monospace', fontSize:10, letterSpacing:'3px',
                          color:'rgba(255,77,0,0.7)', marginBottom:24 }}>
              SEE IT RUNNING LIVE
            </div>
            <h2 style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:'clamp(48px,8vw,96px)',
                         color:'#fff', letterSpacing:'4px', margin:'0 0 16px', lineHeight:0.95 }}>
              I'll run /research<br/>on your company.<br/>
              <span style={{ color:ORANGE }}>Live. In the room.</span>
            </h2>
            <p style={{ fontFamily:'"DM Sans",sans-serif', fontSize:16,
                        color:'rgba(255,255,255,0.4)', maxWidth:460, margin:'24px auto 44px', lineHeight:1.6 }}>
              30 minutes. I'll show you the full commercial engine running on your pipeline, your prospects, your calls.
            </p>
            <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
              <a
                href="mailto:sameer@gtm-360.com?subject=GTM360 HQ Demo Request"
                style={{
                  fontFamily:'"DM Sans",sans-serif', fontWeight:700, fontSize:16,
                  color:'#fff', background:ORANGE, textDecoration:'none',
                  borderRadius:12, padding:'16px 40px', display:'inline-block',
                  boxShadow:`0 0 40px rgba(255,77,0,0.4)`,
                  border:'none',
                }}
              >
                Request a Demo →
              </a>
              <Link
                to="/dashboard"
                style={{
                  fontFamily:'"DM Sans",sans-serif', fontWeight:500, fontSize:16,
                  color:'rgba(255,255,255,0.7)', textDecoration:'none',
                  border:'1px solid rgba(255,255,255,0.15)', borderRadius:12,
                  padding:'16px 40px', background:'rgba(255,255,255,0.04)',
                  display:'inline-block',
                }}
              >
                Enter HQ Live
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ background:'#06050C', borderTop:'1px solid rgba(255,255,255,0.06)',
                       padding:'40px 48px', display:'flex', alignItems:'center',
                       justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:18,
                        letterSpacing:'3px', color:'#fff', marginBottom:4 }}>
            GTM<span style={{ color:ORANGE }}>360</span> HQ
          </div>
          <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:12,
                        color:'rgba(255,255,255,0.3)' }}>
            Built by Sameer Joshi · gtm-360.com
          </div>
        </div>
        <div style={{ fontFamily:'"DM Mono",monospace', fontSize:11,
                      color:'rgba(255,255,255,0.25)', letterSpacing:'0.5px', textAlign:'right' }}>
          One person. Twelve agents. Full commercial engine.
        </div>
      </footer>
    </div>
  )
}
