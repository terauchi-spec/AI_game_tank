const test=require('node:test');
const assert=require('node:assert/strict');
const {indoorGenerateFloor,indoorAt,indoorRect}=require('../js/infiltration-world.js');
const random=seed=>{let state=seed>>>0;return()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;}};
function canReachAll(f,offset){
 const blocks=[...f.walls,...f.furniture].map(r=>indoorRect(r,offset));
 const hit=(x,y)=>blocks.some(r=>{
  const px=Math.max(r.x,Math.min(x,r.x+r.w)),py=Math.max(r.y,Math.min(y,r.y+r.h));
  return (x-px)**2+(y-py)**2<14**2;
 });
 const step=12,width=80,spawn=indoorAt(f.exit.x,f.exit.y-38,offset);
 const x0=Math.round(spawn.x/step),y0=Math.round((spawn.y-offset)/step);
 const q=[[x0,y0]],seen=new Set([y0*width+x0]);let at=0;
 while(at<q.length){
  const [x,y]=q[at++];
  for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
   const xx=x+dx,yy=y+dy,key=yy*width+xx;
   if(xx<0||xx>=width||yy<0||yy>117||seen.has(key)||hit(xx*step,yy*step+offset))continue;
   seen.add(key);q.push([xx,yy]);
  }
 }
 for(const point of [...f.intel,f.stair]){
  const p=indoorAt(point.x,point.y,offset),x=Math.round(p.x/step),y=Math.round((p.y-offset)/step);
  assert.ok([[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0]].some(([dx,dy])=>seen.has((y+dy)*width+x+dx)),
    'unreachable room or stairs');
 }
}
test('two floors keep ten rooms and three scattered pieces of information each',()=>{
 for(let seed=1;seed<=70;seed++){
  const rng=random(seed);
  for(let n=1;n<=2;n++){
   const f=indoorGenerateFloor(n,rng);
   assert.equal(f.rooms.length,10);
   assert.equal(f.guards.length,4);
   assert.equal(f.intel.length,3);
   assert.equal(new Set(f.intel.map(q=>q.room)).size,3);
   canReachAll(f,[9300,5900][n-1]);
  }
 }
});
test('the indoor generator returns different geometry between runs',()=>{
 const a=indoorGenerateFloor(1,random(1)),b=indoorGenerateFloor(1,random(2));
 assert.notDeepEqual(a.rooms,b.rooms);
});
