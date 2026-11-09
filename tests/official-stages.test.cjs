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
test('middle and advanced stages use their own objectives, towers, and stage records',()=>{
 for(const [middleId,advancedId] of [['baseIntermediate','base'],['frontIntermediate','front']]){
  const middle=official(middleId,42),advanced=official(advancedId,42);
  middle.run('reset(false);');
  advanced.run('reset(false);');

  if(advancedId==='base'){
   assert.equal(middle.run('ZONES.at(-1).n'),'敵司令本部');
   assert.equal(advanced.run('ZONES.at(-1).n'),'森林');
   assert.equal(middle.run('baseSpriteKey()'),'command_building_1');
   assert.equal(advanced.run('baseSpriteKey()'),'missile_base');
   assert.equal(middle.run('base.maxHp'),30);
   assert.equal(advanced.run('base.maxHp'),60);
  }else{
   const objectives=h=>JSON.parse(h.run('JSON.stringify(mission.points.map(point=>point.antenna.asset))'));
   assert.deepEqual(objectives(middle),['frontline_antenna_small','frontline_antenna_small','frontline_antenna_large']);
   assert.deepEqual(objectives(advanced),['frontline_rocket_lower','frontline_rocket_middle','frontline_rocket_upper']);
  }

  assert.equal(middle.run("cars.filter(v=>v.kind==='tower').length"),0);
  assert.equal(advanced.run("cars.filter(v=>v.kind==='tower').length"),advancedId==='base'?6:3);

  for(const [h,playedId,otherId] of [[middle,middleId,advancedId],[advanced,advancedId,middleId]]){
   h.run('scoreStats.time=90;finalizeScore(true);');
   assert.equal(h.run(`readStageRecords().stages['${playedId}'].successes`),1);
   assert.equal(h.run(`readStageRecords().stages['${otherId}'].sorties`),0);
  }
 }
});
test('official advanced laboratory saves awards and unlocks capture advanced after completion',()=>{
 const h=official('indoorLab');h.run("reset(false);readIntroName=()=> 'TEST';scoreStats.time=90;finalizeScore(true);");
 assert.equal(h.run('scoreStats.awards.disabled'),false);assert.equal(h.run('scoreStats.unlockedStage'),'front');
 assert.equal(h.run('readStageRecords().stages.indoorLab.successes'),1);assert.equal(h.run('leaderboardPending.indoorLab.stage'),'indoorLab');
});
