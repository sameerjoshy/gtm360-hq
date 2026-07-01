"""
backend/agents/phase1/competitive_intel.py
Competitive Intel Agent - gathers market intelligence on prospects
"""

import json
import urllib.request
import urllib.error
from typing import Optional, Dict, List, Any
from datetime import datetime
from backend.agents.base_agent import BaseAgent
from backend.utils.supabase_client import supabase_get, supabase_post

SERPER_API_KEY = "0d2dd80fc07e77c0ea7e1f51f0ff0a56b215bcf7"


class CompetitiveIntelAgent(BaseAgent):
    """Gathers competitive intelligence on prospects"""
    
    def __init__(self):
        super().__init__(
            name="Competitive Intel",
            phase=1,
            table_name="competitive_intel"
        )
    
    def get_system_prompt(self) -> str:
        return """You are a Competitive Intel Agent.
Analyze the competitor landscape for a prospect.
Look for: competitors, pricing strategy, funding/hiring, sentiment, weaknesses.

Output JSON with 3-5 key insights.
{"insights":["insight1","insight2"],"competitors":["comp1"],"opportunities":["opp1"]}"""
    
    def fetch_serper_news(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Fetch news from Serper API"""
        url = "https://google.serper.dev/news"
        payload = json.dumps({"q": query, "num": limit})
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, data=payload.encode(), headers=headers, method="POST")
        
        try:
            with urllib.request.urlopen(req) as res:
                data = json.loads(res.read().decode())
                results = []
                for item in data.get("news", []):
                    results.append({
                        "title": item.get("title", ""),
                        "source": item.get("source", ""),
                        "date": item.get("date", "")
                    })
                return results
        except Exception as e:
            print(f"[WARNING] Serper failed for '{query}': {e}")
            return []
    
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch live deals to analyze"""
        return supabase_get("pipeline_snapshot", "?gtm360_record_type=eq.Live&limit=5")
    
    def process_item(self, deal: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Gather intel on a single company"""
        company_domain = deal.get("company_domain")
        if not company_domain:
            return None
        
        # Fetch news about this company
        query = f"{deal.get('company_name')} competitors funding pricing"
        serper_results = self.fetch_serper_news(query, limit=5)
        
        if not serper_results:
            return None
        
        prompt = f"""Company: {deal.get('company_name')}

News/Public Intelligence:
{json.dumps(serper_results, indent=2)}

Analyze competitive landscape. What's GTM360's angle?"""
        
        return self.call_llm(prompt, max_tokens=400)
    
    def save_result(self, deal: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save intelligence to database"""
        if result.get("status") == "error":
            return False
        
        try:
            company_domain = deal.get("company_domain")
            
            supabase_post("competitive_intel", {
                "company_domain": company_domain,
                "competitor_name": deal.get("company_name"),
                "intel_source": "serper_news",
                "intel_text": json.dumps(result),
                "intel_date": self.created_at
            })
            
            print(f"[INTEL] {deal.get('company_name')} analyzed")
            return True
        except Exception as e:
            self.log_error(deal.get("company_domain", "unknown"), str(e))
            return False
