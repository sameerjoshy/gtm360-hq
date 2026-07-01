"""
backend/agents/phase3/advocacy.py
Advocacy Agent - identifies and activates customer advocates
"""

from datetime import datetime
from typing import Optional, Dict, List, Any
from backend.agents.base_agent import BaseAgent
from backend.utils.supabase_client import supabase_post


class AdvocacyAgent(BaseAgent):
    """Identifies and activates customer advocates"""
    
    def __init__(self):
        super().__init__(
            name="Advocacy",
            phase=3,
            table_name="advocacy"
        )
    
    def get_system_prompt(self) -> str:
        return """You are an Advocacy Agent. Output ONLY valid JSON.
Identify advocates: {"advocacy_score":9,"advocate_tier":"champion/promoter/supporter","recommended_ask":"case_study/testimonial/reference_call","pitch":"brief reason"}
Consider: NPS, health score, tenure, use case success."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch satisfied customers for advocacy - mock for MVP"""
        return [
            {
                "customer_id": "cust_acme",
                "customer_name": "Acme Corp",
                "nps_score": 9,
                "health_score": 9,
                "arr": 60000,
                "executive_sponsor": "Jane Smith (CRO)",
                "tenure_months": 18,
                "use_case_success": "Achieved 40% forecast accuracy improvement"
            },
            {
                "customer_id": "cust_revvana",
                "customer_name": "revVana",
                "nps_score": 8,
                "health_score": 8,
                "arr": 50000,
                "executive_sponsor": "Greg Lee (VP GTM)",
                "tenure_months": 12,
                "use_case_success": "Scaled GTM from 3 to 25 people in 6 months"
            }
        ]
    
    def process_item(self, customer: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Identify advocacy opportunity for a customer"""
        # Skip if not a promoter
        if customer["nps_score"] < 7 or customer["health_score"] < 7:
            return None
        
        prompt = f"""Customer: {customer['customer_name']}, NPS: {customer['nps_score']}, Health: {customer['health_score']}, ARR: ${customer['arr']:,.0f}, Sponsor: {customer['executive_sponsor']}, Success: {customer['use_case_success']}. Is this customer a potential advocate?"""
        
        return self.call_llm(prompt, max_tokens=200)
    
    def save_result(self, customer: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save advocacy assessment to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("advocacy", {
                "customer_id": customer["customer_id"],
                "customer_name": customer["customer_name"],
                "advocacy_score": result.get("advocacy_score", 0),
                "advocate_tier": result.get("advocate_tier", "supporter"),
                "recommended_ask": result.get("recommended_ask", "none"),
                "pitch": result.get("pitch", ""),
                "created_at": self.created_at
            })
            
            tier = result.get("advocate_tier", "supporter")
            if tier in ["champion", "promoter"]:
                self.create_escalation(
                    escalation_type="customer_advocate",
                    description=f"{customer['customer_name']} ({tier}): {result.get('pitch')}",
                    decision_needed=f"Activate for {result.get('recommended_ask')}"
                )
                print(f"[CHAMPION] {customer['customer_name']} — Tier: {tier}")
            else:
                print(f"[SUPPORTER] {customer['customer_name']} — Tier: {tier}")
            
            return True
        except Exception as e:
            self.log_error(customer["customer_id"], str(e))
            return False
