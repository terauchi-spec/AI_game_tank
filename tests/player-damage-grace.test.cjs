const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
test('damage from different explosions shares 0.2 seconds of protection and resumes at expiry',()=>{
 const h=createGameEngine(path.join(__dirname,'..'),{touch:true});
 h.run(`stageMode='base';reset(false);state='play';debugInvincible=false;
  covers=[];objects=[];humans=[];etanks=[];cars=[];allies=[];water=[];mud=[];bushes=[];mission=null;roadTruckEvents=[];
  rebuildSpatialGrid();p.tank=null;p.hp=3;p.dig=0;p.damageGraceT=0;`);
 h.run('damagePlayerByOwnBomb();commanderRocketBlast(p.x,p.y)');
 assert.equal(h.run('p.hp'),2);
 h.run('update(.1);commanderRocketBlast(p.x,p.y)');
 assert.equal(h.run('p.hp'),2);
 h.run('update(.1);commanderRocketBlast(p.x,p.y)');
 assert.equal(h.run('p.hp'),1.5);
});
test('mounted damage also protects the player after a vehicle is destroyed',()=>{
 const h=createGameEngine(path.join(__dirname,'..'),{touch:true});
 h.run(`stageMode='base';reset(false);state='play';debugInvincible=false;humans=[];allies=[];etanks=[];
  p.damageGraceT=0;p.dig=0;p.tank={kind:'tank',t:TYPES[0],ch:0};commanderRocketBlast(p.x,p.y);`);
 assert.equal(h.run('p.tank'),null);
 const health=h.run('p.hp');h.run('commanderRocketBlast(p.x,p.y)');assert.equal(h.run('p.hp'),health);
});
