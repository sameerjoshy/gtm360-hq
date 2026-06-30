import requests
import os

class SerperClient:
    def __init__(self):
        self.api_key = os.getenv("SERPER_API_KEY")
    
    def search_news(self, query: str, limit: int = 5):
        response = requests.post(
            "https://google.serper.dev/news",
            headers={
                "X-API-KEY": self.api_key,
                "Content-Type": "application/json"
            },
            json={"q": query, "num": limit}
        )
        response.raise_for_status()
        return response.json()

serper = SerperClient()
