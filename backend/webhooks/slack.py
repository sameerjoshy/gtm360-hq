import requests
import os

class SlackNotifier:
    def __init__(self):
        self.webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    
    def send_alert(self, title, message, color="#808080"):
        if not self.webhook_url:
            return False
        payload = {"attachments": [{"title": title, "text": message, "color": color}]}
        try:
            requests.post(self.webhook_url, json=payload)
            return True
        except:
            return False
