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
 w.currentFloor=1;c.p.y=-100;h.api.clamp();assert.equal(c.p.y,upper.footprint.y-24+8);
 c.stageMode='base';c.p.y=-100;h.api.clamp();assert.equal(c.p.y,-100,'other stages retain their movement');
});

test('five-second extraction finalizes once, freezes gameplay, boards the player and departs before results',()=>{
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
 h.api.update(.5);assert.equal(pickup.boarded,true);
 h.api.update(1);assert.equal(pickup.phase,'depart');assert.equal(c.p.x,pickup.carX-8);
 assert.equal(h.api.camera().x,camera.x);assert.equal(h.api.camera().y,camera.y,'camera stays at pickup location');
 h.api.update(2);assert.equal(c.state,'win');assert.ok(pickup.carX-64>camera.x+c.W,'jeep has left the screen');
 assert.equal(h.completed,1);h.api.update(10);assert.equal(h.completed,1);
});

test('jeep raster is built once and reused throughout the cutscene, with no work after results',()=>{
 const h=harness(),exit=h.api.world.exits[0];h.api.begin(exit);
 for(let i=0;i<240;i++){h.api.update(.016);h.api.draw(0,0);}
 assert.equal(h.canvases,1);assert.equal(h.draws.length,240);
 assert.equal(h.draws[0][0],h.draws[239][0]);
 h.api.update(10);h.api.draw(0,0);assert.equal(h.draws.length,240);
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
