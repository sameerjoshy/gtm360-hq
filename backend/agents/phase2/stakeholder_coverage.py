"""
backend/agents/phase2/stakeholder_coverage.py
Stakeholder Coverage Agent - analyzes stakeholder engagement and coverage
"""

import json
from typing import Optional, Dict, List, Any
from agents.base_agent import BaseAgent
from utils.supabase_client import supabase_post


class StakeholderCoverageAgent(BaseAgent):
    """Analyzes stakeholder engagement and coverage"""
    
    def __init__(self):
        super().__init__(
            name="Stakeholder Coverage",
            phase=2,
            table_name="stakeholder_coverage"
        )
    
    def get_system_prompt(self) -> str:
        return """You are a Stakeholder Coverage Agent.
Assess stakeholder coverage: {"coverage_score":6,"gaps":["CTO","VP Ops"],"actions":["engage CTO"]}
Identify gaps in stakeholder engagement and recommend actions."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch accounts for stakeholder analysis - mock for MVP"""
        return [
            {
                "account_id": "acc_001",
                "customer_name": "Acme Corp",
                "known_stakeholders": ["CEO", "VP Finance"],
                "identified_stakeholders": ["CTO", "VP Ops"]
            }
        ]
    
    def process_item(self, account: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Assess stakeholder coverage for an account"""
        prompt = f"""Account: {account['customer_name']}, Known: {','.join(account['known_stakeholders'])}, Gaps: {','.join(account['identified_stakeholders'])}. Assess coverage."""
        
        return self.call_llm(prompt, max_tokens=200)
    
    def save_result(self, account: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save stakeholder coverage assessment to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("stakeholder_coverage", {
                "account_id": account["account_id"],
                "customer_name": account["customer_name"],
                "coverage_score": result.get("coverage_score", 5),
                "gaps": json.dumps(result.get("gaps", [])),
                "created_at": self.created_at
            })
            
            score = result.get("coverage_score", '?')
            print(f"[COVERAGE] {account['customer_name']} — Score: {score}/10")
            return True
        except Exception as e:
            self.log_error(account["account_id"], str(e))
            return False
