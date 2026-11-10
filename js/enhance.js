/* ============================================================
   Engagement layer: hash routing, Today + daily architecture
   challenge, Shorts feed, mobile tab bar and sheets, search
   palette, streaks. Ported from learn-ai-law; loads after
   js/data.js and js/app.js and reuses their globals.
   All saved keys use the "lat:" prefix: other learn-* sites share this
   github.io origin, so unprefixed keys would collide.
   Theme keys appMode and appPalette stay unprefixed and shared.
   ============================================================ */
(function(){
"use strict";

const K=s=>KEY+s;
const APP_URL="https://aaronmeis.github.io/learn-ai-trism/";

/* ---------- Views and groups ---------- */
const VIEWS = {
  today:"Today", curriculum:"Curriculum", views:"Architecture views", shorts:"Shorts", deck:"Deck and deep-dive cut", library:"Library",
  flash:"Flashcards", quiz:"Quiz", practice:"Practice", failures:"Failure modes", prompts:"Prompts",
  cheat:"Decision rules", map:"Progress map", glossary:"Glossary", ea:"EA mapping", debates:"Debates", refs:"Source ledger", dashboard:"Overview"
};
const GROUPS = {
  learn:["curriculum","views","shorts","deck","library"],
  practice:["flash","quiz","practice","failures","prompts"],
  reference:["cheat","map","glossary","ea","debates","refs","dashboard"]
};
const GROUP_OF = {};
Object.keys(GROUPS).forEach(g=>GROUPS[g].forEach(v=>GROUP_OF[v]=g));
const PILLARS = ["Governance","Runtime","ModelOps","Privacy"];
const GOAL = {challenge:3, shorts:1, reviews:5};
const mq = window.matchMedia("(max-width: 899px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const isMobile = ()=>mq.matches;

/* ---------- Progress store ---------- */
function dayKey(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function dayNum(d){d=d||new Date();return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5);}
const Store = {
  activity(){return LS.get(K("activity"),{});},
  watched(){return LS.get(K("shortsWatched"),{});},
  shortQuiz(){return LS.get(K("shortQuiz"),{});},
  bump(kind,n){
    const a=this.activity(),k=dayKey();
    a[k]=a[k]||{shorts:0,cards:0,quiz:0};
    a[k][kind]=(a[k][kind]||0)+(n||1);
    LS.set(K("activity"),a);
    if(currentView==="today") renderToday();
  },
  markWatched(id){
    const w=this.watched();
    if(w[id]) return false;
    w[id]=Date.now(); LS.set(K("shortsWatched"),w); this.bump("shorts");
    return true;
  }
};

/* ---------- Daily architecture challenge ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function challengeFor(d){
  const n=dayNum(d), r=rng(n*2654435761);
  const cards=(DATA.cut&&DATA.cut.cards)||[], fms=DATA.checklist||[], pools=Object.keys(DATA.drills||{});
  if(!cards.length||!fms.length||!pools.length) return null;
  const ci=((n%cards.length)+cards.length)%cards.length;
  const fi=((n*7+3)%fms.length+fms.length)%fms.length;
  const fm=fms[fi];
  const others=fms.map((x,i)=>i).filter(i=>i!==fi&&fms[i].good!==fm.good);
  const picks=[];
  while(picks.length<2){const i=others[Math.floor(r()*others.length)]; if(!picks.includes(i)) picks.push(i);}
  const fmOpts=[fi,...picks].map(i=>({i,t:fms[i].good})).sort(()=>r()-.5);
  const pool=DATA.drills[pools[((n%pools.length)+pools.length)%pools.length]];
  const item=pool.items[((Math.floor(n/pools.length))%pool.items.length+pool.items.length)%pool.items.length];
  return {key:dayKey(d), card:cards[ci], cardSlide:ci+2, fm, fi, fmOpts, pool, item};
}
function chState(k){return (LS.get(K("challenge"),{})[k])||{r:[null,null,null],revealed:false};}
function chSave(k,st){const all=LS.get(K("challenge"),{});all[k]=st;LS.set(K("challenge"),all);}
function chDone(st){return st&&st.r&&st.r.every(x=>x!==null);}
function chScore(st){return st&&st.r?st.r.filter(x=>x===1).length:0;}
function streak(){
  const all=LS.get(K("challenge"),{}); let n=0; const d=new Date();
  if(!chDone(all[dayKey(d)])) d.setDate(d.getDate()-1);
  while(chDone(all[dayKey(d)])){n++;d.setDate(d.getDate()-1);}
  return n;
}
function bestStreak(){
  const all=LS.get(K("challenge"),{}); const days=Object.keys(all).filter(k=>chDone(all[k])).sort();
  let best=0,cur=0,prev=null;
  days.forEach(k=>{const [y,m,dd]=k.split("-").map(Number);const t=Date.UTC(y,m-1,dd)/864e5;cur=(prev!==null&&t-prev===1)?cur+1:1;best=Math.max(best,cur);prev=t;});
  return best;
}
function answer(round,val){
  const c=challengeFor(), st=chState(c.key);
  if(st.r[round]!==null) return;
  st.r[round]=val; chSave(c.key,st); Store.bump("quiz");
  if(chDone(st)){ const s=streak(); if(s>LS.get(K("bestStreak"),0)) LS.set(K("bestStreak"),s); }
  renderToday();
}
function challengeHTML(){
  const c=challengeFor();
  if(!c) return `<div class="note">Daily challenge loads when the pack data is in.</div>`;
  const st=chState(c.key), done=chDone(st), sc=chScore(st);
  const marks=st.r.map(x=>x===null?`<i class="dot"></i>`:`<i class="dot ${x?"ok":"no"}"></i>`).join("");
  const optBtns=(round,opts,correct)=>opts.map((o,i)=>{
    let cls=""; if(st.r[round]!==null){ if(i===correct) cls="correct"; else if(st.pick&&st.pick[round]===i) cls="wrong"; }
    return `<button type="button" class="sx-opt ${cls}" data-round="${round}" data-i="${i}" ${st.r[round]!==null?"disabled":""}>${ec(o)}</button>`;}).join("");
  const fmCorrect=c.fmOpts.findIndex(o=>o.i===c.fi);
  const r1=st.r[0]!==null||st.revealed
    ?`<div class="ch-ans"><b>${esc(c.card.detail)}</b> ${esc(c.card.why)}<br><span class="muted">Example: ${esc(c.card.example)}</span></div>
      ${st.r[0]===null?`<div class="btnrow" style="margin:.6rem 0 0"><button type="button" class="b" data-self="1">I had it</button><button type="button" class="b" data-self="0">I missed it</button></div>`:`<p class="ch-res ${st.r[0]?"ok":"no"}">${st.r[0]?"You had it.":"Marked as missed. It comes back in "+DATA.cut.cards.length+" days."} <a href="#/deck">Slide ${c.cardSlide} in the deck →</a></p>`}`
    :`<button type="button" class="b" data-reveal="1">Answer in your head, then reveal</button>`;
  return h`<div class="ch-card ${done?"done":""}" id="challenge">
    <div class="ch-head"><div><div class="ch-kick">Daily architecture challenge</div><div class="ch-date">${esc(new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}))} · same three rounds for everyone today</div></div><div class="ch-dots" aria-label="${sc} of 3 correct">${marks}</div></div>
    <div class="ch-rounds">
      <div class="ch-round"><div class="ch-rk">1 · Question of the day</div><div class="ch-q">${esc(c.card.question)}</div>${r1}</div>
      <div class="ch-round"><div class="ch-rk">2 · Spot the fix <span class="pill">${esc(c.fm.view)}</span></div>
        <div class="ch-q">${st.r[1]!==null?esc(c.fm.title):"What's the fix for this symptom?"}</div><p class="ch-tell">${ec(c.fm.bad)}</p><div class="ch-ask">Pick the mitigation that fixes it.</div>
        <div class="qopts">${optBtns(1,c.fmOpts.map(o=>o.t),fmCorrect)}</div>
        ${st.r[1]!==null?`<p class="ch-res ${st.r[1]?"ok":"no"}">${st.r[1]?"Correct.":"Not quite."} Source ${ec("["+c.fm.src+"]")} · <a href="#/failures">All failure modes →</a></p>`:""}</div>
      <div class="ch-round"><div class="ch-rk">3 · ${esc(c.pool.title)}</div>
        <div class="ch-q">${esc(c.item.p)}</div><div class="ch-ask">${ec(c.pool.ask)}</div>
        <div class="qopts">${optBtns(2,c.pool.options,c.item.a)}</div>
        ${st.r[2]!==null?`<p class="ch-res ${st.r[2]?"ok":"no"}">${st.r[2]?"Correct.":"Not quite."} ${esc(c.item.why)} ${ec("["+c.item.src+"]")}</p>`:""}</div>
    </div>
    ${done?h`<div class="ch-sum"><div><b>${sc}/3 today</b> · ${streak()} day streak · best ${Math.max(bestStreak(),LS.get(K("bestStreak"),0))}</div>
      <div class="btnrow" style="margin:0"><button type="button" class="b" id="chShare">Copy result</button><a class="b" href="#/quiz">Keep practicing →</a></div></div>`:""}
  </div>`;
}
function bindChallenge(root){
  const c=challengeFor();
  if(!c) return;
  $$("[data-reveal]",root).forEach(b=>b.onclick=()=>{const st=chState(c.key);st.revealed=true;chSave(c.key,st);renderToday();});
  $$("[data-self]",root).forEach(b=>b.onclick=()=>answer(0,+b.dataset.self));
  $$(".ch-round .sx-opt",root).forEach(b=>b.onclick=()=>{
    const round=+b.dataset.round, i=+b.dataset.i, st=chState(c.key);
    if(st.r[round]!==null) return;
    st.pick=st.pick||{}; st.pick[round]=i; chSave(c.key,st);
    const ok=round===1?c.fmOpts[i].i===c.fi:i===c.item.a;
    answer(round,ok?1:0);
  });
  const sh=$("#chShare",root);
  if(sh) sh.onclick=()=>{
    const st=chState(c.key);
    const txt=`Learn AI TRiSM daily challenge ${c.key}: ${chScore(st)}/3 ${st.r.map(x=>x?"■":"□").join("")} · ${streak()} day streak\n${APP_URL}`;
    try{navigator.clipboard.writeText(txt).then(()=>toast("Result copied"),()=>toast(txt));}catch(e){toast(txt);}
  };
}

/* ---------- Routing ---------- */
let currentView = null;
function parseHash(){
  const m=(location.hash||"").match(/^#\/([\w-]+)(?:\/(.+))?$/);
  return m?{v:m[1],sub:m[2]?decodeURIComponent(m[2]):null}:null;
}
function show(v,sub){
  if(!VIEWS[v]||!document.getElementById("v-"+v)) v="today";
  const changed = v!==currentView;
  currentView=v;
  $$("#nav .nav-item").forEach(el=>{
    const on=el.dataset.v===v; el.classList.toggle("active",on);
    if(on) el.setAttribute("aria-current","page"); else el.removeAttribute("aria-current");
  });
  $$("section.view").forEach(el=>el.classList.toggle("active",el.id==="v-"+v));
  const tab = v==="today"||v==="shorts" ? v : (GROUP_OF[v]==="reference"?"more":GROUP_OF[v]);
  $$("#mTabbar [data-tab]").forEach(el=>el.classList.toggle("active",el.dataset.tab===tab));
  document.body.dataset.view=v;
  LS.set(K("view"),v);
  document.title = VIEWS[v]+" · Learn AI TRiSM";
  closeSheet();
  pauseHiddenMedia();
  if(v==="today") renderToday();
  if(v==="shorts"){ if(sub) selectShortById(sub,false); renderShorts(); }
  const paint={glossary:renderGlossary,quiz:renderQuiz,views:renderViews,refs:renderReferences,flash:renderFlash,library:renderLibrary,cheat:renderCheat,failures:renderCounsel,prompts:renderPrompts,ea:renderEA,debates:renderDebates,practice:renderPractice,map:renderMap,dashboard:renderDashboard,curriculum:renderCurriculum,deck:renderDeck};
  if(changed && paint[v]) paint[v]();
  if(changed){
    const main=$("#main"); if(main) main.scrollTop=0;
    window.scrollTo(0,0);
  }
}
window.go = function(v){
  const target="#/"+v;
  if(location.hash===target) show(v); else location.hash=target;
};
window.addEventListener("hashchange",()=>{const r=parseHash(); if(r) show(r.v,r.sub);});
$$("#nav .nav-item").forEach(el=>el.onclick=null);

function pauseHiddenMedia(){
  $$("section.view:not(.active) video, section.view:not(.active) audio").forEach(vd=>{try{vd.pause();}catch(e){}});
  if(currentView!=="deck") $$("#v-deck iframe").forEach(f=>{const s=f.src;f.src="about:blank";f.src=s;});
  if(currentView!=="shorts") destroyAllPlayers();
}

/* ---------- Helpers ---------- */
function fmtDur(s){if(!s&&s!==0)return "";s=Math.round(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}
function h(strings,...vals){return strings.reduce((a,s,i)=>a+s+(i<vals.length?vals[i]:""),"");}
function seenCards(){return DATA.glossary.filter(g=>LS.get(K("fc:"+g.term),null)!==null);}
function dueReviews(){const now=Date.now();return seenCards().filter(g=>fcState(g.term).due<=now);}
function norm(s){return (s||"").toLowerCase();}

/* ---------- Shorts data ---------- */
let shortFilter = LS.get(K("shortFilter"),"all");
let shortsReady = false;
window.loadShorts = function(){
  const cat=window.SHORTS||{items:[]};
  shortItems=(cat.items||[]).filter(it=>it.status==="ready");
  shortsReady=true;
  const r=parseHash(); if(r&&r.v==="shorts"&&r.sub) selectShortById(r.sub,false);
  else { const last=LS.get(K("lastShort"),null); const i=shortItems.findIndex(s=>s.id===last); if(i>=0) shortI=i; }
  renderShorts();
  if(currentView==="today") renderToday();
  buildPaletteIndex();
};
function selectShortById(id,updateHash){
  const i=shortItems.findIndex(s=>s.id===id);
  if(i>=0){shortI=i; LS.set(K("lastShort"),id);}
  if(updateHash!==false) history.replaceState(null,"","#/shorts/"+encodeURIComponent(id));
}
function nextUnwatched(from){
  const w=Store.watched(); const n=shortItems.length; if(!n) return null;
  for(let k=0;k<n;k++){const it=shortItems[(from+k)%n]; if(!w[it.id]) return it;}
  return null;
}
function continueShort(){
  const last=LS.get(K("lastShort"),null); const w=Store.watched();
  const i=shortItems.findIndex(s=>s.id===last);
  if(i>=0&&!w[last]) return shortItems[i];
  return nextUnwatched(i>=0?i+1:0)||shortItems[0];
}
function filteredShorts(){
  const w=Store.watched();
  if(shortFilter==="all") return shortItems;
  if(shortFilter==="unwatched") return shortItems.filter(s=>!w[s.id]);
  return shortItems.filter(s=>s.pillar===shortFilter);
}

/* Related practice for a Short: quiz questions and glossary terms matched on its keywords. */
function relatedFor(it){
  const kws=(it.keywords||[]).map(norm);
  const score=t=>{t=norm(t);let s=0;kws.forEach(k=>{if(k&&t.includes(k))s+=k.length>6?2:1;});return s;};
  const quiz=DATA.quiz.map((q,idx)=>({q,idx,s:score(q.question+" "+q.answer)})).filter(x=>x.s>=3).sort((a,b)=>b.s-a.s).slice(0,2);
  const terms=DATA.glossary.map(g=>({g,s:score(g.term+" "+g.term+" "+g.definition)})).filter(x=>x.s>=2).sort((a,b)=>b.s-a.s).slice(0,5).map(x=>x.g);
  return {quiz,terms};
}

/* ---------- Players (MP4 or unlisted YouTube) ---------- */
const players = new Set();
let ytReady=null;
function loadYT(){
  if(ytReady) return ytReady;
  ytReady=new Promise((res,rej)=>{
    if(window.YT&&window.YT.Player) return res();
    const prev=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{if(prev)prev();res();};
    const s=document.createElement("script"); s.src="https://www.youtube.com/iframe_api";
    s.onerror=()=>{ytReady=null;rej(new Error("YouTube player script blocked"));};
    setTimeout(()=>{ if(!(window.YT&&window.YT.Player)){ytReady=null;rej(new Error("YouTube player script timed out"));} },8000);
    document.head.appendChild(s);
  });
  return ytReady;
}
function mountPlayer(host,it,opts){
  opts=opts||{};
  const done=()=>{ if(Store.markWatched(it.id)){ refreshWatchedUI(); } if(opts.onEnded) opts.onEnded(); };
  let api={destroy(){},pause(){},play(){},el:null};
  if(it.youtube){
    const div=document.createElement("div"); host.appendChild(div);
    let yp=null, dead=false;
    const fallback=why=>{
      console.warn("[shorts] YouTube could not play "+it.id+" ("+it.youtube+"): "+why);
      if(dead) return; dead=true; try{yp&&yp.destroy();}catch(x){} host.innerHTML="";
      if(it.file){ const fb=mountPlayer(host,Object.assign({},it,{youtube:""}),opts); api.pause=fb.pause; api.play=fb.play; api.el=fb.el; const d0=api.destroy; api.destroy=()=>{fb.destroy();d0();}; }
      else host.innerHTML='<p style="color:#fff;padding:1rem;text-align:center">This video is not available on YouTube.</p>';
    };
    loadYT().then(()=>{ if(dead) return;
      yp=new YT.Player(div,{host:"https://www.youtube-nocookie.com",videoId:it.youtube,width:"100%",height:"100%",
        playerVars:{playsinline:1,rel:0,modestbranding:1,autoplay:opts.autoplay?1:0,mute:opts.muted?1:0},
        events:{onStateChange:e=>{ if(e.data===0) done(); }, onError:e=>fallback("error "+e.data)}});
    }).catch(err=>fallback(err.message));
    api={destroy(){dead=true;try{yp&&yp.destroy();}catch(e){} host.innerHTML="";},pause(){try{yp&&yp.pauseVideo();}catch(e){}},play(){try{yp&&yp.playVideo();}catch(e){}},el:div};
  }else{
    const v=document.createElement("video");
    v.src=it.file; v.poster=it.poster||""; v.playsInline=true; v.setAttribute("playsinline",""); v.setAttribute("webkit-playsinline","");
    v.controls=!!opts.controls; v.preload="metadata"; v.muted=!!opts.muted;
    v.setAttribute("aria-label",it.title);
    const pos=LS.get(K("shortPos"),{}); if(pos[it.id]&&pos[it.id]<(it.duration||1e9)-3) v.currentTime=pos[it.id];
    let lastSave=0, fired=false;
    v.addEventListener("timeupdate",()=>{
      if(v.duration&&!fired&&v.currentTime/v.duration>=0.9){fired=true;done();}
      if(Math.abs(v.currentTime-lastSave)>=5){lastSave=v.currentTime;const p=LS.get(K("shortPos"),{});p[it.id]=Math.floor(v.currentTime);LS.set(K("shortPos"),p);}
      if(opts.onTime) opts.onTime(v.currentTime,v.duration);
    });
    v.addEventListener("ended",()=>{const p=LS.get(K("shortPos"),{});delete p[it.id];LS.set(K("shortPos"),p); if(!fired){fired=true;done();} else if(opts.onEnded) opts.onEnded();});
    host.appendChild(v);
    if(opts.autoplay){ const pr=v.play(); if(pr&&pr.catch) pr.catch(()=>{}); }
    api={destroy(){try{v.pause();v.removeAttribute("src");v.load();}catch(e){} v.remove();},pause(){try{v.pause();}catch(e){}},play(){const p=v.play();if(p&&p.catch)p.catch(()=>{});},el:v};
  }
  players.add(api);
  const d=api.destroy; api.destroy=()=>{players.delete(api);d();};
  return api;
}
function destroyAllPlayers(){Array.from(players).forEach(p=>p.destroy());}

/* ---------- Shorts view ---------- */
function tileHTML(it,idx,active){
  const w=Store.watched()[it.id];
  return h`<button type="button" class="sx-tile ${active?"active":""} ${w?"watched":""}" data-id="${esc(it.id)}" aria-label="${esc(it.title)}${w?" (watched)":""}">
    <span class="sx-thumb">${it.poster?`<img src="${esc(it.poster)}" alt="" loading="lazy" decoding="async">`:""}${it.duration?`<span class="sx-dur">${fmtDur(it.duration)}</span>`:""}${w?`<span class="sx-check" aria-hidden="true">✓</span>`:""}</span>
    <span class="sx-tt">${esc(it.title)}</span>
    <span class="sx-pl">${esc(it.pillar||"")}</span>
  </button>`;
}
function filtersHTML(){
  const w=Store.watched(); const un=shortItems.filter(s=>!w[s.id]).length;
  const used=PILLARS.filter(p=>shortItems.some(s=>s.pillar===p));
  const opts=[["all","All "+shortItems.length],["unwatched","Unwatched "+un]].concat(used.map(p=>[p,p]));
  return `<div class="sx-filters" role="toolbar" aria-label="Filter Shorts">`+opts.map(([k,l])=>`<button type="button" class="chip ${shortFilter===k?"on":""}" data-f="${esc(k)}" aria-pressed="${shortFilter===k}">${esc(l)}</button>`).join("")+`</div>`;
}
function checkHTML(it){
  const {quiz,terms}=relatedFor(it); const res=Store.shortQuiz()[it.id];
  let out=`<div class="sx-checkpanel" data-id="${esc(it.id)}"><h3>Check yourself</h3>`;
  if(!quiz.length&&!terms.length){return out+`<p class="muted">No linked questions yet. Try the <a href="#/quiz">quiz</a>.</p></div>`;}
  quiz.forEach(({q,idx})=>{
    out+=`<div class="qcard sx-q" data-qidx="${idx}"><div class="qq">${esc(q.question)}</div>`;
    if(q.type==="mc"&&q.options) out+=`<div class="qopts">`+q.options.map(o=>`<button type="button" class="sx-opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")+`</div>`;
    else out+=`<button type="button" class="b sx-reveal">Show model answer</button>`;
    out+=`<div class="qexp"><b>Answer:</b> ${ec(q.answer)}<br><br><b>Why it matters:</b> ${ec(q.explanation)}<br><b>Trap:</b> ${ec(q.trap)}<br><a href="#/quiz">Practice this in the quiz →</a></div></div>`;
  });
  if(terms.length){
    out+=`<div class="sx-terms"><div class="sx-terms-h">Key terms</div>`+terms.map(g=>`<details class="sx-term"><summary>${esc(g.term)}</summary><p>${ec(g.definition)}</p></details>`).join("")+
      `<button type="button" class="b sx-drill" data-terms="${esc(JSON.stringify(terms.map(g=>g.term)))}">Drill these ${terms.length} as flashcards →</button></div>`;
  }
  if(res) out+=`<p class="muted sx-score">Last check: ${res.right}/${res.total} correct.</p>`;
  return out+`</div>`;
}
function bindCheck(root){
  $$(".sx-q",root).forEach(card=>{
    const q=DATA.quiz[+card.dataset.qidx]; const id=card.closest(".sx-checkpanel").dataset.id;
    $$(".sx-opt",card).forEach(b=>b.onclick=()=>{
      if(card.dataset.done) return; card.dataset.done="1";
      const ok=b.dataset.o===q.answer;
      b.classList.add(ok?"correct":"wrong");
      if(!ok){const c=$$(".sx-opt",card).find(x=>x.dataset.o===q.answer); if(c)c.classList.add("correct");}
      $(".qexp",card).classList.add("show");
      const r=Store.shortQuiz(); const cur=r[id]&&r[id].stamp===sessionStamp?r[id]:{right:0,total:0,stamp:sessionStamp};
      cur.total++; if(ok)cur.right++; r[id]=cur; LS.set(K("shortQuiz"),r); Store.bump("quiz");
    });
    const rv=$(".sx-reveal",card); if(rv) rv.onclick=()=>{$(".qexp",card).classList.add("show"); if(!card.dataset.done){card.dataset.done="1";Store.bump("quiz");}};
  });
  $$(".sx-drill",root).forEach(b=>b.onclick=()=>drillTerms(JSON.parse(b.dataset.terms)));
}
const sessionStamp=Date.now();
window.Store=Store;
function drillTerms(terms){
  const set=new Set(terms);
  const cards=DATA.glossary.filter(g=>set.has(g.term));
  if(cards.some(g=>!g.essential)) LS.set(K("fcDeck"),"full");
  fcQueue=cards.map(g=>Object.assign({},g,{st:fcState(g.term)})); fcIdx=0; fcShown=false;
  go("flash"); renderFlash();
}

let deskPlayer=null;
window.renderShorts = function(){
  const el=$("#v-shorts"); if(!el) return;
  if(!shortsReady){el.innerHTML=`<h2 class="vh">Shorts</h2><p class="lead">Loading…</p>`;return;}
  if(!shortItems.length){el.innerHTML=`<h2 class="vh">Shorts</h2><p class="lead">No Shorts yet.</p>`;return;}
  destroyAllPlayers(); deskPlayer=null;
  if(isMobile()) return renderFeed(el);
  const it=shortItems[shortI]||shortItems[0];
  const w=Store.watched(); const nW=shortItems.filter(s=>w[s.id]).length;
  const list=filteredShorts();
  el.innerHTML=h`<h2 class="vh">Shorts <span class="vh-sub">${nW} of ${shortItems.length} watched</span></h2>
  <div class="note danger" style="margin-bottom:1rem"><b>Secondary source.</b> NotebookLM reports and shorts can overclaim. Vault views and the source ledger win. Learning tool only — not an endorsement of any vendor or analyst firm, and not legal advice.</div>
  <div class="sx-layout">
    <div class="sx-main">
      <div class="sx-player" id="sxPlayer"></div>
      <div class="sx-info">
        <div class="sx-meta"><span class="pill">${esc(it.pillar||"")}</span> <span>${fmtDur(it.duration)}</span> <span>· ${shortI+1} / ${shortItems.length}</span></div>
        <h3 class="sx-title">${esc(it.title)}</h3>
        <div class="sx-meta">${esc(it.tag||"")}</div>
        <div class="btnrow">
          <button type="button" class="b" id="sxPrev" aria-keyshortcuts="K">← Prev</button>
          <button type="button" class="b" id="sxNext" aria-keyshortcuts="J">Next →</button>
        </div>
        ${it.youtube?`<a class="sx-meta" href="https://www.youtube.com/shorts/${esc(it.youtube)}" target="_blank" rel="noopener">Open on YouTube ↗</a>`:""}
        <p class="sx-keys"><kbd>J</kbd>/<kbd>K</kbd> next/prev · <kbd>Space</kbd> play · <kbd>Q</kbd> questions</p>
      </div>
    </div>
    <div class="sx-side">${checkHTML(it)}</div>
  </div>
  <h3 class="sx-h">All Shorts</h3>
  ${filtersHTML()}
  <div class="sx-grid" id="sxGrid">${list.map(s=>tileHTML(s,0,s.id===it.id)).join("")||`<p class="muted">Nothing here. You have watched them all.</p>`}</div>
  <p class="muted" style="margin-top:1.2rem;font-size:.84rem">Longer media: the narrated deep-dive cut and the audio overview are on the <a href="#/deck">Deck and deep-dive cut</a> page.</p>`;
  deskPlayer=mountPlayer($("#sxPlayer"),it,{controls:true});
  bindCheck(el);
  $("#sxPrev").onclick=()=>stepShort(-1);
  $("#sxNext").onclick=()=>stepShort(1);
  bindTilesAndFilters(el);
};
function stepShort(d){const n=shortItems.length;shortI=(shortI+d+n)%n;selectShortById(shortItems[shortI].id);renderShorts();}
function bindTilesAndFilters(el){
  $$(".sx-tile",el).forEach(b=>b.onclick=()=>{selectShortById(b.dataset.id);renderShorts(); if(!isMobile()) $("#sxPlayer").scrollIntoView({block:"nearest",behavior:reduceMotion.matches?"auto":"smooth"});});
  $$(".sx-filters .chip",el).forEach(b=>b.onclick=()=>{shortFilter=b.dataset.f;LS.set(K("shortFilter"),shortFilter);renderShorts();});
}
function refreshWatchedUI(){
  if(isMobile()){ $$(".sx-slide").forEach(s=>s.classList.toggle("watched",!!Store.watched()[s.dataset.id])); return; }
  const w=Store.watched();
  $$(".sx-tile").forEach(t=>{const on=!!w[t.dataset.id]; if(on&&!t.classList.contains("watched")){t.classList.add("watched");$(".sx-thumb",t).insertAdjacentHTML("beforeend",`<span class="sx-check" aria-hidden="true">✓</span>`);}});
  const sub=$("#v-shorts .vh-sub"); if(sub) sub.textContent=shortItems.filter(s=>w[s.id]).length+" of "+shortItems.length+" watched";
}
document.addEventListener("keydown",e=>{
  if(currentView!=="shorts"||isMobile()) return;
  if(e.target.closest&&e.target.closest("input,textarea,select,[contenteditable]")) return;
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const k=e.key.toLowerCase();
  if(k==="j"){e.preventDefault();stepShort(1);}
  else if(k==="k"){e.preventDefault();stepShort(-1);}
  else if(k==="q"){e.preventDefault();const p=$(".sx-checkpanel");if(p){p.scrollIntoView({block:"start"});const b=$("button",p);if(b)b.focus();}}
  else if(e.code==="Space"&&deskPlayer&&deskPlayer.el&&deskPlayer.el.tagName==="VIDEO"&&e.target.tagName!=="VIDEO"&&e.target.tagName!=="BUTTON"){e.preventDefault();const v=deskPlayer.el;v.paused?deskPlayer.play():deskPlayer.pause();}
});

/* ---- Mobile vertical feed ---- */
let feedObs=null, feedActive=null, soundOn=false;
function renderFeed(el){
  const list=filteredShorts().length?filteredShorts():shortItems;
  const startId=(shortItems[shortI]||list[0]).id;
  el.innerHTML=`<div class="sx-feed" id="sxFeed" aria-label="Shorts feed">`+list.map(it=>{
    const w=Store.watched()[it.id];
    return h`<article class="sx-slide ${w?"watched":""}" data-id="${esc(it.id)}" aria-label="${esc(it.title)}">
      ${it.poster?`<img class="sx-bg" src="${esc(it.poster)}" alt="" loading="lazy" decoding="async">`:""}
      <div class="sx-host"></div>
      <button type="button" class="sx-sound" aria-label="Turn sound on">Tap for sound</button>
      <div class="sx-overlay">
        <div class="sx-cap"><span class="pill">${esc(it.pillar||"")}</span> <span>${fmtDur(it.duration)}</span>${w?` <span class="sx-wbadge">✓ watched</span>`:""}<h3>${esc(it.title)}</h3></div>
        <div class="sx-actions">
          <button type="button" data-act="check" aria-label="Check yourself"><span aria-hidden="true">?</span><small>Quiz me</small></button>
          <button type="button" data-act="grid" aria-label="Browse all Shorts"><span aria-hidden="true">▦</span><small>All</small></button>
        </div>
      </div>
      <div class="sx-end" hidden><p>Nice. Lock it in?</p><button type="button" class="b" data-act="check">Check yourself</button><button type="button" class="b" data-act="next">Next Short ↓</button></div>
      <div class="sx-prog"><i></i></div>
    </article>`;}).join("")+`</div>`;
  const feed=$("#sxFeed");
  const start=$(`.sx-slide[data-id="${CSS.escape(startId)}"]`,feed); if(start) feed.scrollTop=start.offsetTop;
  if(feedObs) feedObs.disconnect();
  if(feedActive){ try{feedActive.api.destroy();}catch(e){} feedActive=null; }
  feedObs=new IntersectionObserver(entries=>{
    const best=entries.filter(en=>en.isIntersecting&&en.intersectionRatio>=0.6&&en.boundingClientRect.height>0)
      .sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(best) activateSlide(best.target);
  },{root:feed,threshold:[0.6]});
  // Scroll to the start slide first; the observer then activates whichever slide is actually on screen,
  // so the playing video always matches the visible one.
  requestAnimationFrame(()=>{ if(start) feed.scrollTop=start.offsetTop;
    requestAnimationFrame(()=>{ if(start&&feed.scrollTop!==start.offsetTop) feed.scrollTop=start.offsetTop; $$(".sx-slide",feed).forEach(s=>feedObs.observe(s)); }); });
  // On a cold page load the first scroll can be dropped; settle once layout is final.
  let touched=false;
  ["touchstart","wheel","keydown"].forEach(ev=>feed.addEventListener(ev,()=>{touched=true;},{passive:true,once:true}));
  [350,900].forEach(ms=>setTimeout(()=>{ if(!document.body.contains(feed)||touched) return;
    if(start&&start.offsetHeight&&Math.abs(feed.scrollTop-start.offsetTop)>2) feed.scrollTop=start.offsetTop;
    if(!feedActive){ const slides=$$(".sx-slide",feed); const s=slides[Math.round(feed.scrollTop/Math.max(1,feed.clientHeight))]; if(s) activateSlide(s); }
  },ms));
  feed.addEventListener("click",e=>{
    const b=e.target.closest("[data-act]"); const slide=e.target.closest(".sx-slide"); if(!slide) return;
    const it=shortItems.find(s=>s.id===slide.dataset.id);
    if(b){ const a=b.dataset.act;
      if(a==="check") openSheet("Check yourself", checkHTML(it), bindCheck);
      else if(a==="grid") openGridSheet();
      else if(a==="next"){ const nx=slide.nextElementSibling; if(nx) nx.scrollIntoView({behavior:reduceMotion.matches?"auto":"smooth"}); }
      return; }
    if(e.target.closest(".sx-sound")){ soundOn=true; $$(".sx-sound").forEach(x=>x.hidden=true); if(feedActive&&feedActive.api&&feedActive.api.el){ if(feedActive.api.el.tagName==="VIDEO"){feedActive.api.el.muted=false;feedActive.api.play();} } return; }
    if(feedActive&&feedActive.slide===slide&&feedActive.api.el&&feedActive.api.el.tagName==="VIDEO"){ const v=feedActive.api.el; v.paused?feedActive.api.play():feedActive.api.pause(); }
  });
}
function activateSlide(slide){
  if(feedActive&&feedActive.slide===slide) return;
  if(feedActive){feedActive.api.destroy(); feedActive.slide.classList.remove("playing");}
  const it=shortItems.find(s=>s.id===slide.dataset.id); if(!it) return;
  shortI=shortItems.indexOf(it); selectShortById(it.id);
  $(".sx-end",slide).hidden=true;
  const bar=$(".sx-prog i",slide);
  const api=mountPlayer($(".sx-host",slide),it,{autoplay:!reduceMotion.matches,muted:!soundOn,
    onTime:(t,d)=>{if(d&&bar)bar.style.width=(t/d*100)+"%";},
    onEnded:()=>{$(".sx-end",slide).hidden=false;}});
  $(".sx-sound",slide).hidden=soundOn||!!it.youtube;
  slide.classList.add("playing");
  feedActive={slide,api};
}
function openGridSheet(){
  openSheet("All Shorts", filtersHTML()+`<div class="sx-grid">`+filteredShorts().map(s=>tileHTML(s,0,shortItems[shortI]&&s.id===shortItems[shortI].id)).join("")+`</div>`, root=>{
    $$(".sx-tile",root).forEach(b=>b.onclick=()=>{selectShortById(b.dataset.id);closeSheet();renderShorts();});
    $$(".sx-filters .chip",root).forEach(b=>b.onclick=()=>{shortFilter=b.dataset.f;LS.set(K("shortFilter"),shortFilter);openGridSheet();renderShorts();});
  });
}
let wasMobile=isMobile();
if(mq.addEventListener) mq.addEventListener("change",()=>{ if(wasMobile!==isMobile()){wasMobile=isMobile(); if(currentView==="shorts") renderShorts(); closeSheet();} });

/* ---------- Today ---------- */
function ring(val,max,label,sub){
  const p=Math.min(1,max?val/max:0), r=26, c=2*Math.PI*r;
  return h`<div class="ring ${p>=1?"met":""}"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="ring-bg"/><circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-p)}"/></svg>
    <div class="ring-txt"><b>${Math.min(val,max)}/${max}</b><span>${label}</span></div><div class="ring-sub">${sub}</div></div>`;
}
function renderToday(){
  const el=$("#v-today"); if(!el) return;
  const a=Store.activity(), t=a[dayKey()]||{shorts:0,cards:0,quiz:0};
  const ch=chState(dayKey()), answered=ch.r.filter(x=>x!==null).length;
  const st=streak();
  const w=Store.watched(); const nW=shortItems.filter(s=>w[s.id]).length;
  const due=dueReviews().length, seen=seenCards().length, fresh=DATA.glossary.length-seen;
  const mods=allModules(); const doneMods=mods.filter(m=>LS.get(moduleKey(m.w,m.i),false)).length;
  const nextMod=mods.find(m=>!LS.get(moduleKey(m.w,m.i),false));
  const nextBlock=nextMod?DATA.weeks.find(x=>x.n===nextMod.w):null;
  const cs=shortItems.length?continueShort():null;
  const hr=new Date().getHours(); const greet=hr<12?"Good morning":hr<18?"Good afternoon":"Good evening";
  const dateStr=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  const reviews=Math.max(0,(t.cards||0)+(t.quiz||0)-answered);
  const fmDone=DATA.checklist.filter((_,i)=>LS.get(KEY+"cl:"+i,false)).length;
  const allCh=LS.get(K("challenge"),{});

  const days=[]; for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const x=a[dayKey(d)]||{};const c=allCh[dayKey(d)];days.push({d,n:(x.shorts||0)*5+(x.cards||0)+(x.quiz||0),met:chDone(c),sc:c?chScore(c):0});}
  const maxN=Math.max(5,...days.map(d=>d.n));

  const pillarRows=PILLARS.map(p=>{
    const inP=shortItems.filter(s=>s.pillar===p); if(!inP.length) return "";
    const wn=inP.filter(s=>w[s.id]).length; const q=Store.shortQuiz(); let r=0,tt=0; inP.forEach(s=>{if(q[s.id]){r+=q[s.id].right;tt+=q[s.id].total;}});
    return h`<div class="pbar"><div class="pbar-h"><span>${p} Shorts</span><span>${wn}/${inP.length}${tt?` · ${Math.round(r/tt*100)}% on checks`:""}</span></div><div class="pbar-t"><i style="width:${wn/inP.length*100}%"></i></div></div>`;
  }).join("")+h`<div class="pbar"><div class="pbar-h"><span>Failure modes reviewed</span><span>${fmDone}/${DATA.checklist.length}</span></div><div class="pbar-t"><i style="width:${fmDone/DATA.checklist.length*100}%"></i></div></div>
    <div class="pbar"><div class="pbar-h"><span>Curriculum modules</span><span>${doneMods}/${mods.length}</span></div><div class="pbar-t"><i style="width:${doneMods/mods.length*100}%"></i></div></div>`;

  const upNext=[]; if(cs){let i=shortItems.indexOf(cs); for(let k=1;k<shortItems.length&&upNext.length<3;k++){const s=shortItems[(i+k)%shortItems.length]; if(!w[s.id]) upNext.push(s);}}

  el.innerHTML=h`
  <div class="today-head">
    <div><p class="today-date">${esc(dateStr)}</p><h1>${greet}.</h1>
      <p class="lead">${chDone(ch)?"Today's challenge is done. Anything more is a bonus.":"Three rounds, about three minutes. Keep the streak going."}</p></div>
    <div class="streak ${st?"on":""}" title="Days in a row with the daily challenge completed"><b>${st}</b><span>day streak</span></div>
  </div>
  ${challengeHTML()}
  <div class="today-grid">
    ${cs?h`<a class="hero-card" href="#/shorts/${encodeURIComponent(cs.id)}">
      <span class="hero-thumb">${cs.poster?`<img src="${esc(cs.poster)}" alt="">`:""}<span class="sx-dur">${fmtDur(cs.duration)}</span><span class="hero-play" aria-hidden="true">▶</span></span>
      <span class="hero-body"><span class="hero-kicker">${w[cs.id]?"Rewatch":"Up next"} · ${esc(cs.pillar||"")}</span><span class="hero-title">${esc(cs.title)}</span>
      <span class="hero-cta">Watch, then check yourself →</span></span></a>`:`<div class="hero-card"><span class="hero-body">Loading Shorts…</span></div>`}
    <div class="goal-card"><h3>Today's goal</h3><div class="rings">${ring(answered,GOAL.challenge,"rounds","challenge")}${ring(t.shorts||0,GOAL.shorts,"Short","watched")}${ring(reviews,GOAL.reviews,"reviews","cards + questions")}</div></div>
  </div>
  <div class="today-actions">
    <a class="action" href="#/flash"><b>${due?due+" due":fresh+" new"}</b><span>${due?"Flashcards to review":"Flashcards to learn"}</span></a>
    ${(()=>{const qs=quizStats();return `<a class="action" href="#/quiz"><b>${qs.due?qs.due+" due":qs.total}</b><span>${qs.due?"Quiz questions to review":"Design-review questions"}</span></a>`;})()}
    <a class="action" href="#/curriculum"><b>${mods.length?Math.round(doneMods/mods.length*100):0}%</b><span>${nextBlock?"Next: Block "+nextBlock.n+", "+esc(nextBlock.title):"Curriculum complete"}</span></a>
    <a class="action" href="#/failures"><b>${fmDone}/${DATA.checklist.length}</b><span>Failure modes reviewed</span></a>
  </div>
  <div class="today-cols">
    <div class="card"><h3>Progress</h3>${pillarRows}</div>
    <div class="card"><h3>Last 7 days</h3><div class="week-bars" role="img" aria-label="Activity over the last 7 days">${days.map(d=>h`<div class="wb ${d.met?"met":""}" title="${d.met?d.sc+"/3 on the challenge":"challenge not done"}"><i style="height:${Math.max(4,d.n/maxN*100)}%"></i><span>${d.d.toLocaleDateString(undefined,{weekday:"narrow"})}</span></div>`).join("")}</div>
      <p class="muted" style="font-size:.78rem;margin-top:.6rem">Green days completed the challenge. Best streak ${Math.max(bestStreak(),LS.get(K("bestStreak"),0))}. ${seen} of ${DATA.glossary.length} terms studied.</p></div>
  </div>
  ${upNext.length?h`<h3 class="sx-h">More Shorts</h3><div class="sx-grid upnext">${upNext.map(s=>tileHTML(s)).join("")}</div>`:""}
  <h3 class="sx-h">From the pack</h3>
  <p class="lead">NotebookLM exports and the reference notes, as pages on this site.</p>
  <div class="libgrid">${(DATA.packPages||[]).map(p=>`<a class="libcard" href="library/${p.slug}.html"><b>${esc(p.t)}</b><span>Open the full note</span></a>`).join("")}</div>`;
  bindChallenge(el);
  $$(".sx-tile",el).forEach(b=>b.onclick=()=>{location.hash="#/shorts/"+encodeURIComponent(b.dataset.id);});
}

/* ---------- Activity hooks on existing views ---------- */
document.addEventListener("click",e=>{
  if(e.target.closest("#v-flash .fc-controls button[data-g]")) Store.bump("cards");
  /* quiz reviews are counted in js/quiz.js when a question is graded */
});

/* ---------- Flashcard swipes (touch) ---------- */
(function(){
  let x0=null,y0=null;
  const el=$("#v-flash");
  el.addEventListener("touchstart",e=>{ if(!e.target.closest("#fcStage")) return; x0=e.touches[0].clientX; y0=e.touches[0].clientY; },{passive:true});
  el.addEventListener("touchend",e=>{
    if(x0===null) return;
    const dx=e.changedTouches[0].clientX-x0, dy=e.changedTouches[0].clientY-y0; x0=null;
    const ax=Math.abs(dx), ay=Math.abs(dy); if(Math.max(ax,ay)<50) return;
    let btn=null;
    if(fcShown){ btn= ay>ax&&dy<0 ? $('.fc-controls button[data-g="1"]') : ax>ay ? $(`.fc-controls button[data-g="${dx>0?2:0}"]`) : null; }
    else if(ax>ay){ btn= dx<0 ? $("#fcNext") : $("#fcPrev"); }
    if(btn&&!btn.disabled){ e.preventDefault(); btn.click(); }
  });
})();

/* ---------- Sheets (mobile) ---------- */
let lastFocus=null;
function openSheet(title,html,bind){
  lastFocus=document.activeElement;
  $("#sheetTitle").textContent=title; const body=$("#sheetBody"); body.innerHTML=html;
  $("#sheet").hidden=false; $("#sheetBackdrop").hidden=false;
  requestAnimationFrame(()=>{$("#sheet").classList.add("open");$("#sheetBackdrop").classList.add("open");});
  if(bind) bind(body);
  const f=$("a,button,input,summary",body); if(f) f.focus({preventScroll:true});
  document.body.classList.add("sheet-open");
}
function closeSheet(){
  const s=$("#sheet"); if(!s||s.hidden) return;
  s.classList.remove("open"); $("#sheetBackdrop").classList.remove("open");
  document.body.classList.remove("sheet-open");
  setTimeout(()=>{s.hidden=true;$("#sheetBackdrop").hidden=true;},reduceMotion.matches?0:200);
  if(lastFocus&&lastFocus.focus) lastFocus.focus({preventScroll:true});
}
function navSheet(group){
  const title={learn:"Learn",practice:"Practice",reference:"More"}[group];
  let html=`<ul class="sheet-list">`+GROUPS[group].map(v=>`<li><a href="#/${v}" class="${currentView===v?"active":""}">${esc(VIEWS[v])}<span aria-hidden="true">›</span></a></li>`).join("")+`</ul>`;
  if(group==="reference"){
    const mode=LS.get("appMode",defaultMode()), pal=LS.get("appPalette","github");
    html+=h`<div class="sheet-section"><h3>Appearance</h3><div class="seg" role="group" aria-label="Mode">
      <button type="button" data-mode="light" aria-pressed="${mode==="light"}" class="${mode==="light"?"on":""}">Light</button><button type="button" data-mode="dark" aria-pressed="${mode==="dark"}" class="${mode==="dark"?"on":""}">Dark</button></div>
      <div class="seg" role="group" aria-label="Palette">${[["github","GitHub"],["geist","Geist"],["catppuccin","Catppuccin"]].map(([k,l])=>`<button type="button" data-pal="${k}" aria-pressed="${pal===k}" class="${pal===k?"on":""}">${l}</button>`).join("")}</div></div>
      <p class="muted sheet-disc">Personal study material for AI TRiSM. Vault and source ledger win over NotebookLM. Learning tool only — not an endorsement of any vendor or analyst firm, and not legal advice.</p>`;
  }
  openSheet(title,html,body=>{
    $$("[data-mode]",body).forEach(b=>b.onclick=()=>{applyTheme(LS.get("appPalette","github"),b.dataset.mode);navSheet(group);});
    $$("[data-pal]",body).forEach(b=>b.onclick=()=>{applyTheme(b.dataset.pal,LS.get("appMode",defaultMode()));navSheet(group);});
  });
}
$$("#mTabbar [data-sheet]").forEach(b=>b.onclick=()=>navSheet(b.dataset.sheet));
$("#sheetBackdrop").onclick=closeSheet;
$("#sheetBody").addEventListener("click",e=>{
  const a=e.target.closest(".sheet-list a");
  if(!a) return;
  e.preventDefault();
  const m=(a.getAttribute("href")||"").match(/#\/([\w-]+)/);
  lastFocus=null;
  closeSheet();
  if(m) go(m[1]);
});
(function(){let y0=null;const s=$("#sheet");
  s.addEventListener("touchstart",e=>{if(s.scrollTop<=0&&e.target.closest(".sheet-grip,.sheet-title"))y0=e.touches[0].clientY;},{passive:true});
  s.addEventListener("touchend",e=>{if(y0!==null&&e.changedTouches[0].clientY-y0>60)closeSheet();y0=null;},{passive:true});})();

/* ---------- Search palette (Ctrl/Cmd K) ---------- */
let palIndex=[], palSel=0, palItems=[];
function buildPaletteIndex(){
  palIndex=Object.keys(VIEWS).map(v=>({kind:"View",label:VIEWS[v],sub:(GROUP_OF[v]||"").replace(/^./,c=>c.toUpperCase()),go:()=>go(v)}))
    .concat(shortItems.map(s=>({kind:"Short",label:s.title,sub:s.pillar+" · "+fmtDur(s.duration),go:()=>{location.hash="#/shorts/"+encodeURIComponent(s.id);}})))
    .concat(DATA.glossary.map(g=>({kind:"Term",label:g.term,sub:g.category,go:()=>{LS.set(KEY+"gq",g.term);LS.set(KEY+"gcat","all");renderGlossary();go("glossary");}})))
    .concat(DATA.checklist.map((c,i)=>({kind:"Failure",label:c.title,sub:c.view,go:()=>{LS.set(KEY+"cl-open:"+i,true);LS.set(KEY+"fmView","all");renderCounsel();go("failures");}})))
    .concat((window.LIBRARY||[]).map(p=>({kind:"Note",label:p.title,sub:p.section,go:()=>{location.href="library/"+p.slug+".html";}})))
    .concat(SOURCES.map(s=>({kind:"Source",label:"S"+s.n+" · "+s.t,sub:s.type,go:()=>{window.open(s.u,"_blank","noopener");}})));
}
function openPalette(){
  closeSheet(); if(!palIndex.length) buildPaletteIndex();
  lastFocus=document.activeElement;
  $("#palette").hidden=false; const i=$("#paletteInput"); i.value=""; filterPalette(); i.focus();
}
function closePalette(){ $("#palette").hidden=true; if(lastFocus&&lastFocus.focus) lastFocus.focus({preventScroll:true}); }
function filterPalette(){
  const q=norm($("#paletteInput").value.trim());
  palItems=(q?palIndex.filter(x=>norm(x.label).includes(q)||norm(x.sub).includes(q)).sort((a,b)=>norm(a.label).indexOf(q)-norm(b.label).indexOf(q)):palIndex.filter(x=>x.kind==="View")).slice(0,40);
  palSel=0; drawPalette();
}
function drawPalette(){
  $("#paletteList").innerHTML=palItems.map((x,i)=>`<li role="option" id="pal${i}" aria-selected="${i===palSel}" data-i="${i}"><span class="pk">${x.kind}</span><span class="pl">${esc(x.label)}</span><span class="ps">${esc(x.sub||"")}</span></li>`).join("")||`<li class="none">No matches</li>`;
  $("#paletteInput").setAttribute("aria-activedescendant","pal"+palSel);
  const s=$("#pal"+palSel); if(s) s.scrollIntoView({block:"nearest"});
}
$("#paletteInput").addEventListener("input",filterPalette);
$("#paletteInput").addEventListener("keydown",e=>{
  if(e.key==="ArrowDown"){e.preventDefault();palSel=Math.min(palItems.length-1,palSel+1);drawPalette();}
  else if(e.key==="ArrowUp"){e.preventDefault();palSel=Math.max(0,palSel-1);drawPalette();}
  else if(e.key==="Enter"){e.preventDefault();const x=palItems[palSel];if(x){closePalette();x.go();}}
  else if(e.key==="Escape"){e.preventDefault();closePalette();}
});
$("#paletteList").addEventListener("click",e=>{const li=e.target.closest("li[data-i]");if(li){const x=palItems[+li.dataset.i];closePalette();x.go();}});
$("#palette").addEventListener("click",e=>{if(e.target.id==="palette")closePalette();});
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#palette").hidden?openPalette():closePalette();}
  else if(e.key==="Escape"&&!$("#sheet").hidden) closeSheet();
});
$("#navSearch").onclick=openPalette; $("#mSearch").onclick=openPalette;
if(/Mac|iPhone|iPad/.test(navigator.platform||"")) $$("kbd").forEach(k=>{if(k.textContent==="Ctrl K")k.textContent="⌘K";});

function toast(msg){let t=$("#toast"); if(!t){t=document.createElement("div");t.id="toast";t.setAttribute("role","status");document.body.appendChild(t);} t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),3000);}
window.toast=toast;

/* ---------- Theme extras ---------- */
const _applyTheme=window.applyTheme;
window.applyTheme=function(p,m){ _applyTheme(p,m); try{const bg=getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim(); const meta=document.querySelector('meta[name="theme-color"]'); if(meta&&bg) meta.setAttribute("content",bg);}catch(e){} if(currentView==="today") renderToday(); };

/* ---------- Mobile top bar hides on scroll down ---------- */
(function(){let y=0;window.addEventListener("scroll",()=>{if(!isMobile())return;const ny=window.scrollY;document.body.classList.toggle("bar-hidden",ny>y&&ny>80);y=ny;},{passive:true});})();

/* ---------- Service worker ---------- */
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}

/* ---------- Start ---------- */
const r=parseHash();
if(r) show(r.v,r.sub);
else { history.replaceState(null,"","#/today"); show("today"); }
loadShorts();
})();
