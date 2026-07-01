"""
backend/api/agents.py
Agent management API endpoints
Routes:
  GET  /api/agents                    - list all agents
  POST /api/agents/run                - run all agents
  POST /api/agents/{name}/run         - run specific agent
  GET  /api/agents/phase/{phase}      - get agents by phase
  POST /api/agents/phase/{phase}/run  - run all agents in phase
  GET  /api/health/agents             - agent health check
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from agents.orchestrator import get_orchestrator
from utils.logger import log_info, log_error

agents_bp = Blueprint("agents", __name__, url_prefix="/api/agents")


@agents_bp.route("", methods=["GET"])
def list_agents():
    """List all agents with status"""
    try:
        orchestrator = get_orchestrator()
        agents = orchestrator.list_agents()
        
        return jsonify({
            "status": "success",
            "total_agents": len(agents),
            "agents": agents,
            "timestamp": datetime.now().isoformat() + "Z"
        }), 200
    except Exception as e:
        log_error(f"Failed to list agents: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@agents_bp.route("/run", methods=["POST"])
def run_all_agents():
    """Run all 14 agents sequentially"""
    try:
        log_info("Starting orchestrator: running all 14 agents")
        orchestrator = get_orchestrator()
        result = orchestrator.run_all()
        
        return jsonify({
            "status": "success",
            "data": result,
            "timestamp": datetime.now().isoformat() + "Z"
        }), 200
    except Exception as e:
        log_error(f"Failed to run all agents: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@agents_bp.route("/<agent_name>/run", methods=["POST"])
def run_agent(agent_name):
    """Run a specific agent by name"""
    try:
        log_info(f"Running agent: {agent_name}")
        orchestrator = get_orchestrator()
        result = orchestrator.run_agent(agent_name)
        
        if result.get("status") == "error" and "not found" in result.get("message", ""):
            return jsonify(result), 404
        
        return jsonify({
            "status": "success",
            "data": result,
            "timestamp": datetime.now().isoformat() + "Z"
        }), 200
    except Exception as e:
        log_error(f"Failed to run agent {agent_name}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@agents_bp.route("/phase/<int:phase>", methods=["GET"])
def get_phase_agents(phase):
    """Get all agents for a specific phase"""
    if phase not in [1, 2, 3]:
        return jsonify({"status": "error", "message": "Phase must be 1, 2, or 3"}), 400
    
    try:
        orchestrator = get_orchestrator()
        all_agents = orchestrator.list_agents()
        phase_agents = {
            name: agent 
            for name, agent in all_agents.items() 
            if agent["phase"] == phase
        }
        
        return jsonify({
            "status": "success",
            "phase": phase,
            "agent_count": len(phase_agents),
            "agents": phase_agents,
            "timestamp": datetime.now().isoformat() + "Z"
        }), 200
    except Exception as e:
        log_error(f"Failed to get phase {phase} agents: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@agents_bp.route("/phase/<int:phase>/run", methods=["POST"])
def run_phase_agents(phase):
    """Run all agents for a specific phase"""
    if phase not in [1, 2, 3]:
        return jsonify({"status": "error", "message": "Phase must be 1, 2, or 3"}), 400
    
    try:
        log_info(f"Running phase {phase} agents")
        orchestrator = get_orchestrator()
        results = orchestrator.run_phase(phase)
        
        total_processed = sum(r.get("items_processed", 0) for r in results)
        total_errors = sum(len(r.get("errors", [])) for r in results)
        
        return jsonify({
            "status": "success",
            "phase": phase,
            "agents_run": len(results),
            "total_items_processed": total_processed,
            "total_errors": total_errors,
            "results": results,
            "timestamp": datetime.now().isoformat() + "Z"
        }), 200
    except Exception as e:
        log_error(f"Failed to run phase {phase} agents: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@agents_bp.route("/<agent_name>", methods=["GET"])
def get_agent_status(agent_name):
    """Get status of a specific agent"""
    try:
        orchestrator = get_orchestrator()
        agent = orchestrator.get_agent(agent_name)
        
        if not agent:
            return jsonify({
                "status": "error",
                "message": f"Agent '{agent_name}' not found"
            }), 404
        
        return jsonify({
            "status": "success",
            "agent_name": agent_name,
            "run_status": agent.run_status,
            "phase": agent.phase,
            "table": agent.table_name,
            "timestamp": datetime.now().isoformat() + "Z"
        }), 200
    except Exception as e:
        log_error(f"Failed to get agent status: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
