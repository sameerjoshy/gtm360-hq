"""
GTM360 HQ Backend Flask Application
"""
from flask import Flask, jsonify
from flask_cors import CORS
import os
from datetime import datetime

from api.agents import agents_bp
from scheduler import start_scheduler
from config import Config
from api import routes
from utils.logger import setup_logger

logger = setup_logger(__name__)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(routes.api_bp, url_prefix="/api")
    app.register_blueprint(agents_bp)
    
    @app.before_request
    def startup():
        if not hasattr(app, 'scheduler_started'):
            start_scheduler()
            app.scheduler_started = True
    
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "environment": os.getenv("ENVIRONMENT", "development")
        }), 200
    
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404
    
    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"Server error: {e}")
        return jsonify({"error": "Internal server error"}), 500
    
    logger.info(f"GTM360 HQ Backend initialized")
    return app

if __name__ == "__main__":
    app = create_app()
    debug = os.getenv("ENVIRONMENT") == "development"
    app.run(host="0.0.0.0", port=5000, debug=debug)
