import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DEBUG = ENVIRONMENT == "development"
    
    # Database
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    # APIs
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GROQ_MODEL = "llama-3.3-70b-versatile"
    GROQ_BASE_URL = "https://api.groq.com/openai/v1"
    
    HUBSPOT_API_KEY = os.getenv("HUBSPOT_API_KEY")
    SERPER_API_KEY = os.getenv("SERPER_API_KEY")
    
    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-key-change-in-production")
    
    # Agent configuration
    AGENTS_ENABLED = [
        "lead_qual", "prospect_pulse", "market_trends",
        "deal_risk", "deal_review", "comp_intel",
        "early_health", "onboarding", "support_triage", "ae_cs_handover",
        "churn_risk", "renewal", "upsell_signal", "ebr_prep", "advocacy", "coverage"
    ]
    
    @classmethod
    def validate(cls):
        required = ["SUPABASE_URL", "SUPABASE_KEY", "GROQ_API_KEY"]
        missing = [k for k in required if not getattr(cls, k)]
        if missing:
            raise ValueError(f"Missing required config: {missing}")
