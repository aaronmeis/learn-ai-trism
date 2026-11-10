/* ============================================================
   UI ENGINE & ROUTING
   ============================================================ */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=t=>t?String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):"";
const SRC=Object.fromEntries(SOURCES.map(s=>[s.n,s]));
function cite(html){
  return html.replace(/\[((?:S\d+)(?:\s*,\s*S\d+)*)\]/g,(m,inner)=>"["+inner.replace(/S(\d+)/g,(x,n)=>{const s=SRC[+n];return s?`<a class="cite" href="${esc(s.u)}" target="_blank" rel="noopener" title="${esc(s.t)}">S${n}</a>`:x;})+"]");
}
const ec=t=>cite(esc(t));

const LS={
  get(k,d=null){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
  del(k){try{localStorage.removeItem(k);}catch(e){}}
};
const KEY="lat:";

function go(v){
  $$("#nav .nav-item").forEach(el=>el.classList.toggle("active",el.dataset.v===v));
  $$("section.view").forEach(el=>el.classList.toggle("active",el.id==="v-"+v));
  LS.set(KEY+"view",v);
  if(location.hash!=="#/"+v) history.replaceState(null,"","#/"+v);
  window.scrollTo(0,0); const mc=$(".main-content"); if(mc) mc.scrollTop=0;
}
$$("#nav .nav-item").forEach(el=>el.onclick=()=>go(el.dataset.v));

function lib(slug,label){return `<a href="library/${slug}.html">${esc(label||"Open full note")} ↗</a>`;}

/* ---- Lightbox for diagrams and slides ---- */
document.addEventListener("click",e=>{
  const img=e.target.closest("img.diagram, .slides img");
  if(img){e.preventDefault();$("#lightboxImg").src=img.dataset.full||img.src;$("#lightbox").classList.add("open");}
});
$("#lightbox").onclick=()=>$("#lightbox").classList.remove("open");
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("#lightbox").classList.remove("open");});

/* ---- Dashboard ---- */
function renderDashboard(){
  const el=$("#v-dashboard");
  const mods=allModules();
  const done=mods.filter(m=>LS.get(moduleKey(m.w,m.i),false)).length;
  const pct=mods.length?Math.round((done/mods.length)*100):0;
  const learned=DATA.glossary.filter(g=>fcState(g.term).box>=4).length;
  const due=DATA.glossary.filter(g=>fcState(g.term).due<=Date.now()).length;
  const selfSolid=DATA.ladder.reduce((a,l)=>a+l.r.filter(r=>LS.get(KEY+"self:"+l.key+":"+r.n)==="solid").length,0);
  const totalRungs=DATA.ladder.reduce((a,l)=>a+l.r.length,0);
  const fmDone=DATA.checklist.filter((_,i)=>LS.get(KEY+"cl:"+i,false)).length;
  const libCount=(window.LIBRARY||[]).length;
  const pillar=(img,title,sub,color)=>`<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:12px;padding:.9rem 1.1rem;display:flex;align-items:center;gap:12px">
      <img src="assets/${img}.jpg" alt="" style="width:48px;height:48px;border-radius:10px;border:1px solid ${color};object-fit:cover;flex-shrink:0">
      <div><div style="font-weight:700;font-size:.88rem;color:var(--text-primary)">${title}</div><div style="font-size:.74rem;color:var(--text-dim)">${sub}</div></div></div>`;
  let h=`<span class="badge">STUDY CONSOLE</span>
  <h1 style="margin-top:.9rem">AI TRiSM: Trust, Risk and Security Management</h1>
  <p class="lead">Dual ODM+TDD study console for AI Trust, Risk and Security Management. Layer and pillar names stay secondary unless a primary page is cited. Claims trace to the ${SOURCES.length}-row source ledger when the pack is loaded. ${esc(DATA.checked||"")}</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1rem;margin-bottom:1.5rem">
    ${pillar("100","Governance","Trust and risk ownership","var(--r100)")}
    ${pillar("200","Runtime","Runtime security and monitoring","var(--r200)")}
    ${pillar("300","ModelOps","ModelOps and lifecycle controls","var(--r300)")}
    ${pillar("hero","Privacy","Data protection and privacy","var(--warn)")}
  </div>
  <div class="grid" style="margin-bottom:1.5rem;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
    <div class="statcard"><div class="num">${pct}%</div><div class="lbl">curriculum complete (${done}/${mods.length} modules)</div>
      <div class="progbar" id="dProg"><i class="b100"></i><i class="b200"></i><i class="b300"></i></div></div>
    <div class="statcard"><div class="num">${due}</div><div class="lbl">flashcards due now (${learned}/${DATA.glossary.length} in long-term memory)</div></div>
    <div class="statcard"><div class="num">${selfSolid}/${totalRungs}</div><div class="lbl">ladder rungs self-rated "solid"</div></div>
    <div class="statcard"><div class="num">${fmDone}/${DATA.checklist.length}</div><div class="lbl">failure modes reviewed</div></div>
  </div>
  <div class="note"><b>Mission.</b> By the end you can place AI TRiSM layers against neighbors (ISO/IEC 42001, NIST AI RMF, EU AI Act) and say what Gartner names do and do not authorize. ${lib("odm-mission","Mission note")} · ${lib("odm-day-plan","Timed day plan")} · ${lib("tdd-mission","TDD mission")}</div>
  <div class="grid">
    <div class="card"><h3>Curriculum</h3><p style="color:var(--text-secondary);font-size:.86rem">${DATA.weeks.length} blocks from the one-day mastery and tech deep-dive packs.</p><div class="btnrow" style="margin:.8rem 0 0"><button class="b" onclick="go('curriculum')">Open curriculum →</button></div></div>
    <div class="card"><h3>Views</h3><p style="color:var(--text-secondary);font-size:.86rem">Conceptual, logical, and physical views for the two tracks.</p><div class="btnrow" style="margin:.8rem 0 0"><button class="b" onclick="go('views')">Open views →</button></div></div>
    <div class="card"><h3>Progress map</h3><p style="color:var(--text-secondary);font-size:.86rem">The 100 / 200 / 300 ladder across the packs.</p><div class="btnrow" style="margin:.8rem 0 0"><button class="b" onclick="go('map')">Open map →</button></div></div>
    <div class="card"><h3>Flashcards and quiz</h3><p style="color:var(--text-secondary);font-size:.86rem">${DATA.glossary.length} spaced-repetition cards and the ${DATA.quiz.length}-question quiz bank.</p><div class="btnrow" style="margin:.8rem 0 0"><button class="b" onclick="go('flash')">Flashcards →</button><button class="b" onclick="go('quiz')">Quiz →</button></div></div>
    <div class="card"><h3>Shorts and media</h3><p style="color:var(--text-secondary);font-size:.86rem">NotebookLM shorts and the narrated deep-dive cut, when the media is on this site.</p><div class="btnrow" style="margin:.8rem 0 0"><button class="b" onclick="go('shorts')">Open media →</button><button class="b" onclick="go('deck')">Slide deck →</button></div></div>
    <div class="card"><h3>Failure modes</h3><p style="color:var(--text-secondary);font-size:.86rem">${DATA.checklist.length} failure modes: the tell, the fix, and the source.</p><div class="btnrow" style="margin:.8rem 0 0"><button class="b" onclick="go('failures')">Failure modes →</button><button class="b" onclick="go('cheat')">Decision rules →</button></div></div>
    <div class="card"><h3>Neighbors</h3><p style="color:var(--text-secondary);font-size:.86rem">What sits beside AI TRiSM, and what does not replace it.</p><div class="btnrow" style="margin:.8rem 0 0"><button class="b" onclick="go('ea')">Open the map →</button></div></div>
    <div class="card"><h3>On the phone</h3><p style="color:var(--text-secondary);font-size:.86rem">Talks and the O'Reilly shelf, above the source ledger.</p><div class="btnrow" style="margin:.8rem 0 0"><button class="b" onclick="go('refs')">Open references →</button></div></div>
    <div class="card"><h3>Library</h3><p style="color:var(--text-secondary);font-size:.86rem">${libCount} vault notes and NotebookLM reports rendered as web pages, with live source links.</p><div class="btnrow" style="margin:.8rem 0 0"><button class="b" onclick="go('library')">Open library →</button><button class="b" onclick="go('refs')">Source ledger →</button></div></div>
  </div>
  <h3 style="margin:1.6rem 0 .6rem;font-size:1rem">From the pack</h3>
  <p class="lead">The NotebookLM exports and the reference notes, as pages you can open here.</p>
  <div class="libgrid">${(DATA.packPages||[]).map(p=>`<a class="libcard" href="library/${p.slug}.html"><b>${esc(p.t)}</b><span>Open the full note</span></a>`).join("")}</div>`;
  el.innerHTML=h;
  const by={100:0,200:0,300:0}; mods.forEach(m=>{if(LS.get(moduleKey(m.w,m.i),false))by[m.rung]++;});
  const p=$("#dProg"); if(p){["100","200","300"].forEach((r,i)=>p.children[i].style.width=(mods.length?by[r]/mods.length*100:0)+"%");}
}

/* ---- Curriculum ---- */
function moduleKey(w,i){return KEY+"mod:"+w+":"+i;}
function allModules(){let a=[];DATA.weeks.forEach(w=>w.mods.forEach((m,i)=>a.push({w:w.n,i,rung:(m.rl.match(/\b(100|200|300)\b/)||[])[1]||"200"})));return a;}
function renderCurriculum(){
  const el=$("#v-curriculum");
  let h=`<h2 class="vh">${DATA.weeks.length}-block curriculum</h2>
  <p class="lead">${DATA.weeks.length} blocks from the packs. Each block has an action and a reason. ${lib("odm-day-plan","Timed day plan")}</p>
  <div class="timeline" style="margin-bottom:1.2rem">${DATA.weeks.map(w=>`<span class="t">Block ${w.n}</span><span class="b">${esc(w.title)}</span><span class="m">${esc(w.time)}</span>`).join("")}</div>
  <details class="look-box" style="margin:0 0 1.4rem"><summary>Scope mind map</summary><p style="font-size:.8rem;color:var(--text-dim)">${lib("mindmap","Mind map as text")} · ${lib("intake-record","Intake record")}</p></details>`;
  DATA.weeks.forEach(w=>{
    const total=w.mods.length, done=w.mods.filter((_,i)=>LS.get(moduleKey(w.n,i),false)).length;
    h+=`<div class="card">
      <div class="weekhead" data-wk="${w.n}"><span class="wk">Block ${w.n}</span><h3>${esc(w.title)} <span class="pill">${w.rungs}</span> <span class="pill">${esc(w.time)}</span></h3><span class="pct">${done}/${total}</span></div>
      <div class="weekbody" id="wb-${w.n}">
        <div class="week-opener"><b>Architect context:</b> ${ec(w.opener)}</div>
        <div class="obj">${ec(w.obj)}</div>
        ${w.mods.map((m,i)=>{const dn=LS.get(moduleKey(w.n,i),false);
          return `<div class="modrow ${dn?"done":""}">
            <div class="modrow-top"><input type="checkbox" ${dn?"checked":""} data-mk="${w.n}:${i}"><div class="mt">${ec(m.t)}<div class="rl">${esc(m.rl)}</div></div></div>
            ${m.action?`<div class="action-box"><b>Action step:</b> ${ec(m.action)}</div>`:""}
            ${(DATA.looks&&DATA.looks[w.n+":"+i])||m.lookLike?`<details class="look-box"><summary>What does this look like in practice?</summary><div style="margin-top:.4rem">${(DATA.looks&&DATA.looks[w.n+":"+i])||cite(m.lookLike)}</div></details>`:""}
            ${m.whyMatters?`<details class="why-matters"><summary>Why this matters to an architect</summary><p style="margin-top:.4rem">${ec(m.whyMatters)}</p></details>`:""}
          </div>`;}).join("")}
        <div class="deliv"><b>Exit criteria:</b> ${esc(w.deliv)} · ${lib(w.lib,"Full block / view note")}</div>
        <div class="vidlist"><b>Primary sources:</b>${w.vids.map(v=>{const s=SRC[v.s];return `<a href="${esc(s.u)}" target="_blank" rel="noopener">• ${esc(s.t)} <span class="meta">S${s.n} · ${esc(s.type)}</span></a>`;}).join("")}</div>
      </div></div>`;
  });
  el.innerHTML=h;
  $$(".weekhead",el).forEach(hd=>hd.onclick=()=>$("#wb-"+hd.dataset.wk).classList.toggle("open"));
  if(!LS.get(KEY+"seenCurric",false)){const first=$("#wb-1");if(first){first.classList.add("open");LS.set(KEY+"seenCurric",true);}}
  $$("input[data-mk]",el).forEach(cb=>cb.onchange=()=>{
    const [wk,i]=cb.dataset.mk.split(":"); LS.set(moduleKey(wk,i),cb.checked);
    renderCurriculum(); $("#wb-"+wk).classList.add("open"); renderDashboard();
  });
}

/* ---- Architecture views ---- */
function cell(c){
  const s=String(c);
  if(s.startsWith("GAP:")) return `<td class="gap">${ec(s.slice(4))}</td>`;
  if(s.startsWith("WARN:")) return `<td class="warnc">${ec(s.slice(5))}</td>`;
  return `<td>${ec(s)}</td>`;
}
function tableHTML(t){const cols=t.cols||t.headers||[];const title=t.h||t.caption||"";return `<h3 style="margin:1.2rem 0 .3rem;font-size:1rem">${esc(title)}</h3><table class="tbl"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${t.rows.map(r=>`<tr>${r.map(cell).join("")}</tr>`).join("")}</tbody></table>`;}
function renderViews(){
  const el=$("#v-views");
  const tabs=[["conceptual","Conceptual"],["logical","Logical"],["physical","Physical"],["integration","Integration & AI"],["govcloud","Closed lab vs cloud"]];
  const tab=LS.get(KEY+"viewTab","conceptual");
  const V=DATA.views[tab];
  let h=`<h2 class="vh">Architecture views</h2>
  <p class="lead">The views from the tech deep dive, each at its own altitude. Click any diagram to enlarge. The full notes are in the Library.</p>
  <div class="ea-subnav">${tabs.map(([k,l])=>`<button class="ea-tab-btn ${tab===k?"active":""}" data-vt="${k}">${l}</button>`).join("")}</div>`;
  if(!V){
    h+=`<div class="note">Architecture views load with the pack.</div>`;
    el.innerHTML=h;
    $$("[data-vt]",el).forEach(b=>b.onclick=()=>{LS.set(KEY+"viewTab",b.dataset.vt);renderViews();});
    return;
  }
  h+=`<div class="note"><b>Altitude rule.</b> ${ec(V.rule)} ${lib(V.lib,"Full view note")}</div>`;
  if(tab==="govcloud") h+=`<div class="note good"><b>Learning tool only.</b> ${ec("This study console is not an endorsement of any vendor or analyst firm, and not legal advice. Layer and pillar names stay secondary unless a primary page is cited.")}</div>`;
  V.img.forEach(f=>h+=`<img class="diagram" src="assets/diagrams/${f}" alt="${esc(f)}" loading="lazy">`);
  V.tables.forEach(t=>h+=tableHTML(t));
  if(tab==="integration") h+=`<div class="note"><b>Integration note.</b> ${ec("Name the system boundary before you name a tool. An integration is not a clearance and not an authorization.")}</div>`;
  el.innerHTML=h;
  $$("[data-vt]",el).forEach(b=>b.onclick=()=>{LS.set(KEY+"viewTab",b.dataset.vt);renderViews();});
}

/* ---- Progress map ---- */
function renderMap(){
  const el=$("#v-map");
  let h=`<h2 class="vh">Progress map (100 / 200 / 300 ladder)</h2>
  <p class="lead">Self-rate each rung. The dashboard counts your "solid" ratings.</p><div class="lanes">`;
  DATA.ladder.forEach(l=>{
    h+=`<div class="lane"><div style="display:flex;align-items:center;gap:10px;margin-bottom:.8rem">
        <img src="assets/${l.img}.jpg" alt="" style="width:32px;height:32px;border-radius:6px;object-fit:cover;border:1px solid var(--border-color)">
        <h3 style="margin-bottom:0">${esc(l.name)}</h3></div>`;
    l.r.forEach(r=>{
      const st=LS.get(KEY+"self:"+l.key+":"+r.n,"none");
      h+=`<div class="rung l${r.n}"><b>${r.n} level</b>${esc(r.t)}
        <div class="self" data-k="${l.key}:${r.n}">
          <button data-s="none" class="${st==="none"?"on":""}">not yet</button>
          <button data-s="shaky" class="${st==="shaky"?"on":""}">shaky</button>
          <button data-s="solid" class="${st==="solid"?"on":""}">solid</button>
        </div></div>`;
    });
    h+=`</div>`;
  });
  h+=`</div><h3 style="margin:1.5rem 0 .5rem;font-size:1rem">Neighbor systems (just outside the boundary)</h3><div class="grid">`;
  DATA.miniModules.forEach(m=>h+=`<div class="card"><h3>${esc(m.name)}</h3><div class="obj" style="margin:.4rem 0 0">${ec(m.t)}</div></div>`);
  el.innerHTML=h+`</div>`;
  $$(".self button",el).forEach(b=>b.onclick=()=>{LS.set(KEY+"self:"+b.parentElement.dataset.k,b.dataset.s);renderMap();renderDashboard();});
}

/* ---- Flashcards ---- */
let fcQueue=[],fcIdx=0,fcShown=false;
const BOX_DELAY=[0,0,12e5,864e5,2592e5,6048e5,18144e5];
function fcState(t){return LS.get(KEY+"fc:"+t,{box:1,due:0});}
function deckCards(deck){
  if(deck==="essential") return DATA.glossary.filter(g=>g.essential);
  if(deck==="full") return DATA.glossary;
  const d=(DATA.nblmDecks||{})[deck.replace("nlm-","")];
  return d?d.cards.map(c=>({term:c.front,definition:c.back,category:d.title,rung:"",nblm:true})):DATA.glossary;
}
function buildFcQueue(){
  const deck=LS.get(KEY+"fcDeck","essential"), now=Date.now();
  const src=deckCards(deck);
  const all=src.map(g=>({...g,st:fcState(g.term)}));
  const duec=all.filter(g=>g.st.due<=now).sort((a,b)=>a.st.box-b.st.box||a.st.due-b.st.due);
  fcQueue=duec.length?duec:all; fcIdx=0; fcShown=false;
}
function renderFlash(){
  const el=$("#v-flash");
  const deck=LS.get(KEY+"fcDeck","essential");
  const src=deckCards(deck);
  if(!fcQueue.length) buildFcQueue();
  const learned=src.filter(g=>fcState(g.term).box>=4).length;
  let h=`<h2 class="vh">Flashcards</h2>
  <p class="lead">Shortcuts: <span class="kbd-shortcut">Space</span> flip, <span class="kbd-shortcut">←</span> / <span class="kbd-shortcut">→</span> navigate, <span class="kbd-shortcut">1</span> / <span class="kbd-shortcut">2</span> / <span class="kbd-shortcut">3</span> grade.</p>
  <div class="deck-selector">
    <button class="deck-btn ${deck==="essential"?"active":""}" data-fdeck="essential">Quick essentials (${DATA.glossary.filter(g=>g.essential).length} cards)</button>
    <button class="deck-btn ${deck==="full"?"active":""}" data-fdeck="full">Full mastery (${DATA.glossary.length} cards)</button>
    ${Object.entries(DATA.nblmDecks||{}).map(([k,d])=>`<button class="deck-btn ${deck==="nlm-"+k?"active":""}" data-fdeck="nlm-${k}">${esc(d.title)} (${d.cards.length})</button>`).join("")}
  </div>`;
  const bindDeck=()=>$$(".deck-btn",el).forEach(b=>b.onclick=()=>{LS.set(KEY+"fcDeck",b.dataset.fdeck);buildFcQueue();renderFlash();});
  const reset=()=>{src.forEach(g=>LS.del(KEY+"fc:"+g.term));buildFcQueue();renderFlash();renderDashboard();};
  if(fcIdx>=fcQueue.length){
    el.innerHTML=h+`<div class="card" style="text-align:center;padding:2.5rem"><h3 style="margin-bottom:.5rem">Round complete</h3><p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:1.2rem">Reviewed all ${fcQueue.length} cards.</p>
      <div class="btnrow" style="justify-content:center"><button class="b" id="fcRestart">Review again</button><button class="b" id="fcReset">Reset deck progress</button></div></div>`;
    bindDeck(); $("#fcRestart").onclick=()=>{buildFcQueue();renderFlash();}; $("#fcReset").onclick=reset; return;
  }
  const c=fcQueue[fcIdx];
  h+=`<div class="fc-meta"><span>Card ${fcIdx+1} / ${fcQueue.length} · box ${fcState(c.term).box}${c.rung?" · rung "+c.rung:""}</span><span>${learned} / ${src.length} in long-term memory</span></div>
    <div class="fc-stage" id="fcStage" title="Click or press Space to flip">
      <div class="fc-cat">${esc(c.category)} ${c.essential?'<span class="pill r100">Essential</span>':''}</div>
      <div class="fc-term">${esc(c.term)}</div>
      ${fcShown?`<div class="fc-def">${ec(c.definition)}</div>${c.see_also?`<div class="fc-hint">see also: ${esc(c.see_also)}</div>`:""}`:`<div class="fc-hint">Click the card or press <span class="kbd-shortcut">Space</span> to flip</div>`}
    </div>
    <div class="btnrow" style="justify-content:center;margin-top:1rem">
      <button class="b" id="fcPrev" ${fcIdx===0?"disabled style='opacity:.4'":""}>← Prev</button>
      <button class="b" id="fcToggleFlip">${fcShown?"Hide definition":"Show definition"}</button>
      <button class="b" id="fcNext" ${fcIdx>=fcQueue.length-1?"disabled style='opacity:.4'":""}>Next →</button>
    </div>
    ${fcShown?`<div class="fc-controls"><button class="again" data-g="0">Again (1)</button><button class="hard" data-g="1">Hard (2)</button><button class="good" data-g="2">Good (3)</button></div>`:""}
    <div class="btnrow" style="margin-top:1.5rem"><button class="b" id="fcReset2">Reset deck progress</button></div>`;
  el.innerHTML=h; bindDeck();
  const flip=e=>{if(e&&e.target.closest("a"))return;fcShown=!fcShown;renderFlash();};
  $("#fcStage").onclick=flip; $("#fcToggleFlip").onclick=()=>flip();
  $("#fcPrev").onclick=()=>{if(fcIdx>0){fcIdx--;fcShown=false;renderFlash();}};
  $("#fcNext").onclick=()=>{if(fcIdx<fcQueue.length-1){fcIdx++;fcShown=false;renderFlash();}};
  $$(".fc-controls button[data-g]",el).forEach(b=>b.onclick=()=>{
    const g=+b.dataset.g,st=fcState(c.term);
    if(g===0)st.box=1; else if(g===2)st.box=Math.min(6,st.box+1);
    st.due=Date.now()+BOX_DELAY[st.box];
    LS.set(KEY+"fc:"+c.term,st); fcIdx++; fcShown=false; renderFlash(); renderDashboard();
  });
  $("#fcReset2").onclick=reset;
}
document.addEventListener("keydown",e=>{
  if(!$("#v-flash").classList.contains("active"))return;
  if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName))return;
  if(e.code==="Space"){e.preventDefault();fcShown=!fcShown;renderFlash();}
  else if(e.code==="ArrowLeft"){e.preventDefault();if(fcIdx>0){fcIdx--;fcShown=false;renderFlash();}}
  else if(e.code==="ArrowRight"){e.preventDefault();if(fcIdx<fcQueue.length-1){fcIdx++;fcShown=false;renderFlash();}}
  else if(fcShown&&["1","2","3"].includes(e.key)){const b=$(`.fc-controls button[data-g="${+e.key-1}"]`);if(b)b.click();}
});

/* ---- Shorts globals (player, feed, and gallery live in enhance.js) ---- */
let shortItems=[],shortI=0;
const DEEP=(window.SHORTS&&window.SHORTS.deep_dive)||{file:"media/deep-dive-cut.mp4",youtube:""};
const ytSrc=id=>`https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&modestbranding=1`;

/* ---- Deck and deep-dive cut ---- */
function renderDeck(){
  const el=$("#v-deck"), C=DATA.cut||{};
  const labels=C.labels||[], slides=C.slides||[], cards=C.cards||[];
  const n=labels.length||slides.length;
  const deepFile=(DEEP.file||"").trim();
  const video=DEEP.youtube
    ?`<iframe class="wide-player" src="${ytSrc(DEEP.youtube)}" title="AI TRiSM deep dive cut" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy" style="border:0"></iframe>`
    :(deepFile?`<video class="wide-player" controls preload="metadata" poster="assets/slides/slide-01.jpg" src="${esc(deepFile)}"></video>`
      :`<div class="note"><b>Deep-dive cut.</b> Long-form MP4 is not on the site yet. Study the slide deck and question cards below. ${lib("media-cut-script","Cut script")}</div>`);
  let h=`<h2 class="vh">Deck and deep-dive cut</h2>
  <p class="lead">NotebookLM slides and the narrated cut. Each slide has its narration line and the question the cut asks before it. Amber outlines mark claims the source ledger does not support.</p>
  ${video}
  ${DEEP.youtube?`<p class="obj" style="margin-top:.4rem"><a href="https://www.youtube.com/watch?v=${DEEP.youtube}" target="_blank" rel="noopener">Open the deep-dive cut on YouTube ↗</a></p>`:(deepFile?`<p class="obj" style="margin-top:.4rem">The cut plays from this site. ${lib("media-cut-script","Cut script")}</p>`:"")}
  <div class="note" style="margin-top:1rem"><b>Opening line.</b> ${esc(C.open||"")}<br><b>Recap.</b> ${esc(C.recap||"")}</div>
  <p class="obj" style="margin-top:1rem"><b>Downloads:</b> Blueprint and deck files land in <code>assets/downloads/</code> with the pack. ${lib("media-cut-script","Cut script: narration and question cards")} · ${lib("media-shorts-plan","Shorts plan")} · ${lib("tdd-view-01-conceptual","Conceptual view")}</p>
  <h3 style="margin:1.6rem 0 .6rem;font-size:1.05rem">Slides</h3>
  <div class="deckrows">`;
  for(let i=1;i<=n;i++){
    const f=(DATA.deckFlags||{})[i], pad=String(i).padStart(2,"0"), card=cards[i-2];
    h+=`<div class="deckrow ${f?"flag":""}">
      <img src="assets/slides/slide-${pad}.jpg" alt="Slide ${i}: ${esc(labels[i-1]||"")}" loading="lazy" class="diagram" style="margin:0">
      <div class="deckbody">
        <div class="kick">Slide ${i} · ${esc(labels[i-1]||"")}</div>
        ${card?`<details class="look-box" style="margin:.2rem 0 .6rem"><summary>Question card: ${esc(card.question)}</summary><p style="margin-top:.4rem"><b>${esc(card.detail)}</b> ${esc(card.why)}<br><span style="color:var(--text-secondary)">Example: ${esc(card.example)}</span></p></details>`:""}
        <p class="narr">${esc(slides[i-1]||"")}</p>
        ${f?`<p class="flagnote">${ec(f)}</p>`:""}
      </div></div>`;
  }
  el.innerHTML=h+`</div>`;
}

/* ---- Quiz ---- */
function renderQuiz(){
  const el=$("#v-quiz");
  const secs=Object.keys(DATA.quizSections).map(Number);
  const sel=LS.get(KEY+"quizSec",secs[0]);
  let h=`<h2 class="vh">Quiz</h2>
  <p class="lead">${DATA.quiz.length} questions. The NotebookLM set is multiple choice. The others are short answers. ${lib("quiz-bank","Quiz bank")} · ${lib("nblm-gap-quiz","Full NotebookLM quiz")}</p>
  <div class="btnrow">${secs.map(s=>`<button class="b ${s==sel?"on":""}" data-qs="${s}">${esc(DATA.quizSections[s])} (${DATA.quiz.filter(q=>q.section==s).length})</button>`).join("")}</div>`;
  const qs=DATA.quiz.filter(q=>q.section==sel);
  qs.forEach((q,qi)=>{
    h+=`<div class="qcard" data-qi="${qi}"><div class="qq">${esc(q.question)}${q.rung?` <span class="pill r${q.rung}">${q.rung}</span>`:""}${q.src?` <span class="pill">${esc(q.src)}</span>`:""}</div>`;
    if(q.type==="mc") h+=`<div class="qopts">${q.options.map((o,oi)=>`<label data-o="${oi}"><input type="radio" name="q${qi}" style="margin-right:8px">${esc(o)}</label>`).join("")}</div>`;
    else h+=`<button class="reveal">Show model answer</button>`;
    h+=`<div class="qexp"><b>Answer:</b> ${ec(q.answer)}<br><br><b>Why / source:</b> ${ec(q.explanation)}</div></div>`;
  });
  el.innerHTML=h;
  $$("[data-qs]",el).forEach(b=>b.onclick=()=>{LS.set(KEY+"quizSec",+b.dataset.qs);renderQuiz();});
  $$(".qcard",el).forEach(card=>{
    const q=qs[+card.dataset.qi];
    $$(".qopts label",card).forEach(l=>l.onclick=()=>{
      $$(".qopts label",card).forEach(x=>x.classList.remove("correct","wrong"));
      const ok=$$(".qopts label",card).find(x=>q.options[+x.dataset.o]===q.answer);
      if(l!==ok) l.classList.add("wrong"); if(ok) ok.classList.add("correct");
      $(".qexp",card).classList.add("show");
    });
    const rv=$(".reveal",card); if(rv) rv.onclick=()=>$(".qexp",card).classList.add("show");
  });
}

/* ---- Glossary ---- */
function renderGlossary(){
  const el=$("#v-glossary");
  const q=(LS.get(KEY+"gq","")||"").toLowerCase(), cat=LS.get(KEY+"gcat","all");
  const cats=[...new Set(DATA.glossary.map(g=>g.category))];
  let h=`<h2 class="vh">Glossary <span style="font-size:1rem;color:var(--text-dim)">${DATA.glossary.length} terms</span></h2>
  <p class="lead">Study definitions. Rows marked gap pass still need a ledger check. ${lib("glossary","Glossary note")} · ${lib("nblm-gap-table","Data table")} · ${lib("source-ledger","Source ledger")}</p>
  <input class="search" id="gSearch" placeholder="filter terms…" value="${esc(q)}">
  <div class="gfilters"><button class="b ${cat==="all"?"on":""}" data-gc="all">All (${DATA.glossary.length})</button>${cats.map(c=>`<button class="b ${cat===c?"on":""}" data-gc="${esc(c)}">${esc(c)} (${DATA.glossary.filter(g=>g.category===c).length})</button>`).join("")}</div>`;
  cats.filter(c=>cat==="all"||c===cat).forEach(c=>{
    const items=DATA.glossary.filter(g=>g.category===c&&(!q||(g.term+g.definition+(g.see_also||"")).toLowerCase().includes(q)));
    if(!items.length)return;
    h+=`<h3 style="margin:1.1rem 0 .5rem;font-size:.95rem">${esc(c)} <span style="color:var(--text-dim);font-weight:400">· ${items.length}</span></h3>`;
    items.forEach(g=>h+=`<div class="gterm"><h4>${esc(g.term)} <span class="pill r${g.rung}">${g.rung}</span> ${g.essential?'<span class="pill r100">Essential</span>':''} ${g.source==="nblm-gap"?'<span class="pill" title="Drafted by a NotebookLM data table, checked against the source ledger">gap pass</span>':''}</h4><p>${ec(g.definition)}</p>${g.see_also?`<div class="sa">see also: ${esc(g.see_also)}</div>`:""}</div>`);
  });
  el.innerHTML=h;
  const s=$("#gSearch");
  s.oninput=()=>{LS.set(KEY+"gq",s.value);const p=s.selectionStart;renderGlossary();const ns=$("#gSearch");ns.focus();ns.setSelectionRange(p,p);};
  $$("[data-gc]",el).forEach(b=>b.onclick=()=>{LS.set(KEY+"gcat",b.dataset.gc);renderGlossary();});
}

/* ---- Prompts ---- */
function renderPrompts(){
  const el=$("#v-prompts");
  const pl=(window.LIBRARY||[]).filter(p=>p.section==="Prompts");
  let h=`<h2 class="vh">Prompt library</h2>
  <p class="lead">Study prompts for any LLM, plus the NotebookLM prompts that generated this pack's reports and media.</p>
  <div class="note danger"><b>Data hygiene.</b> No secrets, credentials, classified information, or private data in any model. Use public AI TRiSM / NIST / ISO material and synthetic examples. Not legal advice.</div>`;
  DATA.prompts.forEach(p=>{
    h+=`<div class="promptcat"><h3>${esc(p.cat)} <span class="pill">${esc(p.model)}</span></h3>
      <div class="obj" style="margin:.15rem 0 .4rem">${esc(p.desc)}</div>
      <div style="font-size:.8rem;color:var(--text-dim);margin-bottom:.4rem">Variants: ${p.items.map(esc).join(" · ")}</div>
      <details class="promptbox"><summary>Flagship prompt</summary><pre>${esc(p.flagship)}</pre><button class="copybtn" data-c="${encodeURIComponent(p.flagship)}">Copy</button></details></div>`;
  });
  h+=`<h3 style="margin:1.8rem 0 .6rem;font-size:1rem">NotebookLM prompt notes</h3><div class="libgrid">${pl.map(p=>`<a class="libcard" href="library/${p.slug}.html"><b>${esc(p.title)}</b><span>${esc(p.desc)}</span></a>`).join("")}</div>`;
  el.innerHTML=h;
  $$(".copybtn",el).forEach(b=>b.onclick=()=>{try{navigator.clipboard.writeText(decodeURIComponent(b.dataset.c));b.textContent="Copied";b.classList.add("copied");setTimeout(()=>{b.textContent="Copy";b.classList.remove("copied");},1200);}catch(e){}});
}

/* ---- Failure modes (practice checklist) ---- */
function renderCounsel(){
  const el=$("#v-failures");
  const f=LS.get(KEY+"fmView","all");
  const views=[...new Set(DATA.checklist.map(c=>c.view))];
  const done=DATA.checklist.filter((_,i)=>LS.get(KEY+"cl:"+i,false)).length;
  let h=`<h2 class="vh">Failure modes</h2>
  <p class="lead">What breaks in the engine and at the trust boundary. Check an item once you can name its tell and its fix without looking. ${lib("block-05-edge-cases","Edge cases")} · ${lib("nblm-failure-modes","NotebookLM failure catalog")}</p>
  <div class="card" style="margin-bottom:1rem"><div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap"><h3>Failure-mode review</h3><span class="pct" style="font-weight:700;color:var(--accent-color)">${done} / ${DATA.checklist.length} reviewed</span></div></div>
  <div class="gfilters"><button class="b ${f==="all"?"on":""}" data-fv="all">All views</button>${views.map(v=>`<button class="b ${f===v?"on":""}" data-fv="${esc(v)}">${esc(v)}</button>`).join("")}</div>`;
  DATA.checklist.forEach((item,i)=>{
    if(f!=="all"&&item.view!==f) return;
    const dn=LS.get(KEY+"cl:"+i,false), open=LS.get(KEY+"cl-open:"+i,false);
    h+=`<div class="cl-card"><div class="cl-header ${dn?"done":""}">
        <input type="checkbox" ${dn?"checked":""} data-cl="${i}">
        <div class="cl-title" data-cl-toggle="${i}">${esc(item.title)}</div>
        <span class="pill">${esc(item.view)}</span> ${ec("["+item.src+"]")}
        <button class="cl-toggle-btn" data-cl-toggle="${i}">${open?"Hide":"Show"}</button></div>
      <div class="cl-detail ${open?"open":""}"><div class="good-bad-grid">
        <div class="gb-box good-box"><h5>Mitigation</h5>${ec(item.good)}</div>
        <div class="gb-box bad-box"><h5>Tell and root cause</h5>${ec(item.bad)}</div>
      </div></div></div>`;
  });
  el.innerHTML=h;
  $$("[data-fv]",el).forEach(b=>b.onclick=()=>{LS.set(KEY+"fmView",b.dataset.fv);renderCounsel();});
  $$("input[data-cl]",el).forEach(cb=>cb.onchange=()=>{LS.set(KEY+"cl:"+cb.dataset.cl,cb.checked);renderCounsel();renderDashboard();});
  $$("[data-cl-toggle]",el).forEach(b=>b.onclick=()=>{const k=KEY+"cl-open:"+b.dataset.clToggle;LS.set(k,!LS.get(k,false));renderCounsel();});
}

/* ---- Decision rules (cheatsheet) ---- */
function renderCheat(){
  const el=$("#v-cheat");
  let h=`<h2 class="vh">Decision rules</h2><p class="lead">When a control belongs under AI TRiSM governance, runtime, ModelOps, privacy, or a neighbor framework. ${lib("cheatsheet","Cheatsheet note")}</p>`;
  DATA.cheat.forEach(s=>{h+=`<div class="rule"><b>${esc(s.t)}</b> ${cite(s.d)}</div>`;});
  h+=`<h3 style="margin:1.3rem 0 .6rem;font-size:1rem;color:var(--warn)">Falsifier</h3><div class="rule falsifier">${ec(DATA.falsifier)}</div>`;
  el.innerHTML=h;
}

/* ---- EA mapping ---- */
function renderEA(){
  const el=$("#v-ea");
  const tab=LS.get(KEY+"eaTab","all"), E=DATA.eaFrameworks;
  const box=(head,sub,items,color)=>`<div class="ea-box"><h4>${esc(head)}</h4><div style="font-weight:600;font-size:.8rem;color:${color||"var(--accent-color)"};margin-bottom:.4rem">${esc(sub)}</div><ul>${(items||[]).map(i=>`<li>${ec(i)}</li>`).join("")}</ul></div>`;
  const tabs=[["all","All"],["conceptual","Conceptual"],["logical","Logical"],["physical","Physical"],["integration","Integration"],["trust","Trust"],["alt","Altitude"],["table","Cross-walk"]];
  let h=`<h2 class="vh">EA mapping</h2>
  <p class="lead">${esc(E.note||"")} ${lib("nblm-tdd-crosswalk","EA crosswalk")} · ${lib("tdd-view-01-conceptual","Conceptual view")}</p>
  <div class="ea-subnav">${tabs.map(([k,l])=>`<button class="ea-tab-btn ${tab===k?"active":""}" data-eatab="${k}">${l}</button>`).join("")}</div>`;
  if(tab==="all"||tab==="conceptual") h+=`<div class="ea-card"><h3>Conceptual</h3><div class="ea-grid">${(E.conceptual||[]).map(t=>box(t.phase,t.t,t.items)).join("")}</div></div>`;
  if(tab==="all"||tab==="logical") h+=`<div class="ea-card"><h3>Logical</h3><div class="ea-grid">${(E.logical||[]).map(t=>box(t.phase,t.t,t.items)).join("")}</div></div>`;
  if(tab==="all"||tab==="physical") h+=`<div class="ea-card"><h3>Physical</h3><div class="ea-grid">${(E.physical||[]).map(t=>box(t.phase,t.t,t.items,"var(--r300)")).join("")}</div></div>`;
  if(tab==="all"||tab==="integration") h+=`<div class="ea-card"><h3>Integration</h3><div class="ea-grid">${(E.integration||[]).map(t=>box(t.phase,t.t,t.items)).join("")}</div></div>`;
  if(tab==="all"||tab==="trust") h+=`<div class="ea-card"><h3>Trust</h3><div class="ea-grid">${(E.trust||[]).map(t=>box(t.phase,t.t,t.items,"var(--warn)")).join("")}</div></div>`;
  if(tab==="all"||tab==="alt") h+=`<div class="ea-card"><h3>Altitude rules</h3><table class="ea-table"><thead><tr><th>View</th><th>Question</th><th>Allowed</th><th>Not allowed</th><th>Note</th></tr></thead><tbody>${(E.altitudes||[]).map(a=>`<tr><td><b>${esc(a.name)}</b></td><td>${esc(a.q)}</td><td>${esc(a.allowed)}</td><td>${esc(a.forbidden)}</td><td>${lib(a.lib,"Open")}</td></tr>`).join("")}</tbody></table></div>`;
  if(tab==="all"||tab==="table"){const table=E.table||[];h+=`<div class="ea-card"><h3>Cross-walk</h3><table class="ea-table"><thead><tr>${(table[0]||[]).map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${table.slice(1).map(r=>`<tr>${r.map((c,i)=>`<td>${i?esc(c):"<b>"+esc(c)+"</b>"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;}
  el.innerHTML=h;
  $$(".ea-tab-btn",el).forEach(b=>b.onclick=()=>{LS.set(KEY+"eaTab",b.dataset.eatab);renderEA();});
}

/* ---- Library ---- */
function renderLibrary(){
  const el=$("#v-library");
  const L=window.LIBRARY||[];
  const secs=[...new Set(L.map(p=>p.section))];
  let h=`<h2 class="vh">Library <span style="font-size:1rem;color:var(--text-dim)">${L.length} pages</span></h2>
  <p class="lead">Every postable note from the Obsidian deep-dive pack and the NotebookLM exports, rendered as a web page with diagrams, Mermaid charts, and live source links. The vault stays the source of truth.</p>`;
  if(!L.length) h+=`<div class="note danger">Library manifest not found.</div>`;
  secs.forEach(s=>{
    h+=`<h3 style="margin:1.2rem 0 .6rem;font-size:1rem;color:var(--accent-color)">${esc(s)}</h3>`;
    if(s==="NotebookLM source bundle") h+=`<div class="note" style="margin-bottom:.8rem"><b>As uploaded.</b> The files sent to NotebookLM to build the notebook. The vault notes above are newer and win where they differ.</div>`;
    if(s==="NotebookLM reports") h+=`<div class="note danger" style="margin-bottom:.8rem"><b>Secondary.</b> NotebookLM reports carry a caveat banner; where they differ from the architecture views, the views win.</div>`;
    h+=`<div class="libgrid">${L.filter(p=>p.section===s).map(p=>`<a class="libcard" href="library/${p.slug}.html"><b>${esc(p.title)}</b><span>${esc(p.desc||"")}</span></a>`).join("")}</div>`;
  });
  el.innerHTML=h;
}

/* ---- Debates (claim, warrant, designed counter-evidence) ---- */
function debateStatusPill(id, status, kind){
  const st=status||"unrun";
  const run=/^run\b/i.test(st);
  const bits=[id,st,kind].filter(Boolean);
  return `<span class="pill${run?" r100":""}">${esc(bits.join(" · "))}</span>`;
}
function renderDebates(){
  const el=$("#v-debates"), rows=DATA.debates||[];
  const ids=rows.flatMap(d=>[
    {id:d.idA,st:d.statusA},{id:d.idB,st:d.statusB},{id:d.idBoth,st:d.statusBoth}
  ].filter(x=>x.id));
  const runN=ids.filter(x=>/^run\b/i.test(x.st||"")).length;
  let h=`<h2 class="vh">Debates</h2>
  <p class="lead">Live claims an architect has to walk into a room with. Each row names two sides, the warrant that makes the evidence count, a hidden assumption, and a test that would change the picture. Full note: ${lib("claims-debates","Claims and debates")}.</p>
  <p class="lead" style="margin-top:-.4rem">So what? ${esc((DATA.debateProblem&&DATA.debateProblem.soWhat)||"A placement that cannot name its warrant will not survive a design review.")}</p>
  <p class="lead" style="margin-top:-.4rem">${runN} of ${ids.length} designed tests run. Green pill is run. Evidence sittings are still open.</p>`;
  rows.forEach((d,i)=>{
    h+=`<details class="cl-card" ${i===0?"open":""}><summary class="cl-header" style="cursor:pointer"><div class="cl-title">${esc(d.title)}</div><span class="pill">${esc(d.src||"")}</span>${debateStatusPill(d.idA,d.statusA)}${debateStatusPill(d.idB,d.statusB)}${debateStatusPill(d.idBoth,d.statusBoth)}</summary>
      <div class="cl-detail open"><div class="good-bad-grid">
        <div class="gb-box good-box"><h5>Claim A</h5>${ec(d.claimA)}</div>
        <div class="gb-box bad-box"><h5>Claim B</h5>${ec(d.claimB)}</div>
      </div>
      <div class="rule" style="margin-top:.8rem"><b>Warrant.</b> ${ec(d.warrant)}</div>
      <div class="rule"><b>Hidden assumption.</b> ${ec(d.assume)}</div>
      <div class="rule"><b>Qualification.</b> ${ec(d.qualify)}</div>
      <div class="rule"><b>Evidence that would change the picture.</b>
        <div style="margin-top:.45rem">${debateStatusPill(d.idA,d.statusA,d.kindA)} <b>Support A.</b> ${ec(d.testA)}</div>
        <div style="margin-top:.35rem">${debateStatusPill(d.idB,d.statusB,d.kindB)} <b>Support B.</b> ${ec(d.testB)}</div>
        <div style="margin-top:.35rem">${debateStatusPill(d.idBoth,d.statusBoth,d.kindBoth)} <b>Weaken both.</b> ${ec(d.testBoth)}</div>
      </div>
      </div></details>`;
  });
  el.innerHTML=h;
}

/* ---- Source ledger ---- */
function renderReferences(){
  const el=$("#v-refs");
  const q=(LS.get(KEY+"refq","")||"").toLowerCase(), sel=LS.get(KEY+"refcat","all");
  const cats=[...new Set(SOURCES.map(s=>s.g))];
  let h=`<h2 class="vh">From the NotebookLM reports</h2>
  <p class="lead">The long reports are in the library. These are the lines worth reviewing on a phone. Where a report and the ledger disagree, the ledger wins.</p>`;
  (DATA.fromReports||[]).forEach(r=>{
    h+=`<div class="ref-card"><div class="ref-info"><b>${esc(r.point)}</b><div class="ref-sources">${lib(r.slug,r.title)}</div></div></div>`;
  });
  h+=`<h2 class="vh" style="margin-top:1.6rem">Talks <span style="font-size:1rem;color:var(--text-dim)">${(DATA.watch||[]).length}</span></h2>
  <p class="lead">Talks that belong with this pack. The ledger outranks a talk when they disagree.</p>`;
  (DATA.watch||[]).forEach(v=>{
    h+=`<div class="ref-card"><div class="ref-info"><a class="ref-anchor" href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a>
      <div class="ref-url">${esc(v.who)} · ${esc(v.min)}</div><div class="ref-sources">${esc(v.why)}</div></div>
      <a class="b" href="${esc(v.url)}" target="_blank" rel="noopener" style="font-size:.76rem;flex-shrink:0">Watch ↗</a></div>`;
  });
  const oreillyShelf=(DATA.books||DATA.oreilly||[]).filter(b=>{
    const u=(b.url||"").toLowerCase();
    return u.includes("learning.oreilly.com")||u.includes("oreilly.com/library")||u.includes("oreilly.com/videos");
  });
  h+=`<h2 class="vh" style="margin-top:1.6rem">O'Reilly <span style="font-size:1rem;color:var(--text-dim)">${oreillyShelf.length}</span></h2>
  <p class="lead">These need an O'Reilly login. Practice material only — the source ledger below outranks a book when they disagree.</p>`;
  if(!oreillyShelf.length){
    h+=`<div class="note" style="margin:.6rem 0 1rem">No learning.oreilly.com titles in <code>DATA.books</code> yet. Primary standards stay in the ledger, not this shelf.</div>`;
  }
  oreillyShelf.forEach(b=>{
    h+=`<div class="ref-card"><div class="ref-info"><a class="ref-anchor" href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.title)}</a>
      <div class="ref-url">${esc(b.kind)} · ${esc(b.who)}</div></div>
      <a class="b" href="${esc(b.url)}" target="_blank" rel="noopener" style="font-size:.76rem;flex-shrink:0">Open ↗</a></div>`;
  });
  h+=`<h2 class="vh" style="margin-top:1.6rem">Source ledger <span style="font-size:1rem;color:var(--text-dim)">${SOURCES.length} sources</span></h2>
  <p class="lead">${SOURCES.length} sources. The vault ledger wins over a NotebookLM report. ${lib("source-ledger","Ledger note")} · ${lib("resources","Reading order")}</p>
  <input class="search" id="refSearch" placeholder="filter by title, URL, or type…" value="${esc(q)}">
  <div class="gfilters"><button class="b ${sel==="all"?"on":""}" data-rcat="all">All (${SOURCES.length})</button>${cats.map(c=>`<button class="b ${sel===c?"on":""}" data-rcat="${esc(c)}">${esc(c)} (${SOURCES.filter(s=>s.g===c).length})</button>`).join("")}</div>`;
  cats.filter(c=>sel==="all"||sel===c).forEach(c=>{
    const items=SOURCES.filter(s=>s.g===c&&(!q||(s.t+s.u+s.type).toLowerCase().includes(q)));
    if(!items.length)return;
    h+=`<h3 style="margin:1.4rem 0 .6rem;font-size:1rem;color:var(--accent-color)">${esc(c)} <span style="color:var(--text-dim);font-weight:400">· ${items.length}</span></h3>`;
    items.forEach(s=>h+=`<div class="ref-card"><div class="ref-info">
        <a class="ref-anchor" href="${esc(s.u)}" target="_blank" rel="noopener">S${s.n} · ${esc(s.t)}</a>
        <div class="ref-url">${esc(s.u)}</div>
        <div class="ref-sources">${esc(s.type)} · trust: ${esc(s.trust)} · blocks ${esc(s.b)}</div></div>
        <a class="b" href="${esc(s.u)}" target="_blank" rel="noopener" style="font-size:.76rem;flex-shrink:0">Open ↗</a></div>`);
  });
  el.innerHTML=h;
  const s=$("#refSearch");
  s.oninput=()=>{LS.set(KEY+"refq",s.value);const p=s.selectionStart;renderReferences();const ns=$("#refSearch");ns.focus();ns.setSelectionRange(p,p);};
  $$("[data-rcat]",el).forEach(b=>b.onclick=()=>{LS.set(KEY+"refcat",b.dataset.rcat);renderReferences();});
}

/* ---- Theme engine (keys shared with library pages) ---- */
function applyTheme(palette,mode){
  // House palette only; ignore legacy palette names from localStorage
  document.documentElement.setAttribute("data-theme","house-"+mode);
  LS.set("appPalette","house"); LS.set("appMode",mode);
  const btn=$("#themeToggleBtn");
  if($("#themeToggleIcon")) $("#themeToggleIcon").textContent=mode==="dark"?"🌙":"☀️";
  if($("#themeToggleText")) $("#themeToggleText").textContent=mode==="dark"?"Dark":"Light";
  if(btn) btn.setAttribute("aria-label", mode==="dark"?"Switch to light theme":"Switch to dark theme");
}
function initTheme(){
  applyTheme("house", LS.get("appMode",defaultMode()));
  const btn=$("#themeToggleBtn");
  if(btn) btn.onclick=()=>applyTheme("house", LS.get("appMode","dark")==="dark"?"light":"dark");
}

function defaultMode(){try{return window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}catch(e){return "dark";}}

/* ---- Init ---- */
initTheme();renderDashboard();renderCurriculum();renderViews();renderMap();renderFlash();renderDeck();renderQuiz();renderGlossary();renderPrompts();renderCounsel();renderCheat();renderEA();renderLibrary();renderReferences();
