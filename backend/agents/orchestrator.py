from typing import Dict, List, Any, Optional
from datetime import datetime
from agents.phase1.lead_qualification import LeadQualificationAgent
from agents.phase1.deal_risk import DealRiskAgent
from agents.phase1.competitive_intel import CompetitiveIntelAgent
from agents.phase1.deal_review import DealReviewAgent
from agents.phase2.success_plan import SuccessPlanAgent
from agents.phase2.early_health import EarlyHealthAgent
from agents.phase2.support_triage import SupportTriageAgent
from agents.phase2.ae_cs_handover import AECSHandoverAgent
from agents.phase2.churn_risk import ChurnRiskAgent
from agents.phase2.ebr_prep import EBRPrepAgent
from agents.phase2.stakeholder_coverage import StakeholderCoverageAgent
from agents.phase3.upsell_signal import UpsellSignalAgent
from agents.phase3.renewal import RenewalAgent
from agents.phase3.advocacy import AdvocacyAgent

class Orchestrator:
    """Central orchestrator for all GTM360 agents"""
    
    def __init__(self):
        self.agents = {
            "lead_qualification": LeadQualificationAgent(),
            "deal_risk": DealRiskAgent(),
            "competitive_intel": CompetitiveIntelAgent(),
            "deal_review": DealReviewAgent(),
            "success_plan": SuccessPlanAgent(),
            "early_health": EarlyHealthAgent(),
            "support_triage": SupportTriageAgent(),
            "ae_cs_handover": AECSHandoverAgent(),
            "churn_risk": ChurnRiskAgent(),
            "ebr_prep": EBRPrepAgent(),
            "stakeholder_coverage": StakeholderCoverageAgent(),
            "upsell_signal": UpsellSignalAgent(),
            "renewal": RenewalAgent(),
            "advocacy": AdvocacyAgent(),
        }
        self.execution_log = []
    
    def get_agent(self, agent_name: str) -> Optional[object]:
        """Get agent by name"""
        return self.agents.get(agent_name)
    
    def list_agents(self) -> Dict[str, Dict[str, Any]]:
        """List all agents with metadata"""
        return {
            name: {
                "name": agent.name,
                "phase": agent.phase,
                "table": agent.table_name,
                "status": agent.run_status
            }
            for name, agent in self.agents.items()
        }
    
    def run_agent(self, agent_name: str) -> Dict[str, Any]:
        """Run a single agent"""
        agent = self.get_agent(agent_name)
        if not agent:
            return {"status": "error", "message": f"Agent '\''{agent_name}'\'' not found"}
        
        result = agent.run()
        self.execution_log.append({
            "agent": agent_name,
            "result": result,
            "timestamp": datetime.now().isoformat() + "Z"
        })
        return result
    
    def run_phase(self, phase: int) -> List[Dict[str, Any]]:
        """Run all agents for a phase"""
        results = []
        for agent_name, agent in self.agents.items():
            if agent.phase == phase:
                result = self.run_agent(agent_name)
                results.append(result)
        return results
    
    def run_all(self) -> Dict[str, Any]:
        """Run all 14 agents sequentially"""
        start_time = datetime.now().isoformat() + "Z"
        results_by_phase = {1: [], 2: [], 3: []}
        
        for phase in [1, 2, 3]:
            print(f"\n{'='*50}")
            print(f"Phase {phase} Agents")
            print(f"{'='*50}")
            phase_results = self.run_phase(phase)
            results_by_phase[phase] = phase_results
        
        end_time = datetime.now().isoformat() + "Z"
        
        total_processed = sum(
            r.get("items_processed", 0) 
            for results in results_by_phase.values() 
            for r in results
        )
        
        total_errors = sum(
            len(r.get("errors", [])) 
            for results in results_by_phase.values() 
            for r in results
        )
        
        return {
            "status": "completed",
            "start_time": start_time,
            "end_time": end_time,
            "total_agents_run": len(self.agents),
            "total_items_processed": total_processed,
            "total_errors": total_errors,
            "by_phase": results_by_phase,
            "execution_log": self.execution_log
        }

_orchestrator = None

def get_orchestrator() -> Orchestrator:
    """Get or create global orchestrator"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator
