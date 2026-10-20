const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),indoor=fs.readFileSync(path.join(root,'js/infiltration-world.js'),'utf8'),companion=fs.readFileSync(path.join(root,'js/partner.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness(vertical=false){
 let fallback=0;const messages=[],hit=(x,y,r,c)=>!c.noHit&&x+r>c.x&&x-r<c.x+c.w&&y+r>c.y&&y-r<c.y+c.h;
 const partner={x:400,y:vertical?400:450,face:0,hp:3,down:false,stunT:0,off:0,route:null,modeT:0,planT:0,shotCd:0};
 const c={module:{exports:{}},stageMode:'indoor',state:'play',skill:'partner',WW:960,WH:14000,W:840,H:720,
  p:{x:200,y:400,body:0},partner,allies:[],hound:null,humans:[],etanks:[],cars:[],objects:[],covers:[],mission:null,
  keys:{},D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),R:()=>.5,say:t=>messages.push(t),
  nearbyCovers:()=>c.covers,nearbyObjects:()=>c.objects,circleHitsCover:hit,circleHitsObject:hit,circleHitsBase:()=>false,
  inWaterAt:()=>false,mazeComparisonEnemyFrozen:()=>false,terrainMoveScale:()=>1,
  enemyTankObjectBlocked:()=>false,tankBlocked:()=>false,enemyUnitBlocked:()=>false,frontlineMovementTop:()=>0,
  moveAllySmart:()=>fallback++,burst(){},inBush:()=>false};
 c.hitsC=(x,y,r)=>c.covers.some(q=>hit(x,y,r,q))||c.objects.some(q=>hit(x,y,r,q));
 vm.createContext(c);vm.runInContext(indoor+'\n'+companion,c);
 const a=html.indexOf('function mv(o,'),b=html.indexOf('\nlet lastEnemySeparationAt=',a);vm.runInContext(html.slice(a,b),c);
 vm.runInContext(`door={x:${vertical?450:400},y:${vertical?400:500},vertical:${vertical},open:0};door.cover={...indoorDoorCollisionRect(door),indoorDoor:true};covers.push(door.cover);
  indoorWorld={currentFloor:0,floors:[{number:1,footprint:{x:30,y:100,w:900,h:2000},doors:[door],guards:[]}]};
  api={start:startPartnerOrder,draw:updatePartnerOrder,finish:finishPartnerOrder,update:updatePartner,doors:updateInfiltrationDoors,order:partnerOrder,door,world:indoorWorld};`,c);
 return{c,api:c.api,messages,get fallback(){return fallback;}};
}
test('drawn infiltration routes pass closed automatic doors without opening them, then the partner opens and crosses both orientations',()=>{
 for(const vertical of [false,true]){
  const h=harness(vertical),c=h.c,a=h.api;c.keys[vertical?'ArrowRight':'ArrowDown']=true;
  a.start();a.draw(.2);for(let i=0;i<6;i++)a.draw(.1);
  assert.equal(a.order.blocked,false);assert.ok(a.order.path.length>2);
  assert.equal(a.door.open,0);assert.ok(!a.door.cover.noHit,'planning does not remotely open the door');
  const end={...a.order.path[a.order.path.length-1]};a.finish();let opened=false;
  for(let i=0;i<180&&c.partner.route;i++){
   a.doors(1/60);if(a.door.cover.noHit)opened=true;a.update(1/60);
   assert.ok(!c.hitsC(c.partner.x,c.partner.y,8),'actual movement never clips through a closed collider');
  }
  assert.equal(c.partner.route,null);assert.ok(opened);assert.ok(c.D(c.partner,end)<16);
  assert.equal(h.fallback,0,'a closed automatic panel never triggers perimeter-following');
  assert.ok(h.messages.includes('相棒が指定ルートを完了！'));
 }
});
test('route planning still blocks masonry, furniture, explosive objects and upper-floor void',()=>{
 for(const kind of ['wall','furniture','object','void']){
  const h=harness(),c=h.c,a=h.api;c.keys.ArrowDown=true;
  const blocker={x:390,y:470,w:20,h:10};
  if(kind==='object')c.objects.push(blocker);
  else if(kind==='void'){
   a.world.currentFloor=1;a.world.floors.push({number:2,footprint:{x:30,y:100,w:900,h:365},doors:[],guards:[]});
  }else c.covers.push({...blocker,indoorProp:kind==='furniture'});
  a.start();a.draw(.2);assert.equal(a.order.blocked,true,kind);assert.equal(a.order.path.length,1);
  assert.equal(a.order.cursor.y,450,'blocked route resets to its start');
 }
});
test('outdoor route planning keeps the existing collision rule',()=>{
 for(const mode of ['base','front']){
  const h=harness(),c=h.c,a=h.api;c.stageMode=mode;c.keys.ArrowDown=true;
  c.covers.push({x:390,y:470,w:20,h:10});a.start();a.draw(.2);
  assert.equal(a.order.blocked,true);assert.equal(a.order.path.length,1);
  c.partner.route=[{x:450,y:450}];c.indoorPartnerRouteBlocked=()=>{throw Error('outdoor movement must not use indoor planning');};
  c.partnerCompanionMove(c.partner,c.partner.route[0],155,.1);assert.equal(h.fallback,1,'outdoor companions keep their original movement');
 }
});
test('a solo partner stays at unfinished documents, while a new route or recall takes priority',()=>{
 const h=harness(),c=h.c,a=h.api,start={x:c.partner.x,y:c.partner.y};
 c.mission={points:[{...start,floor:1,done:false}]};
 for(let i=0;i<80;i++)a.update(.1);
 assert.equal(c.partner.x,start.x);assert.equal(c.partner.y,start.y);assert.equal(h.fallback,0);
 Object.assign(c.partner,{route:[{x:start.x+40,y:start.y}],routeIndex:0,routeStart:start,routePointT:0,routeStuckT:0});
 a.update(.1);assert.ok(c.partner.x>start.x,'new explicit route overrides collection');
 c.partner.route=null;c.partner.backup=true;a.update(.1);assert.equal(h.fallback,1,'recall overrides collection');
});
