const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
const random=seed=>{let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}};
function harness(seed=1,width=480){
 let completed=0,canvases=0;const draws=[];
 const context=new Proxy({},{get:(o,k)=>k in o?o[k]:()=>{}});
 const gm=new Proxy({drawImage:(...a)=>draws.push(a)},{get:(o,k)=>k in o?o[k]:()=>{}});
 const c={stageMode:'indoor',state:'play',WH:12800,WW:960,W:width,H:850,p:{},scoreStats:{},R:random(seed),
  ZONE_STYLE:{'敵迷路基地':{p:[]}},module:{exports:{}},keys:{ArrowUp:true,KeyD:true},
  document:{body:{classList:{remove(){}}},createElement:()=>{canvases++;return{width:0,height:0};}},
  gameCanvasContext:()=>context,gm,rebuildSpatialGrid(){},say(){},sfx(){},partner:null,hound:null,
  playerDetectedNow:()=>false,los:()=>true,D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
  completeMission:()=>{completed++;c.state='win';}};
 vm.createContext(c);
 vm.runInContext(source+`;setupInfiltrationWorld();setupInfiltrationMission();
  api={get world(){return indoorWorld;},bounds:infiltrationFloorBounds,clamp:enforceInfiltrationBoundary,
    camera:infiltrationCamera,begin:beginInfiltrationExtraction,update:updateInfiltrationExtraction,
    mission:updateInfiltrationMission,draw:drawInfiltrationExtraction,sprite:infiltrationJeepSprite,
    protected:indoorStairProtected,protect:indoorBeginStairSanctuary,tick:indoorTickStairSanctuary,sees:indoorGuardSeesPlayer,record:indoorRecordGuardDiscovery,stairBlocked:indoorGuardStairBlocked,move:indoorMoveGuardTo,stairBounds:indoorStairBounds,landing:indoorStairLanding};`,c);
 return{c,api:c.api,draws,get completed(){return completed;},get canvases(){return canvases;}};
}

test('one main EXIT aligns with the open entrance; optional emergency EXIT remains inside the boundary',()=>{
 let optional=0;
 for(let seed=1;seed<=30;seed++){
  const h=harness(seed),f=h.api.world.floors[0];
  assert.equal(f.entrances.length,2);assert.equal(f.doors.filter(q=>q.outer).length,0);
  assert.equal(h.api.world.exits.filter(q=>q.y>f.footprint.y+f.footprint.h).length,1);
  assert.equal(h.api.world.exits.length,1+Number(!!f.emergency));
  assert.equal(h.api.world.exits[0],f.entrance);
  if(f.emergency){
   optional++;assert.equal(f.footprint.y-f.emergency.y,672);
   assert.ok(f.emergency.y-90>h.api.bounds().top+8);
  }
 }
 assert.ok(optional>0&&optional<30);
});

test('ground-floor movement and camera cannot reach or reveal the separate second-floor layout',()=>{
 const h=harness(),c=h.c,w=h.api.world,[ground,upper]=w.floors;
 const upperBottom=upper.footprint.y+upper.footprint.h;
 for(let i=0;i<1000;i++){c.p.y-=150;h.api.clamp();}
 assert.equal(c.p.y,ground.footprint.y-900+8);
 assert.ok(c.p.y>upperBottom+300);assert.ok(h.api.camera().y>upperBottom+300);
 c.p.y=99999;h.api.clamp();assert.equal(c.p.y,ground.footprint.y+ground.footprint.h+900-8);
 w.currentFloor=1;c.p.y=-100;h.api.clamp();assert.equal(c.p.y,upper.footprint.y+8);
 c.stageMode='base';c.p.y=-100;h.api.clamp();assert.equal(c.p.y,-100,'other stages retain their movement');
});

test('destroyed upper exterior walls cannot expose walkable ground or allow movement over any edge',()=>{
 const h=harness(),c=h.c,w=h.api.world,upper=w.floors[1].footprint;
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),start=html.indexOf('function mv(o,'),end=html.indexOf('\nlet lastEnemySeparationAt=',start);
 Object.assign(c,{mazeComparisonEnemyFrozen:()=>false,hitsC:()=>false,enemyTankObjectBlocked:()=>false,tankBlocked:()=>false,enemyUnitBlocked:()=>false,frontlineMovementTop:()=>0});
 vm.runInContext(html.slice(start,end),c);w.currentFloor=1;
 for(const [x,y,dx,dy] of [
  [upper.x+8,upper.y+upper.h/2,-50,0],
  [upper.x+upper.w-8,upper.y+upper.h/2,50,0],
  [upper.x+upper.w/2,upper.y+8,0,-50],
  [upper.x+upper.w/2,upper.y+upper.h-8,0,50]]){
  Object.assign(c.p,{x,y});c.mv(c.p,dx,dy,8,1);
  assert.equal(c.p.x,x);assert.equal(c.p.y,y,'edge remains solid even when every wall collider is gone');
  Object.assign(c.p,{x:x+dx,y:y+dy});h.api.clamp();
  assert.ok(c.p.x>=upper.x+8&&c.p.x<=upper.x+upper.w-8);
  assert.ok(c.p.y>=upper.y+8&&c.p.y<=upper.y+upper.h-8,'blast displacement is clamped too');
 }
 const guard=w.floors[1].guards[0];Object.assign(guard,{x:upper.x-50,y:upper.y-50});h.api.clamp();
 assert.equal(guard.x,upper.x+8);assert.equal(guard.y,upper.y+8);
 const ground=w.floors[0].footprint,groundGuard=w.floors[0].guards[0];Object.assign(groundGuard,{x:ground.x+9,y:ground.y+100});
 c.mv(groundGuard,-20,0,8,1);assert.equal(groundGuard.x,ground.x-11,'ground guards can still use the exterior while player is upstairs');
 for(const mode of ['base','front']){c.stageMode=mode;Object.assign(c.p,{x:upper.x+8,y:upper.y+100});c.mv(c.p,-10,0,8,1);assert.equal(c.p.x,upper.x-2,'other stages keep shared movement');}
});

test('upper-floor exterior renders as void without building terrain patterns',()=>{
 const h=harness(),c=h.c,w=h.api.world,ops=[];let patterns=0;
 const g=new Proxy({fillRect(...r){ops.push({color:this.fillStyle,r});}},{get:(o,k)=>k in o?o[k]:()=>{}});
 Object.assign(c,{g,terrainSurfacePattern:()=>{patterns++;return '#456';},indoorConcretePattern:()=>null,drawInfiltrationStairSprite:()=>true});
 vm.runInContext('renderFloor=drawInfiltrationFloors;',c);
 w.currentFloor=1;c.renderFloor(0,w.floors[1].footprint.y);assert.equal(ops[0].color,'#11171c');assert.equal(patterns,0);
 ops.length=0;w.currentFloor=0;c.renderFloor(0,w.floors[0].footprint.y);assert.equal(ops[0].color,'#456');assert.equal(patterns,1);
});

test('five-second extraction finalizes once, freezes gameplay, shows success at the exact boarding boundary',()=>{
 const h=harness(),c=h.c,v=h.api.world.exits[0];
 Object.assign(c.p,v);c.mission.index=3;
 h.api.mission(4.9);assert.equal(h.completed,0);assert.equal(c.state,'play');
 h.api.mission(.1);assert.equal(h.completed,1);assert.equal(c.state,'indoorEscape');
 const pickup=c.mission.extraction,camera=h.api.camera();
 assert.ok(pickup.carX+64<camera.x,'jeep starts off screen to the left');
 assert.ok(Math.abs(pickup.y-pickup.fromY)>=68,'jeep stops beside the player so boarding remains visible');
 assert.equal(c.keys.ArrowUp,false);assert.equal(c.keys.KeyD,false);
 h.api.update(1.8);assert.equal(pickup.carX,pickup.stopX);assert.equal(pickup.boarded,false);
 h.api.update(.6);assert.equal(pickup.phase,'boarding');assert.equal(c.state,'indoorEscape');
 h.api.update(.399);assert.equal(pickup.boarded,false);assert.equal(c.state,'indoorEscape');
 h.api.update(.001);assert.equal(pickup.boarded,true);assert.equal(c.state,'succeeded');
 assert.equal(pickup.phase,'aboard');assert.equal(pickup.carX,pickup.stopX);assert.equal(c.p.x,pickup.carX-8);
 assert.equal(h.api.camera().x,camera.x);assert.equal(h.api.camera().y,camera.y,'camera stays at pickup location');
 h.api.update(2);assert.equal(c.state,'succeeded');assert.equal(c.successFrameDrawn,false);assert.equal(pickup.carX,pickup.endX,'jeep leaves the right edge during success');assert.equal(pickup.phase,'departed');
 assert.equal(h.completed,1);h.api.update(10);assert.equal(h.completed,1);
});

test('both stair directions bring the partner onto the protected landing and clear old-floor orders without healing',()=>{
 for(const condition of ['active','stunned','down']){
  const h=harness(),c=h.c,w=h.api.world;c.skill='partner';c.cars=[];
  c.partner={x:100,y:100,hp:condition==='down'?0:2,down:condition==='down',stunT:condition==='stunned'?3:0,
   route:[{x:700,y:100}],routeStart:{x:100,y:100},backup:true,reentryT:1.5,goal:{x:700,y:100},farT:1};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/partner.js'),'utf8')+';order=partnerOrder;',c);
  for(const destination of [1,0]){
   const f=w.floors[w.currentFloor],b=h.api.stairBounds(f.stair,f.number);w.stairsCooldown=0;
   c.order.pressed=true;c.order.drawing=true;c.order.path=[{x:1,y:2}];
   Object.assign(c.p,{x:f.stair.x,y:b.y+b.h-12});h.api.mission(.01);c.p.y=b.y+20;h.api.mission(.01);
   assert.equal(w.currentFloor,destination);const landing=h.api.landing(w.floors[destination]),q=c.partner;
   assert.equal(q.x,landing.x+14);assert.equal(q.y,landing.y+12);
   const area=w.stairSanctuary;assert.ok(q.x>=area.x&&q.x<=area.x+area.w&&q.y>=area.y&&q.y<=area.y+area.h);
   assert.equal(q.route,null);assert.equal(q.routeStart,null);assert.equal(q.goal,null);assert.equal(q.backup,false);assert.equal(q.reentryT,0);assert.equal(q.farT,0);
   assert.equal(c.order.pressed,false);assert.equal(c.order.drawing,false);assert.equal(c.order.path.length,0);
   const x=q.x,y=q.y;c.updatePartner(.1);assert.equal(q.x,x);assert.equal(q.y,y,'partner shares the landing pause');
   assert.equal(q.hp,condition==='down'?0:2);assert.equal(q.down,condition==='down');assert.equal(q.stunT,condition==='stunned'?3:0);
  }
 }
});

test('EXIT pickup boards the partner beside the player, displays the blue helmet and shows both aboard immediately on success',()=>{
 const h=harness(),c=h.c,exit=h.api.world.exits[0];Object.assign(c.p,exit);c.skill='partner';
 c.partner={x:exit.x+60,y:exit.y+30,face:0,hp:2,down:false,stunT:0,route:[{x:10,y:20}],backup:true};
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/partner.js'),'utf8'),c);
 h.api.begin(exit);const v=c.mission.extraction;assert.equal(v.partner.actor,c.partner);assert.equal(v.partner.boarded,false);
 assert.equal(c.partner.route,null);assert.equal(c.partner.backup,false);
 h.api.update(1.8);assert.equal(c.partner.x,v.partner.waitX);assert.equal(c.partner.y,v.partner.waitY);
 h.api.update(.6);assert.equal(v.phase,'boarding');assert.equal(v.partner.boarded,false);assert.equal(c.partner.moving,true);
 let bodies=0;const fills=[];c.g=new Proxy({},{get:()=>()=>{}});c.soldier=()=>bodies++;
 c.gm.fillRect=function(...r){fills.push({color:this.fillStyle,r});};c.drawPartner();assert.equal(bodies,1);
 h.api.update(.5);assert.equal(v.boarded,true);assert.equal(v.partner.boarded,true);assert.equal(c.partner.x,v.carX-25);assert.equal(c.partner.y,v.y-10);
 c.drawPartner();assert.equal(bodies,1,'no duplicate standing partner once aboard');h.api.draw(0,0);
 assert.ok(fills.some(f=>f.color==='#399bff'),'blue partner helmet is visible in the car');
 assert.ok(fills.some(f=>f.color==='#b5372e'),'red player helmet remains visible');
 h.api.update(1);assert.equal(v.phase,'departing');assert.equal(c.state,'succeeded');assert.equal(c.partner.x,v.carX-25);assert.equal(c.p.x,v.carX-8);
 h.api.update(2);assert.equal(c.state,'succeeded');assert.equal(c.successFrameDrawn,false);assert.equal(c.partner.x,v.carX-25);assert.equal(c.partner.hp,2);
});

test('pickup includes an incapacitated partner without changing health and omits partners for other skills',()=>{
 for(const condition of ['down','stunned','other-skill','absent']){
  const h=harness(),c=h.c;c.skill=condition==='other-skill'?'throw':'partner';
  c.partner=condition==='absent'?null:{x:100,y:100,hp:condition==='down'?0:2,down:condition==='down',stunT:condition==='stunned'?3:0};
  h.api.begin(h.api.world.exits[0]);const v=c.mission.extraction;h.api.update(3);
  if(condition==='other-skill'||condition==='absent')assert.equal(v.partner,undefined);
  else{assert.equal(v.partner.boarded,true);assert.equal(c.partner.hp,condition==='down'?0:2);assert.equal(c.partner.stunT,condition==='stunned'?3:0);}
 }
});

test('EXIT pickup gathers and boards the hound, releases its target and shows success with both aboard',()=>{
 const h=harness(),c=h.c,exit=h.api.world.exits[0];Object.assign(c.p,exit);c.skill='hound';c.mission.index=3;
 const target={houndPinned:true};c.hound={x:exit.x+60,y:exit.y+30,face:0,col:'#4a3025',state:'bite',stun:0,target,biteT:2,dashDist:70};
 h.api.mission(5);assert.equal(h.completed,1);assert.equal(c.state,'indoorEscape');
 const v=c.mission.extraction;assert.equal(v.hound.actor,c.hound);assert.equal(v.hound.boarded,false);
 assert.equal(target.houndPinned,false);assert.equal(c.hound.target,null);assert.equal(c.hound.biteT,0);
 h.api.update(1.8);assert.equal(c.hound.x,v.hound.waitX);assert.equal(c.hound.y,v.hound.waitY);
 h.api.update(.6);assert.equal(v.phase,'boarding');assert.equal(v.hound.boarded,false);assert.equal(c.hound.moving,true);
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),start=html.indexOf('function drawHound('),end=html.indexOf('function startAirstrike(',start);
 let bodies=0;const fills=[];c.g=new Proxy({translate:()=>bodies++},{get:(o,k)=>k in o?o[k]:()=>{}});
 c.houndTrailTarget=()=>c.p;c.performance={now:()=>1000};vm.runInContext(html.slice(start,end),c);
 c.drawHound();assert.equal(bodies,1,'dog remains visible during boarding');
 c.gm.fillRect=function(...r){fills.push({color:this.fillStyle,r});};
 h.api.update(.5);assert.equal(v.hound.boarded,true);assert.equal(c.hound.x,v.carX-25);assert.equal(c.hound.y,v.y-10);
 c.drawHound();assert.equal(bodies,1,'no duplicate dog left standing outside the car');h.api.draw(0,0);
 assert.ok(fills.some(f=>f.color==='#201710'),'dog muzzle is rendered in the car');
 assert.ok(fills.some(f=>f.color==='#b5372e'),'player remains aboard');
 h.api.update(1);assert.equal(v.phase,'departing');assert.equal(c.state,'succeeded');assert.equal(c.hound.x,v.carX-25);assert.equal(c.p.x,v.carX-8);
 h.api.update(2);assert.equal(c.state,'succeeded');assert.equal(c.successFrameDrawn,false);assert.equal(c.hound.x,v.carX-25);assert.equal(h.completed,1);
 for(const mode of ['base','front']){c.stageMode=mode;const before=bodies;c.drawHound();assert.equal(bodies,before+1,'other stages retain dog drawing');}
 c.stageMode='indoor';const before=bodies;c.drawHound({...c.hound,enemyDog:true});assert.equal(bodies,before+1,'enemy dogs are never hidden by the player extraction');
});

test('hound pickup preserves coat color and stun state, includes a distant lost dog and excludes inactive skills',()=>{
 for(const condition of ['brown','white','black','stunned','lost','other-skill','absent']){
  const h=harness(),c=h.c;c.skill=condition==='other-skill'?'throw':'hound';
  c.hound=condition==='absent'?null:{x:condition==='lost'?-999:100,y:condition==='lost'?-999:100,
   col:condition==='white'?'#e8e5da':condition==='black'?'#222222':'#4a3025',face:0,state:condition==='lost'?'lost':'follow',stun:condition==='stunned'?3:0};
  h.api.begin(h.api.world.exits[0]);const v=c.mission.extraction;
  if(condition==='other-skill'||condition==='absent'){assert.equal(v.hound,undefined);continue;}
  assert.ok(v.hound.fromX>=v.camX-16&&v.hound.fromX<=v.camX+c.W+16);
  assert.ok(v.hound.fromY>=v.camY-16&&v.hound.fromY<=v.camY+c.H+16);
  const color=c.hound.col;h.api.update(3);assert.equal(v.hound.boarded,true);assert.equal(c.hound.col,color);
  assert.equal(c.hound.stun,condition==='stunned'?3:0,'extraction never heals the dog');
 }
});

test('hound extraction reuses the single jeep raster and does not allocate per-frame images',()=>{
 const h=harness(),c=h.c;c.skill='hound';c.hound={x:c.p.x+40,y:c.p.y+20,face:0,col:'#4a3025',state:'follow',stun:0};
 h.api.begin(h.api.world.exits[0]);
 for(let i=0;i<240;i++){h.api.update(.016);h.api.draw(0,0);}
 assert.equal(h.canvases,1);assert.equal(h.draws.length,240);assert.equal(h.draws[0][0],h.draws[239][0]);
 assert.equal(c.mission.extraction.hound.boarded,true);
});

test('jeep raster is built once and reused throughout the cutscene, with no work after results',()=>{
 const h=harness(),exit=h.api.world.exits[0];h.api.begin(exit);
 for(let i=0;i<240;i++){h.api.update(.016);h.api.draw(0,0);}
 assert.equal(h.canvases,1);assert.equal(h.draws.length,240);
 assert.equal(h.draws[0][0],h.draws[239][0]);
 h.c.state='win';h.api.update(10);h.api.draw(0,0);assert.equal(h.draws.length,240);
});

test('pickup animation does not activate for completed base or frontline stages',()=>{
 for(const stage of ['base','beginner','front']){
  const h=harness();h.c.stageMode=stage;h.api.begin(h.api.world.exits[0]);
  assert.equal(h.c.state,'play');assert.equal(h.c.mission.extraction,undefined);
  h.api.update(10);h.api.draw(0,0);assert.equal(h.canvases,0);assert.equal(h.draws.length,0);
 }
});

test('deployment EXIT and player start align with the wide entrance center',()=>{
 for(let seed=1;seed<=40;seed++)for(const width of [480,840]){
  const h=harness(seed,width);
  const f=h.api.world.floors[0],center=f.lobbyArea.x+f.lobbyArea.w/2;
  assert.equal(h.c.p.x,center);assert.equal(h.api.world.exits[0].x,center);
  assert.equal(f.openings[0].x,center);
 }
});

test('stair transition grants sanctuary until the landing area is left and clears stale discovery',()=>{
 const h=harness(),c=h.c,w=h.api.world,target=w.floors[1],guard=target.guards[0];
 const b=h.api.stairBounds(w.floors[0].stair,1);
 Object.assign(c.p,{x:w.floors[0].stair.x,y:b.y+b.h-12});h.api.mission(.01);
 c.p.y=b.y+20;guard.st=1;guard.target='p';guard.indoorAlert={phase:'found'};
 guard.indoorNotice={visible:true,exposure:1};guard._detectCache={key:'p',obj:c.p};guard._nextDetectAt=9999;
 h.api.mission(.01);
 assert.equal(w.currentFloor,1);assert.equal(h.api.protected(),true);assert.ok(w.stairSanctuary);
 assert.equal(guard.st,0);assert.equal(guard.target,null);assert.equal(guard.indoorNotice,null);assert.equal(guard._detectCache,null);
 assert.equal(h.api.sees(guard),false,'even a point-blank guard cannot see the landing player');
 guard.st=1;guard.target='p';h.api.record(guard);assert.equal(w.alarm.witnesses.size,0);
 h.api.tick(3600);assert.equal(h.api.protected(),true,'standing on the landing never expires');
 h.api.protect(target);c.p.x+=111;h.api.tick(.01);assert.equal(h.api.protected(),false);
 c.p.x-=111;assert.equal(h.api.protected(),false,'returning to the landing does not renew protection');
});

test('common detection cannot reuse a cached player sighting inside the stair sanctuary',()=>{
 const h=harness(),c=h.c,w=h.api.world;h.api.protect(w.floors[0]);
 Object.assign(c.p,{x:w.stairSanctuary.x,y:w.stairSanctuary.y});
 c.performance={now:()=>100};c.decoy=null;c.frontlineEnemyAreaTarget=()=>null;
 const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const start=index.indexOf('function canDetect(o,target,face,key){'),end=index.indexOf('const MAX_PARTS=',start);
 vm.runInContext(index.slice(start,end),c);
 const guard=w.floors[0].guards[0];guard._detectCache={key:'p',obj:c.p};guard._nextDetectAt=10000;
 assert.equal(c.canDetect(guard,c.p,0,'p'),false);
 assert.equal(c.findDetectedTarget(guard,0),null);assert.equal(guard._detectCache,null);
});

test('guards route around the actual stair artwork and separation cannot push them onto it',()=>{
 const h=harness(),c=h.c;
 c.angD=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 c.mv=(o,dx,dy,r)=>{
  if(!h.api.stairBlocked(o,o.x+dx,o.y,r))o.x+=dx;
  if(!h.api.stairBlocked(o,o.x,o.y+dy,r))o.y+=dy;
 };
 for(const floor of h.api.world.floors){
  const stair=floor.stair,b=floor.stairObstacle;
  assert.equal(b.w,76,'NPC obstacle includes both 8px enclosure walls');
  const guard={x:stair.x-70,y:stair.y,face:0,alive:true,indoorGuard:true,indoorFloor:floor.number,indoorAlert:{}};
  const goal={x:stair.x+70,y:stair.y};
  for(let i=0;i<1200&&c.D(guard,goal)>18;i++){
   h.api.move(guard,goal,.05,78);
   assert.equal(h.api.stairBlocked(guard,guard.x,guard.y,8),false);
  }
  assert.ok(c.D(guard,goal)<18,'guard completes the detour on floor '+floor.number);
  const original=floor.guards[0];original.x=stair.x;original.y=stair.y;
  h.api.clamp();assert.equal(h.api.stairBlocked(original,original.x,original.y,8),false);
 }
});

test('entrances are broad unobstructed openings and existing guards patrol across their thresholds',()=>{
 const h=harness(3),c=h.c,f=h.api.world.floors[0];
 assert.equal(f.doors.filter(q=>q.outer).length,0);
 assert.equal(f.openings[0].w,360);
 assert.equal(h.api.world.exits[0].x,f.openings[0].x);
 assert.equal(f.guards.filter(q=>q.indoorEntrancePatrol).length,2);
 for(const gate of f.openings){
  for(let x=gate.x-gate.w/2+20;x<gate.x+gate.w/2-20;x+=10)
   assert.ok(!f.walls.some(w=>x>=w.x&&x<=w.x+w.w&&gate.y>=w.y&&gate.y<=w.y+w.h));
  assert.ok(f.guards.filter(q=>q.indoorEntrancePatrol).some(q=>q.path.some(p=>gate.side*(p.y-gate.y)>80)&&q.path.some(p=>gate.side*(p.y-gate.y)<-40)));
 }
 c.angD=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 c.mv=(o,dx,dy)=>{o.x+=dx;o.y+=dy;};
 for(const gate of f.openings){
  const guard={x:gate.x,y:gate.y-gate.side*64,face:0,alive:true,indoorGuard:true,indoorFloor:1,indoorAlert:{}};
  for(const goal of [{x:gate.x,y:gate.y+gate.side*180},{x:gate.x,y:gate.y-gate.side*80}]){
   for(let i=0;i<600&&c.D(guard,goal)>18;i++)h.api.move(guard,goal,.05,78);
   assert.ok(c.D(guard,goal)<18,'pursuit can cross the open entrance in both directions');
  }
 }
});


test('stairs have three solid sides, require entering at the mouth, and switch only at the back',()=>{
 for(let seed=1;seed<=30;seed++){
  const h=harness(seed),c=h.c,w=h.api.world;
  for(const f of w.floors){
   const b=h.api.stairBounds(f.stair,f.number),walls=f.walls.filter(q=>q.indoorStairWall);
   assert.equal(walls.length,3);
   const blocked=(x,y)=>walls.some(q=>x+8>q.x&&x-8<q.x+q.w&&y+8>q.y&&y-8<q.y+q.h);
   assert.equal(blocked(b.x-4,f.stair.y),true);
   assert.equal(blocked(b.x+b.w+4,f.stair.y),true);
   assert.equal(blocked(f.stair.x,b.y-4),true);
   assert.equal(blocked(f.stair.x,b.y+b.h),false);
  }
  for(let trip=0;trip<2;trip++){
   const before=w.currentFloor,f=w.floors[before],b=h.api.stairBounds(f.stair,f.number);
   w.stairsCooldown=0;
   Object.assign(c.p,{x:f.stair.x,y:b.y+20});h.api.mission(.01);
   assert.equal(w.currentFloor,before,'side/back access cannot activate travel');
   c.p.y=b.y+b.h-12;h.api.mission(.01);assert.equal(w.currentFloor,before);
   c.p.y=f.stair.y;h.api.mission(.01);assert.equal(w.currentFloor,before,'middle is not the trigger');
   c.p.y=b.y+20;h.api.mission(.01);assert.equal(w.currentFloor,1-before);
   assert.equal(h.api.protected(),true);
   const area=w.stairSanctuary;
   const landing=h.api.landing(w.floors[w.currentFloor]);
   assert.equal(c.p.x,landing.x);assert.equal(c.p.y,landing.y);
   assert.equal(area.w,44);assert.equal(area.h,44);
   c.p.x=area.x+area.w;assert.equal(h.api.protected(),true);
   c.p.x+=1;assert.equal(h.api.protected(),false);
   c.p.x=landing.x;c.p.y=area.y+area.h;assert.equal(h.api.protected(),true);
   c.p.y+=1;assert.equal(h.api.protected(),false);
   c.p.y=landing.y;
   c.p.x=area.x;h.api.mission(3);assert.equal(w.currentFloor,1-before,'landing never immediately bounces back');
  }
 }
});


test('stair arrival freezes only the infiltration player for 0.5 seconds',()=>{
 const h=harness(),c=h.c,w=h.api.world,b=h.api.stairBounds(w.floors[0].stair,1);
 Object.assign(c.p,{x:w.floors[0].stair.x,y:b.y+b.h-12});h.api.mission(.01);
 c.p.y=b.y+20;h.api.mission(.01);assert.equal(w.stairMoveLock,.5);
 const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),start=index.indexOf('function mv(');
 Object.assign(c,{mazeComparisonEnemyFrozen:()=>false,terrainMoveScale:()=>1,hitsC:()=>false,
  enemyTankObjectBlocked:()=>false,tankBlocked:()=>false,enemyUnitBlocked:()=>false,frontlineMovementTop:()=>0});
 vm.runInContext(index.slice(start,index.indexOf('\n',start)),c);
 const x=c.p.x,y=c.p.y;
 c.mv(c.p,5,5,8);assert.equal(c.p.x,x);assert.equal(c.p.y,y);
 const ally={x:100,y:c.p.y};c.mv(ally,5,0,8);assert.equal(ally.x,105);
 h.api.mission(.49);c.mv(c.p,5,0,8);assert.equal(c.p.x,x);
 h.api.mission(.011);c.mv(c.p,5,0,8);assert.equal(c.p.x,x+5);
 w.stairMoveLock=.5;c.stageMode='base';c.mv(c.p,5,0,8);assert.equal(c.p.x,x+10);
});


test('extraction success waits at the success overlay until evaluation is explicitly requested',()=>{
 const h=harness(),c=h.c,index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),nodes=new Map(),classes=new Set(),sounds=[];let results=0;
 const get=id=>{if(!nodes.has(id))nodes.set(id,{events:{},addEventListener(name,fn){this.events[name]=fn;},focus(){this.focused=true;}});return nodes.get(id);};
 c.document.getElementById=get;c.document.body.classList={contains:k=>classes.has(k),toggle(k,on){on?classes.add(k):classes.delete(k);}};c.sfx=n=>sounds.push(n);c.syncResultScreen=()=>results++;
 vm.runInContext(index.slice(index.indexOf('function syncMissionSuccess(){'),index.indexOf('let failureFrameDrawn=false;')),c);
 h.api.begin(h.api.world.exits[0]);c.syncMissionSuccess();assert.equal(classes.has('success-open'),false);h.api.update(2.799);assert.equal(c.state,'indoorEscape');c.syncMissionSuccess();assert.equal(classes.has('success-open'),false);h.api.update(.001);assert.equal(c.state,'succeeded');c.syncMissionSuccess();assert.equal(classes.has('success-open'),true);assert.equal(get('missionSuccessEvaluate').focused,true);assert.equal(results,0);c.syncMissionSuccess();assert.deepEqual(sounds,['win']);
 get('missionSuccessEvaluate').events.click();assert.equal(c.state,'win');assert.equal(classes.has('success-open'),false);assert.equal(results,1);get('missionSuccessEvaluate').events.click();assert.equal(results,1);
 assert.match(index,/<h1 id="missionSuccessTitle">作戦成功<\/h1>/);assert.match(index,/<h1 id="missionFailureTitle">作成失敗<\/h1>/);
});


test('success departure redraws until off screen, then freezes; early evaluation stops the animation',()=>{
 const h=harness(),c=h.c,index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 c.document.body.classList.contains=()=>false;
 vm.runInContext(index.slice(index.indexOf('function shouldDrawGameFrame(now){'),index.indexOf('// 成功した描画処理の回数。')),c);
 h.api.begin(h.api.world.exits[0]);h.api.update(2.8);
 assert.equal(c.shouldDrawGameFrame(0),true);
 h.api.update(.5);const v=c.mission.extraction,x=v.carX;
 assert.ok(x>v.stopX&&x<v.endX);assert.equal(v.phase,'departing');assert.equal(c.shouldDrawGameFrame(500),true);
 assert.equal(h.api.camera().x,v.camX);assert.equal(h.api.camera().y,v.camY);
 h.api.update(1.3);assert.equal(v.phase,'departed');assert.ok(v.carX-64>v.camX+c.W);
 assert.equal(c.shouldDrawGameFrame(1800),true,'final frame clears the departing jeep');
 assert.equal(c.shouldDrawGameFrame(1900),false,'success background stops redrawing');
 h.api.update(10);assert.equal(v.carX,v.endX);assert.equal(c.state,'succeeded');
 const early=harness();early.api.begin(early.api.world.exits[0]);early.api.update(2.8);early.api.update(.2);
 early.c.state='win';const before=early.c.mission.extraction.carX;early.api.update(10);
 assert.equal(early.c.mission.extraction.carX,before);assert.equal(early.c.state,'win');
});
