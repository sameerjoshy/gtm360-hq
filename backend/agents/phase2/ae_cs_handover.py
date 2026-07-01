"""
backend/agents/phase2/ae_cs_handover.py
AE→CS Handover Agent - ensures smooth handoff from sales to customer success
"""

import json
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from backend.agents.base_agent import BaseAgent
from backend.utils.supabase_client import supabase_post


class AECSHandoverAgent(BaseAgent):
    """Ensures smooth handoffs from sales to customer success"""
    
    def __init__(self):
        super().__init__(
            name="AE→CS Handover",
            phase=2,
            table_name="ae_cs_handovers"
        )
    
    def get_system_prompt(self) -> str:
        return """You are an AE→CS Handover Agent.
Assess readiness for handoff to CS: {"handover_ready":true,"gaps":["gap1"],"next_steps":["step1"]}
Check: customer contact info, success manager assigned, implementation plan, executive sponsor."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch recently closed deals - mock for MVP"""
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        
        return [
            {
                "deal_id": "deal_001",
                "customer_name": "revVana",
                "ae_name": "Sales Person",
                "contracted_value": 50000,
                "success_manager": "TBD",
                "close_date": yesterday
            }
        ]
    
    def process_item(self, deal: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Check handover readiness for a deal"""
        prompt = f"""Deal: {deal['deal_id']}, Customer: {deal['customer_name']}, Value: ${deal['contracted_value']:,.0f}, Manager: {deal['success_manager']}. Check handover readiness."""
        
        return self.call_llm(prompt, max_tokens=200)
    
    def save_result(self, deal: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save handover assessment to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("ae_cs_handovers", {
                "deal_id": deal["deal_id"],
                "customer_name": deal["customer_name"],
                "handover_ready": result.get("handover_ready", False),
                "gaps": json.dumps(result.get("gaps", [])),
                "created_at": self.created_at
            })
            
            if result.get("handover_ready"):
                print(f"[READY] {deal['customer_name']} — handover approved")
            else:
                print(f"[BLOCKED] {deal['customer_name']} — gaps exist")
            
            return True
        except Exception as e:
            self.log_error(deal["deal_id"], str(e))
            return False
