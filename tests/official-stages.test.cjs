const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function official(id,seed=17){const h=createGameEngine(root,{seed});h.run(`localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify({version:3,cleared:STAGE_ORDER.slice(0,STAGE_ORDER.findIndex(s=>s.id==='${id}')).map(s=>s.id),unlocked:[]}));state='stage';selectedSkillId='throw';setSelectedStage('${id}');deploySelectedStage();`);return h;}
test('official stage selection deploys independent middle copies and advanced laboratory without developer mode',()=>{
 for(const [id,mode,name] of [['baseIntermediate','base','破壊（中級）'],['frontIntermediate','front','制圧（中級）'],['indoor','indoor','潜入（中級）'],['indoorLab','indoor','潜入（上級）']]){
  const h=official(id);assert.equal(h.run('isDeveloperMode()'),false);assert.equal(h.run('stageMode'),mode);assert.equal(h.run('currentStageId()'),id);assert.equal(h.run(`STAGE_ORDER.find(s=>s.id==='${id}').name`),name);
  h.run('reset(false);recordStageSortie(scoreStats);');assert.equal(h.run('scoreStats.stageRecordId'),id);
  assert.equal(h.run('!!scoreStats.laboratoryTest'),false);assert.equal(h.run('scoreStats.debugUsed'),false);
  if(id==='indoorLab'){assert.equal(h.run('indoorWorld.floors.length'),3);assert.equal(h.run('enemyDogs.length'),3);}
 }
});
test('middle copies reuse upper-stage generation while records remain independent',()=>{
 for(const [id,mode] of [['baseIntermediate','base'],['frontIntermediate','front']]){
  const project=h=>h.run(`JSON.stringify({zones:ZONES.map(z=>({n:z.n,y0:z.y0,y1:z.y1})),covers:covers.length,objects:objects.length,humans:humans.length,points:mission?.points.map(q=>({x:q.x,y:q.y,need:q.need,captureSeconds:q.captureSeconds})),base:{x:base.x,y:base.y,w:base.w,h:base.h,maxHp:base.maxHp}})`);
  const a=createGameEngine(root,{seed:42}),b=createGameEngine(root,{seed:42});
  a.run(`stageMode='${mode}';frontlineBeginner=false;intermediateStageId='${id}';reset(false);`);b.run(`stageMode='${mode}';frontlineBeginner=false;reset(false);`);
  assert.equal(project(a),project(b));a.run('scoreStats.time=90;finalizeScore(true);');
  assert.equal(a.run(`readStageRecords().stages['${id}'].successes`),1);assert.equal(a.run(`readStageRecords().stages['${mode}'].sorties`),0);
 }
});
test('official advanced laboratory saves awards and unlocks capture advanced after completion',()=>{
 const h=official('indoorLab');h.run("reset(false);readIntroName=()=> 'TEST';scoreStats.time=90;finalizeScore(true);");
 assert.equal(h.run('scoreStats.awards.disabled'),false);assert.equal(h.run('scoreStats.unlockedStage'),'front');
 assert.equal(h.run('readStageRecords().stages.indoorLab.successes'),1);assert.equal(h.run('leaderboardPending.indoorLab.stage'),'indoorLab');
});
