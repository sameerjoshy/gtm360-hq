def load_customer_config(customer_id: str) -> dict:
    return {
        "customer_id": customer_id,
        "agents_enabled": ["lead_qual", "deal_risk", "churn_risk"],
        "thresholds": {
            "churn_risk": 7,
            "deal_risk": 6
        }
    }
