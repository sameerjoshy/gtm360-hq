import sys
path = "index.html"
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()
old = "if (brief.one_thing) document.getElementById('oneThingText').textContent = brief.one_thing;\n      if (brief.sams_flag) document.getElementById('samsFlag').textContent = brief.sams_flag;"
new = """if (brief.one_thing) document.getElementById('oneThingText').textContent = brief.one_thing;
      if (brief.sams_flag) document.getElementById('samsFlag').textContent = brief.sams_flag;
      if (brief.priority_actions) {
        let pa = brief.priority_actions;
        if (typeof pa==='string'){try{pa=JSON.parse(pa);}catch(e){}}
        if (typeof pa==='string'){try{pa=JSON.parse(pa);}catch(e){pa=[pa];}}
        if (Array.isArray(pa)&&pa.length){
          let html='<div style="margin-top:12px;border-top:1px solid rgba(255,77,0,0.2);padding-top:10px"><div style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;color:var(--accent);margin-bottom:8px">PRIORITY ACTIONS</div>';
          pa.forEach((a,i)=>{html+=`<div style="display:flex;gap:10px;margin-bottom:6px"><span style="font-family:var(--font-display);font-size:16px;color:var(--accent)">${i+1}</span><span style="font-size:13px;color:var(--text2)">${a}</span></div>`;});
          html+='</div>';
          document.getElementById('oneThing').insertAdjacentHTML('beforeend',html);
        }
      }"""
if old in c:
    c = c.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Done")
else:
    print("Not found")
    print(repr(c[c.find('oneThingText'):c.find('oneThingText')+100]))
