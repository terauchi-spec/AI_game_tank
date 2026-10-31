const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 const c={stageMode:'base',now:1000,p:{x:20,y:0},partner:{x:10,y:0,down:false},allies:[{x:5,y:0,id:1,alive:true}],decoy:{x:200,y:0,t:5},o:{x:0,y:0,st:1,target:'p'},area:null,tankArea:null,calls:0,visible:new Set(['p','partner','ally:1'])};
 c.performance={now:()=>c.now};c.D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);c.indoorStairProtected=()=>false;
 c.frontlineEnemyAreaTarget=()=>c.area;c.frontlineTankAreaTarget=()=>c.tankArea;
 c.canDetect=(o,t,f,key)=>{c.calls++;return c.visible.has(key);};c.enterTankFound=(o,key)=>{o.target=key;};
 vm.createContext(c);const a=html.indexOf('function findDetectedTarget(o,face){');vm.runInContext(html.slice(a,html.indexOf('const MAX_PARTS=',a)),c);
 const b=html.indexOf('const areaTarget=frontlineTankAreaTarget(e);'),end=html.indexOf('let tg=targetObj(e.target)',b);
 vm.runInContext('function tankSelection(e,silentDrill=false){'+html.slice(b,end)+'return detected;}',c);
 c.lookup=()=>c.findDetectedTarget(c.o,0);return c;
}
test('an audible decoy outranks a closer player, partner and allied soldier without extra vision tests',()=>{
 const c=harness();assert.equal(c.lookup().key,'decoy');assert.equal(c.calls,0);assert.equal(c.o._detectCache.obj,c.decoy);
});
test('an audible decoy outranks capture-area forced targets for infantry and tanks',()=>{
 for(const tank of [false,true]){
  const c=harness();c.stageMode='front';c.area={key:'p',obj:c.p,d:20};c.tankArea={key:'ally:1',obj:c.allies[0],d:5};
  const result=tank?c.tankSelection(c.o):c.lookup();assert.equal(result.key,'decoy');
  if(tank)assert.equal(c.o.target,'decoy');
 }
});
test('new placement, replacement and expiry invalidate stale choices immediately; unchanged lures reuse the cache',()=>{
 const c=harness();c.decoy=null;assert.equal(c.lookup().key,'ally:1');
 c.decoy={x:200,y:0,t:5};assert.equal(c.lookup().key,'decoy');const calls=c.calls;
 for(let i=0;i<20;i++)assert.equal(c.lookup().key,'decoy');assert.equal(c.calls,calls);
 const replacement=c.decoy={x:250,y:0,t:5};assert.equal(c.lookup().obj,replacement);
 c.decoy.t=0;assert.equal(c.lookup().key,'ally:1');
});
test('out-of-range or cross-floor decoys cannot suppress normal targets; visual detection beyond hearing range still works',()=>{
 for(const crossFloor of [false,true]){
  const c=harness();
  if(crossFloor){c.stageMode='indoor';c.o.indoorGuard=true;c.o.indoorFloor=1;c.decoy.indoorFloor=2;}
  else c.decoy.x=501;
  assert.equal(c.lookup().key,'ally:1');
 }
 const c=harness();c.decoy.x=501;c.visible.add('decoy');assert.equal(c.lookup().key,'decoy');
});
test('without an eligible decoy, capture alarms retain tank priority and ordinary allies retain nearest-target selection',()=>{
 const c=harness();c.decoy=null;c.tankArea={key:'ally:1',obj:c.allies[0],d:5};assert.equal(c.tankSelection(c.o).key,'ally:1');
 c.o._nextDetectAt=0;c.area={key:'p',obj:c.p,d:20};assert.equal(c.lookup().key,'p');
 c.o._nextDetectAt=0;c.area=null;assert.equal(c.lookup().key,'ally:1');
});
test('conversation hearing distance and burn-stun restrictions remain intact',()=>{
 const c=harness();c.o.chatT=1;c.decoy.x=251;assert.equal(c.lookup().key,'ally:1');
 c.o._nextDetectAt=0;c.decoy.x=249;assert.equal(c.lookup().key,'decoy');
 c.o.burnSuspicionHold=1;assert.equal(c.lookup(),null);
});

test('the actual combat update switches pursuing infantry and a tank away from stale player targets to a newly placed decoy',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs'),h=createGameEngine(path.join(__dirname,'..'),{seed:17});
 h.run("stageMode='base';reset(false);p.x=500;p.y=5000;reviewHuman=humans.find(h=>!h.commander&&!h.hq);reviewTank=etanks.find(e=>e.alive);humans=[reviewHuman];etanks=[reviewTank];allies=[];partner=null;enemyDogs=[];covers=[];objects=[];water=[];mud=[];bushes=[];rebuildSpatialGrid();decoy={x:600,y:5100,t:5,face:0,sound:1};Object.assign(reviewHuman,{x:300,y:5000,st:1,target:'p',lastAiMode:'found',modePause:0,foundPause:.5,_detectCache:{key:'p',obj:p},_nextDetectAt:99999});Object.assign(reviewTank,{x:200,y:5000,st:1,target:'p',lastAiMode:'found',modePause:0,foundPause:0,_detectCache:{key:'p',obj:p},_nextDetectAt:99999});update(.016);");
 assert.equal(h.run('reviewHuman.target'),'decoy');assert.equal(h.run('reviewTank.target'),'decoy');assert.equal(h.run('scoreStats.decoyLures'),2);assert.ok(h.run('Math.abs(reviewHuman.face-Math.atan2(decoy.y-reviewHuman.y,decoy.x-reviewHuman.x))')<1e-6);assert.ok(h.run('decoy.t')<5);
});
