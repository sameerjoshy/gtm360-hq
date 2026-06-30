from flask import Blueprint, jsonify
from auth import require_auth, get_customer_id

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/summary", methods=["GET"])
@require_auth
def summary():
    customer_id = get_customer_id()
    return jsonify({
        "health_score": 72,
        "forecast_accuracy": 78,
        "risks_detected": 4,
        "actions_today": 3
    }), 200

@dashboard_bp.route("/pipeline", methods=["GET"])
@require_auth
def pipeline():
    customer_id = get_customer_id()
    return jsonify({
        "pipeline": {
            "leads": {"value": 500000, "count": 12},
            "discovery": {"value": 800000, "count": 4},
            "demo": {"value": 600000, "count": 3},
            "negotiation": {"value": 200000, "count": 2}
        }
    }), 200
