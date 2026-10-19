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
    protected:indoorStairProtected,protect:indoorBeginStairSanctuary,tick:indoorTickStairSanctuary,sees:indoorGuardSeesPlayer,record:indoorRecordGuardDiscovery};`,c);
 return{c,api:c.api,draws,get completed(){return completed;},get canvases(){return canvases;}};
}

test('one main EXIT remains with two automatic doors; emergency EXIT is farther away and inside the boundary',()=>{
 let optional=0;
 for(let seed=1;seed<=30;seed++){
  const h=harness(seed),f=h.api.world.floors[0];
  assert.equal(f.entrances.length,2);assert.equal(f.doors.filter(q=>q.kind==='main').length,2);
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

test('deployment EXIT and player start at the horizontal center at every generated layout',()=>{
 for(let seed=1;seed<=40;seed++)for(const width of [480,840]){
  const h=harness(seed,width);
  assert.equal(h.c.p.x,h.c.WW/2);assert.equal(h.api.world.exits[0].x,h.c.WW/2);
  assert.equal(h.c.p.x-h.api.camera().x,width/2);
 }
});

test('stair transition grants a bounded sanctuary and clears stale player discovery',()=>{
 const h=harness(),c=h.c,w=h.api.world,target=w.floors[1],guard=target.guards[0];
 Object.assign(c.p,w.floors[0].stair);guard.st=1;guard.target='p';guard.indoorAlert={phase:'found'};
 guard.indoorNotice={visible:true,exposure:1};guard._detectCache={key:'p',obj:c.p};guard._nextDetectAt=9999;
 h.api.mission(.01);
 assert.equal(w.currentFloor,1);assert.equal(h.api.protected(),true);assert.equal(w.stairSanctuary.remaining,3);
 assert.equal(guard.st,0);assert.equal(guard.target,null);assert.equal(guard.indoorNotice,null);assert.equal(guard._detectCache,null);
 assert.equal(h.api.sees(guard),false,'even a point-blank guard cannot see the landing player');
 guard.st=1;guard.target='p';h.api.record(guard);assert.equal(w.alarm.witnesses.size,0);
 h.api.tick(2.9);assert.equal(h.api.protected(),true);
 h.api.tick(.11);assert.equal(h.api.protected(),false);assert.equal(w.stairSanctuary,null);
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
