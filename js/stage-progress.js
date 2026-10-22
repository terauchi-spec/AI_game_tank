// Stage progress is independent of skill unlocks and never changes in debug runs.
const STAGE_PROGRESS_KEY='tankGameStageProgressV1';
const STAGE_ORDER=[
 {id:'beginner',name:'破壊（初級）',image:'satellite'},
 {id:'indoorBeginner',name:'潜入（初級）',image:'infiltration_beginner'},
 {id:'frontBeginner',name:'制圧（初級）',image:'supplies'},
 {id:'base',name:'破壊（上級）',image:'headquarters'},
 {id:'indoor',name:'潜入（上級）',image:'infiltration_advanced'},
 {id:'front',name:'制圧（上級）',image:'antenna'}
];
const STAGE_DISPLAY_ORDER=STAGE_ORDER.map(stage=>stage.id);
function stageDisplayNumber(id){return String(STAGE_DISPLAY_ORDER.indexOf(id)+1).padStart(2,'0');}
function stageSelectionName(name){return name.replace('拠点破壊','破壊').replace('前線制圧','制圧');}
function currentStageId(){return stageMode==='front'&&frontlineBeginner?'frontBeginner':stageMode==='indoor'&&typeof indoorBeginner!=='undefined'&&indoorBeginner?'indoorBeginner':stageMode;}
function readStageProgress(){
 let saved;try{saved=JSON.parse(localStorage.getItem(STAGE_PROGRESS_KEY)||'null');}catch(_){}
 const earned=new Set();
 if(saved?.version===2){
  for(const stage of STAGE_ORDER)if(Array.isArray(saved.cleared)&&saved.cleared.includes(stage.id))earned.add(stage.id);
 }else{
  // 旧4ステージの連続クリアと、別保存だった潜入の実績を引き継ぐ。
  for(const id of ['beginner','frontBeginner','base','front']){if(!Array.isArray(saved?.cleared)||!saved.cleared.includes(id))break;earned.add(id);}
  for(const id of ['indoorBeginner','indoor'])if(Array.isArray(saved?.indoorCleared)&&saved.indoorCleared.includes(id))earned.add(id);
 }
 return{version:2,cleared:STAGE_ORDER.filter(stage=>earned.has(stage.id)).map(stage=>stage.id)};
}
function stageSelectable(id,progress=readStageProgress()){
 const index=STAGE_ORDER.findIndex(stage=>stage.id===id);
 return index>=0&&STAGE_ORDER.slice(0,index).every(stage=>progress.cleared.includes(stage.id));
}
function unlockStageOnClear(s){
 if(!s?.final?.cleared||s.debugUsed||areaDebugEnabled||s.stageProgressRecorded)return;
 s.stageProgressRecorded=true;const progress=readStageProgress(),id=currentStageId();
 if(!stageSelectable(id,progress)||progress.cleared.includes(id))return;
 const before={cleared:[...progress.cleared]};progress.cleared.push(id);
 progress.cleared=STAGE_ORDER.filter(stage=>progress.cleared.includes(stage.id)).map(stage=>stage.id);
 try{localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify(progress));}catch(_){s.stageUnlockSaveFailed=true;return;}
 const next=STAGE_ORDER.find(stage=>!progress.cleared.includes(stage.id)&&!stageSelectable(stage.id,before)&&stageSelectable(stage.id,progress));
 if(next)s.unlockedStage=next.id;
}
function renderStageLocks(){
 const progress=readStageProgress();
 document.querySelectorAll('[data-stage]').forEach(button=>{
  const index=STAGE_ORDER.findIndex(s=>s.id===button.dataset.stage),stage=STAGE_ORDER[index],locked=!stageSelectable(stage.id,progress);
  button.disabled=locked;button.classList.toggle('locked',locked);
  button.classList.toggle('stage-cleared',progress.cleared.includes(stage.id));
  const number=stageDisplayNumber(stage.id),name=stageSelectionName(stage.name),requirement=index>0?stageSelectionName(STAGE_ORDER[index-1].name)+'をクリアすると解放':'';
  button.querySelector('.stage-number').textContent=number;
  button.setAttribute('aria-label',number+' '+name+(locked?'・'+requirement:progress.cleared.includes(stage.id)?'・クリア済み':''));
  button.title=locked?requirement:'';
 });
}
function renderStageUnlock(s){
 const stage=STAGE_ORDER.find(stage=>stage.id===s.unlockedStage),notice=document.getElementById('resStageUnlock'),image=document.getElementById('resStageUnlockImage');
 notice.hidden=!stage;
 document.getElementById('resStageUnlockName').textContent=stage?stageDisplayNumber(stage.id)+' '+stageSelectionName(stage.name):'';
 if(stage)image.src='assets/ui/stages/'+stage.image+'.webp';else image.removeAttribute('src');
}
