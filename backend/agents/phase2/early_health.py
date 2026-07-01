"""
backend/agents/phase2/early_health.py
Early Health Agent - monitors health of new customers during onboarding
"""

from typing import Optional, Dict, List, Any
from agents.base_agent import BaseAgent
from utils.supabase_client import supabase_post


class EarlyHealthAgent(BaseAgent):
    """Monitors health of customers in first 90 days"""
    
    def __init__(self):
        super().__init__(
            name="Early Health",
            phase=2,
            table_name="early_health_checks"
        )
    
    def get_system_prompt(self) -> str:
        return """You are an Early Health Agent.
Assess new customer health: {"health_score":7,"risk_level":"low","actions":["action1"]}
Consider onboarding completion, support tickets, feature adoption, sentiment."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch customers in first 90 days - mock for MVP"""
        return [
            {
                "customer_id": "cust_acme",
                "customer_name": "Acme Corp",
                "days_since_start": 25,
                "onboarding_complete": 0.6,
                "support_tickets": 3,
                "feature_adoption": 0.5
            }
        ]
    
    def process_item(self, customer: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Assess health for a customer"""
        if customer.get("days_since_start", 0) > 90:
            return None
        
        prompt = f"""Customer: {customer['customer_name']}, Days: {customer['days_since_start']}, Onboarding: {customer['onboarding_complete']*100:.0f}%, Adoption: {customer['feature_adoption']*100:.0f}%. Assess health."""
        
        return self.call_llm(prompt, max_tokens=200)
    
    def save_result(self, customer: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save health check to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("early_health_checks", {
                "customer_id": customer["customer_id"],
                "customer_name": customer["customer_name"],
                "health_score": result.get("health_score", 5),
                "risk_level": result.get("risk_level", "medium"),
                "check_date": self.created_at
            })
            
            score = result.get("health_score", '?')
            print(f"[HEALTH] {customer['customer_name']} — Score: {score}/10")
            return True
        except Exception as e:
            self.log_error(customer["customer_id"], str(e))
            return False
