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
 for(const p of [f.stair,f.entrance,f.emergency,...f.intel])
   assert.ok(accessible(p),'unreachable document, staircase or exit');
 // 詰所テーブル・家具の真上は歩けないが、各部屋には歩けるスペースを残す。
 for(const room of f.rooms)for(const tile of room.tiles){
  const samples=[.23,.5,.77];
  assert.ok(samples.some(u=>samples.some(v=>accessible({
    x:tile.x+tile.w*u,y:tile.y+tile.h*v
  }))), 'room tile has no reachable walking space');
 }
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
  assert.ok(f.doors.length>=17&&f.doors.length<=20,'multiple doors plus two exterior exits');
  assert.ok(f.doors.filter(q=>q.kind==='room-room').length>=2,'direct room-to-room doors');
  assert.ok(f.rooms.filter(q=>q.doors.length>1).length>=2,'several rooms have two doors');
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
  const doors=new Set(f.doors.filter(d=>d.cells).map(d=>[Math.min(...d.cells),Math.max(...d.cells)].join(':')));
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

test('windows only on exterior walls, rooms furnished, corridors contain military cover',()=>{
 for(let seed=1;seed<=180;seed++)for(let floorNo=1;floorNo<=2;floorNo++){
   const f=indoorGenerateFloor(floorNo,random(seed*71+floorNo));
   const bounds=f.footprint;
   for(const w of f.windows){
     assert.equal(w.external,true,'windows are exterior-only');
     assert.ok(w.x===bounds.x||w.x===bounds.x+bounds.w||w.y===bounds.y||w.y===bounds.y+bounds.h,
       'window must be located on the building perimeter');
   }
   const hallway=f.furniture.filter(x=>x.zone==='hallway');
   const interior=f.furniture.filter(x=>x.zone==='room');
   assert.ok(hallway.length>=4&&hallway.length<=7,'military props in corridor');
   assert.ok(hallway.every(x=>['ammo','supply','barrel','sandbag','kit'].includes(x.kind)));
   assert.ok(new Set(hallway.map(x=>x.kind)).size>=4,'corridor supplies include four different military props');
   assert.ok(interior.some(x=>x.kind==='cabinet'),'cabinet in rooms');
   assert.ok(interior.some(x=>x.kind==='table')||f.furniture.some(x=>x.kind==='postTable'),'tables in rooms');
   assert.ok(f.furniture.some(x=>x.kind==='postTable'));
 }
});
test('large barracks has four to eight stationary guards arranged outside the table',()=>{
 for(let seed=1;seed<=180;seed++){
  const f=indoorGenerateFloor(1,random(seed*31));
  const post=f.rooms.find(x=>x.isGuardPost);
  assert.ok(post&&post.name==='青兵詰所');
  assert.equal(f.postRoomId,post.id);
  assert.ok(f.postCount>=4&&f.postCount<=8);
  assert.equal(f.postGuards.length,f.postCount);
  assert.equal(f.guards.length,4,'keep original four full-building patrol guards');
  assert.ok(f.intel.every(q=>q.room!==post.name),'documents are outside the guard post');
  const table=f.furniture.find(x=>x.kind==='postTable');
  assert.ok(table);
  for(const guard of f.postGuards){
   assert.equal(guard.waypoints.length,1,'guards wait instead of patrolling');
   const x=guard.x,y=guard.y;
   const nearestX=Math.max(table.x,Math.min(x,table.x+table.w));
   const nearestY=Math.max(table.y,Math.min(y,table.y+table.h));
   assert.ok(Math.hypot(x-nearestX,y-nearestY)>8,'guard must not spawn inside the table');
  }
 }
});

test('smaller doors have multiple routes between rooms, corridors, and exterior entrances',()=>{
 for(let seed=1;seed<=180;seed++)for(let floorNo=1;floorNo<=2;floorNo++){
  const f=indoorGenerateFloor(floorNo,random(seed*97+floorNo));
  const interior=f.doors.filter(d=>!d.outer),rr=interior.filter(d=>d.kind==='room-room');
  assert.ok(rr.length>=2,'at least two direct inter-room doorways');
  assert.ok(f.rooms.some(r=>r.doors.length>=2),'at least one multi-door room');
  assert.ok(f.rooms.filter(r=>r.doors.length>=2).length>=2,'multiple rooms have options');
  assert.ok(f.doors.length>=17&&f.doors.length<=20);
  assert.equal(f.doors.filter(d=>d.kind==='main'||d.kind==='emergency').length,2);
  const windows=f.windows;
  assert.ok(windows.every(d=>d.external),'keep windows exterior-only');
  for(const d of interior){
   const gap=84,wallWidth=22;
   const at=d.vertical
    ?f.walls.some(w=>Math.abs(w.x+w.w/2-d.x)<1&&Math.abs(w.y+w.h-d.y+gap/2)<1)
    :f.walls.some(w=>Math.abs(w.y+w.h/2-d.y)<1&&Math.abs(w.x+w.w-d.x+gap/2)<1);
   assert.ok(at,'door frame must have two wall sections with 84px opening');
  }
 }
});
