// Stage progress is independent of skill unlocks and persists even when debug controls are used.
let selectedStageId=null,expandedStageId=null,stageDebugAll=false;
const TRAINING_STAGE={id:'training',target:'訓練場',name:'準備',image:'training'};
const STAGE_PROGRESS_KEY='tankGameStageProgressV1';
const STAGE_ORDER=[
 {id:'beginner',target:'軍事衛星施設',name:'破壊（初級）',image:'satellite'},
 {id:'indoorBeginner',target:'軍司令施設（南部）',name:'潜入（初級）',image:'infiltration_beginner'},
 {id:'frontBeginner',target:'軍需物資',name:'制圧（初級）',image:'supplies'},
 {id:'base',target:'軍司令施設（北部）',name:'破壊（上級）',image:'headquarters'},
 {id:'indoor',target:'軍需格納庫',name:'潜入（上級）',image:'infiltration_advanced'},
 {id:'front',target:'戦術アンテナ',name:'制圧（上級）',image:'antenna'},
 {id:'decisive',target:'移動要塞',name:'決戦',image:'decisive'}
];
const STAGE_DISPLAY_ORDER=STAGE_ORDER.map(stage=>stage.id);
function stageDisplayNumber(id){if(id==='training')return '00';return String(STAGE_DISPLAY_ORDER.indexOf(id)+1).padStart(2,'0');}
function stageSelectionName(name){return name.replace('拠点破壊','破壊').replace('前線制圧','制圧');}
function currentStageId(){if(typeof isDecisiveStage==='function'&&isDecisiveStage())return 'decisive';return stageMode==='front'&&typeof frontlineOni!=='undefined'&&frontlineOni?'frontOni':stageMode==='front'&&frontlineBeginner?'frontBeginner':stageMode==='indoor'&&typeof indoorBeginner!=='undefined'&&indoorBeginner?'indoorBeginner':stageMode;}
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
 if(id==='training')return true;
 const index=STAGE_ORDER.findIndex(stage=>stage.id===id);
 return index>=0&&STAGE_ORDER.slice(0,index).every(stage=>progress.cleared.includes(stage.id));
}
function unlockStageOnClear(s){
 if(!s?.final?.cleared||s.training||s.stage==='training'||areaDebugEnabled||s.stageProgressRecorded)return;
 s.stageProgressRecorded=true;const progress=readStageProgress(),id=currentStageId();
 if(!stageSelectable(id,progress)||progress.cleared.includes(id))return;
 const before={cleared:[...progress.cleared]};progress.cleared.push(id);
 progress.cleared=STAGE_ORDER.filter(stage=>progress.cleared.includes(stage.id)).map(stage=>stage.id);
 try{localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify(progress));}catch(_){s.stageUnlockSaveFailed=true;return;}
 const next=STAGE_ORDER.find(stage=>!progress.cleared.includes(stage.id)&&!stageSelectable(stage.id,before)&&stageSelectable(stage.id,progress));
 if(next)s.unlockedStage=next.id;
}
// Debug visibility affects selection only; canonical progression still uses stageSelectable().
function stageAvailableForSelection(id,progress=readStageProgress()){
 if(id==='training')return true;
 const developer=typeof isDeveloperMode==='function'&&isDeveloperMode();
 return (id==='areaDebug'&&developer)||(STAGE_ORDER.some(stage=>stage.id===id)&&((developer&&stageDebugAll)||stageSelectable(id,progress)));
}
const STAGE_RECORDS_KEY='tankGameStageRecordsV1';
const STAGE_RECORD_RANKS=['S','A','B','C','D','E','F'];
function readStageRecords(){
 let saved;try{saved=JSON.parse(localStorage.getItem(STAGE_RECORDS_KEY)||'null');}catch(_){}
 const stages={};
 for(const {id} of STAGE_ORDER){
  const v=saved?.stages?.[id];
  const sorties=Number.isSafeInteger(v?.sorties)&&v.sorties>=0?v.sorties:0;
  stages[id]={sorties,successes:Number.isSafeInteger(v?.successes)&&v.successes>=0?Math.min(v.successes,sorties):0,bestScore:Number.isFinite(v?.bestScore)&&v.bestScore>=0?Math.round(v.bestScore):null,bestRank:STAGE_RECORD_RANKS.includes(v?.bestRank)?v.bestRank:null};
 }
 return{version:1,stages};
}
function recordStageSortie(s){
 if(!s||s.stageSortieRecorded||areaDebugEnabled)return;
 const id=currentStageId();if(!STAGE_ORDER.some(stage=>stage.id===id))return;
 const data=readStageRecords();data.stages[id].sorties++;
 try{localStorage.setItem(STAGE_RECORDS_KEY,JSON.stringify(data));s.stageSortieRecorded=true;s.stageRecordId=id;}catch(_){s.stageRecordSaveFailed=true;}
}
function recordStageResult(s){
 if(!s?.final||s.stageResultRecorded||areaDebugEnabled)return;
 recordStageSortie(s);
 const id=s.stageRecordId;if(!STAGE_ORDER.some(stage=>stage.id===id))return;
 const data=readStageRecords(),v=data.stages[id],score=s.final.total,rank=s.final.rank;
 if(s.final.cleared===true)v.successes=Math.min(v.sorties,v.successes+1);
 if(Number.isFinite(score)&&score>=0)v.bestScore=Math.max(v.bestScore??0,Math.round(score));
 if(STAGE_RECORD_RANKS.includes(rank)&&(!v.bestRank||STAGE_RECORD_RANKS.indexOf(rank)<STAGE_RECORD_RANKS.indexOf(v.bestRank)))v.bestRank=rank;
 try{localStorage.setItem(STAGE_RECORDS_KEY,JSON.stringify(data));s.stageResultRecorded=true;}catch(_){s.stageRecordSaveFailed=true;}
}
function renderStageRecords(){
 const data=readStageRecords();
 document.querySelectorAll('[data-stage]').forEach(card=>{
  const panel=card.querySelector?.('.stage-records');if(!panel?.querySelector)return;
  const id=card.dataset.stage,open=expandedStageId===id,v=data.stages[id];
  panel.hidden=!open;card.setAttribute('aria-expanded',String(open));
  if(!open)return;
  const metrics=panel.querySelector('.stage-record-metrics'),note=panel.querySelector('.stage-record-note');
  metrics.hidden=!v;note.hidden=!!v;note.textContent=v?'':id==='training'?'基本操作を順番に練習できます':'デバッグ・テストステージは記録対象外';
  if(!v)return;
  panel.querySelector('.stage-record-score').textContent=v.bestScore===null?'—':v.bestScore.toLocaleString('ja-JP');
  panel.querySelector('.stage-record-count').textContent=v.successes.toLocaleString('ja-JP')+' / '+v.sorties.toLocaleString('ja-JP')+'回';
  panel.querySelector('.stage-record-rank').textContent=v.bestRank||'—';
  const image=panel.querySelector('img');image.hidden=!v.bestRank;
  if(v.bestRank){image.src='assets/ui/ranks/rank_'+v.bestRank.toLowerCase()+'.webp?v=2026.10.17';image.alt=v.bestRank+'ランク';}else image.removeAttribute('src');
 });
}
function setSelectedStage(id,toggle=true){
 if(!stageAvailableForSelection(id))return false;
 if(toggle)expandedStageId=expandedStageId===id?null:id;else if(selectedStageId!==id)expandedStageId=null;
 selectedStageId=id;
 document.querySelectorAll('[data-stage]').forEach(card=>{const chosen=card.dataset.stage===id;card.classList.toggle('selected',chosen);card.setAttribute('aria-pressed',String(chosen));});
 const stage=id==='training'?TRAINING_STAGE:STAGE_ORDER.find(stage=>stage.id===id),button=document.getElementById('stageDeploy');
 button.disabled=typeof gameBuildQueued!=='undefined'&&gameBuildQueued;
 button.textContent=id==='areaDebug'?'エリアデバッグへ':stage.name+'で出撃';
 renderStageRecords();
 return true;
}
function deploySelectedStage(){
 if(state!=='stage'||gameBuildQueued||!stageAvailableForSelection(selectedStageId))return false;
 const id=selectedStageId;selectedAreaDebug=null;if(typeof decisiveBattle!=='undefined')decisiveBattle=null;
 areaDebugEnabled=id==='areaDebug';frontlineOni=false;frontlineBeginner=id==='frontBeginner';indoorBeginner=id==='indoorBeginner';
 stageMode=areaDebugEnabled?'base':frontlineBeginner||frontlineOni?'front':indoorBeginner?'indoor':id;
 if(areaDebugEnabled){state='areaPick';sfx('skill');return true;}
 return selectSkillIndex(skillMenuList().findIndex(skill=>skill.id===selectedSkillId),true);
}
function renderStageLocks(){
 const progress=readStageProgress();
 document.querySelectorAll('[data-stage]').forEach(button=>{
  const id=button.dataset.stage,index=STAGE_ORDER.findIndex(stage=>stage.id===id),stage=STAGE_ORDER[index];
  if(id==='training'){button.disabled=false;button.classList.toggle('locked',false);button.classList.toggle('stage-concealed',false);button.querySelector('.stage-target').textContent='訓練場';button.querySelector('.stage-number').textContent='00';button.setAttribute('aria-label','00 準備 訓練場');return;}
  if(id==='areaDebug'){
   button.disabled=!(typeof isDeveloperMode==='function'&&isDeveloperMode());button.classList.toggle('locked',false);button.setAttribute('aria-label','エリアデバッグ');return;
  }
  if(!stage){button.disabled=true;return;}
  const locked=!stageAvailableForSelection(id,progress);
  button.disabled=locked;button.classList.toggle('locked',locked);
  const concealed=!stageSelectable(id,progress)&&!(id==='decisive'&&stageDebugAll&&typeof isDeveloperMode==='function'&&isDeveloperMode());
  button.classList.toggle('stage-concealed',concealed);
  button.querySelector('.stage-target').textContent=concealed?'？':stage.target;
  button.classList.toggle('stage-cleared',progress.cleared.includes(id));
  const number=stageDisplayNumber(id),name=stageSelectionName(stage.name),requirement=index>0?stageSelectionName(STAGE_ORDER[index-1].name)+'をクリアすると解放':'';
  button.querySelector('.stage-number').textContent=number;
  button.setAttribute('aria-label',number+' '+name+(locked?'・'+requirement:progress.cleared.includes(id)?'・クリア済み':''));
  button.title=locked?requirement:'';
 });
 const toggle=document.getElementById('stageDebugAll');
 if(toggle){toggle.textContent=stageDebugAll?'解放済みに戻す':'全ステージを表示';toggle.classList.toggle('enabled',stageDebugAll);toggle.setAttribute('aria-pressed',String(stageDebugAll));}
 if(document.getElementById('stageDeploy')){
  const firstTraining=!progress.cleared.length&&typeof trainingCompleted==='function'&&!trainingCompleted();
  const fallback=firstTraining?TRAINING_STAGE:STAGE_ORDER.find(stage=>stageAvailableForSelection(stage.id,progress)&&!progress.cleared.includes(stage.id))||STAGE_ORDER[0];
  setSelectedStage(stageAvailableForSelection(selectedStageId,progress)?selectedStageId:fallback.id,false);
 }
}
function renderStageUnlock(s){
 const stage=STAGE_ORDER.find(stage=>stage.id===s.unlockedStage),notice=document.getElementById('resStageUnlock'),image=document.getElementById('resStageUnlockImage');
 notice.hidden=!stage;
 document.getElementById('resStageUnlockName').textContent=stage?stageDisplayNumber(stage.id)+' '+stageSelectionName(stage.name):'';
 if(stage)image.src='assets/ui/stages/'+stage.image+'.webp';else image.removeAttribute('src');
}
