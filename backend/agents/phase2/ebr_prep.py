"""
backend/agents/phase2/ebr_prep.py
EBR Prep Agent - prepares executive business reviews
"""

import json
from typing import Optional, Dict, List, Any
from backend.agents.base_agent import BaseAgent
from backend.utils.supabase_client import supabase_post


class EBRPrepAgent(BaseAgent):
    """Prepares executive business reviews"""
    
    def __init__(self):
        super().__init__(
            name="EBR Prep",
            phase=2,
            table_name="ebr_preps"
        )
    
    def get_system_prompt(self) -> str:
        return """You are an EBR Prep Agent.
Prepare EBR agenda: {"outcomes":["outcome1"],"kpis":["kpi1"],"expansion_opp":"upsell"}
Focus on customer business outcomes, ROI, strategic alignment, expansion opportunities."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch accounts ready for EBR - mock for MVP"""
        return [
            {
                "account_id": "acc_001",
                "customer_name": "Acme Corp",
                "annual_contract_value": 50000,
                "quarter": "Q2 2026",
                "last_ebr_date": "2026-03-15"
            }
        ]
    
    def process_item(self, account: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Prepare EBR agenda for an account"""
        prompt = f"""Account: {account['customer_name']}, ACV: ${account['annual_contract_value']:,.0f}, Quarter: {account['quarter']}. Prepare EBR agenda."""
        
        return self.call_llm(prompt, max_tokens=250)
    
    def save_result(self, account: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save EBR prep to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("ebr_preps", {
                "account_id": account["account_id"],
                "customer_name": account["customer_name"],
                "quarter": account["quarter"],
                "ebr_agenda": json.dumps(result),
                "created_at": self.created_at
            })
            
            print(f"[EBR] {account['customer_name']} — Agenda prepared for {account['quarter']}")
            return True
        except Exception as e:
            self.log_error(account["account_id"], str(e))
            return False
