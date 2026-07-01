"""
backend/agents/phase1/deal_review.py
Deal Review Agent - assesses deal health via MEDDIC scoring
"""

import json
from typing import Optional, Dict, List, Any
from datetime import date
from backend.agents.base_agent import BaseAgent
from backend.utils.supabase_client import supabase_get, supabase_post


class DealReviewAgent(BaseAgent):
    """Reviews deals and scores MEDDIC completeness"""
    
    def __init__(self):
        super().__init__(
            name="Deal Review",
            phase=1,
            table_name="deal_reviews"
        )
    
    def get_system_prompt(self) -> str:
        return """You are a Deal Review Agent.
For each deal, assess:
1. MEDDIC completeness (1-10)
2. Deal progression
3. Red flags
4. Next critical action

Output JSON with deal review.
{"meddic_score":8,"progression":"on_track","red_flags":["flag1"],"next_action":"action"}"""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch top deals by value"""
        return supabase_get("pipeline_snapshot", "?gtm360_record_type=eq.Live&order=amount.desc&limit=5")
    
    def process_item(self, deal: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Review a single deal"""
        prompt = f"""Deal: {deal.get('deal_name')}
Company: {deal.get('company_name')}
Stage: {deal.get('stage')}
Value: ${float(deal.get('amount') or 0):,.0f}
Days in Stage: {deal.get('days_in_stage', 0)}
Contact: {deal.get('contact_name', 'Unknown')}
Close Date: {deal.get('close_date', 'Not set')}

Review this deal. Score MEDDIC. Flag risks."""
        
        return self.call_llm(prompt, max_tokens=400)
    
    def save_result(self, deal: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save deal review to database"""
        if result.get("status") == "error":
            return False
        
        try:
            today = date.today().isoformat()
            
            supabase_post("deal_reviews", {
                "deal_id": deal.get("deal_id"),
                "deal_name": deal.get("deal_name"),
                "company_name": deal.get("company_name"),
                "review_date": today,
                "meddic_score": result.get("meddic_score", 0),
                "review_text": json.dumps(result),
                "status": "ready"
            })
            
            meddic = result.get("meddic_score", '?')
            print(f"[REVIEW] {deal.get('deal_name')} — MEDDIC: {meddic}/10")
            return True
        except Exception as e:
            self.log_error(deal.get("deal_id", "unknown"), str(e))
            return False
