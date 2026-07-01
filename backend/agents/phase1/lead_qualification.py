"""
backend/agents/phase1/lead_qualification.py
Lead Qualification Agent - scores inbound leads, routes to Sameer if high-value
"""

from datetime import datetime
from typing import Optional, Dict, List, Any
from backend.agents.base_agent import BaseAgent
from backend.utils.supabase_client import supabase_post


class LeadQualificationAgent(BaseAgent):
    """Qualifies inbound leads and routes hot prospects"""
    
    def __init__(self):
        super().__init__(
            name="Lead Qualification",
            phase=1,
            table_name="lead_qualifications"
        )
    
    def get_system_prompt(self) -> str:
        return """You are a Lead Qualification Agent for GTM360.
Analyze the lead's message. Score them on:
1. ICP fit (10=perfect, 0=no fit) — B2B SaaS, 10-500 employees, $1M-$100M ARR
2. Budget signal (10=clear budget, 0=no signal)
3. Urgency (10=high, 0=low)
4. Authority (10=decision maker, 0=not)

Average = qualification_score.
If score >= 7: route to Sameer immediately.

Output ONLY JSON:
{"name":"string","company":"string","qualification_score":8.5,"should_route":true,"reason":"string"}"""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch inbound leads (mock data for MVP)"""
        # In production, this fetches from Gmail API
        return [
            {
                "email": "cro@revvana.com",
                "name": "Greg",
                "company": "revVana",
                "message": "Interested in GTM-360 advisory for our new revenue ops function. We're a 50-person B2B SaaS company looking to scale our GTM."
            },
            {
                "email": "vp@acme.io",
                "name": "Sarah",
                "company": "Acme",
                "message": "Your LinkedIn post caught my eye. We need help with our sales process."
            }
        ]
    
    def process_item(self, lead: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Qualify a single lead"""
        prompt = f"""Lead Email: {lead['email']}
Name: {lead['name']}
Company: {lead['company']}
Message: {lead['message']}

Qualify this lead."""
        
        return self.call_llm(prompt, max_tokens=300)
    
    def save_result(self, lead: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save qualification result to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("lead_qualifications", {
                "lead_email": lead["email"],
                "lead_name": result.get("name"),
                "company_domain": f"{lead['company'].lower().replace(' ', '')}.com",
                "discovery_responses": {"message": lead["message"]},
                "qualification_score": result.get("qualification_score"),
                "routed_to_sameer": result.get("should_route", False),
                "created_at": self.created_at
            })
            
            if result.get("should_route"):
                print(f"[ROUTED] {result.get('name')} from {lead['company']} — Score: {result.get('qualification_score')}")
                self.create_escalation(
                    escalation_type="qualified_lead",
                    description=f"{result.get('reason')}",
                    decision_needed="Schedule discovery call"
                )
            else:
                print(f"[NURTURE] {result.get('name')} — Score: {result.get('qualification_score')}")
            
            return True
        except Exception as e:
            self.log_error(lead["email"], str(e))
            return False
