import { useEffect, useState } from "react"

export default function Dashboard() {
  const [agents, setAgents] = useState([])
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const agentRes = await fetch("/api/agents")
        const agentData = await agentRes.json()
        setAgents(agentData.agents || [])

        const escRes = await fetch("/api/escalations")
        const escData = await escRes.json()
        setEscalations(escData.escalations || [])
      } catch (err) {
        console.error("Error fetching data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">GTM360 HQ Dashboard</h1>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Agent Status</h2>
        <div className="grid grid-cols-4 gap-4">
          {agents.map((agent) => (
            <div key={agent.name} className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="font-bold text-sm">{agent.name}</h3>
              <p className="text-xs text-gray-400 mt-1">Phase {agent.phase}</p>
              <div className="mt-2 text-xs">
                <span className="bg-green-900 text-green-200 px-2 py-1 rounded">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Escalations ({escalations.length})</h2>
        <div className="space-y-2">
          {escalations.length > 0 ? (
            escalations.map((esc, idx) => (
              <div key={idx} className="bg-gray-900 p-4 rounded border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm">{esc.agent_name}</h4>
                    <p className="text-xs text-gray-400">{esc.escalation_type}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    esc.severity === "critical" ? "bg-red-900 text-red-200" :
                    esc.severity === "high" ? "bg-orange-900 text-orange-200" :
                    "bg-yellow-900 text-yellow-200"
                  }`}>
                    {esc.severity}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">No escalations</p>
          )}
        </div>
      </div>
    </div>
  )
}
