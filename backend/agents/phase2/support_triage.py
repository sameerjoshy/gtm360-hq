"""
backend/agents/phase2/support_triage.py
Support Triage Agent - categorizes support tickets and escalates critical issues
"""

from typing import Optional, Dict, List, Any
from datetime import datetime
from agents.base_agent import BaseAgent
from utils.supabase_client import supabase_post


class SupportTriageAgent(BaseAgent):
    """Triages support tickets and escalates critical issues"""
    
    def __init__(self):
        super().__init__(
            name="Support Triage",
            phase=2,
            table_name="support_triage"
        )
    
    def get_system_prompt(self) -> str:
        return """You are a Support Triage Agent.
Categorize support tickets by severity and escalation need.
Output JSON: {"severity":"low/medium/high/critical","category":"category","escalate_to":"team/none"}"""
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch support tickets - mock for MVP"""
        return [
            {
                "ticket_id": "SUP-001",
                "customer_name": "Acme",
                "subject": "System down - revenue report not generating",
                "priority_guess": "high",
                "created_at": datetime.now().isoformat()
            },
            {
                "ticket_id": "SUP-002",
                "customer_name": "TechCo",
                "subject": "Question about API integration",
                "priority_guess": "low",
                "created_at": datetime.now().isoformat()
            }
        ]
    
    def process_item(self, ticket: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Triage a single ticket"""
        prompt = f"""Ticket: {ticket['ticket_id']}, Customer: {ticket['customer_name']}, Subject: {ticket['subject']}, Initial Priority: {ticket['priority_guess']}. Triage this."""
        
        return self.call_llm(prompt, max_tokens=200)
    
    def save_result(self, ticket: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save triage result to database"""
        if result.get("status") == "error":
            return False
        
        try:
            supabase_post("support_triage", {
                "ticket_id": ticket["ticket_id"],
                "customer_name": ticket["customer_name"],
                "subject": ticket["subject"],
                "severity": result.get("severity", "medium"),
                "category": result.get("category", "general"),
                "escalate_to": result.get("escalate_to", "none"),
                "triaged_at": self.created_at
            })
            
            escalate_to = result.get("escalate_to", "none")
            if escalate_to != "none":
                print(f"[ESCALATE] {ticket['ticket_id']} → {escalate_to}")
            else:
                print(f"[TRIAGE] {ticket['ticket_id']} — {result.get('severity')}")
            
            return True
        except Exception as e:
            self.log_error(ticket["ticket_id"], str(e))
            return False
