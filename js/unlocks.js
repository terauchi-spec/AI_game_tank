// Presentation only: progression and award persistence remain in their existing owners.
const UNLOCK_INSTRUCTOR_KEY='tankGameUnlockInstructorV1';
const UNLOCK_INSTRUCTORS=['instructor_1','instructor_2','instructor_3'];
let unlockRun=null,unlockInstructorNext=0;
try{const saved=Number(localStorage.getItem(UNLOCK_INSTRUCTOR_KEY));if(Number.isSafeInteger(saved)&&saved>=0)unlockInstructorNext=saved%UNLOCK_INSTRUCTORS.length;}catch(_){}
function escapeUnlockText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function collectRunUnlocks(s){
 if(!s?.final||s.debugUsed||(typeof areaDebugEnabled!=='undefined'&&areaDebugEnabled)||s.awards?.disabled)return [];
 const items=[],stages=typeof STAGE_ORDER!=='undefined'?STAGE_ORDER:[],skills=typeof SK!=='undefined'?SK:[],titles=typeof TITLE_CATALOG!=='undefined'?TITLE_CATALOG:[];
 const stage=stages.find(v=>v.id===s.unlockedStage);
 if(stage&&!s.stageUnlockSaveFailed)items.push({kind:'stage',id:stage.id,name:(typeof stageDisplayNumber==='function'?stageDisplayNumber(stage.id)+' ':'')+stage.name,image:'assets/ui/stages/'+stage.image+'.webp',note:'次回の出撃から選択できます'});
 const skill=skills.find(v=>v.id===s.unlockedSkill);
 if(skill&&!s.unlockSaveFailed)items.push({kind:'skill',id:skill.id,name:'「'+skill.n+'」',image:typeof skillCardIconSrc==='function'?skillCardIconSrc(skill.id):'',note:'次回の出撃から選択できます'});
 if(!s.awards?.saveFailed)for(const id of new Set(s.awards?.newTitles||[])){
  const title=titles.find(v=>v.id===id);if(title)items.push({kind:'title',id,name:title.name,title,note:title.type||'新しい称号を獲得しました'});
 }
 return items;
}
function renderUnlockCard(item){
 const labels={stage:['NEW STAGE UNLOCKED!','新ステージ解放！'],skill:['NEW SKILL UNLOCKED!','新スキル解放！'],title:['NEW TITLE UNLOCKED!','新称号獲得！']},label=labels[item.kind];
 const art=item.kind==='title'?(typeof awardIcon==='function'?awardIcon(item.title,'title'):''):('<img src="'+escapeUnlockText(item.image)+'" alt="" decoding="async" loading="lazy">');
 return '<article class="unlock-card unlock-card-'+item.kind+'"><div class="unlock-card-art" aria-hidden="true">'+art+'</div><div class="unlock-card-copy"><div class="unlock-eyebrow">'+label[0]+'</div><h2>'+label[1]+'</h2><div class="unlock-name">'+escapeUnlockText(item.name)+'</div><div class="unlock-note">'+escapeUnlockText(item.note)+'</div></div></article>';
}
function closeUnlockScreen(){
 document.body.classList.remove('unlock-open');document.getElementById('unlockScreen').hidden=true;unlockRun=null;
}
function syncUnlockScreen(s){
 if(!s){if(unlockRun)closeUnlockScreen();return false;}
 if(!s.unlockNoticePrepared){s.unlockNoticePrepared=true;s.unlockNoticeItems=collectRunUnlocks(s);}
 if(s.unlockNoticeAcknowledged||!s.unlockNoticeItems.length){if(unlockRun)closeUnlockScreen();return false;}
 if(unlockRun!==s){
  const screen=document.getElementById('unlockScreen'),image=document.getElementById('unlockInstructor');
  unlockRun=s;image.src='assets/ui/instructors/'+UNLOCK_INSTRUCTORS[unlockInstructorNext]+'.webp';
  unlockInstructorNext=(unlockInstructorNext+1)%UNLOCK_INSTRUCTORS.length;
  try{localStorage.setItem(UNLOCK_INSTRUCTOR_KEY,String(unlockInstructorNext));}catch(_){}
  document.getElementById('unlockList').innerHTML=s.unlockNoticeItems.map(renderUnlockCard).join('');
  screen.hidden=false;document.body.classList.add('unlock-open');screen.scrollTop=0;
  document.getElementById('unlockEvaluate').focus({preventScroll:true});
 }
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
