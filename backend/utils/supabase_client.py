import json
import os
import urllib.request
import urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dtqsnojfatzjsklsjzwj.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

def supabase_request(method, table, params="", data=None):
    """Make authenticated request to Supabase REST API"""
    url = f"{SUPABASE_URL}/rest/v1/{table}{params}"
    body = json.dumps(data).encode() if data else None
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as res:
            content = res.read().decode()
            return json.loads(content) if content else []
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"Supabase error {e.code}: {error_body}")
        return []

def supabase_get(table, params=""):
    """GET from Supabase"""
    return supabase_request("GET", table, params=params)

def supabase_post(table, data):
    """POST to Supabase"""
    return supabase_request("POST", table, data=data)

def supabase_patch(table, params, data):
    """PATCH in Supabase"""
    return supabase_request("PATCH", table, params=params, data=data)

def supabase_delete(table, params):
    """DELETE from Supabase"""
    return supabase_request("DELETE", table, params=params)
