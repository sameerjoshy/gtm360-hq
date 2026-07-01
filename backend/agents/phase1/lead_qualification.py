from agents.base_agent import BaseAgent
from utils.hubspot_client import HubSpotClient
from typing import List, Dict, Any, Optional
import requests

class LeadQualificationAgent(BaseAgent):
    def __init__(self):
        super().__init__("lead_qualification", 1, "lead_qualifications")
        self.hubspot = HubSpotClient()
    
    def get_system_prompt(self) -> str:
        return "You are a lead scoring expert. Score leads 0-1 based on fit and engagement."
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        return self.hubspot.get_contacts(limit=10)
    
    def process_item(self, contact: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        score = self._score_lead(contact)
        return {
            "lead_id": contact["id"],
            "name": f"{contact.get('firstname', '')} {contact.get('lastname', '')}",
            "email": contact["email"],
            "score": round(score, 2),
            "hot_flag": score >= 0.75
        }
    
    def save_result(self, contact: Dict[str, Any], result: Dict[str, Any]) -> bool:
        if result["hot_flag"]:
            try:
                requests.post("http://localhost:5000/api/escalations/create", json={
                    "agent_name": "lead_qualification",
                    "escalation_type": "hot_lead",
                    "severity": "high",
                    "entity_id": result["lead_id"],
                    "data": result
                })
            except Exception as e:
                self.logger.error(f"Escalation failed: {e}")
        return True
    
    def _score_lead(self, contact):
        score = 0.0
        if contact.get("lifecyclestage") == "subscriber":
            score += 0.3
        if contact.get("lead_status") == "qualified":
            score += 0.5
        if contact.get("email"):
            score += 0.2
        return score
