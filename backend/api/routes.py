from flask import Blueprint, jsonify, request
from datetime import datetime
from auth import require_auth, get_customer_id
from api.agents import agents_bp
from api.escalations import escalation_bp
from api.dashboard import dashboard_bp

api_bp = Blueprint("api", __name__)

api_bp.register_blueprint(escalation_bp, url_prefix="/escalations")
api_bp.register_blueprint(dashboard_bp, url_prefix="/dashboard")

@api_bp.route("/status", methods=["GET"])
@require_auth
def status():
    return jsonify({
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "agents_available": 22,
        "version": "0.1.0"
    }), 200
