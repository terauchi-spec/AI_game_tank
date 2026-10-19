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
    mission:updateInfiltrationMission,draw:drawInfiltrationExtraction,sprite:infiltrationJeepSprite};`,c);
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
