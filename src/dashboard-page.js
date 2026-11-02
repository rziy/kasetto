"use strict";

module.exports = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Turntable settings</title>
<style>
:root{--bg:#f6f7f5;--panel:#fff;--ink:#1d2321;--mute:#667570;--line:#d9dfdc;--accent:#1c7c6f;--bad:#b3261e;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#141817;--panel:#1c2220;--ink:#e8eeeb;--mute:#93a39d;--line:#2d3633;--accent:#4cc2b0;--bad:#ff8a80}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:640px;margin:0 auto;padding:24px 16px 96px}
h1{font-size:1.5rem;margin:8px 0 4px}
h2{font-size:1.05rem;margin:0 0 12px}
p.lead{color:var(--mute);margin:0 0 20px;max-width:60ch}
section{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px}
label{display:block;font-size:.9rem;color:var(--mute);margin:12px 0 4px}
div>label{margin-top:0}
div+div>label{margin-top:12px}.grid>div>label{margin-top:12px}
input{width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);font:inherit}
input:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
@media (max-width:520px){.grid{grid-template-columns:1fr}}
small{color:var(--mute);display:block;margin-top:4px}
.bar{position:fixed;inset:auto 0 0 0;background:var(--panel);border-top:1px solid var(--line);padding:12px 16px}
.bar div{max-width:640px;margin:0 auto;display:flex;gap:12px;align-items:center}
button{background:var(--accent);color:#fff;border:0;border-radius:6px;padding:10px 18px;font:inherit;font-weight:600;cursor:pointer}
@media (prefers-color-scheme:dark){button{color:#08201c}}
button:disabled{opacity:.6;cursor:wait}
#msg{font-size:.95rem}.ok{color:var(--accent)}.err{color:var(--bad)}
</style></head><body><main>
<h1>Turntable settings</h1>
<p class="lead">Changes apply to the personal profile within one update cycle. No restart needed. Images must be public https links, because Discord cannot read files from your server.</p>
<form id="f">
<section><h2>Text</h2>
<label for="title">Title</label><input id="title" maxlength="64">
<label for="subtitle">Subtitle</label><input id="subtitle" maxlength="128">
<label for="username">Name shown in personal mode</label><input id="username" maxlength="64">
<label for="miniText">Text next to the mini avatar</label><input id="miniText" maxlength="64">
<label for="activity">Activity line</label><input id="activity" maxlength="128">
</section>
<section><h2>Stat slot labels</h2><div class="grid" id="labels"></div>
<small>Leave a slot empty to keep it blank.</small></section>
<section><h2>Images</h2><div id="icons"></div>
<small>Leave empty to use the built-in image shown as a placeholder.</small></section>
</form>
<div class="bar"><div><button id="save" type="button">Save changes</button><span id="msg" role="status"></span></div></div>
</main>
<script>
const $=(id)=>document.getElementById(id);
const TEXT=["title","subtitle","username","miniText","activity"];
function field(parent,id,label,ph,max){
  const w=document.createElement("div");
  const l=document.createElement("label");l.htmlFor=id;l.textContent=label;
  const i=document.createElement("input");i.id=id;i.placeholder=ph||"";i.maxLength=max;
  w.append(l,i);parent.append(w);return i;
}
let meta;
async function load(){
  const r=await fetch("/api/profile");meta=await r.json();const p=meta.profile;
  TEXT.forEach(k=>$(k).value=p[k]||"");
  for(let n=1;n<=6;n++){field($("labels"),"label"+n,"Slot "+n,"",64).value=(p.labels||{})[n]||"";}
  meta.iconKeys.forEach(k=>{field($("icons"),"icon_"+k,k.replace("_"," ").toLowerCase(),meta.defaults[k]||"",500).value=(p.icons||{})[k]||"";});
}
async function save(){
  const body={labels:{},icons:{}};
  TEXT.forEach(k=>body[k]=$(k).value);
  for(let n=1;n<=6;n++)body.labels[n]=$("label"+n).value;
  meta.iconKeys.forEach(k=>body.icons[k]=$("icon_"+k).value);
  const b=$("save"),m=$("msg");b.disabled=true;m.className="";m.textContent="Saving…";
  try{
    const r=await fetch("/api/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||"Could not save");
    m.className="ok";m.textContent="Saved";
  }catch(e){m.className="err";m.textContent=e.message;}
  b.disabled=false;
}
$("save").addEventListener("click",save);
load().catch(e=>{$("msg").className="err";$("msg").textContent="Could not load settings: "+e.message;});
</script></body></html>`;
