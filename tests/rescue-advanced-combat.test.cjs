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

test('all rescue floors use beginner-sized furniture and matching cover bounds',()=>{
 const root=path.join(__dirname,'..');
 const beginner=createGameEngine(root,{seed:1771}),rescue=createGameEngine(root,{seed:1771});
 beginner.run("stageMode='indoor';indoorBeginner=true;reset(false)");
 rescue.run("stageMode='indoor';rescueAdvancedTest=true;reset(false)");
 const dimensions=`JSON.stringify(indoorWorld.floors.map(floor=>[
  floor.props.find(p=>p.propKind==='postTable'),
  floor.props.find(p=>p.propKind==='supply'&&p.propArt==='shelf'),
  floor.props.find(p=>p.propArt==='operations_table')
 ].map(p=>[Math.round(p.w*1e6)/1e6,Math.round(p.h*1e6)/1e6])))`;
 const [reference]=JSON.parse(beginner.run(dimensions));
 const floors=JSON.parse(rescue.run(dimensions));
 assert.equal(floors.length,3);
 for(const sizes of floors)assert.deepEqual(sizes,reference);
 assert.ok(rescue.run('indoorWorld.floors.every(floor=>floor.footprint.w===900&&floor.props.every(p=>covers.includes(p)))'));
});

test('entering the VIP circle starts the escort and plays the documents-complete sound once',()=>{
 const h=setup();
 h.run(`
  globalThis.rescueSounds=[];globalThis.rescueArcs=[];
  sfx=name=>rescueSounds.push(name);
  drawEscapeVipSprite=()=>{};
  g.arc=(x,y,r)=>rescueArcs.push([x,y,r,g.fillStyle,g.strokeStyle,g.lineWidth]);
  p.x=vip.x+41;p.y=vip.y;
  updateRescueAdvancedMission(0);drawRescueAdvancedMission();
 `);
 assert.equal(h.run('vip.freed'),false);
 assert.equal(h.run(`rescueArcs.some(([x,y,r,fill,outline,width])=>
  x===vip.x&&y===vip.y&&r===40&&fill==='rgba(255,214,92,.16)'&&outline==='#ffdb68'&&width===3)`),true);
 assert.equal(h.run("rescueSounds.includes('allDocuments')"),false);
 h.run('p.x=vip.x+40;updateRescueAdvancedMission(0);');
 assert.equal(h.run('vip.freed'),true);
 assert.equal(h.run('indoorWorld.rescue.key.done'),false);
 assert.equal(h.run('vip.followWait'),.6);
 h.run('updateRescueAdvancedMission(0);rescueArcs.length=0;drawRescueAdvancedMission();');
 assert.equal(h.run("rescueSounds.filter(name=>name==='allDocuments').length"),1);
 assert.equal(h.run('rescueArcs.length'),0);
});

test('the locked rescue door shows a key only when the player touches it without the key',()=>{
 const h=setup();
 h.run(`
  globalThis.cell=indoorWorld.rescue.door;
  globalThis.keyHints=0;
  drawRescueKeyIcon=()=>keyHints++;
  const touchDoor=actor=>Object.assign(actor,{x:cell.x,y:cell.y});
  touchDoor(guard);p.x=cell.x+100;p.y=cell.y+100;
  updateInfiltrationDoors(.1);
 `);
 assert.equal(h.run('cell.rescueKeyHint'),false);
 h.run('touchDoor(p);updateInfiltrationDoors(.1);drawInfiltrationOpenings(cell.x-100,cell.y-100);');
 assert.equal(h.run('cell.rescueKeyHint'),true);
 assert.equal(h.run('keyHints'),1);
 assert.equal(h.run('cell.open'),0);
 h.run('p.x+=100;p.y+=100;updateInfiltrationDoors(.1);drawInfiltrationOpenings(cell.x-100,cell.y-100);');
 assert.equal(h.run('cell.rescueKeyHint'),false);
 assert.equal(h.run('keyHints'),1);
 h.run('touchDoor(p);indoorWorld.rescue.key.done=true;updateInfiltrationDoors(.1);drawInfiltrationOpenings(cell.x-100,cell.y-100);');
 assert.equal(h.run('cell.rescueUnlocked'),true);
 assert.ok(h.run('cell.open')>0);
 assert.equal(h.run('keyHints'),1);
});

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
 assert.equal(h.run('vip.hp'),2,'only the first bullet in the burst deals damage');
 for(const remaining of [1,0]){
  h.tick(1,'update(1/60)');
  h.run("fire(vip.x+16,vip.y,Math.PI,'e','r',600,240);update(.033)");
  assert.equal(h.run('vip.hp'),remaining);
 }
 assert.equal(h.run('state'),'failed');
 assert.equal(h.run('scoreStats.vipHp'),0);
 assert.equal(h.run('scoreStats.vipDetections'),1);
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
