from functools import wraps
from flask import request, jsonify
import os

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get("X-API-Key")
        
        if not api_key:
            return jsonify({"error": "Missing API key"}), 401
        
        # TODO: Validate against customer API keys in database
        
        return f(*args, **kwargs)
    
    return decorated_function

def get_customer_id():
    """Extract customer_id from request"""
    return request.headers.get("X-Customer-ID")
