from supabase import create_client
import os

class SupabaseClient:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        self.client = create_client(url, key)
    
    def get_customer(self, customer_id: str):
        return self.client.table("customers").select("*").eq("customer_id", customer_id).single().execute()
    
    def insert_escalation(self, escalation: dict):
        return self.client.table("escalations").insert(escalation).execute()
    
    def get_escalations(self, customer_id: str):
        return self.client.table("escalations").select("*").eq("customer_id", customer_id).eq("status", "open").execute()

supabase = SupabaseClient()
