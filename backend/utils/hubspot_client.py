import requests
import os
from typing import List, Dict, Any

class HubSpotClient:
    def __init__(self):
        self.api_key = os.getenv("HUBSPOT_API_KEY")
        self.base_url = "https://api.hubapi.com"
        if not self.api_key:
            raise ValueError("HUBSPOT_API_KEY not set")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def get_deals(self, limit: int = 50) -> List[Dict]:
        url = f"{self.base_url}/crm/v3/objects/deals"
        params = {
            "limit": limit,
            "properties": ["dealname", "dealstage", "amount", "closedate"]
        }
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json().get("results", [])
        except Exception as e:
            print(f"HubSpot error: {e}")
            return []
    
    def get_contacts(self, limit: int = 50) -> List[Dict]:
        url = f"{self.base_url}/crm/v3/objects/contacts"
        params = {
            "limit": limit,
            "properties": ["firstname", "lastname", "email", "lifecyclestage", "hs_lead_status"]
        }
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            results = response.json().get("results", [])
            return [{"id": r["id"], "firstname": r["properties"].get("firstname"), "lastname": r["properties"].get("lastname"), "email": r["properties"].get("email"), "lifecyclestage": r["properties"].get("lifecyclestage"), "lead_status": r["properties"].get("hs_lead_status")} for r in results]
        except Exception as e:
            print(f"HubSpot error: {e}")
            return []
