"""
backend/agents/base_agent.py
Base agent class - all agents inherit from this
"""

import json
from datetime import datetime
from abc import ABC, abstractmethod
from typing import Optional, Dict, List, Any
from utils.llm import call_groq_json
from utils.supabase_client import supabase_post


class BaseAgent(ABC):
    """Base class for all GTM360 agents"""
    
    def __init__(self, name: str, phase: int, table_name: str):
        self.name = name
        self.phase = phase
        self.table_name = table_name
        self.created_at = datetime.now().isoformat() + "Z"
        self.run_status = "pending"
        self.error_log = []
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return system prompt for this agent"""
        pass
    
    @abstractmethod
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch input data for this agent"""
        pass
    
    @abstractmethod
    def process_item(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single item and return result"""
        pass
    
    @abstractmethod
    def save_result(self, item: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """Save result to database"""
        pass
    
    def log_error(self, item_id: str, error: str):
        """Log an error for this run"""
        self.error_log.append({
            "item_id": item_id,
            "error": error,
            "timestamp": datetime.now().isoformat() + "Z"
        })
    
    def run(self) -> Dict[str, Any]:
        """Execute agent - fetch data, process, save results"""
        try:
            self.run_status = "running"
            print(f"[{self.name}] Starting...")
            
            items = self.fetch_data()
            if not items:
                print(f"[{self.name}] No data to process")
                self.run_status = "completed"
                return {
                    "status": "success",
                    "agent": self.name,
                    "items_processed": 0,
                    "errors": []
                }
            
            processed_count = 0
            for item in items:
                try:
                    result = self.process_item(item)
                    if result and result.get("status") != "error":
                        if self.save_result(item, result):
                            processed_count += 1
                except Exception as e:
                    item_id = item.get("id") or item.get("deal_id") or item.get("customer_id") or "unknown"
                    self.log_error(item_id, str(e))
                    print(f"[{self.name}] Error processing {item_id}: {e}")
            
            self.run_status = "completed"
            
            print(f"[{self.name}] Completed: {processed_count}/{len(items)} processed")
            
            return {
                "status": "success",
                "agent": self.name,
                "items_processed": processed_count,
                "total_items": len(items),
                "errors": self.error_log if self.error_log else []
            }
        
        except Exception as e:
            self.run_status = "failed"
            print(f"[{self.name}] FAILED: {e}")
            return {
                "status": "error",
                "agent": self.name,
                "error": str(e),
                "errors": self.error_log
            }
    
    def call_llm(self, prompt: str, max_tokens: int = 800) -> Dict[str, Any]:
        """Call LLM with this agent's system prompt"""
        return call_groq_json(
            prompt=prompt,
            system=self.get_system_prompt(),
            max_tokens=max_tokens,
            temperature=0.7
        )
    
    def create_escalation(self, escalation_type: str, description: str, decision_needed: str) -> bool:
        """Create an escalation record"""
        try:
            supabase_post("escalations", {
                "raised_by": self.name,
                "escalation_type": escalation_type,
                "description": description,
                "decision_needed": decision_needed,
                "status": "open",
                "created_at": self.created_at
            })
            return True
        except Exception as e:
            print(f"[{self.name}] Failed to create escalation: {e}")
            return False
