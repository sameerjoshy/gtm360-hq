"""
backend/agents/phase3/renewal.py
Renewal Agent - manages contract renewals and identifies at-risk renewals
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from backend.agents.base_agent import BaseAgent
from backend.utils.supabase_client import supabase_post


class RenewalAgent(BaseAgent):
    """Manages contract renewals and identifies renewal risks"""
    
    def __init__(self):
        super().__init__(
            name="Renewal",
            phase=3,
            table_name="renewals"
        )
    
    def get_system_prompt(self) -> str:
        return """You are a Renewal Agent. Output ONLY valid JSON.
Assess renewal: {"renewal_confidence":"high/medium/low","risk_level":"low/medium/high","recommended_action":"schedule_ebr/intervention"}
Consider: contract anniversary, NPS, health score, business review frequency."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch contracts approaching renewal - mock for MVP"""
        renewal_date_1 = (datetime.now() + timedelta(days=90)).date().isoformat()
        renewal_date_2 = (datetime.now() + timedelta(days=120)).date().isoformat()
        last_review_1 = (datetime.now() - timedelta(days=60)).isoformat()
        last_review_2 = (datetime.now() - timedelta(days=200)).isoformat()
        
        return [
            {
                "contract_id": "con_001",
                "customer_name": "Acme Corp",
                "current_arr": 60000,
                "renewal_date": renewal_date_1,
                "nps_score": 8,
                "health_score": 7,
                "last_business_review": last_review_1
            },
            {
                "contract_id": "con_002",
                "customer_name": "TechCo",
                "current_arr": 30000,
                "renewal_date": renewal_date_2,
                "nps_score": 4,
                "health_score": 3,
                "last_business_review": last_review_2
            }
        ]
    
    def process_item(self, contract: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Assess renewal for a contract"""
        try:
            renewal_days = (datetime.fromisoformat(contract["renewal_date"]) - datetime.now()).days
        except:
            renewal_days = 120
        
        prompt = f"""Contract: {contract['contract_id']}, Customer: {contract['customer_name']}, ARR: ${contract['current_arr']:,.0f}, Days to Renewal: {renewal_days}, NPS: {contract['nps_score']}, Health: {contract['health_score']}/10. Assess renewal risk."""
        
        return self.call_llm(prompt, max_tokens=200)
    
    def save_result(self, contract: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save renewal assessment to database"""
        if result.get("status") == "error":
            return False
        
        try:
            renewal_days = (datetime.fromisoformat(contract["renewal_date"]) - datetime.now()).days
            risk = result.get("risk_level", "medium")
            
            supabase_post("renewals", {
                "contract_id": contract["contract_id"],
                "customer_name": contract["customer_name"],
                "arr": contract["current_arr"],
                "renewal_date": contract["renewal_date"],
                "renewal_confidence": result.get("renewal_confidence", "medium"),
                "risk_level": risk,
                "recommended_action": result.get("recommended_action", "monitor"),
                "created_at": self.created_at
            })
            
            if risk == "high":
                self.create_escalation(
                    escalation_type="renewal_at_risk",
                    description=f"{contract['customer_name']}: Renewal in {renewal_days}d. Risk: {risk}",
                    decision_needed=result.get("recommended_action", "monitor")
                )
                print(f"[AT RISK] {contract['customer_name']} — {renewal_days}d to renewal")
            else:
                print(f"[HEALTHY] {contract['customer_name']} — {renewal_days}d to renewal")
            
            return True
        except Exception as e:
            self.log_error(contract["contract_id"], str(e))
            return False
