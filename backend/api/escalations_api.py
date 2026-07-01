import requests
import os
from flask import Blueprint, jsonify, request
from utils.supabase_client import supabase_request
from webhooks.slack import SlackNotifier

escalations_bp = Blueprint("escalations_api", __name__)
slack = SlackNotifier()

@escalations_bp.route("", methods=["GET"])
def get_escalations():
    """Fetch open escalations"""
    try:
        result = supabase_request("GET", "escalations?status=eq.open&order=created_at.desc&limit=50")
        escalations = result if isinstance(result, list) else []
        return jsonify({"escalations": escalations, "total": len(escalations)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@escalations_bp.route("/create", methods=["POST"])
def create_escalation():
    data = request.json
    agent_name = data.get("agent_name")
    escalation_type = data.get("escalation_type")
    severity = data.get("severity", "medium")
    entity_id = data.get("entity_id")
    entity_data = data.get("data", {})
    
    try:
        supabase_request("POST", "escalations", data={
            "agent_name": agent_name,
            "escalation_type": escalation_type,
            "severity": severity,
            "entity_id": entity_id,
            "data": entity_data,
            "status": "open"
        })
        
        color_map = {"low": "#808080", "medium": "#FFA500", "high": "#FF6B6B", "critical": "#FF0000"}
        slack.send_alert(
            f"{agent_name.upper()} - {escalation_type}",
            f"Severity: {severity}\nEntity: {entity_id}\nData: {str(entity_data)[:200]}",
            color_map.get(severity, "#808080")
        )
        
        return jsonify({"status": "created"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
