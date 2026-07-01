import json
import os
import urllib.request
import urllib.error

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

def call_groq(prompt, system="", max_tokens=800, temperature=0.7):
    """Call Groq API with prompt and system message"""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")
    
    url = f"{GROQ_BASE_URL}/chat/completions"
    messages = []
    
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    body = json.dumps({
        "model": GROQ_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    }).encode()
    
    req = urllib.request.Request(url, data=body, headers={
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "GTM360HQ/1.0"
    })
    
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        raise Exception(f"Groq error {e.code}: {error_body}")

def call_groq_json(prompt, system="", max_tokens=800, temperature=0.7):
    """Call Groq API and parse JSON response"""
    raw = call_groq(prompt, system, max_tokens, temperature)
    clean = raw.strip()
    
    if "```json" in clean:
        clean = clean.split("```json")[1].split("```")[0]
    elif "```" in clean:
        clean = clean.split("```")[1].split("```")[0]
    
    clean = clean.strip()
    
    try:
        return json.loads(clean)
    except json.JSONDecodeError as e:
        return {"status": "error", "message": f"JSON parse failed: {str(e)}"}
