const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');

function setup(){
 const h=createGameEngine(path.join(__dirname,'..'),{seed:1771});
 let now=0;
 h.c.performance.now=()=>now;
 h.run(`stageMode='indoor';rescueAdvancedTest=true;reset(false);state='play';
  indoorWorld.currentFloor=2;indoorWorld.stairSanctuary=null;
  globalThis.vip=indoorWorld.rescue.vip;
  globalThis.guard=indoorWorld.floors[2].guards.find(q=>!q.indoorCommander);
  Object.assign(guard,{x:vip.x-100,y:vip.y,face:0,st:0,target:null,cd:0});
  p.x=vip.x+110;p.y=vip.y;p.dig=20;
  indoorWorld.floors[2].guards=[guard];humans=[guard];etanks=[];covers=[];objects=[];
  rebuildSpatialGrid();`);
 h.tick=(seconds,code)=>{
  for(let i=0;i<Math.round(seconds*60);i++){
   now+=1000/60;
   h.run(code);
  }
 };
 return h;
}

test('rescued VIP is confirmed, pursued, hit by enemy rifles and lost at zero life',()=>{
 const h=setup();
 h.tick(.8,'updateRescueVipGuardDetection(1/60)');
 assert.equal(h.run('guard.target'),null);
 h.run('vip.freed=true;vip.stunT=20');
 h.tick(.5,'updateRescueVipGuardDetection(1/60)');
 assert.equal(h.run('guard.target'),null);
 h.tick(.2,'updateRescueVipGuardDetection(1/60)');
 assert.equal(h.run('guard.target'),'rescueVip');
 assert.equal(h.run('indoorWorld.alarm.witnesses.has(guard)'),true);
 h.run('indoorWorld.alarm.noiseCount=2;indoorRefreshAlarm()');
 assert.equal(h.run('guard.target'),'rescueVip');
 h.run('vip.x+=12');
 const startingDistance=h.run('D(guard,vip)');
 h.tick(1,'updateInfiltrationGuardAI(guard,1/60)');
 assert.equal(h.run('guard.indoorAlert.lastSeen.x'),h.run('vip.x'));
 assert.ok(h.run('D(guard,vip)')<startingDistance);
 assert.ok(h.run("bullets.some(b=>b.from==='e'&&b.k==='r')"));
 h.run('guard.cd=10');
 h.tick(.6,"if(state==='play')update(1/60)");
 assert.equal(h.run('vip.hp'),0);
 assert.equal(h.run('state'),'failed');
});

test('indoor commander can hit the VIP and guards cannot see the VIP on another floor',()=>{
 const h=setup();
 h.run('guard.x=vip.x-180;guard.indoorCommander=true;vip.freed=true;vip.stunT=20');
 h.tick(.7,'updateRescueVipGuardDetection(1/60)');
 h.tick(1.4,'updateInfiltrationGuardAI(guard,1/60)');
 assert.ok(h.run('bullets.some(b=>b.commanderRocket)'));
 h.run('guard.cd=10');
 h.tick(.6,'update(1/60)');
 assert.equal(h.run('vip.hp'),2);
 h.run('bullets=[];vip.indoorFloor=2;guard.cd=0');
 h.tick(.6,'updateInfiltrationGuardAI(guard,1/60)');
 assert.equal(h.run('guard.indoorAlert.visible'),false);
 assert.equal(h.run('bullets.length'),0);
});

test('a stair landing protects the player and VIP independently from detection and enemy fire',()=>{
 const h=setup();
 h.run(`p.dig=0;vip.freed=true;
  globalThis.floor=indoorWorld.floors[2];
  globalThis.landing=indoorStairLanding(floor);
  Object.assign(p,landing);Object.assign(vip,landing);
  Object.assign(guard,{x:landing.x,y:landing.y+90,face:-Math.PI/2});
  enterHumanFound(guard,'rescueVip');indoorGuardAlertAt(guard,vip);
  updateInfiltrationGuardAI(guard,1/60);`);
 assert.equal(h.run('indoorStairProtected()'),true);
 assert.notEqual(h.run('guard.target'),'rescueVip');
 assert.equal(h.run('indoorGuardSeesPlayer(guard)'),false);
 assert.equal(h.run("enemyPlayerBulletImpact({from:'e',x:p.x,y:p.y},p.x,p.y)"),null);
 assert.equal(h.run('combatVipTarget()'),null);
 h.run('commanderRocketBlast(p.x,p.y)');
 assert.equal(h.run('p.hp'),3);
 assert.equal(h.run('vip.hp'),3);
 h.run('vip.y+=45');
 assert.equal(h.run('combatVipTarget()===vip'),true);
 assert.equal(h.run('indoorStairProtected()'),true);
 h.run('p.y+=45');
 assert.equal(h.run('indoorStairProtected()'),false);
});

test('stair travel fades for half a second and moves the player and VIP at the midpoint',()=>{
 const h=setup();
 h.run(`p.dig=0;vip.freed=true;
  globalThis.source=indoorWorld.floors[2].stair;
  globalThis.bounds=indoorStairBounds(source,3);
  Object.assign(p,{x:source.x,y:bounds.y+bounds.h-5});
  indoorStairTravelReady(indoorWorld.floors[2]);
  p.y=bounds.y+22;
  updateRescueAdvancedMission(0);`);
 assert.equal(h.run('indoorWorld.currentFloor'),2);
 assert.equal(h.run('indoorWorld.stairTransition.remaining'),.5);
 h.tick(.2,'update(1/60)');
 assert.equal(h.run('indoorWorld.currentFloor'),2);
 h.tick(.05,'update(1/60)');
 assert.equal(h.run('indoorWorld.currentFloor'),1);
 assert.equal(h.run('vip.indoorFloor'),2);
 assert.equal(h.run('D(p,vip)'),0);
 assert.equal(h.run('indoorStairProtected()'),true);
 const opacity=h.run(`(()=>{
  const original=gm.fillRect;let alpha=0;
  gm.fillRect=()=>{alpha=gm.globalAlpha;};
  try{drawIndoorStairTransition();}finally{gm.fillRect=original;}
  return alpha;
 })()`);
 assert.ok(opacity>.99);
 h.tick(.25,'update(1/60)');
 assert.equal(h.run('indoorWorld.stairTransition'),null);
 assert.equal(h.run('indoorWorld.stairMoveLock'),0);
});
