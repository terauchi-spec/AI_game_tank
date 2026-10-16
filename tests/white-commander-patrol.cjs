// Run: node tests/white-commander-patrol.cjs
// Heading regression checks; the browser smoke test covers real movement/collision.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function fn(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);const end=html.indexOf('\n}',start);assert(end>start,name);return html.slice(start,end+2);}
const c={Math,mazeComparisonEnemyFrozen:()=>false,findDetectedTarget:()=>null,targetObj:()=>null,enemyModePaused:()=>false,
 D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),commanderMove:(h,q,dt,sp)=>{const d=c.D(h,q),s=Math.min(d,sp*dt);if(d){h.x+=(q.x-h.x)*s/d;h.y+=(q.y-h.y)*s/d;}},patrol:()=>0};
vm.createContext(c);vm.runInContext(fn('patrolWhiteCommander')+'\n'+fn('updateCommanderAI'),c);
for(const fps of [30,60,120])for(const waypoints of [null,[],[{x:100,y:100}]]){
 const h={x:100,y:100,face:1.2,commander:'white',st:0,sus:0,path:waypoints,commanderScan:0};
 let min=Infinity,max=-Infinity;
 for(let i=0;i<fps*12;i++){c.updateCommanderAI(h,1/fps);min=Math.min(min,h.face);max=Math.max(max,h.face);assert(Math.abs(h.face-1.2)<=.800001,`stationary heading at ${fps}fps`);}
 assert(max-min>1.59,'still looks left and right');assert.equal(h.x,100);assert.equal(h.y,100);
}
const h={x:100,y:100,face:0,commander:'white',st:0,sus:0,path:[{x:100,y:100},{x:235,y:100}],wi:1,dir:1,commanderScan:0};
let reachedEnd=false,turnedBack=false;
for(let i=0;i<60*10;i++){c.updateCommanderAI(h,1/60);if(h.turnPause>0&&h.wi===1)reachedEnd=true;if(reachedEnd&&h.wi===0&&h.x<200)turnedBack=true;}
assert(reachedEnd&&turnedBack,'two-point patrol arrives, pauses and returns');
// If a route is removed while playing, use its last base heading, not a scan-offset face.
h.path=[];const base=h.whitePatrolFace;for(let i=0;i<300;i++){c.updateCommanderAI(h,1/60);assert(Math.abs(h.face-base)<=.800001);}
console.log('PASS stationary/missing routes at 30/60/120fps; bounded scan; route pause/return; removed route');
