"""
backend/agents/phase2/churn_risk.py
Churn Risk Agent - identifies customers at risk of churning
"""

from typing import Optional, Dict, List, Any
from agents.base_agent import BaseAgent
from utils.supabase_client import supabase_post


class ChurnRiskAgent(BaseAgent):
    """Identifies customers at risk of churn"""
    
    def __init__(self):
        super().__init__(
            name="Churn Risk",
            phase=2,
            table_name="churn_risks"
        )
    
    def get_system_prompt(self) -> str:
        return """You are a Churn Risk Agent.
Assess churn risk: {"churn_risk_score":8,"flagged":true,"intervention":"urgent"}
Consider: engagement gaps, NPS score, support sentiment, contract anniversary."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch customer accounts for churn analysis - mock for MVP"""
        return [
            {
                "customer_id": "cust_acme",
                "customer_name": "Acme Corp",
                "mrr": 5000,
                "days_since_last_engagement": 30,
                "nps_score": 5,
                "support_sentiment": "frustrated"
            }
        ]
    
    def process_item(self, customer: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Assess churn risk for a customer"""
        prompt = f"""Customer: {customer['customer_name']}, MRR: ${customer['mrr']:,.0f}, Engagement Gap: {customer['days_since_last_engagement']}d, NPS: {customer['nps_score']}, Sentiment: {customer['support_sentiment']}. Assess churn risk."""
        
        return self.call_llm(prompt, max_tokens=150)
    
    def save_result(self, customer: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save churn risk assessment to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("churn_risks", {
                "customer_id": customer["customer_id"],
                "customer_name": customer["customer_name"],
                "churn_risk_score": result.get("churn_risk_score", 5),
                "flagged": result.get("flagged", False),
                "created_at": self.created_at
            })
            
            score = result.get("churn_risk_score", '?')
            if result.get("flagged"):
                print(f"[AT RISK] {customer['customer_name']} — Score: {score}/10")
                self.create_escalation(
                    escalation_type="churn_risk",
                    description=f"{customer['customer_name']}: Churn risk score {score}/10",
                    decision_needed="Schedule intervention call"
                )
            else:
                print(f"[HEALTHY] {customer['customer_name']} — Score: {score}/10")
            
            return True
        except Exception as e:
            self.log_error(customer["customer_id"], str(e))
            return False
