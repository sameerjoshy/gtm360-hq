from abc import ABC, abstractmethod
from datetime import datetime

class BaseAgent(ABC):
    """Abstract base class for all agents"""
    
    def __init__(self, name: str, config: dict = None):
        self.name = name
        self.config = config or {}
        self.confidence = 0.7
    
    @abstractmethod
    def run(self, customer_id: str) -> dict:
        pass
    
    def log(self, message: str):
        print(f"[{self.name}] {message}")
