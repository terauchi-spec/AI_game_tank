// Presentation only: progression and award persistence remain in their existing owners.
const UNLOCK_INSTRUCTOR_KEY='tankGameUnlockInstructorV1';
const UNLOCK_INSTRUCTORS=['instructor_1','instructor_2','instructor_3','instructor_4','instructor_5','instructor_6','instructor_7','instructor_8','instructor_9','instructor_10','instructor_11','instructor_12','instructor_0'];
let unlockRun=null,unlockInstructorNext=0;
try{const saved=Number(localStorage.getItem(UNLOCK_INSTRUCTOR_KEY));if(Number.isSafeInteger(saved)&&saved>=0)unlockInstructorNext=saved%UNLOCK_INSTRUCTORS.length;}catch(_){}
function escapeUnlockText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function collectRunUnlocks(s){
 if(!s?.final||(typeof areaDebugEnabled!=='undefined'&&areaDebugEnabled)||s.awards?.disabled)return [];
 const items=[],stages=typeof STAGE_ORDER!=='undefined'?STAGE_ORDER:[],skills=typeof SK!=='undefined'?SK:[],titles=typeof TITLE_CATALOG!=='undefined'?TITLE_CATALOG:[];
 const stage=stages.find(v=>v.id===s.unlockedStage);
 if(stage&&!s.stageUnlockSaveFailed)items.push({kind:'stage',id:stage.id,name:(typeof stageDisplayNumber==='function'?stageDisplayNumber(stage.id)+' ':'')+stage.name,image:'assets/ui/stages/'+stage.image+'.webp',note:'次回の出撃から選択できます'});
 const skill=skills.find(v=>v.id===s.unlockedSkill);
 if(skill&&!s.unlockSaveFailed)items.push({kind:'skill',id:skill.id,name:'「'+skill.n+'」',image:typeof skillCardIconSrc==='function'?skillCardIconSrc(skill.id):'',note:'次回の出撃から選択できます'});
 if(!s.awards?.saveFailed)for(const id of new Set(s.awards?.newTitles||[])){
  const title=titles.find(v=>v.id===id);if(title)items.push({kind:'title',id,name:title.name,title,note:title.type||'新しい称号を獲得しました'});
 }
 const promotion=s.careerPromotion;
 if(!s.awards?.saveFailed&&promotion&&Number.isInteger(promotion.previousLevel)&&Number.isInteger(promotion.level)&&promotion.previousLevel>=1&&promotion.level>promotion.previousLevel&&promotion.level<=16&&promotion.name){
  items.push({kind:'rank',id:'careerRank',name:promotion.name,note:promotion.from+' → '+promotion.name});
 }
 const boards=(s.leaderboardUpdates||[]).filter(v=>Number.isInteger(v.position)&&v.position>=1&&v.position<=30&&(v.board==='overall'||stages.some(stage=>stage.id===v.board)));
 if(boards.length){
  const best=Math.min(...boards.map(v=>v.position)),medal=best===1?'gold':best===2?'silver':'bronze';
  items.push({kind:'leaderboard',id:'leaderboard',name:Math.round(s.final.total).toLocaleString('ja-JP')+'点',image:'assets/ui/leaderboard/medal-'+medal+'.webp',note:boards.map(v=>(v.board==='overall'?'総合':stages.find(stage=>stage.id===v.board).name)+' '+v.position+'位').join(' ／ ')});
 }
 return items;
}
function renderUnlockCard(item,index=0){
 const labels={stage:'新ステージ',skill:'新スキル',title:'新称号',rank:'昇級！',leaderboard:'スコアボード更新'},label=labels[item.kind];
 const art=item.kind==='rank'?'<span class="unlock-rank-mark">↑</span>':item.kind==='title'?(typeof awardIcon==='function'?awardIcon(item.title,'title'):''):('<img src="'+escapeUnlockText(item.image)+'" alt="" decoding="async" loading="lazy">');
 return '<article class="unlock-card unlock-card-'+item.kind+'" style="--unlock-reveal-delay:'+ (300+Math.min(index,6)*100)+'ms"><div class="unlock-card-art" aria-hidden="true">'+art+'</div><div class="unlock-card-copy"><h2>'+label+'</h2><div class="unlock-name">'+escapeUnlockText(item.name)+'</div>'+(item.kind==='leaderboard'||item.kind==='rank'?'<div class="unlock-leaderboard-ranks">'+escapeUnlockText(item.note)+'</div>':'')+'</div></article>';
}
let unlockRevealTimer=null;
function cancelUnlockReveal(){
 if(unlockRevealTimer!==null){clearTimeout(unlockRevealTimer);unlockRevealTimer=null;}
}
function beginUnlockReveal(screen){
 cancelUnlockReveal();
 const list=document.getElementById('unlockList'),run=unlockRun;
 list.classList.remove('unlock-revealing');
 unlockRevealTimer=setTimeout(()=>{
  unlockRevealTimer=null;
  if(unlockRun!==run||screen.hidden)return;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const top=Math.max(0,screen.scrollTop+list.getBoundingClientRect().top-screen.getBoundingClientRect().top-20);
  screen.scrollTo({top,left:0,behavior:reduced?'instant':'smooth'});
  if(!reduced)list.classList.add('unlock-revealing');
 },650);
}
// Manual interaction takes priority over the opening scroll.
const unlockScrollScreen=document.getElementById('unlockScreen');
function interruptUnlockReveal(){
 cancelUnlockReveal();
 unlockScrollScreen.scrollTo({top:unlockScrollScreen.scrollTop,left:0,behavior:'instant'});
}
for(const event of ['pointerdown','touchstart','wheel','keydown'])unlockScrollScreen.addEventListener(event,interruptUnlockReveal,{passive:true});
function closeUnlockScreen(){
 cancelUnlockReveal();
 document.body.classList.remove('unlock-open');document.getElementById('unlockScreen').hidden=true;unlockRun=null;
}
function syncUnlockScreen(s){
 if(!s){if(unlockRun)closeUnlockScreen();return false;}
 let updated=false;
 if(!s.unlockNoticePrepared){s.unlockNoticePrepared=true;s.unlockNoticeItems=collectRunUnlocks(s);s.unlockLeaderboardApplied=!!s.leaderboardUpdates?.length;}
 else if(s.leaderboardUpdates?.length&&!s.unlockLeaderboardApplied){
  s.unlockLeaderboardApplied=true;
  const notices=collectRunUnlocks(s).filter(v=>v.kind==='leaderboard');
  if(notices.length){
   s.unlockNoticeItems=s.unlockNoticeAcknowledged?notices:[...s.unlockNoticeItems,...notices];
   s.unlockNoticeAcknowledged=false;updated=true;
  }
 }
 if(s.unlockNoticeAcknowledged||!s.unlockNoticeItems.length){if(unlockRun)closeUnlockScreen();return false;}
 if(unlockRun!==s){
  const screen=document.getElementById('unlockScreen'),image=document.getElementById('unlockInstructor');
  unlockRun=s;image.src='assets/ui/instructors/'+UNLOCK_INSTRUCTORS[unlockInstructorNext]+'.webp?v=2026.10.25.1434';
  unlockInstructorNext=(unlockInstructorNext+1)%UNLOCK_INSTRUCTORS.length;
  try{localStorage.setItem(UNLOCK_INSTRUCTOR_KEY,String(unlockInstructorNext));}catch(_){}
  document.getElementById('unlockDialogue').textContent=s.final.cleared?'よくやった！すばらしい逃げ足だったぞ':'もっとこっそり進め！はずかしくないのか';
  document.getElementById('unlockList').innerHTML=s.unlockNoticeItems.map(renderUnlockCard).join('');
  screen.hidden=false;document.body.classList.add('unlock-open');screen.scrollTop=0;
  document.getElementById('unlockEvaluate').focus({preventScroll:true});
  beginUnlockReveal(screen);
 }else if(updated){const list=document.getElementById('unlockList');list.classList.remove('unlock-revealing');list.innerHTML=s.unlockNoticeItems.map(renderUnlockCard).join('');}
 return true;
}
function acknowledgeRunUnlocks(){
 if(!unlockRun||typeof scoreStats==='undefined'||scoreStats!==unlockRun)return;
 unlockRun.unlockNoticeAcknowledged=true;closeUnlockScreen();
 if(typeof sfx==='function')sfx('uiConfirm');syncResultScreen();
}
document.getElementById('unlockEvaluate').addEventListener('click',acknowledgeRunUnlocks);
addEventListener('keydown',event=>{
 if(!unlockRun)return;
 if(event.code==='Enter'||event.code==='Space'||event.code==='Escape'){
  event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)acknowledgeRunUnlocks();
 }
},{capture:true});
