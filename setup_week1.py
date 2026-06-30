#!/usr/bin/env python3
"""
GTM360 HQ - Week 1 Auto-Setup Script
Automatically creates all 60 scaffold files in correct locations
Run: python setup_week1.py
"""

import os
import sys
from pathlib import Path

# Define all files and their content
FILES = {
    # Backend root files
    "backend/app.py": '''"""
GTM360 HQ — Backend Flask Application
Week 1: Foundation Scaffold
"""

from flask import Flask, jsonify
from flask_cors import CORS
import os
from datetime import datetime

from config import Config
from api import routes
from utils.logger import setup_logger

logger = setup_logger(__name__)

def create_app():
    """Application factory"""
    app = Flask(__name__)
    
    # Configuration
    app.config.from_object(Config)
    
    # CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register blueprints
    app.register_blueprint(routes.api_bp, url_prefix="/api")
    
    # Health check
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "environment": os.getenv("ENVIRONMENT", "development")
        }), 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404
    
    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"Server error: {e}")
        return jsonify({"error": "Internal server error"}), 500
    
    logger.info(f"GTM360 HQ Backend initialized ({Config.ENVIRONMENT})")
    
    return app

if __name__ == "__main__":
    app = create_app()
    debug = os.getenv("ENVIRONMENT") == "development"
    app.run(host="0.0.0.0", port=5000, debug=debug)
''',

    "backend/requirements.txt": """Flask==3.0.0
Flask-CORS==4.0.0
python-dotenv==1.0.0
requests==2.31.0
psycopg2-binary==2.9.9
supabase==2.0.3
pytest==7.4.3
pytest-cov==4.1.0
gunicorn==21.2.0
""",

    "backend/config.py": """import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    \"\"\"Base configuration\"\"\"
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
""",

    "backend/auth.py": """from functools import wraps
from flask import request, jsonify
import os

def require_auth(f):
    \"\"\"Decorator to require authentication\"\"\"
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get("X-API-Key")
        
        if not api_key:
            return jsonify({"error": "Missing API key"}), 401
        
        # TODO: Validate against customer API keys in database
        
        return f(*args, **kwargs)
    
    return decorated_function

def get_customer_id():
    \"\"\"Extract customer_id from request\"\"\"
    return request.headers.get("X-Customer-ID")
""",

    "backend/Dockerfile": """FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:create_app()"]
""",

    # Backend API files
    "backend/api/__init__.py": "# API module",
    
    "backend/api/routes.py": """from flask import Blueprint, jsonify, request
from datetime import datetime
from auth import require_auth, get_customer_id
from api.agents import agent_bp
from api.escalations import escalation_bp
from api.dashboard import dashboard_bp

api_bp = Blueprint("api", __name__)

api_bp.register_blueprint(agent_bp, url_prefix="/agents")
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
""",

    "backend/api/agents.py": """from flask import Blueprint, jsonify, request
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
""",

    "backend/api/escalations.py": """from flask import Blueprint, jsonify, request
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
""",

    "backend/api/dashboard.py": """from flask import Blueprint, jsonify
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
""",

    # Backend agents files
    "backend/agents/__init__.py": "# Agents module",
    
    "backend/agents/base_agent.py": """from abc import ABC, abstractmethod
from datetime import datetime

class BaseAgent(ABC):
    \"\"\"Abstract base class for all agents\"\"\"
    
    def __init__(self, name: str, config: dict = None):
        self.name = name
        self.config = config or {}
        self.confidence = 0.7
    
    @abstractmethod
    def run(self, customer_id: str) -> dict:
        pass
    
    def log(self, message: str):
        print(f"[{self.name}] {message}")
""",

    "backend/agents/orchestrator.py": """from datetime import datetime

class AgentOrchestrator:
    \"\"\"Orchestrate agent execution\"\"\"
    
    def __init__(self, customer_config: dict):
        self.config = customer_config
        self.agents = {}
    
    def run(self, customer_id: str) -> dict:
        return {
            "customer_id": customer_id,
            "execution_time": datetime.utcnow().isoformat(),
            "agents_executed": [],
            "escalations": [],
            "total_escalations": 0
        }
""",

    "backend/agents/legacy/__init__.py": "# Legacy agents",
    
    "backend/agents/legacy/placeholder.py": "# Original agent code will go here",

    # Backend models files
    "backend/models/__init__.py": "# Models module",
    
    "backend/models/supabase.py": """from supabase import create_client
import os

class SupabaseClient:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        self.client = create_client(url, key)
    
    def get_customer(self, customer_id: str):
        return self.client.table("customers").select("*").eq("customer_id", customer_id).single().execute()
    
    def insert_escalation(self, escalation: dict):
        return self.client.table("escalations").insert(escalation).execute()
    
    def get_escalations(self, customer_id: str):
        return self.client.table("escalations").select("*").eq("customer_id", customer_id).eq("status", "open").execute()

supabase = SupabaseClient()
""",

    # Backend services files
    "backend/services/__init__.py": "# Services module",
    
    "backend/services/groq.py": """import requests
import json
import os

class GroqClient:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    
    def call(self, prompt: str, system: str = "") -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "messages": messages,
                "max_tokens": 800,
                "temperature": 0.7
            }
        )
        
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

groq = GroqClient()
""",

    "backend/services/hubspot.py": """class HubSpotClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
    
    def get_deals(self, customer_id: str):
        return {"deals": []}
    
    def get_contacts(self, customer_id: str):
        return {"contacts": []}
    
    def sync_data(self, customer_id: str):
        pass

hubspot = HubSpotClient()
""",

    "backend/services/serper.py": """import requests
import os

class SerperClient:
    def __init__(self):
        self.api_key = os.getenv("SERPER_API_KEY")
    
    def search_news(self, query: str, limit: int = 5):
        response = requests.post(
            "https://google.serper.dev/news",
            headers={
                "X-API-KEY": self.api_key,
                "Content-Type": "application/json"
            },
            json={"q": query, "num": limit}
        )
        response.raise_for_status()
        return response.json()

serper = SerperClient()
""",

    # Backend utils files
    "backend/utils/__init__.py": "# Utils module",
    
    "backend/utils/logger.py": """import logging
import sys

def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger
""",

    "backend/utils/config_loader.py": """def load_customer_config(customer_id: str) -> dict:
    return {
        "customer_id": customer_id,
        "agents_enabled": ["lead_qual", "deal_risk", "churn_risk"],
        "thresholds": {
            "churn_risk": 7,
            "deal_risk": 6
        }
    }
""",

    # Backend tests files
    "backend/tests/__init__.py": "# Tests module",
    
    "backend/tests/conftest.py": """import pytest
from app import create_app

@pytest.fixture
def app():
    app = create_app()
    app.config["TESTING"] = True
    return app

@pytest.fixture
def client(app):
    return app.test_client()
""",

    "backend/tests/test_api.py": """def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json["status"] == "healthy"

def test_api_status(client):
    response = client.get("/api/status", headers={"X-API-Key": "test"})
    assert response.status_code == 200
""",

    "backend/tests/test_agents.py": """def test_orchestrator_initialization():
    from agents.orchestrator import AgentOrchestrator
    config = {"agents_enabled": ["lead_qual"]}
    orchestrator = AgentOrchestrator(config)
    assert orchestrator is not None
""",

    # Frontend files
    "frontend/package.json": """{
  "name": "gtm360-hq-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.17.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16"
  }
}
""",

    "frontend/vite.config.js": """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
""",

    "frontend/tailwind.config.js": """export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {}
  },
  plugins: []
}
""",

    "frontend/postcss.config.js": """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
""",

    "frontend/index.html": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GTM360 HQ</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>
""",

    "frontend/.env.example": """VITE_API_BASE_URL=http://localhost:5000/api
VITE_ENVIRONMENT=development
""",

    "frontend/Dockerfile": """FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
CMD ["serve", "-s", "dist", "-l", "3000"]
""",

    "frontend/src/main.jsx": """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
""",

    "frontend/src/index.css": """@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
""",

    "frontend/src/App.jsx": """import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  return (
    <Router>
      {isAuthenticated ? (
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Router>
  )
}
""",

    "frontend/src/pages/Login.jsx": """import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    localStorage.setItem('token', 'demo-token')
    navigate('/')
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg">
        <h1 className="text-3xl font-bold text-white mb-6">GTM360 HQ</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" className="w-full px-4 py-2 bg-gray-700 text-white rounded" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" className="w-full px-4 py-2 bg-gray-700 text-white rounded" />
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded">Sign In</button>
        </form>
      </div>
    </div>
  )
}
""",

    "frontend/src/pages/Dashboard.jsx": """export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p className="text-gray-400 mt-2">Welcome to GTM360 HQ</p>
    </div>
  )
}
""",

    "frontend/src/pages/CRO.jsx": """export default function CRO() {
  return <div className="p-8"><h1>CRO Dashboard</h1></div>
}
""",

    "frontend/src/pages/RevOps.jsx": """export default function RevOps() {
  return <div className="p-8"><h1>RevOps Dashboard</h1></div>
}
""",

    "frontend/src/pages/AE.jsx": """export default function AE() {
  return <div className="p-8"><h1>AE Dashboard</h1></div>
}
""",

    "frontend/src/pages/CS.jsx": """export default function CS() {
  return <div className="p-8"><h1>CS Dashboard</h1></div>
}
""",

    "frontend/src/components/Navbar.jsx": """export default function Navbar() {
  return <nav className="bg-gray-800 p-6">GTM360 HQ</nav>
}
""",

    "frontend/src/components/HealthCard.jsx": """export default function HealthCard({ title, value }) {
  return <div className="bg-gray-800 p-4 rounded"><h3>{title}</h3><p className="text-2xl font-bold mt-2">{value}</p></div>
}
""",

    "frontend/src/components/EscalationList.jsx": """export default function EscalationList() {
  return <div>No escalations</div>
}
""",

    "frontend/src/components/PipelineChart.jsx": """export default function PipelineChart() {
  return <div>Pipeline chart</div>
}
""",

    "frontend/src/hooks/useAuth.js": """import { useState, useEffect } from 'react'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
    setLoading(false)
  }, [])

  return { isAuthenticated, loading }
}
""",

    "frontend/src/hooks/useDashboard.js": """import { useState, useEffect } from 'react'

export function useDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  return { data, loading }
}
""",

    "frontend/src/hooks/useEscalations.js": """import { useState, useEffect } from 'react'

export function useEscalations() {
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  return { escalations, loading }
}
""",

    "frontend/src/services/api.js": """import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers['X-API-Key'] = token
  }
  return config
})
""",

    # Database migrations
    "migrations/001_initial_schema.sql": """-- GTM360 HQ Initial Schema
CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
  deal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  deal_name TEXT NOT NULL,
  amount DECIMAL(15, 2),
  stage TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deals_customer_id ON deals(customer_id);
""",

    "migrations/002_escalations.sql": """-- Escalations table
CREATE TABLE IF NOT EXISTS escalations (
  escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  agent_name TEXT NOT NULL,
  escalation_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  confidence DECIMAL(3, 2),
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_escalations_customer_id ON escalations(customer_id);
""",

    "migrations/003_feedback.sql": """-- Feedback table
CREATE TABLE IF NOT EXISTS user_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  escalation_id UUID REFERENCES escalations(escalation_id),
  action_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_actions_customer_id ON user_actions(customer_id);
""",

    # Infrastructure files
    "infrastructure/railway.toml": """[build]
builder = "dockerfile"

[deploy]
startCommand = "gunicorn --bind 0.0.0.0:5000 app:create_app()"
healthcheckPath = "/health"
healthcheckTimeout = 100

[environments.production]
name = "GTM360 HQ Production"
icon = "🚀"
""",

    "infrastructure/docker-compose.yml": """version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: gtm360_hq
      POSTGRES_USER: gtm360
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      ENVIRONMENT: development
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_KEY: ${SUPABASE_KEY}
      GROQ_API_KEY: ${GROQ_API_KEY}
    ports:
      - "5000:5000"
    depends_on:
      - postgres

  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
""",

    "infrastructure/env.example": """ENVIRONMENT=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-key
GROQ_API_KEY=your-key
HUBSPOT_API_KEY=your-key
SERPER_API_KEY=your-key
SECRET_KEY=dev-key-change-in-production
VITE_API_BASE_URL=http://localhost:5000/api
""",

    # Root files
    ".env.example": """SUPABASE_URL=https://dtqsnojfatzjsklsjzwj.supabase.co
SUPABASE_KEY=your-key
GROQ_API_KEY=your-key
HUBSPOT_API_KEY=your-key
SERPER_API_KEY=your-key
ENVIRONMENT=development
RENDER_API_KEY=your-key
RENDER_STAGING_SERVICE_ID=your-id
RENDER_PRODUCTION_SERVICE_ID=your-id
""",

    "README.md": """# GTM360 HQ — Revenue Orchestration Platform

**Status:** Week 1 Foundation

## What is GTM360 HQ?

GTM360 HQ is an AI-native revenue orchestration system that automates decision-making across the full revenue cycle.

22 AI agents work together to surface escalations, score entities, and drive revenue team action.

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
backend/          - Flask API + Agent Orchestrator
frontend/         - React SPA
migrations/       - Database schemas
.github/workflows - CI/CD pipelines
infrastructure/   - Deployment configs
```

## Status

- ✅ Week 1: Foundation scaffold
- ⏳ Week 2: Agent orchestrator + phase migrations
- ⏳ Week 3-4: Core agents (12 agents)

## Support

See docs for API documentation and deployment guide.
""",

    ".gitignore": """__pycache__/
*.py[cod]
.Python
env/
venv/
.env
node_modules/
npm-debug.log
dist/
.DS_Store
.vscode/
.idea/
*.egg-info/
.pytest_cache/
.coverage
build/
"""
}

def create_files():
    """Create all files"""
    print("🚀 GTM360 HQ Week 1 Auto-Setup")
    print(f"Creating {len(FILES)} files...")
    
    created = 0
    skipped = 0
    
    for filepath, content in FILES.items():
        path = Path(filepath)
        
        # Create parent directories
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # Check if file exists
        if path.exists():
            print(f"⏭️  {filepath} (already exists)")
            skipped += 1
            continue
        
        # Create file
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ {filepath}")
        created += 1
    
    print(f"\n✨ Done!")
    print(f"Created: {created} files")
    print(f"Skipped: {skipped} files")
    print(f"Total: {len(FILES)} files")
    
    # Verify
    print("\n🔍 Verifying...")
    python_files = list(Path("backend").rglob("*.py"))
    print(f"   Backend Python files: {len(python_files)}")
    
    jsx_files = list(Path("frontend/src").rglob("*.jsx"))
    js_files = list(Path("frontend/src").rglob("*.js"))
    print(f"   Frontend JSX/JS files: {len(jsx_files) + len(js_files)}")
    
    print("\n📝 Next steps:")
    print("1. Create .env file: cp .env.example .env")
    print("2. Add your API keys to .env")
    print("3. Commit: git add . && git commit -m 'Week 1: Foundation scaffold'")
    print("4. Push: git push origin main")
    print("5. Watch GitHub Actions run automatically")

if __name__ == "__main__":
    try:
        create_files()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
