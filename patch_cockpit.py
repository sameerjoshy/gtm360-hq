#!/usr/bin/env python3
"""
GTM360 HQ — Cockpit Patcher
Adds priority actions rendering to index.html in your repo
Run from C:\Users\DELL\gtm360-hq
"""
import os

path = "index.html"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if already patched
if 'priorityActions' in content:
    print("Already patched — priority actions code exists")
else:
    print("Applying priority actions patch...")

# Fix 1: Update ONE THING HTML section
old_one_thing = '''<!-- ONE THING -->
<div class="container">
  <div class="one-thing" id="oneThing">
    <div class="one-thing-label">ONE THING</div>
    <div class="one-thing-text" id="oneThingText">Loading today\'s brief...</div>
  </div>
</div>'''

new_one_thing = '''<!-- ONE THING + PRIORITY ACTIONS -->
<div class="container">
  <div class="one-thing" id="oneThing">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:12px">
        <div class="one-thing-label">ONE THING</div>
        <div class="one-thing-text" id="oneThingText">Loading today\'s brief...</div>
      </div>
      <div id="priorityActions" style="display:none;border-top:1px solid rgba(255,77,0,0.2);padding-top:12px;margin-top:4px">
        <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;color:var(--accent);margin-bottom:8px">PRIORITY ACTIONS</div>
        <div id="priorityList" style="display:flex;flex-direction:column;gap:6px"></div>
      </div>
    </div>
  </div>
</div>'''

# Fix 2: Update JS to render priority actions
old_js = '''      if (brief.one_thing) document.getElementById(\'oneThingText\').textContent = brief.one_thing;
      if (brief.sams_flag) document.getElementById(\'samsFlag\').textContent = brief.sams_flag;'''

new_js = '''      if (brief.one_thing) document.getElementById(\'oneThingText\').textContent = brief.one_thing;
      if (brief.sams_flag) document.getElementById(\'samsFlag\').textContent = brief.sams_flag;

      // Render priority actions
      if (brief.priority_actions) {
        let actions = brief.priority_actions;
        if (typeof actions === \'string\') { try { actions = JSON.parse(actions); } catch(e) {} }
        if (typeof actions === \'string\') { try { actions = JSON.parse(actions); } catch(e) { actions = [actions]; } }
        if (Array.isArray(actions) && actions.length) {
          const list = document.getElementById(\'priorityList\');
          list.innerHTML = actions.map((a, i) => `<div style="display:flex;gap:10px;align-items:baseline"><span style="font-family:var(--font-display);font-size:16px;color:var(--accent);flex-shrink:0">${i+1}</span><span style="font-size:13px;color:var(--text2)">${a}</span></div>`).join(\'\');
          document.getElementById(\'priorityActions\').style.display = \'block\';
        }
      }'''

# Apply patches
if old_one_thing in content:
    content = content.replace(old_one_thing, new_one_thing)
    print("✅ ONE THING HTML updated")
else:
    print("⚠️  ONE THING HTML not found — may already be updated")

if old_js in content:
    content = content.replace(old_js, new_js)
    print("✅ Priority actions JS added")
else:
    print("⚠️  JS section not found — may already be updated")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done. Now run: git add . && git commit -m 'Priority actions fix' && git push")
