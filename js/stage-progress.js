// Stage progress is independent of skill unlocks and never changes in debug runs.
const STAGE_PROGRESS_KEY='tankGameStageProgressV1';
const STAGE_ORDER=[
 {id:'beginner',name:'拠点破壊（初級）',image:'satellite'},
 {id:'frontBeginner',name:'前線制圧（初級）',image:'supplies'},
 {id:'base',name:'拠点破壊（上級）',image:'headquarters'},
 {id:'front',name:'前線制圧（上級）',image:'antenna'}
];
// Selection numbering is independent of the existing saved unlock sequence.
const STAGE_DISPLAY_ORDER=['beginner','indoorBeginner','frontBeginner','base','indoor','front'];
function stageDisplayNumber(id){return String(STAGE_DISPLAY_ORDER.indexOf(id)+1).padStart(2,'0');}
function stageSelectionName(name){return name.replace('拠点破壊','破壊').replace('前線制圧','制圧');}
function currentStageId(){return stageMode==='front'&&frontlineBeginner?'frontBeginner':stageMode==='indoor'&&typeof indoorBeginner!=='undefined'&&indoorBeginner?'indoorBeginner':stageMode;}
function readStageProgress(){
 let saved;try{saved=JSON.parse(localStorage.getItem(STAGE_PROGRESS_KEY)||'null');}catch(_){}
 const cleared=[];
 // Only a continuous sequence of clears can open the next operation.
 for(const stage of STAGE_ORDER){if(!Array.isArray(saved?.cleared)||!saved.cleared.includes(stage.id))break;cleared.push(stage.id);}
 const indoorCleared=['indoorBeginner','indoor'].filter(id=>Array.isArray(saved?.indoorCleared)&&saved.indoorCleared.includes(id));
 return{cleared,indoorCleared};
}
function stageSelectable(id,progress=readStageProgress()){
 if(id==='indoor'||id==='indoorBeginner')return true; // 潜入は両難易度とも解放。既存4ステージの進行には干渉しない。
 const index=STAGE_ORDER.findIndex(s=>s.id===id);return index>=0&&index<=progress.cleared.length;
}
function unlockStageOnClear(s){
 if(!s?.final?.cleared||s.debugUsed||areaDebugEnabled||s.stageProgressRecorded)return;
 s.stageProgressRecorded=true;const progress=readStageProgress(),id=currentStageId(),index=STAGE_ORDER.findIndex(stage=>stage.id===id);
 // 潜入は常時選択可能な正式ステージ。既存4ステージの解放順と分けてクリアを保存する。
 if(id==='indoorBeginner'||id==='indoor'){
  if(progress.indoorCleared.includes(id))return;
  progress.indoorCleared.push(id);
  try{localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify(progress));}catch(_){s.stageUnlockSaveFailed=true;}
  return;
 }
 if(index<0||index!==progress.cleared.length)return;
 progress.cleared.push(id);
 try{localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify(progress));}catch(_){s.stageUnlockSaveFailed=true;return;}
 if(index+1<STAGE_ORDER.length)s.unlockedStage=STAGE_ORDER[index+1].id;
}
function renderStageLocks(){
 const progress=readStageProgress();
 document.querySelectorAll('[data-stage]').forEach(button=>{
  if(button.dataset.stage==='indoor'||button.dataset.stage==='indoorBeginner'){
   const advanced=button.dataset.stage==='indoor',number=stageDisplayNumber(button.dataset.stage),name=advanced?'潜入（上級）':'潜入（初級）';
   button.disabled=false;button.classList.toggle('locked',false);
   button.classList.toggle('stage-cleared',progress.indoorCleared.includes(button.dataset.stage));
   button.querySelector('.stage-number').textContent=number;
   button.setAttribute('aria-label',number+' '+name+(progress.indoorCleared.includes(button.dataset.stage)?'・クリア済み':''));
   button.title=advanced?'2階建て施設・重要資料3箇所を回収':'小型施設・重要資料2箇所を回収';return;
  }
  const index=STAGE_ORDER.findIndex(s=>s.id===button.dataset.stage),stage=STAGE_ORDER[index],locked=!stageSelectable(stage.id,progress);
  button.disabled=locked;button.classList.toggle('locked',locked);
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
