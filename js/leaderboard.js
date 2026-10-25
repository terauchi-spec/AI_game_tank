// Network work happens only after results or when this board is opened, never per frame.
const LEADERBOARD_PENDING_KEY='tankGameLeaderboardPendingV1';
const leaderboardRuns=new WeakMap();
let leaderboardBoard='overall',leaderboardRequest=0,leaderboardSending=false,leaderboardPending=readLeaderboardPending();
function readLeaderboardPending(){try{const v=JSON.parse(localStorage.getItem(LEADERBOARD_PENDING_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch(_){return {};}}
function saveLeaderboardPending(){try{localStorage.setItem(LEADERBOARD_PENDING_KEY,JSON.stringify(leaderboardPending));}catch(_){}}
function queueLeaderboardScore(s){
 if(!s?.final||s.leaderboardQueued||areaDebugEnabled||s.debugUsed||s.awards?.disabled)return;
 const stage=currentStageId();if(!STAGE_ORDER.some(v=>v.id===stage))return;
 const name=readIntroName();if(!name||!Number.isFinite(s.final.total)||s.final.total<=0)return;
 const byId=new Map(TITLE_CATALOG.map(t=>[t.id,t]));
 const titles=[s.awards?.primary,...(s.awards?.titles||[])].filter((id,i,a)=>byId.has(id)&&a.indexOf(id)===i);
 const entry={name,stage,score:Math.round(s.final.total),rank:s.final.rank,skill,titles,debug:false};
 s.leaderboardQueued=true;
 if(!leaderboardPending[stage]||entry.score>leaderboardPending[stage].score){leaderboardPending[stage]=entry;leaderboardRuns.set(entry,s);saveLeaderboardPending();}
 setTimeout(flushLeaderboardScores,0);
}
async function leaderboardFetch(url,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{const r=await fetch(url,{...options,credentials:'same-origin',signal:controller.signal});if(!r.ok)throw Error('Leaderboard HTTP '+r.status);return await r.json();}finally{clearTimeout(timer);}
}
async function flushLeaderboardScores(){
 if(leaderboardSending||state==='play'||state==='blast'||state==='dying')return;
 leaderboardSending=true;
 try{
  for(const stage of STAGE_ORDER.map(v=>v.id)){
   const entry=leaderboardPending[stage];if(!entry)continue;
   const result=await leaderboardFetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)});
   if(!result.ok)throw Error('not saved');
   notifyLeaderboardUpdate(entry,result);
   if(leaderboardPending[stage]===entry){delete leaderboardPending[stage];saveLeaderboardPending();}
  }
 }catch(_){/* Keep the bounded queue for the next result or board visit. */}
 finally{leaderboardSending=false;}
}
function notifyLeaderboardUpdate(entry,result){
 const run=leaderboardRuns.get(entry);if(!run||!Array.isArray(result.updated))return;
 const updates=result.updated.filter(v=>(v.board==='overall'||STAGE_ORDER.some(stage=>stage.id===v.board))&&Number.isInteger(v.position)&&v.position>=1&&v.position<=30);
 if(!updates.length)return;
 run.leaderboardUpdates=updates;
 // Never interrupt another sortie/menu when an old offline submission completes.
 if(typeof scoreStats!=='undefined'&&scoreStats===run&&(state==='win'||state==='lose')&&typeof syncResultScreen==='function')syncResultScreen();
}
function openLeaderboard(){
 if(state!=='title')return;
 state='leaderboard';document.body.classList.remove('title-open');document.body.classList.add('leaderboard-open');
 document.getElementById('leaderboardScreen').hidden=false;document.getElementById('leaderboardScreen').scrollTop=0;
 const select=document.getElementById('leaderboardSelect');
 if(!select.options.length){const options=[{id:'overall',name:'総合'},...STAGE_ORDER];for(const v of options){const option=document.createElement('option');option.value=v.id;option.textContent=v.name;select.appendChild(option);}}
 select.value=leaderboardBoard;document.getElementById('leaderboardHome').focus({preventScroll:true});sfx('uiConfirm');refreshLeaderboard();
}
function closeLeaderboard(){
 if(state!=='leaderboard')return;
 leaderboardRequest++;document.getElementById('leaderboardScreen').hidden=true;document.body.classList.remove('leaderboard-open');state='title';sfx('uiSelect');
}
async function refreshLeaderboard(){
 const request=++leaderboardRequest,board=leaderboardBoard,status=document.getElementById('leaderboardStatus'),list=document.getElementById('leaderboardList');
 status.textContent='ランキングを読み込んでいます…';list.replaceChildren();
 await flushLeaderboardScores();
 try{
  const data=await leaderboardFetch('/api/leaderboard?board='+encodeURIComponent(board));
  if(request!==leaderboardRequest||state!=='leaderboard')return;
  if(!Array.isArray(data.entries))throw Error('invalid response');
  renderLeaderboardRows(data.entries.slice(0,30));status.textContent=data.entries.length?'トップ30 · 各プレイヤーの自己ベスト':'まだ記録がありません。最初の記録を目指そう！';
  if(Object.keys(leaderboardPending).length)status.textContent+=' 未送信の記録があります。「更新」で再送します。';
 }catch(_){if(request===leaderboardRequest&&state==='leaderboard')status.textContent='ランキングを取得できませんでした。「更新」で再試行できます。';}
}
function renderLeaderboardRows(entries){
 const list=document.getElementById('leaderboardList'),titles=new Map(TITLE_CATALOG.map(t=>[t.id,t])),skills=new Map(SK.map(k=>[k.id,k.n]));
 const fragment=document.createDocumentFragment();
 entries.forEach((entry,index)=>{
  const row=document.createElement('li');row.className='leaderboard-row';
  const add=(tag,cls,text,parent=row)=>{const el=document.createElement(tag);el.className=cls;el.textContent=text;parent.appendChild(el);return el;};
  const position=add('div','lb-position',index<3?'':String(index+1).padStart(2,'0'));
  if(index<3){const medal=document.createElement('img');medal.className='lb-medal';medal.src='assets/ui/leaderboard/medal-'+['gold','silver','bronze'][index]+'.webp?v=2026.10.26.0847';medal.alt=(index+1)+'位 '+['金','銀','銅'][index]+'メダル';medal.width=160;medal.height=192;medal.decoding='async';position.appendChild(medal);}
  const body=add('div','lb-player','');add('strong','lb-name',String(entry.name||''),body);
  const meta=add('div','lb-meta','',body);add('span','lb-score',Number(entry.score).toLocaleString('ja-JP')+'点',meta);add('span','lb-rank','RANK '+String(entry.rank||''),meta);add('span','lb-skill',skills.get(entry.skill)||'—',meta);
  const awards=add('div','lb-titles','',body);let found=0;
  for(const id of Array.isArray(entry.titles)?entry.titles:[]){const title=titles.get(id);if(!title)continue;const chip=add('span','lb-title','',awards),art=document.createElement('span');art.className='lb-title-art';art.innerHTML=awardIcon(title,'title');chip.appendChild(art);add('span','',title.name,chip);found++;}
  if(!found)add('span','lb-empty-title','称号なし',awards);
  fragment.appendChild(row);
 });list.replaceChildren(fragment);
}
document.getElementById('titleLeaderboard').addEventListener('click',openLeaderboard);
document.getElementById('leaderboardHome').addEventListener('click',closeLeaderboard);
document.getElementById('leaderboardRefresh').addEventListener('click',()=>{sfx('uiSelect');refreshLeaderboard();});
document.getElementById('leaderboardSelect').addEventListener('change',event=>{leaderboardBoard=event.target.value;sfx('uiSelect');refreshLeaderboard();});
addEventListener('keydown',event=>{if(state==='leaderboard'&&event.key==='Escape'){event.preventDefault();closeLeaderboard();}});
addEventListener('online',()=>{if(state!=='play')flushLeaderboardScores();});
