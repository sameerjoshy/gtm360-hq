"""
backend/agents/phase1/deal_risk.py
Deal Risk Agent - detects engagement gaps and flags at-risk deals
"""

from datetime import datetime, date
from typing import Optional, Dict, List, Any
from backend.agents.base_agent import BaseAgent
from backend.utils.supabase_client import supabase_get, supabase_post


class DealRiskAgent(BaseAgent):
    """Identifies deals at risk due to engagement gaps"""
    
    def __init__(self):
        super().__init__(
            name="Deal Risk",
            phase=1,
            table_name="deal_risks"
        )
    
    def get_system_prompt(self) -> str:
        return """You are a Deal Risk Agent.
Given deal data and last activity date, assess risk:
1. Days since last activity
2. Deal value (high value = more urgent)
3. Stage progression
4. Recommendation

Output risk level: low/medium/high/critical
Recommend action to re-engage or move to hold.

Output ONLY JSON:
{"risk_level":"low/medium/high/critical","recommendation":"string"}"""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch live deals from Supabase"""
        return supabase_get("pipeline_snapshot", "?gtm360_record_type=eq.Live")
    
    def process_item(self, deal: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Assess risk for a single deal"""
        today = date.today()
        
        last_activity = deal.get("last_activity_date")
        if not last_activity:
            return None
        
        try:
            last_date = datetime.fromisoformat(last_activity.split("T")[0]).date()
            days_gap = (today - last_date).days
        except:
            return None
        
        # Skip healthy deals (activity in last 7 days)
        if days_gap < 7:
            return None
        
        prompt = f"""Deal: {deal.get('deal_name')}
Company: {deal.get('company_name')}
Stage: {deal.get('stage')}
Value: ${float(deal.get('amount') or 0):,.0f}
Days Since Activity: {days_gap}

Assess risk and recommend action."""
        
        return self.call_llm(prompt, max_tokens=300)
    
    def save_result(self, deal: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save risk assessment to database"""
        if result.get("status") == "error":
            return False
        
        try:
            today = date.today()
            last_activity = deal.get("last_activity_date")
            last_date = datetime.fromisoformat(last_activity.split("T")[0]).date()
            days_gap = (today - last_date).days
            
            risk_level = result.get("risk_level", "medium")
            
            supabase_post("deal_risks", {
                "deal_id": deal.get("deal_id"),
                "company_name": deal.get("company_name"),
                "engagement_gap_days": days_gap,
                "risk_level": risk_level,
                "last_activity": last_activity,
                "escalated": risk_level in ["high", "critical"]
            })
            
            if risk_level in ["high", "critical"]:
                self.create_escalation(
                    escalation_type="deal_risk",
                    description=f"{deal.get('deal_name')}: {days_gap}d gap. Risk: {risk_level}.",
                    decision_needed="Re-engage or move to hold"
                )
                print(f"[{risk_level.upper()}] {deal.get('deal_name')} — {days_gap}d gap")
            else:
                print(f"[{risk_level.upper()}] {deal.get('deal_name')} — {days_gap}d gap (watch)")
            
            return True
        except Exception as e:
            self.log_error(deal.get("deal_id", "unknown"), str(e))
            return False
