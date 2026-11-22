const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
const root=path.join(__dirname,'..');
const expected=[
 ['t34',.9,382.5,427.5,.95,288,1,1],
 ['tiger',1.8,225,202.5,1.3,318,2,2],
 ['type10',1.25,405,450,.85,324,2,2],
 ['m1',1.65,337.5,315,1.2,330,2,2],
 ['sherman',1.05,360,382.5,1,306,1,1],
 ['churchill',1.95,180,157.5,1.6,294,2,2],
 ['kingtiger',2.1,202.5,180,1.5,312,2,2]
];
function start(){
 const h=createGameEngine(root,{touch:true,seed:17});
 h.run(`stageMode='beginner';reset(false);state='play';
  covers=[];objects=[];humans=[];etanks=[];cars=[];water=[];mud=[];bushes=[];allies=[];roadTruckEvents=[];
  mission=null;partner=null;hound=null;bullets=[];bombs=[];waves=[];parts=[];rebuildSpatialGrid();touchTurretAngle=.7;`);
 return h;
}
test('seven model roles have explicit steering, pivot, crushing, armor and machine-gun range settings',()=>{
 const h=start();
 const actual=h.run('TYPES.map(t=>[t.id,t.armor,t.turnRate,t.pivotRate,t.ramSpeed,t.vrng])');
 assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected.map(row=>row.slice(0,6)));
});
test('real enemy shell and blue commander rocket collisions destroy each model on its intended hit',()=>{
 const h=start();
 h.c.expectedTankHits=expected.map(row=>[row[0],row[6],row[7]]);
 const result=h.run(`(()=>{
  const results=[];wreck=()=>{p.tank.testWrecked=true;};
  for(const [id,shells,rockets] of expectedTankHits)for(const rocket of [false,true]){
   const t=TYPES.find(t=>t.id===id);p.x=480;p.y=5000;p.body=0;p.ang=.7;camX=0;cam=p.y-H/2;
   p.tank={kind:'tank',t,f:t.fmax,ch:0,c:t.cmax,v:t.vmax};
   const limit=rocket?rockets:shells,damage=1.1;
   for(let hit=1;hit<=limit;hit++){
    bullets=[{x:450,y:5000,sx:420,sy:5000,vx:120,vy:0,life:2,from:'e',k:'c',commanderRocket:rocket}];
    update(.05);
    if(Math.abs(p.tank.ch-hit*damage)>1e-8||!!p.tank.testWrecked!==(hit===limit)||bullets.length)return {id,rocket,hit,ch:p.tank.ch,wrecked:p.tank.testWrecked};
   }
   results.push([id,rocket,limit]);
  }
  return results;
 })()`);
 assert.ok(Array.isArray(result),JSON.stringify(result));assert.equal(result.length,14);
});
test('actual player machine-gun shots use the model range and retain ammunition/reload rules',()=>{
 const h=start();
 const actual=h.run(`(()=>{
  const results=[];
  for(const t of TYPES){
   p.x=480;p.y=5000;p.body=0;p.ang=.7;p.tank={kind:'tank',t,f:t.fmax,ch:0,c:t.cmax,v:t.vmax};
   p.vc=0;bullets=[];keys.KeyS=true;update(.01);keys.KeyS=false;
   const b=bullets.find(b=>b.from==='p'&&b.k==='v');
   results.push([t.id,b?b.life*468+Math.hypot(b.x-b.sx,b.y-b.sy):null,p.tank.v,p.vc]);
  }
  return results;
 })()`);
 for(const [i,row] of actual.entries()){
  assert.ok(Math.abs(row[1]-expected[i][5])<1e-8,JSON.stringify(row));
  const type=h.run('TYPES['+i+']');assert.equal(row[2],type.vmax-1);assert.ok(Math.abs(row[3]-type.vcd)<1e-8);
 }
});
test('contact destruction changes the actual area removed, including sustained contact and maze walls',()=>{
 const h=start();
 h.c.ids=expected.map(row=>row[0]);
 const results=h.run(`(()=>{
  const results={};
  for(const mazeWall of [false,true]){
   for(const id of ids){
    const t=TYPES.find(t=>t.id===id);p.x=500;p.y=5000;p.tank={kind:'tank',t,f:t.fmax};
    // A large blocker lets every model build pressure for the same duration.
    covers=[{kd:1,x:526,y:4940,w:300,h:120,mazeWall}];objects=[];parts=[];rebuildSpatialGrid();
    let removed=0;const original=carve;carve=(...args)=>{const area=original(...args);removed+=area;return area;};
    for(let frame=0;frame<60;frame++)playerMove(3,0,28,1/60);
    carve=original;results[(mazeWall?'maze:':'normal:')+id]=removed;
   }
  }
  return results;
 })()`);
 for(const prefix of ['normal:','maze:']){
  assert.ok(results[prefix+'churchill']>results[prefix+'t34'],JSON.stringify(results));
  assert.ok(results[prefix+'kingtiger']>results[prefix+'type10'],JSON.stringify(results));
  assert.ok(results[prefix+'tiger']>results[prefix+'sherman'],JSON.stringify(results));
 }
});

test('bazooka rebalance preserves armored car, fighter and infantry blast damage',()=>{
 const h=start();
 assert.equal(h.run(`(()=>{
  p.x=480;p.y=5000;p.dig=0;
  p.tank={kind:'tank',t:ARMORED_TYPE,f:100,ch:0};commanderRocketBlast(480,5000);
  if(Math.abs(p.tank.ch-.55)>1e-9)return false;
  p.tank={kind:'fighter',t:FIGHTER_TYPE,f:100,hp:8};commanderRocketBlast(480,5000);
  if(Math.abs(p.tank.hp-6.5)>1e-9)return false;
  p.tank=null;p.hp=3;commanderRocketBlast(480,5000);
  return p.hp===2;
 })()`),true);
});
