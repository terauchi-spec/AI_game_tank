const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
const root=path.join(__dirname,'..');
test('destruction beginner has no enemy tanks across seeded maps, including a random middle grassland, while player vehicles remain',()=>{
 let grass=false;
 for(const seed of [1,7,17,42,91,125]){
  const h=createGameEngine(root,{seed});h.run("stageMode='beginner';reset(false)");
  assert.equal(h.run('etanks.length'),0,'seed '+seed);
  assert.ok(h.run('cars.length')>0,'player vehicles remain');
  grass=grass||h.run("ZONES.slice(1,-1).some(z=>z.n==='草原')");
  h.run('updateHQSpawn(30)');assert.equal(h.run('etanks.length'),0);
 }
 assert.equal(grass,true);
});
test('switching from destruction beginner to advanced restores enemy tank generation',()=>{
 const h=createGameEngine(root,{seed:17});h.run("stageMode='beginner';reset(false)");assert.equal(h.run('etanks.length'),0);
 h.run("stageMode='base';reset(false)");assert.ok(h.run('etanks.length')>0);
});
test('capture beginner enters with three infantry and caps later waves at eight without changing its two enemy tanks',()=>{
 const h=createGameEngine(root,{seed:17});
 h.run("stageMode='front';frontlineBeginner=true;reset(false);frontlineSpawnSpot=()=>({x:480,y:9000});p.y=mission.enemyEntryY;updateFrontlineEnemyEntry()");
 assert.equal(h.run('humans.length'),3);assert.ok(h.run('etanks.length')<=2);
 h.run('spawnFrontlineWave(100)');assert.equal(h.run('humans.length'),8);
 h.run('humans=[];mission.enemyWavesStarted=true;point={x:p.x,y:p.y};updateFrontlineCounterattack(point,.1)');
 assert.equal(h.run('humans.length'),3);assert.equal(h.run('point.counterPending'),0);assert.equal(h.run("humans.filter(h=>h.commander==='blue').length"),1);
});
