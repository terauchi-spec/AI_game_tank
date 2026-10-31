const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
const root=path.join(__dirname,'..');
function sentry(){
 const h=createGameEngine(root,{seed:1771});let clock=0;h.c.performance.now=()=>clock;
 h.run("stageMode='indoor';reset(false);state='play';indoorWorld.alarm.active=true;cam=indoorWorld.floors[1].footprint.y;indoorUpdateEntranceGuards(.3);reviewGuard=indoorWorld.floors[0].guards.find(h=>h.indoorEntranceGuard&&indoorWorld.floors[0].openings[h.indoorEntranceSlot.gate].side===1);indoorWorld.currentFloor=0;indoorWorld.stairSanctuary=null;p.x=reviewGuard.x;p.y=reviewGuard.y+300;reviewGuard.face=Math.PI/2+.16;covers=[];objects=[];humans=[reviewGuard];indoorWorld.floors[0].guards=[reviewGuard];etanks=[];rebuildSpatialGrid();");
 h.tick=(count=1)=>{for(let i=0;i<count;i++){clock+=1000/60;h.run('updateInfiltrationGuardAI(reviewGuard,1/60)');}};return h;
}
test('alarm sentry holds an edge-of-vision glimpse, confirms, pursues and fires using real perception and movement',()=>{
 const h=sentry();
 assert.equal(h.run('indoorGuardSeesPlayer(reviewGuard)'),true);
 h.tick(90);assert.equal(h.run('reviewGuard.target'),'p');assert.equal(h.run('reviewGuard.indoorAlert.phase'),'found');
 assert.equal(h.run('reviewGuard.sus'),0);
 h.tick(240);
 assert.ok(h.run('D(reviewGuard,reviewGuard.indoorEntranceHome)')>100);
 assert.ok(h.run("bullets.some(b=>b.from==='e')"));
});
test('waiting entrance sentry looks left and right without spinning around or moving from its post',()=>{
 const h=sentry(),base=h.run('reviewGuard.face');h.run('debugMode=2');let min=Infinity,max=-Infinity;
 for(let i=0;i<1200;i++){h.tick();const face=h.run('reviewGuard.face');min=Math.min(min,face);max=Math.max(max,face);assert.ok(Math.abs(face-base)<=.650001);}
 assert.ok(max-min>1.2);assert.equal(h.run('D(reviewGuard,reviewGuard.indoorEntranceHome)'),0);
});
test('an unconfirmed glimpse cannot discover the player after they hide',()=>{
 const h=sentry();h.tick(8);h.run('p.dig=5');h.tick(120);
 assert.notEqual(h.run('reviewGuard.target'),'p');assert.equal(h.run('reviewGuard.indoorNotice.visible'),false);
});
test('both ordinary infiltration floors draw destination arrows inside their landings',()=>{
 const h=createGameEngine(root);
 h.run("stageMode='indoor';indoorLaboratory=false;indoorPropImages.stairs_up={complete:true,naturalWidth:100,naturalHeight:320};indoorPropImages.stairs_down={complete:true,naturalWidth:162,naturalHeight:320};");
 for(const number of [1,2]){
  h.c.reviewFloor={number,stair:{x:500,y:1000}};
  const result=JSON.parse(h.run(`(()=>{const points=[],labels=[],oldMove=g.moveTo,oldLine=g.lineTo,oldText=g.fillText;
   g.moveTo=(x,y)=>points.push({x,y});g.lineTo=(x,y)=>points.push({x,y});g.fillText=t=>labels.push(t);
   drawInfiltrationStairSprite(reviewFloor);g.moveTo=oldMove;g.lineTo=oldLine;g.fillText=oldText;
   return JSON.stringify({points,labels,safe:indoorStairSafeArea(reviewFloor)});})()`));
  assert.equal(result.points.length,7);assert.equal(result.points[1].y<result.points[0].y,number===1);
  assert.ok(result.labels.includes(number===1?'2Fへ':'1Fへ'));
  assert.ok(result.points.every(p=>p.x>=result.safe.x&&p.x<=result.safe.x+result.safe.w&&p.y>=result.safe.y&&p.y<=result.safe.y+result.safe.h));
 }
});
