const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 const c={Math,performance:{now:()=>0},TANK_HIT:28,mazeComparisonEnemyFrozen:()=>false,mv(o,dx,dy){o.x+=dx;o.y+=dy;}};vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('function turnEnemyTankBody('),html.indexOf('// Main gun follows')),c);
 vm.runInContext(html.slice(html.indexOf('function movePatrolReturn('),html.indexOf('function distributeFlankPatrols(')),c);
 return c;
}
test('opposite directions pivot without translating, then resume at the original speed at every frame rate',()=>{
 for(const dt of [1/30,1/60,1/120])for(const start of [0,Math.PI/2,-Math.PI/2,Math.PI]){
  const c=harness(),e={x:500,y:500,body:start,ang:.7},desired=start+Math.PI;
  for(let i=0;i<Math.round(2/dt)-1;i++){c.moveEnemyTank(e,desired,55,dt);assert.equal(e.x,500);assert.equal(e.y,500);}
  assert.ok(Math.abs(e.body-(start+Math.PI))>0);
  c.moveEnemyTank(e,desired,55,dt);assert.ok(Math.abs(Math.atan2(Math.sin(desired-e.body),Math.cos(desired-e.body)))<1e-8);
  assert.ok(Math.abs(Math.hypot(e.x-500,e.y-500)-55*dt)<1e-8);assert.equal(e.ang,.7);
 }
});
test('hull takes the short turn across the angle boundary and handles a changed destination mid-pivot',()=>{
 const c=harness(),e={x:100,y:100,body:Math.PI-.05};c.moveEnemyTank(e,-Math.PI+.05,40,.1);
 assert.ok(Math.abs(e.body-(Math.PI+.05))<1e-9);assert.ok(e.x<100);
 const p={x:100,y:100,body:0};c.moveEnemyTank(p,Math.PI,40,.1);assert.equal(p.x,100);
 const before=p.body;c.moveEnemyTank(p,-Math.PI/2,40,.1);assert.ok(p.body<before);assert.equal(p.y,100);
});
test('patrol retains the two-second endpoint stop, pivots without accumulating stuck time, then moves back',()=>{
 const c=harness(),e={x:500,y:500,body:0,path:[{x:300,y:500},{x:500,y:500}],wi:1,dir:1,stk:0};
 c.patrol(e,.1,20,28,c.turnEnemyTankBody);assert.equal(e.turnPause,2);
 for(let i=0;i<20;i++)c.patrol(e,.1,20,28,c.turnEnemyTankBody);
 assert.equal(e.wi,0);assert.equal(e.x,500);assert.equal(e.body,0);
 for(let i=0;i<19;i++){c.patrol(e,.1,20,28,c.turnEnemyTankBody);assert.equal(e.x,500);assert.equal(e.stk,0);}
 c.patrol(e,.1,20,28,c.turnEnemyTankBody);assert.ok(e.x<500);assert.ok(Math.abs(e.body-Math.PI)<1e-9);
 const infantry={x:500,y:500,path:[{x:300,y:500},{x:500,y:500}],wi:0,dir:1,stk:0};
 c.patrol(infantry,.1,30,8);assert.equal(infantry.x,497);
});
test('combat pursuit and close-range withdrawal both rotate before moving through the real update loop',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs');
 for(const [distance,body] of [[300,Math.PI],[80,0]]){
  const h=createGameEngine(path.join(__dirname,'..'),{seed:7});
  h.run("stageMode='beginner';reset(false);covers=[];objects=[];water=[];bridges=[];mud=[];bushes=[];cars=[];humans=[];bullets=[];bombs=[];allies=[];hound=null;partner=null;p.x="+(500+distance)+";p.y=1000;p.tank=null;etanks=[{x:500,y:1000,body:"+body+",ang:0,alive:true,st:1,target:'p',lost:99,cc:99,vc:99,foundPause:0,path:[],static:false}];rebuildSpatialGrid();update(.1)");
  const e=h.run('etanks[0]');assert.equal(e.x,500);assert.equal(e.y,1000);assert.ok(Math.abs(e.body-body)>0&&Math.abs(e.body-body)<.2);
 }
});
