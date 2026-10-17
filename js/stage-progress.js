// Stage progress is independent of skill unlocks and never changes in debug runs.
const STAGE_PROGRESS_KEY='tankGameStageProgressV1';
const STAGE_ORDER=[
 {id:'beginner',name:'拠点破壊（初級）',image:'satellite'},
 {id:'frontBeginner',name:'前線制圧（初級）',image:'supplies'},
 {id:'base',name:'拠点破壊（上級）',image:'headquarters'},
 {id:'front',name:'前線制圧（上級）',image:'antenna'}
];
function currentStageId(){return stageMode==='front'&&frontlineBeginner?'frontBeginner':stageMode;}
function readStageProgress(){
 let saved;try{saved=JSON.parse(localStorage.getItem(STAGE_PROGRESS_KEY)||'null');}catch(_){}
 const cleared=[];
 // Only a continuous sequence of clears can open the next operation.
 for(const stage of STAGE_ORDER){if(!Array.isArray(saved?.cleared)||!saved.cleared.includes(stage.id))break;cleared.push(stage.id);}
 return{cleared};
}
function stageSelectable(id,progress=readStageProgress()){
 const index=STAGE_ORDER.findIndex(s=>s.id===id);return index>=0&&index<=progress.cleared.length;
}
function unlockStageOnClear(s){
 if(!s?.final?.cleared||s.debugUsed||areaDebugEnabled||s.stageProgressRecorded)return;
 s.stageProgressRecorded=true;const progress=readStageProgress(),id=currentStageId(),index=STAGE_ORDER.findIndex(stage=>stage.id===id);
 if(index<0||index!==progress.cleared.length)return;
 progress.cleared.push(id);
 try{localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify(progress));}catch(_){s.stageUnlockSaveFailed=true;return;}
 if(index+1<STAGE_ORDER.length)s.unlockedStage=STAGE_ORDER[index+1].id;
}
function renderStageLocks(){
 const progress=readStageProgress();
 document.querySelectorAll('[data-stage]').forEach(button=>{
  const index=STAGE_ORDER.findIndex(s=>s.id===button.dataset.stage),stage=STAGE_ORDER[index],locked=!stageSelectable(stage.id,progress);
  button.disabled=locked;button.classList.toggle('locked',locked);
  button.querySelector('.stage-number').textContent=String(index+1).padStart(2,'0');
  button.setAttribute('aria-label',String(index+1).padStart(2,'0')+' '+stage.name+(locked?'・前のステージをクリアすると解放':progress.cleared.includes(stage.id)?'・クリア済み':''));
  button.title=locked?'前のステージをクリアすると解放':'';
 });
}
function renderStageUnlock(s){
 const stage=STAGE_ORDER.find(stage=>stage.id===s.unlockedStage),notice=document.getElementById('resStageUnlock'),image=document.getElementById('resStageUnlockImage');
 notice.hidden=!stage;
 document.getElementById('resStageUnlockName').textContent=stage?String(STAGE_ORDER.indexOf(stage)+1).padStart(2,'0')+' '+stage.name:'';
 if(stage)image.src='assets/ui/stages/'+stage.image+'.webp';else image.removeAttribute('src');
}
