const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function scene(id='base',rolls=[.1,.1,.99]){
 const h=createGameEngine(root);h.c.rolls=rolls;
 h.run(`stageMode='${['base','baseIntermediate'].includes(id)?'base':id}';intermediateStageId=${id==='baseIntermediate'?"'baseIntermediate'":'null'};state='play';
 p={x:480,y:5000,hp:3};base={x:0,y:-1000,w:20,h:20,hp:30};covers=[];objects=[];water=[];bridges=[];mud=[];bushes=[];humans=[];etanks=[];cars=[];
 roadBands=[{x:0,y:4952,w:WW,h:96,lanes:1,kind:'dirt'}];rebuildSpatialGrid();
 (function(R){return ${h.run('setupRoadTruckEvents.toString()')}})(()=>rolls.shift()??.5)();`);
 return h;
}
test('every generated road gets one event in both destruction difficulties, independent of its surface',()=>{
 for(const id of ['base','baseIntermediate']){
  const h=scene(id);h.run("roadBands.push({x:0,y:8000,w:WW,h:320,lanes:4,kind:'asphalt'});setupRoadTruckEvents();");
  assert.equal(h.run('roadTruckEvents.length'),2);
  assert.equal(h.run('roadTruckEvents.every(t=>t.state===\'waiting\')'),true);
 }
 for(const id of ['beginner','front','indoor','training','decisive'])assert.equal(scene(id).run('roadTruckEvents.length'),0,id);
 const h=scene();h.run('areaDebugEnabled=true;setupRoadTruckEvents();');assert.equal(h.run('roadTruckEvents.length'),0);
 h.run('areaDebugEnabled=false;roadBands=[];setupRoadTruckEvents();');assert.equal(h.run('roadTruckEvents.length'),0);
});
test('jungle escape and jungle debug traffic enter and unload using the shared event',()=>{
 for(const setup of ["stageMode='escapeTest'", "stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林'"]){
  const h=scene();
  h.run(setup+';setupRoadTruckEvents()');
  assert.equal(h.run('roadTruckEvents.length'),1);
  h.run('const t=roadTruckEvents[0];t.arrivalDelay=0;t.unload=true;t.passengers=1;for(let i=0;i<180;i++)updateRoadTrucks(.1)');
  assert.equal(h.run('t.state'), 'done');
  assert.equal(h.run('humans.filter(o=>o.roadReinforcement).length'),1);
 }
});
test('the half-probability boundary chooses unloading versus passing, and both entrance sides',()=>{
 const unload=scene('base',[.49999,.49999,0]);assert.equal(unload.run('roadTruckEvents[0].unload'),true);assert.equal(unload.run('roadTruckEvents[0].dir'),1);assert.equal(unload.run('roadTruckEvents[0].passengers'),1);
 const pass=scene('base',[.5,.5]);assert.equal(pass.run('roadTruckEvents[0].unload'),false);assert.equal(pass.run('roadTruckEvents[0].dir'),-1);assert.equal(pass.run('roadTruckEvents[0].passengers'),0);
});
test('traffic waits for its road to be visible and enters from outside the horizontal viewport',()=>{
 for(const rolls of [[.1,.8],[.8,.8]]){
  const h=scene('base',rolls);h.run('p.y=11000;updateRoadTrucks(.016);');assert.equal(h.run('roadTruckEvents[0].state'),'waiting');
  h.run('p.y=5000;updateRoadTrucks(.016);');assert.equal(h.run('roadTruckEvents[0].state'),'entering');
  assert.equal(h.run('roadTruckEvents[0].dir>0?roadTruckEvents[0].x<0:roadTruckEvents[0].x>W'),true);
 }
});
test('a delayed truck waits for two visible seconds, then enters from the current screen edge',()=>{
 const h=scene('base',[.1,.8,.1,0]);
 h.run('updateRoadTrucks(1);p.y=11000;updateRoadTrucks(10);');
 assert.equal(h.run('roadTruckEvents[0].state'),'waiting');
 assert.equal(h.run('roadTruckEvents[0].arrivalDelay'),1);
 h.run("p.y=5000;p.x=WW;state='paused';updateRoadTrucks(10);state='play';updateRoadTrucks(.99);");
 assert.equal(h.run('roadTruckEvents[0].state'),'waiting');
 h.run('updateRoadTrucks(.01);');
 assert.equal(h.run('roadTruckEvents[0].state'),'entering');
 assert.ok(h.run('roadTruckEvents[0].x<WW-W'));
});
test('passing trucks cross the road without stopping or spawning soldiers, then finish permanently',()=>{
 for(const dir of [.1,.8]){
  const h=scene('base',[dir,.9]);h.run("seenStop=false;for(let i=0;i<140;i++){updateRoadTrucks(.1);if(roadTruckEvents[0].state==='unloading')seenStop=true;}");
  assert.equal(h.run('seenStop'),false);assert.equal(h.run('humans.length'),0);assert.equal(h.run('roadTruckEvents[0].state'),'done');
  const x=h.run('roadTruckEvents[0].x');h.run('updateRoadTrucks(10);');assert.equal(h.run('roadTruckEvents[0].x'),x);
 }
});
test('one to three ordinary blue soldiers disembark at the tailgate in patrol mode before the truck leaves',()=>{
 for(const [roll,count] of [[0,1],[.5,2],[.9999,3]]){
  const h=scene('base',[.1,.1,roll]);h.run('for(let i=0;i<140;i++)updateRoadTrucks(.1);');
  assert.equal(h.run('humans.length'),count);assert.equal(h.run('roadTruckEvents[0].state'),'done');
  assert.equal(h.run('humans.every(h=>h.alive&&!h.elite&&!h.commander&&h.st===0&&h.target===null&&h.patrolMode===\'axis\'&&h.roadReinforcement&&pOK(h.path,8,false)&&!hitsM(h.x,h.y,8))'),true);
  assert.equal(h.run('humans.every(h=>h.y>4952&&h.y<5048)'),true);
  assert.equal(h.run('humans.every((h,i)=>humans.slice(0,i).every(q=>D(h,q)>=23))'),true);
 }
});
test('an obstructed tailgate waits and retries locally without embedding soldiers or losing passengers',()=>{
 const h=scene();h.run("roadTruckEvents[0].x=480;roadTruckEvents[0].state='unloading';roadTruckEvents[0].t=0;p.y=5300;covers=[{kd:1,x:200,y:4952,w:600,h:96}];rebuildSpatialGrid();updateRoadTrucks(.1);");
 assert.equal(h.run('humans.length'),0);assert.equal(h.run('roadTruckEvents[0].dropped'),0);assert.equal(h.run('roadTruckEvents[0].state'),'unloading');
 h.run('covers=[];rebuildSpatialGrid();for(let i=0;i<140;i++)updateRoadTrucks(.1);');assert.equal(h.run('humans.length'),3);assert.equal(h.run('roadTruckEvents[0].state'),'done');
});
test('pause freezes trucks and reinitializing a sortie replaces old events',()=>{
 const h=scene();h.run('updateRoadTrucks(.1);const beforeX=roadTruckEvents[0].x;state=\'paused\';updateRoadTrucks(10);');assert.equal(h.run('roadTruckEvents[0].x===beforeX'),true);
 h.run('setupRoadTruckEvents();');assert.equal(h.run('roadTruckEvents.length'),1);assert.equal(h.run('roadTruckEvents[0].state'),'waiting');
});
function targetTruck(){
 const h=scene();h.run("parts=[];fx=[];waves=[];tankWrecks=[];bullets=[];bombs=[];items=[];allies=[];enemyDogs=[];scoreStats=newScoreStats();shake=0;flash=0;roadTruckEvents[0].x=480;roadTruckEvents[0].state='unloading';p.y=5300;");return h;
}
test('five gun hits destroy the truck once, leave a wreck and cancel pending dropoffs',()=>{
 const h=targetTruck();h.run('for(let i=0;i<4;i++)damageRoadTruck(roadTruckEvents[0],1);');assert.equal(h.run('roadTruckEvents[0].hp'),1);assert.equal(h.run('tankWrecks.length'),0);
 h.run('damageRoadTruck(roadTruckEvents[0],1);damageRoadTruck(roadTruckEvents[0],5);for(let i=0;i<100;i++)updateRoadTrucks(.1);');
 assert.equal(h.run('roadTruckEvents[0].state'),'destroyed');assert.equal(h.run('tankWrecks.length'),1);assert.equal(h.run('tankWrecks[0].id'),'truck');assert.equal(h.run('humans.length'),0);
 assert.equal(h.run('roadTruckDropSoldier(roadTruckEvents[0])'),false);
});
test('swept gunfire hits a moving truck even when its endpoint is past the vehicle',()=>{
 const h=targetTruck();h.run("b={x:650,y:5000,k:'v',from:'p'};roadTruckEvents[0].state='entering';");
 assert.equal(h.run('hitRoadTruckBullet(b,300,5000)'),true);assert.equal(h.run('roadTruckEvents[0].hp'),4);assert.equal(h.run('b.x'),447);
});
test('a nearer wall blocks truck damage while a wall beyond the truck does not',()=>{
 const h=targetTruck();h.run("covers=[{kd:1,x:360,y:4950,w:24,h:100}];rebuildSpatialGrid();b={x:700,y:5000,k:'v',from:'p'};");
 assert.equal(h.run('hitRoadTruckBullet(b,300,5000)'),false);assert.equal(h.run('roadTruckEvents[0].hp'),5);
 h.run("covers=[{kd:1,x:600,y:4950,w:24,h:100}];rebuildSpatialGrid();b.x=700;");assert.equal(h.run('hitRoadTruckBullet(b,300,5000)'),true);
});
test('cannon and explosion destruction stop remaining passengers without harming previously unloaded soldiers directly',()=>{
 const h=targetTruck();h.run('roadTruckDropSoldier(roadTruckEvents[0]);damageRoadTrucksInRadius(480,5000,95);for(let i=0;i<100;i++)updateRoadTrucks(.1);');
 assert.equal(h.run('humans.length'),1);assert.equal(h.run('humans[0].alive'),true);assert.equal(h.run('roadTruckEvents[0].hp'),0);
 const cannon=targetTruck();cannon.run("b={x:650,y:5000,k:'c',from:'p',actionId:0};hitRoadTruckBullet(b,300,5000);");assert.equal(cannon.run('roadTruckEvents[0].hp'),0);assert.equal(cannon.run('tankWrecks.length'),1);
 const bomb=targetTruck();bomb.run('bombBlast(480,5000);');assert.equal(bomb.run('roadTruckEvents[0].hp'),0);
});
test('sniper bullets damage the truck and stop instead of penetrating the vehicle',()=>{
 const h=targetTruck();h.run("for(let i=0;i<3;i++){b={x:650,y:5000,k:'s',from:'p'};if(!updateSniperPiercingBullet(b,300,5000))throw Error('sniper passed truck');}");
 assert.equal(h.run('roadTruckEvents[0].hp'),0);assert.equal(h.run('tankWrecks.length'),1);
});
test('a moving truck triggers a planted bomb during normal play and leaves a single wreck',()=>{
 const h=createGameEngine(root);
 h.run("stageMode='base';reset(false);p.x=480;p.y=5300;humans=[];etanks=[];cars=[];water=[];bridges=[];roadTruckEvents=[{x:440,y:5000,dir:1,speed:190,state:'leaving',hp:5,maxHp:5,body:0,kind:'truck'}];bombs=[{x:480,y:5024,armed:true,own:'p'}];update(.05);");
 assert.equal(h.run('bombs.length'),1);
 assert.equal(h.run('roadTruckEvents[0].hp'),5);
 h.run('bombs[0].y=5000;update(.05);');
 assert.equal(h.run('bombs.length'),0);
 assert.equal(h.run('roadTruckEvents[0].state'),'destroyed');
 assert.equal(h.run('tankWrecks.length'),1);
 assert.equal(h.run('tankWrecks[0].id'),'truck');
 h.run('update(.05);');
 assert.equal(h.run('tankWrecks.length'),1);
});
test('swept chassis contact detects a mine even after the truck has passed it',()=>{
 const h=targetTruck();
 h.run("roadTruckEvents[0].previousX=350;roadTruckEvents[0].x=620;");
 assert.equal(h.run('roadTruckOnBomb({x:480,y:5000})===roadTruckEvents[0]'),true);
 assert.equal(h.run('roadTruckOnBomb({x:480,y:5023})'),null);
});
test('gatling rounds select the truck as their nearest hit, while a nearer soldier still takes the bullet',()=>{
 const h=targetTruck();h.run("b={x:650,y:5000,vx:1000,vy:0,k:'v',from:'p',gatling:true};updateGatlingBullet(b,300,5000,false);");assert.equal(h.run('roadTruckEvents[0].hp'),4);
 h.run("humans=[{x:380,y:5000,alive:true}];b={x:650,y:5000,vx:1000,vy:0,k:'v',from:'p',gatling:true};updateGatlingBullet(b,300,5000,false);");assert.equal(h.run('humans[0].alive'),false);assert.equal(h.run('roadTruckEvents[0].hp'),4);
});
test('offscreen waiting and finished trucks cannot be hit, and explosions beyond the body do not damage it',()=>{
 const h=targetTruck();h.run("roadTruckEvents[0].state='waiting';damageRoadTrucksInRadius(480,5000,95);");assert.equal(h.run('roadTruckEvents[0].hp'),5);
 h.run("roadTruckEvents[0].state='done';damageRoadTruck(roadTruckEvents[0],5);");assert.equal(h.run('roadTruckEvents[0].hp'),5);
 h.run("roadTruckEvents[0].state='leaving';damageRoadTrucksInRadius(700,5000,95);");assert.equal(h.run('roadTruckEvents[0].hp'),5);
});
