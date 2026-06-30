class HubSpotClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
    
    def get_deals(self, customer_id: str):
        return {"deals": []}
    
    def get_contacts(self, customer_id: str):
        return {"contacts": []}
    
    def sync_data(self, customer_id: str):
        pass

hubspot = HubSpotClient()
