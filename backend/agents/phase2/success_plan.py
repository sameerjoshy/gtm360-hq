"""
backend/agents/phase2/success_plan.py
Success Plan Agent - creates 90-day success plans for new customers
"""

import json
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from backend.agents.base_agent import BaseAgent
from backend.utils.supabase_client import supabase_post


class SuccessPlanAgent(BaseAgent):
    """Creates success plans for newly onboarded customers"""
    
    def __init__(self):
        super().__init__(
            name="Success Plan",
            phase=2,
            table_name="success_plans"
        )
    
    def get_system_prompt(self) -> str:
        return """You are a Success Plan Agent.
For a newly onboarded customer, create a 90-day success plan.
Output ONLY JSON:
{"milestones":["week 1 goal","week 2 goal","week 4 goal","week 8 goal","week 12 goal"],"metrics":["metric1","metric2"],"risks":["risk1"],"actions":["action1","action2"]}"""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch recently closed deals (last 7 days) - mock for MVP"""
        # In production, this would query HubSpot for newly closed deals
        now = datetime.now()
        two_days_ago = (now - timedelta(days=2)).isoformat()
        
        return [
            {
                "customer_name": "revVana",
                "customer_id": "cust_revvana",
                "contract_value": 50000,
                "use_case": "Revenue ops transformation for 50-person team",
                "start_date": two_days_ago
            }
        ]
    
    def process_item(self, customer: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create success plan for a customer"""
        prompt = f"""Customer: {customer['customer_name']}, Value: ${customer['contract_value']:,.0f}, Use Case: {customer['use_case']}. Create 90-day plan."""
        
        return self.call_llm(prompt, max_tokens=300)
    
    def save_result(self, customer: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save success plan to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("success_plans", {
                "customer_id": customer["customer_id"],
                "customer_name": customer["customer_name"],
                "plan_90_day": json.dumps(result),
                "status": "active",
                "created_at": self.created_at
            })
            
            print(f"[PLAN] {customer['customer_name']} — 90-day plan created")
            return True
        except Exception as e:
            self.log_error(customer["customer_id"], str(e))
            return False
