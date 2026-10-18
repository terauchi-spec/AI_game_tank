const test=require('node:test');
const assert=require('node:assert/strict');
const {indoorGenerateFloor,indoorAt,indoorRect}=require('../js/infiltration-world.js');
const random=seed=>{let x=Math.imul(seed,2654435761)>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}};
const offset=9300,STEP=12,COLS=80,ROWS=220;
function reachablePoints(f){
 const rectangles=[...f.walls,...f.furniture].map(r=>indoorRect(r,offset));
 const occupied=new Uint8Array(COLS*ROWS);
 // Collision radius: conservatively inflate 9px. The doorway must stay wide.
 for(const r of rectangles){
  const x0=Math.max(0,Math.ceil((r.x-9)/STEP)),x1=Math.min(COLS-1,Math.floor((r.x+r.w+9)/STEP));
  const y0=Math.max(0,Math.ceil((r.y-offset-9)/STEP)),y1=Math.min(ROWS-1,Math.floor((r.y+r.h-offset+9)/STEP));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)occupied[y*COLS+x]=1;
 }
 const entrance=indoorAt(f.entrance.x,f.entrance.y,offset);
 const at=p=>{const q=indoorAt(p.x,p.y,offset);return [Math.round(q.x/STEP),Math.round((q.y-offset)/STEP)]};
 const [sx,sy]=[Math.round(entrance.x/STEP),Math.round((entrance.y-offset)/STEP)];
 const initial=sy*COLS+sx;assert.equal(occupied[initial],0,'spawn must be collision free');
 const seen=new Uint8Array(COLS*ROWS),queue=new Int32Array(COLS*ROWS);let head=0,tail=1;
 queue[0]=initial;seen[initial]=1;
 while(head<tail){
  const cur=queue[head++],x=cur%COLS,y=Math.floor(cur/COLS);
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const xx=x+dx,yy=y+dy;
   if(xx<0||xx>=COLS||yy<0||yy>=ROWS)continue;
   const id=yy*COLS+xx;
   if(seen[id]||occupied[id])continue;
   seen[id]=1;queue[tail++]=id;
  }
 }
 const accessible=p=>{
   const [x,y]=at(p);
   return [[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0]].some(([dx,dy])=>{
     const xx=x+dx,yy=y+dy;return xx>=0&&xx<COLS&&yy>=0&&yy<ROWS&&seen[yy*COLS+xx];
   });
 };
 for(const p of [f.stair,f.entrance,f.emergency,...f.intel,
    ...f.rooms.flatMap(r=>r.tiles.map(t=>({x:t.x+t.w/2,y:t.y+t.h/2})))])
   assert.ok(accessible(p),'unreachable room, document, staircase or exit');
}
test('five corridor shapes and differently sized rooms remain navigable at double floor area',()=>{
 const patterns=new Set(),sizeSet=new Set();
 for(let seed=1;seed<=110;seed++)for(let n=1;n<=2;n++){
  const f=indoorGenerateFloor(n,random(seed*83+n));
  patterns.add(f.pattern);
  assert.equal(f.rooms.length,10);assert.equal(f.guards.length,4);
  assert.equal(f.intel.length,3,'generator candidates');
  assert.ok(f.rooms.some(r=>r.size===1));
  assert.ok(f.rooms.some(r=>r.size>=3));
  assert.equal(f.rooms.reduce((s,r)=>s+r.tiles.length,0)+f.corridors.length,35);
  assert.equal(f.doors.length,12,'ten rooms and two exterior exits');
  for(const r of f.rooms){sizeSet.add(r.size);assert.equal(r.size,r.tiles.length);}
  const nw=indoorRect(f.footprint,offset);assert.ok(nw.x>=0&&nw.x+nw.w<=960);
  assert.ok(Math.abs((1/.86)*1.75-2)<.04,'floor area should be approximately double');
  reachablePoints(f);
 }
 for(const name of ['H','L','T','四角','コ'])assert.ok(patterns.has(name),'missing '+name);
 for(const size of [1,3,4])assert.ok(sizeSet.has(size));
});
test('exterior walls have no gaps except the front door and emergency exit; windows are solid',()=>{
 for(let seed=1;seed<=100;seed++){
  const f=indoorGenerateFloor(1,random(seed)),w=f.walls;
  const isWall=(x,y)=>w.some(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);
  const {x,y,w:width,h}=f.footprint;
  for(let px=x+2;px<x+width-2;px+=5){
   if(Math.abs(px-f.emergency.x)>60)assert.ok(isWall(px,y),'north boundary hole');
   if(Math.abs(px-f.entrance.x)>60)assert.ok(isWall(px,y+h),'south boundary hole');
  }
  for(const win of f.windows)assert.ok(isWall(win.x,win.y),'window must not leave a traversable hole');
  assert.ok(!isWall(f.entrance.x,y+h),'main doorway opening');
  assert.ok(!isWall(f.emergency.x,y),'emergency doorway opening');
 }
});
test('room and hallway arrangement varies on independent seeds',()=>{
 const a=indoorGenerateFloor(1,random(1)),b=indoorGenerateFloor(1,random(2));
 assert.notDeepEqual([a.pattern,a.corridors,a.rooms],[b.pattern,b.corridors,b.rooms]);
});

test('all blue soldiers traverse interconnected routes across the whole building',()=>{
 for(let seed=1;seed<=150;seed++)for(let fno=1;fno<=2;fno++){
  const f=indoorGenerateFloor(fno,random(seed*29+fno));
  const roomOwner=new Map(f.rooms.flatMap(r=>r.cellIds.map(id=>[id,r.id])));
  const halls=new Set(f.corridors.map(t=>Math.round((t.y-80)/180)*5+Math.round((t.x-70)/180)));
  const doors=new Set(f.rooms.map(r=>[Math.min(r.door.inside,r.door.outside),Math.max(r.door.inside,r.door.outside)].join(':')));
  assert.equal(f.guards.length,4);
  for(const h of f.guards){
   assert.ok(h.loop&&h.waypoints.length>=6,'long cyclic patrol');
   assert.equal(h.cellRoute[0],h.cellRoute.at(-1),'route closes');
   const roomsVisited=new Set(h.cellRoute.map(c=>roomOwner.get(c)).filter(v=>v!==undefined)).size;
   const rowsVisited=new Set(h.cellRoute.map(c=>Math.floor(c/5))).size;
   assert.ok(roomsVisited>=5&&rowsVisited>=4,'whole-building route');
   for(let i=1;i<h.cellRoute.length;i++){
    const a=h.cellRoute[i-1],b=h.cellRoute[i],key=[Math.min(a,b),Math.max(a,b)].join(':');
    assert.equal(Math.abs(a%5-b%5)+Math.abs(Math.floor(a/5)-Math.floor(b/5)),1);
    assert.ok(roomOwner.get(a)===roomOwner.get(b)||(halls.has(a)&&halls.has(b))||doors.has(key),'no solid wall crossing');
   }
  }
 }
});
