const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {harness}=require('./infiltration-beginner.test.cjs');
const world=fs.readFileSync(require.resolve('../js/infiltration-world.js'),'utf8');
const dogs=fs.readFileSync(require.resolve('../js/enemy-dogs.js'),'utf8');
function setup(beginner=false,seed=1){
 const s=harness(beginner,seed,dogs+'\n'+world);
 s.c.skill='throw';
 vm.runInContext('dogApi={get list(){return enemyDogs},find:dogFindTarget,update:updateEnemyDogs,doors:updateInfiltrationDoors}',s.c);
 return s;
}
test('advanced has exactly one blue handler on a whole-building loop; beginner has none',()=>{
 for(let seed=1;seed<=24;seed++){
  const s=setup(false,seed),list=s.c.dogApi.list;
  assert.equal(list.length,1,'seed '+seed);const d=list[0],h=d.handler;
  assert.equal(h.indoorFloor,1);assert.equal(h.elite,false);assert.equal(h.indoorCommander,false);
  assert.ok(h.loop&&h.path.length>4&&!h.indoorEntrancePatrol&&!h.indoorPost);
  assert.ok(s.c.D(h,d)>=50&&s.c.D(h,d)<=150);
  assert.ok(Math.max(...h.path.map(q=>q.y))-Math.min(...h.path.map(q=>q.y))>1000,'wide loop');
  s.api.setup();assert.equal(s.c.dogApi.list.length,1,'new sortie resets pair');
  s.c.indoorBeginner=true;s.api.setup();assert.equal(s.c.dogApi.list.length,0);
 }
});
test('dog is never replenished; scent stays on its floor and respects stair sanctuary',()=>{
 const s=setup(),c=s.c,d=c.dogApi.list[0],h=d.handler;
 c.p={x:d.x,y:d.y};assert.equal(c.dogApi.find(d).key,'p');
 s.api.world.currentFloor=1;assert.equal(c.dogApi.find(d),null);
 s.api.world.currentFloor=0;s.api.world.stairSanctuary={floor:0,x:d.x-10,y:d.y-10,w:20,h:20};
 assert.equal(c.dogApi.find(d),null);
 h.alive=false;s.api.replenish(.3);
 assert.ok(!h.alive);assert.ok(c.humans.filter(h=>h.dogHandler).every(h=>h===d.handler));assert.equal(c.dogApi.list.length,1);
});
test('indoor dogs open automatic doors themselves',()=>{
 const s=setup(),c=s.c,d=c.dogApi.list[0],f=s.api.world.floors[0],door=f.doors.find(q=>!q.outer);
 Object.assign(d,{x:door.x,y:door.y});c.p={x:-1000,y:-1000};
 for(const h of c.humans)h.alive=false;
 c.dogApi.doors(.1);assert.equal(door.cover.noHit,true);
});
test('dog and handler travel through generated rooms with collisions and leash bounds',()=>{
 const s=setup(false,5),c=s.c,d=c.dogApi.list[0],h=d.handler,foot=s.api.world.floors[0].footprint;
 c.debugMode=2;c.skill='throw';c.performance={now:()=>1000};
 c.angD=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 c.mv=(o,dx,dy,r)=>{
  const valid=(x,y)=>x>foot.x+r&&x<foot.x+foot.w-r&&y>foot.y+r&&y<foot.y+foot.h-r&&
   !c.covers.some(q=>!q.noHit&&x+r>q.x&&x-r<q.x+q.w&&y+r>q.y&&y-r<q.y+q.h)&&
   (!o.dogHandler||vm.runInContext('dogHandlerStepAllowed',c)(o,x,y));
  if(valid(o.x+dx,o.y))o.x+=dx;if(valid(o.x,o.y+dy))o.y+=dy;
 };
 vm.runInContext('simMove=indoorMoveGuardTo',c);
 let x0=h.x,x1=h.x,y0=h.y,y1=h.y,index=h.wi,steps=0;const nav={};
 for(let i=0;i<18000;i++){
  c.dogApi.doors(1/30);c.simMove(h,h.path[index],1/30,30,nav);
  if(c.D(h,h.path[index])<12){index=(index+1)%h.path.length;steps++;}
  c.dogApi.update(1/30);
  x0=Math.min(x0,h.x);x1=Math.max(x1,h.x);y0=Math.min(y0,h.y);y1=Math.max(y1,h.y);
  assert.ok(c.D(d,h)<=151,'leash');
 }
 assert.ok(steps>=5,'cross several route waypoints');assert.ok(y1-y0>700&&x1-x0>200,'large patrol area');
});
