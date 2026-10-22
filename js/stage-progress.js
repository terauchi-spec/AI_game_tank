// Stage progress is independent of skill unlocks and never changes in debug runs.
let selectedStageId=null,stageDebugAll=false;
const STAGE_PROGRESS_KEY='tankGameStageProgressV1';
const STAGE_ORDER=[
 {id:'beginner',name:'破壊（初級）',image:'satellite'},
 {id:'indoorBeginner',name:'潜入（初級）',image:'infiltration_beginner'},
 {id:'frontBeginner',name:'制圧（初級）',image:'supplies'},
 {id:'base',name:'破壊（上級）',image:'headquarters'},
 {id:'indoor',name:'潜入（上級）',image:'infiltration_advanced'},
 {id:'front',name:'制圧（上級）',image:'antenna'}
];
const TEST_STAGES=[{id:'frontOni',name:'制圧（鬼）',image:'antenna'}];
const STAGE_DISPLAY_ORDER=STAGE_ORDER.map(stage=>stage.id);
function stageDisplayNumber(id){return String(STAGE_DISPLAY_ORDER.indexOf(id)+1).padStart(2,'0');}
function stageSelectionName(name){return name.replace('拠点破壊','破壊').replace('前線制圧','制圧');}
function currentStageId(){return stageMode==='front'&&typeof frontlineOni!=='undefined'&&frontlineOni?'frontOni':stageMode==='front'&&frontlineBeginner?'frontBeginner':stageMode==='indoor'&&typeof indoorBeginner!=='undefined'&&indoorBeginner?'indoorBeginner':stageMode;}
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
// Debug visibility affects selection only; canonical progression still uses stageSelectable().
function stageAvailableForSelection(id,progress=readStageProgress()){
 return id==='areaDebug'||(TEST_STAGES.some(stage=>stage.id===id)&&stageDebugAll)||(STAGE_ORDER.some(stage=>stage.id===id)&&(stageDebugAll||stageSelectable(id,progress)));
}
function setSelectedStage(id){
 if(!stageAvailableForSelection(id))return false;
 selectedStageId=id;
 document.querySelectorAll('[data-stage]').forEach(card=>{const chosen=card.dataset.stage===id;card.classList.toggle('selected',chosen);card.setAttribute('aria-pressed',String(chosen));});
 const stage=[...STAGE_ORDER,...TEST_STAGES].find(stage=>stage.id===id),button=document.getElementById('stageDeploy');
 button.disabled=typeof gameBuildQueued!=='undefined'&&gameBuildQueued;
 button.textContent=id==='areaDebug'?'エリアデバッグへ':stage.name.replace(/[（）]/g,'')+'で出撃';
 return true;
}
function deploySelectedStage(){
 if(state!=='stage'||gameBuildQueued||!stageAvailableForSelection(selectedStageId))return false;
 const id=selectedStageId;selectedAreaDebug=null;
 areaDebugEnabled=id==='areaDebug';frontlineOni=id==='frontOni';frontlineBeginner=id==='frontBeginner';indoorBeginner=id==='indoorBeginner';
 stageMode=areaDebugEnabled?'base':frontlineBeginner||frontlineOni?'front':indoorBeginner?'indoor':id;
 if(areaDebugEnabled){state='areaPick';sfx('skill');return true;}
 return selectSkillIndex(skillMenuList().findIndex(skill=>skill.id===selectedSkillId),true);
}
function renderStageLocks(){
 const progress=readStageProgress();
 document.querySelectorAll('[data-stage]').forEach(button=>{
  const id=button.dataset.stage,index=STAGE_ORDER.findIndex(stage=>stage.id===id),stage=STAGE_ORDER[index];
  if(id==='areaDebug'){
   button.disabled=false;button.classList.toggle('locked',false);button.setAttribute('aria-label','エリアデバッグ');return;
  }
  const testStage=TEST_STAGES.find(stage=>stage.id===id);
  if(testStage){
   button.disabled=!stageDebugAll;button.classList.toggle('locked',!stageDebugAll);
   button.querySelector('.stage-number').textContent='鬼';button.setAttribute('aria-label',testStage.name+'（テスト）'+(stageDebugAll?'':'・全ステージを表示で選択'));
   button.title=stageDebugAll?'制圧上級と同じ3拠点・敵兵の出現数3倍':'全ステージを表示で選択できるテストステージ';return;
  }
  if(!stage)return;
  const locked=!stageAvailableForSelection(id,progress);
  button.disabled=locked;button.classList.toggle('locked',locked);
  button.classList.toggle('stage-cleared',progress.cleared.includes(id));
  const number=stageDisplayNumber(id),name=stageSelectionName(stage.name),requirement=index>0?stageSelectionName(STAGE_ORDER[index-1].name)+'をクリアすると解放':'';
  button.querySelector('.stage-number').textContent=number;
  button.setAttribute('aria-label',number+' '+name+(locked?'・'+requirement:progress.cleared.includes(id)?'・クリア済み':''));
  button.title=locked?requirement:'';
 });
 const toggle=document.getElementById('stageDebugAll');
 if(toggle){toggle.textContent=stageDebugAll?'解放済みに戻す':'全ステージを表示';toggle.classList.toggle('enabled',stageDebugAll);toggle.setAttribute('aria-pressed',String(stageDebugAll));}
 if(document.getElementById('stageDeploy')){
  const fallback=STAGE_ORDER.find(stage=>stageAvailableForSelection(stage.id,progress)&&!progress.cleared.includes(stage.id))||STAGE_ORDER[0];
  setSelectedStage(stageAvailableForSelection(selectedStageId,progress)?selectedStageId:fallback.id);
 }
}
function renderStageUnlock(s){
 const stage=STAGE_ORDER.find(stage=>stage.id===s.unlockedStage),notice=document.getElementById('resStageUnlock'),image=document.getElementById('resStageUnlockImage');
 notice.hidden=!stage;
 document.getElementById('resStageUnlockName').textContent=stage?stageDisplayNumber(stage.id)+' '+stageSelectionName(stage.name):'';
 if(stage)image.src='assets/ui/stages/'+stage.image+'.webp';else image.removeAttribute('src');
}
