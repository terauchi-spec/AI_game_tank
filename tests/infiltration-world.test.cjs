const test=require('node:test');
const assert=require('node:assert/strict');
const {indoorGenerateFloor,indoorAt,indoorRect}=require('../js/infiltration-world.js');
const random=seed=>{let state=(Math.imul(seed,2654435761))>>>0;return()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;}};
function canReachAll(f,offset){
  const blocks=[...f.walls,...f.furniture].map(r=>indoorRect(r,offset));
  const hit=(x,y)=>blocks.some(r=>{
    const px=Math.max(r.x,Math.min(x,r.x+r.w)),py=Math.max(r.y,Math.min(y,r.y+r.h));
    return (x-px)**2+(y-py)**2<10**2;
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
  const reachable=point=>{
    const p=indoorAt(point.x,point.y,offset),x=Math.round(p.x/step),y=Math.round((p.y-offset)/step);
    return [[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0]]
      .some(([dx,dy])=>seen.has((y+dy)*width+x+dx));
  };
  for(const point of [f.stair,...f.intel,...f.rooms.flatMap(room=>room.tiles.map(tile=>({x:tile.x+tile.w/2,y:tile.y+tile.h/2})))])
    assert.ok(reachable(point),'every room tile, intel file and stairs must be reachable');
}
test('five hallway patterns plus composite large and small rooms',()=>{
  const found=new Set(),sizes=new Set();
  for(let seed=1;seed<=150;seed++)for(let n=1;n<=2;n++){
    const floor=indoorGenerateFloor(n,random(seed*83+n));
    found.add(floor.pattern);
    assert.equal(floor.rooms.length,10);
    assert.equal(floor.guards.length,4);
    assert.equal(floor.intel.length,3);
    assert.equal(new Set(floor.intel.map(x=>x.room)).size,3);
    assert.ok(floor.rooms.some(r=>r.size>=3),'at least one large connected room');
    assert.ok(floor.rooms.some(r=>r.size===1),'at least one small room');
    const cells=floor.rooms.flatMap(r=>r.tiles);
    assert.equal(cells.length+floor.corridors.length,35,'floor tiles cover the full footprint');
    for(const r of floor.rooms){assert.equal(r.size,r.tiles.length);sizes.add(r.size);}
    canReachAll(floor,[9300,5900][n-1]);
  }
  for(const pattern of ['H','L','T','四角','コ'])assert.ok(found.has(pattern),'missing pattern '+pattern);
  assert.ok(sizes.has(1)&&sizes.has(3)&&sizes.has(4),'small and merged rooms');
});
test('hallway shape and room layout vary between independent generations',()=>{
  const a=indoorGenerateFloor(1,random(1)),b=indoorGenerateFloor(1,random(2));
  assert.notDeepEqual([a.pattern,a.corridors,a.rooms],[b.pattern,b.corridors,b.rooms]);
});
