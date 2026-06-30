from flask import Blueprint, jsonify, request
from auth import require_auth, get_customer_id

escalation_bp = Blueprint("escalations", __name__)

@escalation_bp.route("/", methods=["GET"])
@require_auth
def list_escalations():
    customer_id = get_customer_id()
    return jsonify({
        "escalations": [],
        "total": 0
    }), 200

@escalation_bp.route("/<escalation_id>/mark_done", methods=["POST"])
@require_auth
def mark_done(escalation_id):
    customer_id = get_customer_id()
    return jsonify({"status": "marked_done"}), 200

@escalation_bp.route("/<escalation_id>/false_alarm", methods=["POST"])
@require_auth
def false_alarm(escalation_id):
    customer_id = get_customer_id()
    return jsonify({"status": "marked_false_alarm"}), 200
