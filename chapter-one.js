import { chapterOne } from './chapter-one-data.js';
import { structureSvg } from './chapter-one-structures.js';
const STORAGE_KEY = 'miniochem.chapter1.reviewed.v1';
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
let reviewed;
try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); reviewed=new Set(Array.isArray(saved)?saved:[]); }
catch { reviewed=new Set(); }
const panel=document.querySelector('#chapter-one');
const topicOptions=[...new Set(chapterOne.map(p=>p.topic))];
function renderPart(item, index, number) {
  const letter=String.fromCharCode(97+index);
  const drawing = item.forms ? `<div class="practice-pair">${structureSvg(item.forms[0],`Problem ${number} (${letter}), left structure`)}<span aria-label="compare forms">${number==='1.21'?'? ↔ ?':'↔'}</span>${structureSvg(item.forms[1],`Problem ${number} (${letter}), right structure`)}</div>`
    : item.diagram ? structureSvg(item.diagram,`Problem ${number} (${letter}): ${item.diagram.description}`)
    : item.svg || `<span class="practice-formula">${escape(item.formula)}</span>`;
  return `<figure class="practice-part ${item.forms?'has-pair':''}"><figcaption><span class="part-letter">(${letter})</span>${escape(item.caption||'')}</figcaption>${drawing}</figure>`;
}
panel.innerHTML=`
 <header class="practice-header"><p class="practice-eyebrow">PROBLEM SET 1 · TEXTBOOK PRACTICE</p><h1>Chapter 1</h1><p class="practice-subtitle">Atoms and molecules; orbitals and bonding</p>
 <p>All 32 assigned textbook problems, together in one place.</p><p class="practice-source">Jones &amp; Fleming · <cite>Organic Chemistry</cite>, 5th ed. · pp. 15–49</p></header>
 <div class="practice-tools"><label>Topic<select id="practice-topic"><option value="">All topics</option>${topicOptions.map(t=>`<option>${t}</option>`).join('')}</select></label>
 <label>Jump to problem<select id="practice-jump"><option value="">Choose a number</option>${chapterOne.map(p=>`<option value="${p.number}">${p.number}</option>`).join('')}</select></label>
 <label class="practice-toggle"><input id="practice-unreviewed" type="checkbox">Unreviewed only</label><span id="practice-count" role="status" aria-live="polite"></span></div>
 <details class="practice-about"><summary>About this first pass</summary><p>Assigned in Problem Set 1: 1.4–1.22, 1.24, 1.37–1.39, 1.42–1.45, and 1.48–1.52. Numbering and subparts follow the supplied textbook. Wording is lightly condensed; diagrams are redrawn with explicit bonds, charges and electron dots. Some C–H bonds are grouped as CH, CH₂ or CH₃.</p><p>“Worked example” identifies an exercise with an answer in the textbook; this practice page contains prompts only. Supplied reference forms for 1.14 and 1.18 retain the context needed for those questions. Page references use the printed page number, with the uploaded PDF page in parentheses. Progress is saved only in this browser.</p></details>
 <div id="practice-list">${chapterOne.map(p=>`<article class="practice-card" id="problem-${p.number}" data-number="${p.number}" data-topic="${p.topic}" tabindex="-1"><header><div><h2>Problem ${p.number}</h2><span class="practice-meta">${p.topic} · p. ${p.page} (PDF ${p.pdfPage})${p.worked?' · Worked example':''}</span></div><label class="review-control"><input type="checkbox" data-reviewed="${p.number}" ${reviewed.has(p.number)?'checked':''}>Reviewed<span class="sr-only"> Problem ${p.number}</span></label></header><p class="practice-prompt">${p.prompt}</p>${p.parts.length?`<div class="practice-parts ${p.parts.some(x=>x.forms)?'pairs':''}">${p.parts.map((x,i)=>renderPart(x,i,p.number)).join('')}</div>`:''}${p.note?`<p class="practice-note">${p.note}</p>`:''}<a class="practice-permalink" href="#problem-${p.number}" aria-label="Link to problem ${p.number}"># ${p.number}</a></article>`).join('')}</div>
 <p id="practice-empty" hidden>No problems match this view. Choose another topic or turn off “Unreviewed only.”</p>`;
const topic=panel.querySelector('#practice-topic'), unreviewed=panel.querySelector('#practice-unreviewed');
function filter(){
 let shown=0;
 panel.querySelectorAll('.practice-card').forEach(card=>{
  card.hidden=(topic.value&&card.dataset.topic!==topic.value)||(unreviewed.checked&&reviewed.has(card.dataset.number));
  if(!card.hidden)shown++;
 });
 const count=chapterOne.filter(p=>reviewed.has(p.number)).length;
 panel.querySelector('#practice-count').textContent=`${shown} shown · ${count} / 32 reviewed`;
 panel.querySelector('#practice-empty').hidden=shown!==0;
}
topic.addEventListener('change',filter);unreviewed.addEventListener('change',filter);
panel.addEventListener('change',event=>{
 const number=event.target.dataset.reviewed;if(!number)return;
 event.target.checked?reviewed.add(number):reviewed.delete(number);
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...reviewed]));}catch{/* Practice remains usable when storage is unavailable. */}
 filter();
});
panel.querySelector('#practice-jump').addEventListener('change',event=>{
 if(!event.target.value)return;
 const hash=`#problem-${event.target.value}`;
 if(location.hash===hash)syncHash();else location.hash=hash;
});
const tabs=[...document.querySelectorAll('[data-app-tab]')];
function activate(name){
 tabs.forEach(tab=>{const active=tab.dataset.appTab===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
 document.querySelector('#structures-panel').hidden=name!=='structures';panel.hidden=name!=='chapter1';
}
function syncHash(){
 const match=location.hash.match(/^#problem-(1\.\d+)$/);
 const problem=match&&chapterOne.find(p=>p.number===match[1]);
 activate(location.hash==='#chapter1'||problem?'chapter1':'structures');
 if(problem){topic.value='';unreviewed.checked=false;filter();const card=document.getElementById(`problem-${problem.number}`);card.focus({preventScroll:true});requestAnimationFrame(()=>card.scrollIntoView({block:'start'}));}
 else if(location.hash==='#chapter1')window.scrollTo({top:0});
}
tabs.forEach((tab,index)=>{
 tab.addEventListener('click',()=>{location.hash=tab.dataset.appTab==='chapter1'?'chapter1':'structures';});
 tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs[(index+1)%tabs.length];next.click();next.focus();});
});
window.addEventListener('hashchange',syncHash);filter();syncHash();
