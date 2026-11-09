const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const reference=require('./helpers/combat-performance-reference.cjs');
const {createGameEngine}=require('./helpers/game-engine.cjs');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const separation=html.slice(html.indexOf('function separateEnemyUnits('),html.indexOf('function separateFootPlayerEnemyTanks('));
function random(seed){return()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);}
function separate(code,data,blocked=false){
 const c={humans:structuredClone(data.humans),etanks:structuredClone(data.etanks),TANK_HIT:28,WW:960,WH:12800,lastEnemySeparationAt:-1e9,performance:{now:()=>1000},mazeComparisonEnemyFrozen:o=>!!o.frozen,hitsC:(x,y)=>blocked&&x>470&&x<490&&y>400&&y<700};
 vm.createContext(c);vm.runInContext(code+';separateEnemyUnits(true);',c);
 return JSON.stringify([c.humans,c.etanks]);
}
test('nearby separation exactly matches the original three passes, ordered pushes and blocked moves',()=>{
 for(let seed=1;seed<=240;seed++){
  const R=random(seed),dense=seed%3===0,n=[0,1,16,31,32,48,80,160][seed%8];
  const unit=i=>({x:seed%11===0?480:30+R()*(dense?100:900),y:seed%11===0?500:30+R()*(dense?100:12000),alive:i%13!==0,static:i%7===0,areaDebugStatic:i%17===0,modeFrozen:i%19===0,gunTower:i%23===0,frozen:i%29===0});
  const data={humans:Array.from({length:n},(_,i)=>unit(i)),etanks:Array.from({length:seed%9},(_,i)=>unit(i+1))};
  // Keep the grid active while a local crowd pushes across cell boundaries.
  if(n>=80&&!dense)for(let i=0;i<18;i++)Object.assign(data.humans[i],{x:190+(i%6)*5,y:475+Math.floor(i/6)*5,alive:true});
  assert.equal(separate(separation,data,seed%2===0),separate(reference.separation,data,seed%2===0),'seed '+seed);
 }
});
test('separation still honors the 100ms throttle',()=>{
 const c={performance:{now:()=>1050},lastEnemySeparationAt:1000};vm.createContext(c);
 vm.runInContext(separation+';separateEnemyUnits();',c);assert.equal(c.lastEnemySeparationAt,1000);
});
test('spread-out large groups skip distant pairs while small squads retain the direct path',()=>{
 function count(code,n){
  const c={pairs:0,humans:Array.from({length:n},(_,i)=>({x:100+i%8*100,y:100+Math.floor(i/8)*300,alive:true})),etanks:[],TANK_HIT:28,WW:960,WH:12800,lastEnemySeparationAt:0,performance:{now:()=>1000},mazeComparisonEnemyFrozen:()=>false,hitsC:()=>false};
  vm.createContext(c);vm.runInContext(code.replace('const a=u[i],b=u[j]','pairs++;const a=u[i],b=u[j]')+';separateEnemyUnits(true);',c);return c.pairs;
 }
 assert.equal(count(separation,16),count(reference.separation,16));
 assert.ok(count(separation,80)<count(reference.separation,80)/5);
});
test('gatling preserves swept impacts, hit priority and combat results against the original',()=>{
 const current=createGameEngine(root),original=createGameEngine(root);original.run(reference.gatling);
 for(let seed=1;seed<=180;seed++){
  const R=random(seed),human=()=>({x:120+R()*700,y:380+R()*40,alive:true,stun:0});
  const data={humans:Array.from({length:seed%49},human),covers:seed%3?[{x:250,y:380,w:35,h:60,kd:1}]:[],objects:seed%4?[{x:450,y:380,w:40,h:40,kind:'crate'}]:[]};
  if(seed%7===0)data.humans.push({x:220,y:400,alive:true},{x:220,y:400,alive:true});
  const init=`stageMode='base';setupZones();state='play';skill='partner';p={x:700,y:400,hp:3,dig:0};allies=[{x:600,y:400,alive:true,chute:0}];partner={x:650,y:400,hp:3};hound=null;decoy=null;parts=[];covers=input.covers;objects=input.objects;bushes=[];humans=input.humans;etanks=[];cars=[];roadTruckEvents=[];bullets=[];fx=[];waves=[];water=[];bridges=[];mud=[];mission=null;base={x:850,y:50,w:50,h:50,hp:30,maxHp:30};scoreStats=newScoreStats();sfx=()=>{};burst=()=>{};noteEnemyFallHit=()=>{};rebuildSpatialGrid();b={x:800,y:400,vx:1000,vy:0,from:origin,k:'v',gatling:true};result=updateGatlingBullet(b,100,400,false);`;
  const snapshot='JSON.stringify({result,b,humans,allies,partner,p,covers,objects,scoreStats})';
  for(const h of [current,original]){h.c.input=structuredClone(data);h.c.origin=['p','ally','e'][seed%3];h.run(init);}
  assert.equal(current.run(snapshot),original.run(snapshot),'seed '+seed);
 }
});

test('jungle movement index preserves collision decisions while enemies cross bands and land from blasts',()=>{
 const h=createGameEngine(root,{seed:7});
 h.run("stageMode='escapeTest';reset(false);covers=[];objects=[];water=[];mud=[];rebuildSpatialGrid()");
 h.run(`{globalThis.comparisons=0;globalThis.indexedComparisons=0;
  const originalBlocked=(self,x,y,r)=>{
   if(!humans.includes(self)&&!etanks.includes(self))return false;
   for(const [units,limit] of [[humans,r+(self.frontMarch?20.5:18)],[etanks,r+TANK_HIT+8]]){
    for(const unit of units){
     const dx=unit.x-x,dy=unit.y-y;
     if(unit!==self&&unit.alive&&Math.abs(dx)<limit&&Math.abs(dy)<limit&&dx*dx+dy*dy<limit*limit)return true;
    }
   }
   return false;
  };
  const indexedBlocked=enemyUnitBlocked;
  enemyUnitBlocked=(...args)=>{
   comparisons++;
   if(enemyMoveIndex?.entries.has(args[0]))indexedComparisons++;
   const actual=indexedBlocked(...args),expected=originalBlocked(...args);
   if(actual!==expected)throw Error('Collision result changed');
   return actual;
  };
  const soldier=humans[0],tank=etanks[0];
  Object.assign(soldier,{x:480,y:5119,blastAirT:.4,blastAirDur:.4,blastDY:100});
  Object.assign(tank,{x:506,y:5150,body:Math.PI,ang:Math.PI,path:[{x:506,y:5150},{x:465,y:5150}],wi:1});
  for(let i=0;i<90;i++)update(1/60);}`);
 assert.ok(h.run('indexedComparisons')>1000);
 assert.ok(h.run('comparisons')>=h.run('indexedComparisons'));
 assert.equal(h.run('enemyMoveIndex'),null);
});
