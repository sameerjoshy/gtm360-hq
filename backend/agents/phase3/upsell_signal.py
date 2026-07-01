"""
backend/agents/phase3/upsell_signal.py
Upsell Signal Agent - identifies expansion opportunities in existing accounts
"""

from typing import Optional, Dict, List, Any
from agents.base_agent import BaseAgent
from utils.supabase_client import supabase_post


class UpsellSignalAgent(BaseAgent):
    """Identifies expansion opportunities in existing accounts"""
    
    def __init__(self):
        super().__init__(
            name="Upsell Signal",
            phase=3,
            table_name="upsell_signals"
        )
    
    def get_system_prompt(self) -> str:
        return """You are an Upsell Signal Agent. Output ONLY valid JSON.
Identify upsell opportunities: {"upsell_opportunity":"yes/no","trigger":"user_growth/feature_adoption/usage","expansion_potential":8,"recommended_offer":"higher_tier"}
Consider: user growth, feature adoption, usage trends, support sentiment."""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch customer accounts for upsell analysis - mock for MVP"""
        return [
            {
                "account_id": "acc_acme",
                "customer_name": "Acme Corp",
                "current_mrr": 5000,
                "current_users": 50,
                "usage_growth": 0.35,
                "feature_adoption": 0.7,
                "support_sentiment": "very positive",
                "contract_anniversary": "2027-06-15"
            },
            {
                "account_id": "acc_revvana",
                "customer_name": "revVana",
                "current_mrr": 4000,
                "current_users": 30,
                "usage_growth": 0.25,
                "feature_adoption": 0.8,
                "support_sentiment": "positive",
                "contract_anniversary": "2027-08-30"
            }
        ]
    
    def process_item(self, account: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Identify upsell signals for an account"""
        prompt = f"""Account: {account['customer_name']}, MRR: ${account['current_mrr']}, Users: {account['current_users']}, Growth: {account['usage_growth']*100:.0f}%, Adoption: {account['feature_adoption']*100:.0f}%. Identify upsell signal."""
        
        return self.call_llm(prompt, max_tokens=200)
    
    def save_result(self, account: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save upsell signal to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("upsell_signals", {
                "account_id": account["account_id"],
                "customer_name": account["customer_name"],
                "upsell_opportunity": result.get("upsell_opportunity") == "yes",
                "trigger": result.get("trigger", "unknown"),
                "expansion_potential": result.get("expansion_potential", 0),
                "recommended_offer": result.get("recommended_offer", ""),
                "created_at": self.created_at
            })
            
            if result.get("upsell_opportunity") == "yes":
                potential = result.get("expansion_potential", '?')
                self.create_escalation(
                    escalation_type="upsell_opportunity",
                    description=f"{account['customer_name']}: {result.get('trigger')} signal. Potential: {potential}/10",
                    decision_needed="Schedule expansion conversation"
                )
                print(f"[UPSELL] {account['customer_name']} — Potential: {potential}/10")
            else:
                print(f"[MONITOR] {account['customer_name']} — No upsell signal yet")
            
            return True
        except Exception as e:
            self.log_error(account["account_id"], str(e))
            return False
