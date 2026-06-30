from flask import Blueprint, jsonify, request
from auth import require_auth, get_customer_id

agent_bp = Blueprint("agents", __name__)

@agent_bp.route("/run", methods=["POST"])
@require_auth
def run_agent():
    customer_id = get_customer_id()
    data = request.json
    agent_name = data.get("agent")
    
    if not agent_name:
        return jsonify({"error": "Missing agent name"}), 400
    
    return jsonify({
        "status": "initiated",
        "agent": agent_name,
        "customer_id": customer_id
    }), 202

@agent_bp.route("/status", methods=["GET"])
@require_auth
def agent_status():
    return jsonify({
        "agents": {
            "lead_qual": {"status": "ready", "last_run": None},
            "deal_risk": {"status": "ready", "last_run": None},
        }
    }), 200
