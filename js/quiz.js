/* ============================================================
   Quiz and Practice. Loads after data.js and before app.js.
   Uses globals from app.js ($, $$, esc, ec, LS, KEY, lib, SRC) and
   enhance.js (Store, toast, go) only when functions run, never at load.
   All saved keys use the "lat:" prefix (KEY).
   ============================================================ */
const QDAY=864e5;
const QBOX=[0,2*QDAY,7*QDAY,18*QDAY,45*QDAY]; /* missed returns in 2 days, then 7, then 18, then 45 */
const QGRADE=["Missed","Partly","Had it"];
const qk=id=>KEY+"quiz:"+id;
const qState=id=>LS.get(qk(id),null);
const qDay=t=>{const d=new Date(t||Date.now());return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const qById=id=>DATA.quiz.find(q=>q.id===id);
const qVault=s=>String(s||"").replace(/\bS7([123])\b/g,(m,x)=>"S7"+({1:"b",2:"c",3:"d"})[x]);

/* ---------- Scheduling ---------- */
function qApplyGrade(q,g,conf,att){
  const st=qState(q.id)||{box:0,n:0};
  const now=Date.now();
  if(g===0) st.box=1;
  else if(g===2) st.box=Math.min(4,(st.box||0)+(conf==="sure"?2:1));
  else st.box=Math.max(1,st.box||1);
  st.due=now+QBOX[st.box]; st.last=now; st.grade=g; st.n=(st.n||0)+1;
  st.conf=conf||null; st.att=att||""; st.sureWrong=(g===0&&conf==="sure");
  if(st.bumpDay!==qDay()){st.bumpDay=qDay(); if(window.Store) Store.bump("quiz");}
  LS.set(qk(q.id),st);
}
function qDue(q){const s=qState(q.id);return !!(s&&s.due<=Date.now());}
function qMissed(q){const s=qState(q.id);return !!(s&&s.grade===0);}
function quizStats(){
  let graded=0,due=0,missed=0;
  DATA.quiz.forEach(q=>{const s=qState(q.id);if(!s)return;graded++;if(s.due<=Date.now())due++;if(s.grade===0)missed++;});
  return {total:DATA.quiz.length,graded,due,missed};
}
function qWhen(s){
  if(!s) return "";
  const d=s.due-Date.now(); if(d<=0) return "due now";
  const days=Math.ceil(d/QDAY); return "back in "+days+(days===1?" day":" days");
}

/* ---------- Pack, section, filter helpers ---------- */
function qIn(q,pack){return pack==="all"||(pack==="tdd"?q.pack!=="odm":q.pack!=="tdd");}
function qSec(q,pack){return pack==="odm"?(q.section2||q.section):q.section;}
function qSecs(pack){
  const t=[1,2,3,4,5,6], o=[11,12,13,14,15,16,17];
  return pack==="tdd"?t:pack==="odm"?o:t.concat(o);
}
function qShuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---------- Module state (memory only) ---------- */
const qUI={};          /* per-card: conf, att, revealed, pick, graded */
let qSetState=null;    /* {title,key,ids,res:{id:grade}} while a set runs */
let qFilter="all", qShuf=false;

function qCopy(text,msg){
  const done=()=>{if(window.toast) toast(msg||"Copied");};
  try{navigator.clipboard.writeText(text).then(done,()=>qCopyFallback(text,done));}catch(e){qCopyFallback(text,done);}
}
function qCopyFallback(text,done){
  const t=document.createElement("textarea");t.value=text;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();
  try{document.execCommand("copy");}catch(e){} t.remove(); done();
}

/* ---------- Text builders ---------- */
function qSourceLines(q){
  const blob=[q.answer,q.explanation,q.trap,(q.optionWhy||[]).join(" ")].join(" ");
  const ids=[...new Set([...blob.matchAll(/\[S(\d+)\]/g)].map(m=>+m[1]))];
  return ids.map(n=>SRC[n]?("S"+(n>70?"7"+({71:"b",72:"c",73:"d"})[n]:n)+": "+SRC[n].t):null).filter(Boolean);
}
function qPrompt(q,att){
  return "You are grading a closed-book answer on a study quiz. Use only the material below. Do not add facts from outside it.\n\n"+
   "Question: "+q.question+"\n"+
   "Model answer: "+qVault(q.answer)+"\n"+
   "Why it matters: "+qVault(q.explanation)+"\n"+
   "Common trap: "+qVault(q.trap)+"\n"+
   (qSourceLines(q).length?"Sources:\n- "+qSourceLines(q).join("\n- ")+"\n":"")+
   "\nLearner's attempt:\n"+(att&&att.trim()?att.trim():"(no attempt typed)")+"\n\n"+
   "Reply with:\n1. Verdict: Had it, Partly, or Missed.\n2. What the attempt got right.\n3. What it left out, quoting the model answer.\n4. One sentence the learner could say in a design review.\n"+
   "If the attempt contradicts the model answer, say so plainly. Keep the whole reply under 150 words.";
}
function qSecName(q,pack){return DATA.quizSections[qSec(q,pack==="all"?"tdd":pack)]||"";}
function qRecord(ids){
  const today=qDay();
  let items;
  if(ids) items=ids.map(id=>qById(id)).filter(Boolean).map(q=>({q,g:qSetState&&qSetState.res[q.id]!==undefined?qSetState.res[q.id]:(qState(q.id)||{}).grade,att:(qState(q.id)||{}).att,conf:(qState(q.id)||{}).conf})).filter(x=>x.g!==undefined&&x.g!==null);
  else items=DATA.quiz.map(q=>({q,s:qState(q.id)})).filter(x=>x.s&&qDay(x.s.last)===today).map(x=>({q:x.q,g:x.s.grade,att:x.s.att,conf:x.s.conf}));
  if(!items.length) return "";
  const by={};
  items.forEach(x=>{
    const key=x.q.pack==="odm"?"ODM block "+(x.q.section-10):("TDD view: "+(DATA.quizSections[x.q.section]||"section "+x.q.section));
    const r=by[key]=by[key]||{had:0,n:0,part:0};
    r.n++; if(x.g===2) r.had++; if(x.g===1) r.part++;
  });
  const had=items.filter(x=>x.g===2).length, part=items.filter(x=>x.g===1).length;
  let s="## Quiz sitting "+today+"\n\nScore: "+had+"/"+items.length+(part?" ("+part+" partly)":"")+"\n\n";
  s+="Tracker lines (paste into the Quiz column):\n"+Object.entries(by).map(([k,v])=>"- "+k+": "+v.had+"/"+v.n).join("\n")+"\n\n";
  const miss=items.filter(x=>x.g!==2);
  if(miss.length){
    s+="Missed-it list:\n"+miss.map(x=>"- `"+x.q.id+"` "+x.q.question+(x.conf==="sure"&&x.g===0?" (was sure)":"")+(x.att&&x.att.trim()?"\n  - my attempt: "+x.att.trim().replace(/\n/g,"\n    "):"")).join("\n")+"\n";
  } else s+="No misses.\n";
  return s;
}

/* ---------- Card rendering ---------- */
function qLinks(q){
  const s=q.see||{}, out=[];
  if(s.view) out.push(`<a href="#/views">Architecture view: ${esc(s.view)}</a>`);
  if(s.term) out.push(`<a href="#/glossary">Glossary: ${esc(s.term)}</a>`);
  if(s.fm) out.push(`<a href="#/failures">Failure mode: ${esc(s.fm)}</a>`);
  if(s.lib) out.push(lib(s.lib,"Pack note"));
  const sh=qShort(q); if(sh) out.push(`<a href="#/shorts/${encodeURIComponent(sh.id)}">Short: ${esc(sh.title)}</a>`);
  return out.length?`<div class="qsee"><b>Learn more.</b> ${out.join(" · ")}</div>`:"";
}
function qShort(q){
  const list=(typeof shortItems!=="undefined"&&shortItems)||[]; if(!list.length) return null;
  const t=(q.question+" "+q.answer).toLowerCase(); let best=null,bs=0;
  list.forEach(it=>{let s=0;(it.keywords||[]).forEach(k=>{k=String(k).toLowerCase();if(k&&t.includes(k))s+=k.length>6?2:1;});if(s>bs){bs=s;best=it;}});
  return bs>=3?best:null;
}
function qWhyHTML(q){
  return `<div class="qwhy"><p><b>Why it matters.</b> ${ec(q.explanation)}</p><p><b>Trap.</b> ${ec(q.trap)}</p>${q.src&&q.src!=="pack"&&q.src!=="claims"?`<p class="muted">Source ${ec("["+q.src+"]")}</p>`:""}${qLinks(q)}</div>`;
}
function qConfHTML(u,locked){
  const b=(v,l)=>`<button type="button" class="chip ${u.conf===v?"on":""}" data-act="conf" data-v="${v}" aria-pressed="${u.conf===v}" ${locked?"disabled":""}>${l}</button>`;
  return `<div class="qconf" role="group" aria-label="How sure are you?"><span class="muted">Before you answer:</span> ${b("sure","Sure")} ${b("unsure","Not sure")}</div>`;
}
function qCardHTML(q,u,inSet){
  const st=qState(q.id);
  const pills=`${q.type==="mc"?'<span class="pill">multiple choice</span>':""}${st?`<span class="qbadge g${st.grade}">${QGRADE[st.grade]} · ${qWhen(st)}</span>`:""}`;
  let h=`<div class="qcard" data-id="${esc(q.id)}" tabindex="-1"><div class="qq">${esc(q.question)} ${pills}</div>`;
  if(q.type==="mc"){
    const done=u.pick!==undefined;
    h+=qConfHTML(u,done);
    h+=`<div class="qopts q2" role="group" aria-label="Answer options">`+q.options.map((o,i)=>{
      let cls=""; if(done){ if(o===q.answer) cls="correct"; else if(i===u.pick) cls="wrong"; }
      return `<button type="button" class="qo ${cls}" data-act="pick" data-i="${i}" ${done?"disabled":""}>${esc(o)}</button>`;}).join("")+`</div>`;
    if(done){
      const ci=q.options.indexOf(q.answer);
      h+=`<div class="qfb" role="status" aria-live="polite"><p class="${u.pick===ci?"ok":"no"}"><b>${u.pick===ci?"Correct.":"Not quite."}</b> ${ec(q.optionWhy[u.pick])}</p>${u.pick!==ci?`<p><b>The right one.</b> ${ec(q.optionWhy[ci])}</p>`:""}</div>`;
      if(q.img) h+=`<img class="diagram qimg" src="${esc(q.img)}" alt="Diagram for this question" loading="lazy">`;
      h+=qWhyHTML(q);
      h+=`<div class="btnrow"><span class="muted">Graded automatically: ${QGRADE[u.pick===ci?2:0]}.</span></div>`;
    }
  } else if(!u.revealed){
    h+=qConfHTML(u,false);
    h+=`<label class="qlabel" for="att-${esc(q.id)}">Type your answer first. Optional, and it stays on this device.</label>
      <textarea class="qatt" id="att-${esc(q.id)}" data-att rows="3" placeholder="Say it the way you would in the room">${esc(u.att||"")}</textarea>
      <div class="btnrow"><button type="button" class="b" data-act="reveal">Reveal the model answer</button></div>`;
  } else {
    if(u.att&&u.att.trim()) h+=`<div class="qmine"><b>Your attempt.</b> ${esc(u.att)}</div>`;
    h+=`<div class="qexp show" tabindex="-1" data-focus><b>Answer.</b> ${ec(q.answer)}</div>`;
    if(q.img) h+=`<img class="diagram qimg" src="${esc(q.img)}" alt="Diagram for this question" loading="lazy">`;
    h+=qWhyHTML(q);
    if(u.graded===undefined){
      h+=`<div class="qgrade" role="group" aria-label="Grade yourself"><span class="muted">How did you do?</span>
        <button type="button" class="b" data-act="grade" data-g="0">Missed (1)</button>
        <button type="button" class="b" data-act="grade" data-g="1">Partly (2)</button>
        <button type="button" class="b" data-act="grade" data-g="2">Had it (3)</button></div>`;
    } else h+=`<p class="qres ${u.graded===2?"ok":u.graded===1?"part":"no"}" role="status" aria-live="polite">${QGRADE[u.graded]}. ${esc(qWhen(qState(q.id)))}.</p>`;
    h+=`<div class="btnrow"><button type="button" class="b" data-act="prompt">Copy grading prompt</button><span class="muted">Paste it into any assistant for feedback on your attempt.</span></div>`;
  }
  return h+`</div>`;
}

/* ---------- Quiz view ---------- */
function qItems(pack,sec,filter){
  let a=DATA.quiz.filter(q=>qIn(q,pack)&&qSec(q,pack)===sec);
  if(pack==="odm") a=a.slice().sort((x,y)=>(x.odmN||0)-(y.odmN||0));
  if(filter==="due") a=a.filter(qDue); else if(filter==="missed") a=a.filter(qMissed);
  const rank=q=>{const s=qState(q.id);return s&&s.sureWrong?0:1;};
  if(filter!=="all") a=a.slice().sort((x,y)=>rank(x)-rank(y));
  if(qShuf) a=qShuffle(a);
  return a;
}
function qChromeHTML(pack,sec){
  const S=quizStats();
  const chip=(on,act,v,l)=>`<button type="button" class="chip ${on?"on":""}" data-act="${act}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
  if(qSetState){
    const n=qSetState.ids.length, d=Object.keys(qSetState.res).length;
    return `<h2 class="vh">${esc(qSetState.title)}</h2>
      <p class="lead">${d} of ${n} graded. Answer closed book, grade yourself, and finish for a score you can paste into the Progress Log.</p>
      <div class="btnrow"><button type="button" class="b" data-act="exitset">Leave this set</button>${d?`<button type="button" class="b" data-act="record">Copy sitting record</button>`:""}</div>`;
  }
  const secBtns=qSecs(pack).map(s=>{
    const its=DATA.quiz.filter(q=>qIn(q,pack)&&qSec(q,pack)===s); if(!its.length) return "";
    const g=its.filter(q=>qState(q.id)).length;
    return `<button class="b ${s===sec?"on":""}" data-act="sec" data-v="${s}">${esc(DATA.quizSections[s])} (${g}/${its.length})</button>`;}).join("");
  return `<h2 class="vh">Quiz</h2>
  <p class="lead">${S.total} questions. Open ones ask for your answer first, then show the model answer, why it matters, and the trap. Multiple choice gives feedback on every option. ${lib("tdd-quiz-bank","TDD bank")} · ${lib("quiz-bank","ODM bank")}</p>
  <p class="muted qstat" aria-live="polite">${S.graded} of ${S.total} graded · ${S.due} due · ${S.missed} missed. Missed questions come back in 2 days, then 7, then 18.</p>
  <div class="qrow" role="group" aria-label="Pack">${chip(pack==="tdd","pack","tdd","TDD views")}${chip(pack==="odm","pack","odm","ODM blocks")}${chip(pack==="all","pack","all","Both")}</div>
  <div class="qrow" role="group" aria-label="Filter">${chip(qFilter==="all","filter","all","All")}${chip(qFilter==="due","filter","due","Due ("+S.due+")")}${chip(qFilter==="missed","filter","missed","Missed ("+S.missed+")")}${chip(qShuf,"shuf","1","Shuffle")}</div>
  <div class="btnrow"><button type="button" class="b" data-act="mixed">Mixed check (10)</button><button type="button" class="b" data-act="record">Copy sitting record</button></div>
  <div class="btnrow">${secBtns}</div>`;
}
function qSummaryHTML(){
  const ids=qSetState.ids, r=qSetState.res;
  const had=ids.filter(i=>r[i]===2).length, part=ids.filter(i=>r[i]===1).length;
  const miss=ids.filter(i=>r[i]!==2);
  return `<div class="qsum" role="status"><h3>${had}/${ids.length}${part?" ("+part+" partly)":""}</h3>
    ${miss.length?`<p>Missed-it list</p><ul>${miss.map(i=>`<li>${esc(qById(i).question)}</li>`).join("")}</ul>`:"<p>No misses. Let this one wait for a longer gap.</p>"}
    <p class="muted">A high score can wait longer before the next pass. A weak one comes back within a couple of days.</p>
    <div class="btnrow"><button type="button" class="b" data-act="record">Copy sitting record</button><button type="button" class="b" data-act="exitset">Close</button></div></div>`;
}
function renderQuiz(){
  const el=$("#v-quiz"); if(!el) return;
  const pack=LS.get(KEY+"quizPack","tdd");
  const secs=qSecs(pack).filter(s=>DATA.quiz.some(q=>qIn(q,pack)&&qSec(q,pack)===s));
  let sec=LS.get(KEY+"quizSec:"+pack,secs[0]); if(!secs.includes(sec)) sec=secs[0];
  el.innerHTML=`<div id="qChrome">${qChromeHTML(pack,sec)}</div><div id="qList"></div>`;
  qFillList(pack,sec);
  if(!el._qBound){el._qBound=true; el.addEventListener("click",qClick); el.addEventListener("input",qInput); el.addEventListener("keydown",qKey);}
}
function qFillList(pack,sec){
  const box=$("#qList"); if(!box) return;
  let list;
  if(qSetState) list=qSetState.ids.map(qById).filter(Boolean);
  else list=qItems(pack,sec,qFilter);
  let h=list.map(q=>qCardHTML(q,qUI[q.id]=(qSetState?(qUI[q.id]||{}):{}),!!qSetState)).join("");
  if(!list.length) h=`<div class="note">${qFilter==="due"?"Nothing is due here. Nice.":qFilter==="missed"?"No missed questions in this section.":"No questions here."}</div>`;
  if(qSetState&&Object.keys(qSetState.res).length===qSetState.ids.length) h=qSummaryHTML()+h;
  box.innerHTML=h;
}
function qRefreshChrome(){
  const pack=LS.get(KEY+"quizPack","tdd");
  const secs=qSecs(pack).filter(s=>DATA.quiz.some(q=>qIn(q,pack)&&qSec(q,pack)===s));
  let sec=LS.get(KEY+"quizSec:"+pack,secs[0]); if(!secs.includes(sec)) sec=secs[0];
  const c=$("#qChrome"); if(c) c.innerHTML=qChromeHTML(pack,sec);
}
function qRepaint(id){
  const q=qById(id), card=$(`#qList .qcard[data-id="${CSS.escape(id)}"]`); if(!q||!card) return;
  const keepFocus=document.activeElement&&card.contains(document.activeElement)&&document.activeElement.tagName==="TEXTAREA";
  const html=qCardHTML(q,qUI[id],!!qSetState); const t=document.createElement("div"); t.innerHTML=html;
  card.replaceWith(t.firstElementChild);
  const nc=$(`#qList .qcard[data-id="${CSS.escape(id)}"]`); const f=nc&&$("[data-focus]",nc);
  if(f&&qUI[id].justRevealed){f.focus();qUI[id].justRevealed=false;}
}
function qGradeCard(id,g){
  const q=qById(id), u=qUI[id]; if(!q||u.graded!==undefined) return;
  u.graded=g; qApplyGrade(q,g,u.conf,u.att);
  if(qSetState){qSetState.res[id]=g;}
  qRepaint(id); qRefreshChrome();
  if(qSetState&&Object.keys(qSetState.res).length===qSetState.ids.length){
    LS.set(KEY+"lastSet:"+qSetState.key,{date:qDay(),had:qSetState.ids.filter(i=>qSetState.res[i]===2).length,total:qSetState.ids.length});
    const pack=LS.get(KEY+"quizPack","tdd"); qFillList(pack,0);
  }
}
function qClick(e){
  const b=e.target.closest("[data-act]"); if(!b) return;
  const act=b.dataset.act, card=b.closest(".qcard"), id=card&&card.dataset.id;
  const pack=LS.get(KEY+"quizPack","tdd");
  if(act==="conf"){const u=qUI[id];u.conf=u.conf===b.dataset.v?null:b.dataset.v;qRepaint(id);return;}
  if(act==="reveal"){const u=qUI[id];const ta=$("[data-att]",card);if(ta)u.att=ta.value;u.revealed=true;u.justRevealed=true;qRepaint(id);return;}
  if(act==="grade"){qGradeCard(id,+b.dataset.g);return;}
  if(act==="pick"){
    const q=qById(id),u=qUI[id]; if(u.pick!==undefined) return;
    u.pick=+b.dataset.i; u.revealed=true; qRepaint(id);
    if(u.graded===undefined){const ok=q.options[u.pick]===q.answer;u.graded=ok?2:0;qApplyGrade(q,u.graded,u.conf,"");if(qSetState){qSetState.res[id]=u.graded;} qRefreshChrome();
      if(qSetState&&Object.keys(qSetState.res).length===qSetState.ids.length){LS.set(KEY+"lastSet:"+qSetState.key,{date:qDay(),had:qSetState.ids.filter(i=>qSetState.res[i]===2).length,total:qSetState.ids.length});qFillList(pack,0);}}
    return;
  }
  if(act==="prompt"){const q=qById(id);qCopy(qPrompt(q,(qUI[id]||{}).att),"Grading prompt copied");return;}
  if(act==="pack"){LS.set(KEY+"quizPack",b.dataset.v);renderQuiz();return;}
  if(act==="filter"){qFilter=b.dataset.v;renderQuiz();return;}
  if(act==="shuf"){qShuf=!qShuf;renderQuiz();return;}
  if(act==="sec"){LS.set(KEY+"quizSec:"+pack,+b.dataset.v);renderQuiz();return;}
  if(act==="mixed"){
    const pool=DATA.quiz.filter(q=>qIn(q,pack));
    const pri=qShuffle(pool.filter(q=>qDue(q)||qMissed(q))).slice(0,5);
    const rest=qShuffle(pool.filter(q=>!pri.includes(q))).slice(0,10-pri.length);
    quizRunSet("Mixed check",qShuffle(pri.concat(rest)).map(q=>q.id),"mixed");return;
  }
  if(act==="exitset"){qSetState=null;renderQuiz();return;}
  if(act==="record"){
    const txt=qSetState?qRecord(qSetState.ids):qRecord();
    if(!txt){if(window.toast)toast("Grade a question first");return;}
    qCopy(txt,"Sitting record copied");return;
  }
}
function qInput(e){const ta=e.target.closest("[data-att]");if(!ta)return;const card=ta.closest(".qcard");qUI[card.dataset.id].att=ta.value;}
function qKey(e){
  if(e.target.tagName==="TEXTAREA"||e.target.tagName==="INPUT") return;
  const card=e.target.closest&&e.target.closest(".qcard"); if(!card) return;
  if(["1","2","3"].includes(e.key)){const u=qUI[card.dataset.id];if(u&&u.revealed&&u.graded===undefined&&qById(card.dataset.id).type!=="mc"){e.preventDefault();qGradeCard(card.dataset.id,+e.key-1);}}
}
function quizRunSet(title,ids,key){
  qSetState={title,ids,key,res:{}};
  ids.forEach(i=>{qUI[i]={};});
  if(window.go) go("quiz"); else renderQuiz();
  renderQuiz();
}

/* ============================================================
   Practice: teach-back, reviewer questions, spaced preset,
   claim sort, Handbook Assistant placement
   ============================================================ */
const pr={tb:{pack:"odm",run:false,t0:0,secs:null,ticks:{}},rv:{order:null,i:0,t0:0,revealed:false,graded:null,timer:null,left:45},cs:{order:null,i:0,score:0,done:0,pick:null},hb:{shown:false}};
const fmtT=s=>Math.floor(s/60)+":"+String(Math.round(s%60)).padStart(2,"0");
let prTick=null;
function prActive(){const v=$("#v-practice");return v&&v.classList.contains("active");}
function renderPractice(){
  const el=$("#v-practice"); if(!el) return;
  const P=DATA.practice; if(!P){el.innerHTML=`<div class="note">Practice data is not loaded.</div>`;return;}
  const last=LS.get(KEY+"lastSet:p18",null);
  el.innerHTML=`<h2 class="vh">Practice</h2>
  <p class="lead">The mission is to defend a design aloud, so these modes train speaking and judgment as well as recall. Everything stays on this device. ${lib("odm-block-04-teach-it","ODM block 4")} · ${lib("tdd-block-08-design-review","TDD block 8")}</p>
  <section class="pcard" id="pTeach" aria-labelledby="pTeachH"></section>
  <section class="pcard" id="pRev" aria-labelledby="pRevH"></section>
  <section class="pcard" id="pPull" aria-labelledby="pPullH"><h3 id="pPullH">Spaced review preset (P1 to P8)</h3>
    <p>The eight closed-book items from ODM block 6, scored as X/8. ${last?`Last run ${esc(last.date)}: <b>${last.had}/${last.total}</b>.`:"Not run yet."}</p>
    <div class="btnrow"><button type="button" class="b" id="pPullGo">Run P1 to P8</button></div></section>
  <section class="pcard" id="pClaim" aria-labelledby="pClaimH"></section>
  <section class="pcard" id="pHand" aria-labelledby="pHandH"></section>`;
  prTeach(); prRev(); prClaim(); prHand();
  $("#pPullGo").onclick=()=>quizRunSet("Spaced review P1 to P8",DATA.practice.pull.map(x=>x[1]),"p18");
}

/* ---- 1. Teach-back ---- */
function prTeach(){
  const el=$("#pTeach"); if(!el) return; const t=pr.tb, T=DATA.practice.teachback[t.pack];
  const hist=LS.get(KEY+"teachback",[]).slice(-4).reverse();
  let h=`<h3 id="pTeachH">Teach-back</h3>
   <div class="qrow" role="group" aria-label="Talk length"><button type="button" class="chip ${t.pack==="odm"?"on":""}" data-p="odm" ${t.run?"disabled":""}>5 minutes (ODM)</button><button type="button" class="chip ${t.pack==="tdd"?"on":""}" data-p="tdd" ${t.run?"disabled":""}>8 minutes (TDD)</button></div>`;
  if(t.run){
    h+=`<p class="ptimer" id="pTimer" role="timer" aria-live="off">0:00</p>
     <p class="phead">Market · Voluntary · Certifiable · Statute</p>
     <p class="muted">Speak aloud. Only the four headings are allowed. Aim for ${fmtT(T.pass[0])} to ${fmtT(T.pass[1])}.</p>
     <div class="btnrow"><button type="button" class="b" id="tbStop">Stop</button></div>`;
  } else if(t.secs!==null){
    const inBand=t.secs>=T.pass[0]&&t.secs<=T.pass[1];
    h+=`<p class="ptimer">${fmtT(t.secs)}</p><p class="${inBand?"ok":"no"}" role="status">${inBand?"Inside the band.":t.secs<T.pass[0]?"Under the band. Say more of the sourced detail.":"Over the band. Cut a section."}</p>
     <p><b>Tick what you covered.</b></p><ul class="ptick">${T.parts.map((p,i)=>`<li><label><input type="checkbox" data-tick="${i}" ${t.ticks[i]?"checked":""}> <b>${esc(p[0])}</b> ${ec(p[1])}</label></li>`).join("")}</ul>
     <p class="muted">The sentence you stumbled on is a Missed-it item for block 6.</p>
     <div class="btnrow"><button type="button" class="b" id="tbCopy">Copy result</button><button type="button" class="b" id="tbAgain">Run again</button></div>`;
  } else {
    h+=`<p>${esc(T.title)}. A timer runs while you talk. Notes stay closed. The outline appears afterward as a checklist.</p><div class="btnrow"><button type="button" class="b" id="tbStart">Start the clock</button></div>`;
  }
  if(hist.length) h+=`<p class="muted">Recent: ${hist.map(x=>esc(x.date)+" "+fmtT(x.secs)+" ("+x.covered+"/"+x.total+")").join(" · ")}</p>`;
  el.innerHTML=h;
  $$("[data-p]",el).forEach(b=>b.onclick=()=>{pr.tb={pack:b.dataset.p,run:false,t0:0,secs:null,ticks:{}};prTeach();});
  const st=$("#tbStart",el); if(st) st.onclick=()=>{t.run=true;t.t0=Date.now();t.secs=null;t.ticks={};prTeach();clearInterval(prTick);prTick=setInterval(()=>{if(!prActive()||!t.run){clearInterval(prTick);return;}const n=$("#pTimer");if(n)n.textContent=fmtT((Date.now()-t.t0)/1000);},500);};
  const sp=$("#tbStop",el); if(sp) sp.onclick=()=>{t.secs=Math.round((Date.now()-t.t0)/1000);t.run=false;clearInterval(prTick);prSaveTb();prTeach();if(window.Store)Store.bump("quiz");};
  $$("[data-tick]",el).forEach(c=>c.onchange=()=>{t.ticks[c.dataset.tick]=c.checked;prSaveTb();});
  const cp=$("#tbCopy",el); if(cp) cp.onclick=()=>{const cov=T.parts.filter((_,i)=>t.ticks[i]).length;qCopy("## Teach-back "+qDay()+"\n\n"+T.title+": "+fmtT(t.secs)+" (band "+fmtT(T.pass[0])+" to "+fmtT(T.pass[1])+"). Covered "+cov+"/"+T.parts.length+".\nStumble sentence: \n","Result copied");};
  const ag=$("#tbAgain",el); if(ag) ag.onclick=()=>{pr.tb={pack:t.pack,run:false,t0:0,secs:null,ticks:{}};prTeach();};
}
function prSaveTb(){
  const t=pr.tb,T=DATA.practice.teachback[t.pack]; if(t.secs===null) return;
  const h=LS.get(KEY+"teachback",[]); const rec={date:qDay(),pack:t.pack,secs:t.secs,covered:T.parts.filter((_,i)=>t.ticks[i]).length,total:T.parts.length,at:t.t0};
  const i=h.findIndex(x=>x.at===t.t0); if(i>=0) h[i]=rec; else h.push(rec); LS.set(KEY+"teachback",h.slice(-20));
}

/* ---- 2. Reviewer questions ---- */
function prRev(){
  const el=$("#pRev"); if(!el) return; const R=DATA.practice.reviewer, r=pr.rv;
  if(!r.order) r.order=qShuffle(R.map((_,i)=>i));
  const cur=R[r.order[r.i%R.length]];
  let h=`<h3 id="pRevH">Reviewer questions</h3><p class="muted">Answer aloud in 45 seconds. Then reveal and grade yourself.</p><p class="pq">${esc(cur.q)}</p>`;
  if(!r.revealed){
    h+=`<p class="ptimer sm" id="rvTimer" role="timer" aria-live="off">0:${String(r.left).padStart(2,"0")}</p><div class="btnrow"><button type="button" class="b" id="rvReveal">Reveal the model answer</button></div>`;
  } else {
    h+=`<div class="qexp show"><b>Answer.</b> ${ec(cur.a)}</div>`;
    if(r.graded===null) h+=`<div class="qgrade"><span class="muted">How did you do?</span><button type="button" class="b" data-g="0">Missed</button><button type="button" class="b" data-g="1">Partly</button><button type="button" class="b" data-g="2">Had it</button></div>`;
    else {
      h+=`<p class="qres ${r.graded===2?"ok":r.graded===1?"part":"no"}" role="status">${QGRADE[r.graded]}.</p>`;
      if(r.graded<2) h+=`<label class="qlabel" for="rvStumble">The sentence you stumbled on</label><input class="search" id="rvStumble" placeholder="Write it here so block 6 can retest it"><div class="btnrow"><button type="button" class="b" id="rvSave">Save it</button></div>`;
      h+=`<div class="btnrow"><button type="button" class="b" id="rvNext">Next question</button></div>`;
    }
  }
  const st=LS.get(KEY+"stumbles",[]).slice(-3).reverse();
  if(st.length) h+=`<p class="muted"><b>Missed-it sentences.</b> ${st.map(x=>esc(x.date)+": "+esc(x.text)).join(" · ")}</p>`;
  el.innerHTML=h;
  if(!r.revealed){
    clearInterval(r.timer); r.t0=Date.now(); r.left=45;
    r.timer=setInterval(()=>{if(!prActive()||r.revealed){clearInterval(r.timer);return;}r.left=Math.max(0,45-Math.floor((Date.now()-r.t0)/1000));const n=$("#rvTimer");if(n){n.textContent="0:"+String(r.left).padStart(2,"0");n.classList.toggle("late",r.left===0);}},500);
  }
  const rv=$("#rvReveal",el); if(rv) rv.onclick=()=>{clearInterval(r.timer);r.revealed=true;prRev();};
  $$("[data-g]",el).forEach(b=>b.onclick=()=>{r.graded=+b.dataset.g;if(window.Store)Store.bump("quiz");prRev();});
  const sv=$("#rvSave",el); if(sv) sv.onclick=()=>{const v=$("#rvStumble").value.trim();if(!v)return;const a=LS.get(KEY+"stumbles",[]);a.push({date:qDay(),text:v,q:cur.q});LS.set(KEY+"stumbles",a.slice(-30));if(window.toast)toast("Saved");prRev();};
  const nx=$("#rvNext",el); if(nx) nx.onclick=()=>{r.i++;r.revealed=false;r.graded=null;prRev();};
}

/* ---- 4. Claim sort ---- */
function prClaim(){
  const el=$("#pClaim"); if(!el) return; const pool=DATA.drills.claim, c=pr.cs;
  if(!c.order) c.order=qShuffle(pool.items.map((_,i)=>i));
  let h=`<h3 id="pClaimH">Claim sort</h3><p class="muted">${esc(pool.ask)} ${c.done} answered, ${c.score} right.</p>`;
  const item=pool.items[c.order[c.done%pool.items.length]];
  h+=`<p class="pq">${esc(item.p)}</p><div class="qopts q2" role="group" aria-label="Choose one">`+pool.options.map((o,i)=>{
    let cls=""; if(c.pick!==null){ if(i===item.a) cls="correct"; else if(i===c.pick) cls="wrong"; }
    return `<button type="button" class="qo ${cls}" data-i="${i}" ${c.pick!==null?"disabled":""}>${esc(o)}</button>`;}).join("")+`</div>`;
  if(c.pick!==null) h+=`<p class="qfb ${c.pick===item.a?"ok":"no"}" role="status"><b>${c.pick===item.a?"Right.":"Not quite."}</b> ${ec(item.why)} ${item.src&&item.src!=="pack"&&item.src!=="claims"?ec("["+item.src+"]"):""}</p><div class="btnrow"><button type="button" class="b" id="csNext">Next</button></div>`;
  el.innerHTML=h;
  $$(".qo",el).forEach(b=>b.onclick=()=>{if(c.pick!==null)return;c.pick=+b.dataset.i;if(c.pick===item.a)c.score++;if(window.Store)Store.bump("quiz");prClaim();});
  const nx=$("#csNext",el); if(nx) nx.onclick=()=>{c.done++;c.pick=null;prClaim();};
}

/* ---- 5. Handbook Assistant placement ---- */
function prHand(){
  const el=$("#pHand"); if(!el) return; const H=DATA.practice.handbook, s=pr.hb;
  const saved=LS.get(KEY+"handbook",{});
  let h=`<h3 id="pHandH">Handbook Assistant placement</h3>
   <p>An internal assistant answers questions about the employee handbook, uses retrieval, and may draft an IT ticket through a tool. It may not change payroll. For each secondary layer, write one control and the owner. The layer names are secondary, not Gartner quotes.</p>`;
  h+=H.layers.map((l,i)=>`<label class="qlabel" for="hb${i}">${esc(l)}</label><textarea class="qatt" id="hb${i}" rows="2" data-hb="${i}" placeholder="Control, and who owns it">${esc(saved[i]||"")}</textarea>${s.shown?`<div class="qexp show"><b>Study key.</b> ${ec(H.key[i])}</div>`:""}`).join("");
  h+=`<div class="btnrow"><button type="button" class="b" id="hbShow">${s.shown?"Hide the study key":"Compare with the study key"}</button></div>
   <p class="muted">The key is a study placement, not a Gartner crosswalk. Your answer can differ and still be defensible if you can name the source.</p>`;
  el.innerHTML=h;
  $$("[data-hb]",el).forEach(t=>t.oninput=()=>{const o=LS.get(KEY+"handbook",{});o[t.dataset.hb]=t.value;LS.set(KEY+"handbook",o);});
  $("#hbShow",el).onclick=()=>{s.shown=!s.shown;prHand();};
}
