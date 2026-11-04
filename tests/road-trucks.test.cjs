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
