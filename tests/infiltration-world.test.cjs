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
 const start=f.entrance||f.stair;
 const entrance=indoorAt(start.x,start.y,offset);
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
 for(const p of [f.stair,f.entrance,f.emergency,...f.intel].filter(Boolean))
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
  assert.equal(f.rooms.length,10);assert.ok(f.guards.length>=6&&f.guards.length<=8,'6–8 patrol guards per floor');
  assert.equal(f.intel.length,3,'generator candidates');
  assert.ok(f.rooms.some(r=>r.size===1));
  assert.ok(f.rooms.some(r=>r.size>=3));
  assert.equal(f.rooms.reduce((s,r)=>s+r.tiles.length,0)+f.corridors.length,35);
  assert.ok(f.doors.length>=(n===1?16:14)&&f.doors.length<=(n===1?20:18),'interior doors plus ground-floor exits');
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
  assert.ok(f.guards.length>=6&&f.guards.length<=8,'6–8 patrol guards per floor');
  for(const h of f.guards){
   assert.ok(h.loop&&h.waypoints.length>=4,'long cyclic patrol');
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
   assert.ok(hallway.length>=1&&hallway.length<=13,'sparse one-sided military props per floor');
   assert.ok(hallway.every(x=>['ammo','supply','barrel','sandbag','kit'].includes(x.kind)));
   assert.ok(new Set(hallway.map(x=>x.kind)).size>=2,'sparser corridor supplies keep varied military props');
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
  assert.ok(f.guards.length>=6&&f.guards.length<=8,'increased full-building patrol guards');
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
  assert.ok(f.doors.length>=(floorNo===1?16:14)&&f.doors.length<=(floorNo===1?20:18));
  assert.equal(f.doors.filter(d=>d.kind==='main'||d.kind==='emergency').length,floorNo===1?2:0);
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

test('indoor wall artwork covers the full collision wall length without visible seams',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const begin=source.indexOf('function drawCoverAsset(c){');
 const end=source.indexOf('\n}\n\n',begin);
 assert.ok(begin>=0&&end>begin,'find actual canvas cover rendering function');
 const sourceFunction=source.slice(begin,end+2);
 const calls=[],g={
   save(){},restore(){},imageSmoothingEnabled:true,
   drawImage(...a){calls.push(a);}
 };
 const image={naturalWidth:100,naturalHeight:200};
 let sprite=null;
 const renderer=new Function('g','COVER_IMG','assetOK','drawAssetSprite',
   sourceFunction+'\nreturn drawCoverAsset;')(
   g,{maze_wall_vertical:image,maze_wall:image},()=>true,(...a)=>{sprite=a;return true;}
 );
 const height=(wall)=>{
   calls.length=0;renderer({kd:1,x:100,y:200,w:22,h:315,...wall});
   assert.equal(calls.length,2,'render vertical wall from two image slices');
   return calls[1][6]+calls[1][8]-calls[0][6];
 };
 const indoorHeight=height({indoorWall:true});
 const normalHeight=height({});
 assert.ok(indoorHeight>=315,'indoor visual length must cover physical wall from end to end');
 assert.ok(normalHeight<315,'other stages keep their original 20 percent shrink');
 sprite=null;renderer({kd:1,x:100,y:200,w:315,h:22,indoorWall:true});
 assert.ok(sprite&&sprite[3]>=315,'horizontal indoor wall also covers the whole span');
});

test('automatic doors have identical slim 6px thickness in both orientations',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const thickness=Number(source.match(/INDOOR_DOOR_THICKNESS=(\d+)/)[1]);
 const extract=(name)=>{
   const begin=source.indexOf('function '+name+'(');
   const end=source.indexOf('\n}\n',begin);
   assert.ok(begin>=0&&end>begin,'find function '+name);
   return source.slice(begin,end+2);
 };
 const geometry=new Function('INDOOR_DOOR_WIDTH','INDOOR_DOOR_THICKNESS','INDOOR_SCALE_X','INDOOR_SCALE_Y',
   extract('indoorDoorCollisionRect')+'\nreturn indoorDoorCollisionRect;')(84,thickness,1,1.75);
 const q={x:400,y:400};
 const vertical=geometry({...q,vertical:true}),horizontal=geometry({...q,vertical:false});
 assert.equal(vertical.w,6,'thin vertical door collision');
 assert.equal(horizontal.h,6,'thin horizontal door collision');
 assert.equal(vertical.h,147,'door length remains 84px by vertical map scaling');
 assert.equal(horizontal.w,84,'door width unchanged');
 const fills=[],g={
   save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
   fillRect(...args){fills.push(args);}
 };
 const doors=[{...q,vertical:true,open:0,kind:'room-hall'},
   {...q,x:600,vertical:false,open:0,kind:'room-room'}];
 const floor={footprint:{y:100,h:850},windows:[],doors};
 const drawer=new Function('g','indoorWorld','drawInfiltrationProps','W','H','INDOOR_SCALE_X','INDOOR_SCALE_Y',
  'INDOOR_DOOR_WIDTH','INDOOR_DOOR_THICKNESS',
  extract('drawInfiltrationOpenings')+'\nreturn drawInfiltrationOpenings;')(
  g,{floors:[floor]},()=>{},840,720,1,1.75,84,thickness
 );
 drawer(0,250);
 assert.equal(fills.length,4,'two sliding panels per closed door');
 for(const rc of fills.slice(0,2))assert.equal(rc[2],6,'vertical drawn thickness');
 for(const rc of fills.slice(2))assert.equal(rc[3],6,'horizontal drawn thickness');
 // 触れる前は閉じたまま。薄くしても近接開閉のルールは維持する。
 const entities=[{x:450,y:400}],cover={noHit:false},door={...q,vertical:true,open:0,cover};
 const updater=new Function('indoorWorld','p','allies','partner','hound',
   'INDOOR_DOOR_THICKNESS','INDOOR_DOOR_SPEED','INDOOR_DOOR_WIDTH','INDOOR_SCALE_X','INDOOR_SCALE_Y',
   extract('updateInfiltrationDoors')+'\nreturn updateInfiltrationDoors;')(
     {floors:[{doors:[door],guards:[]}]},entities[0],[],null,null,thickness,5.2,84,1,1.75
   );
 updater(.2);assert.equal(cover.noHit,false,'stays shut away from the panel');
 entities[0].x=419;updater(.2);assert.equal(cover.noHit,true,'opens on contact');
 entities[0].x=470;updater(.3);assert.equal(cover.noHit,false,'closes on departure');
});

test('expanded patrol density and supply items remain separated and keep lanes clear',()=>{
  for(let seed=1;seed<=250;seed++)for(let floorNo=1;floorNo<=2;floorNo++){
    const f=indoorGenerateFloor(floorNo,random(seed*131+floorNo));
    const props=f.furniture.filter(q=>q.zone==='hallway');
    assert.ok(props.length>=1&&props.length<=13,'sparse hallway cover count');
    assert.ok(f.guards.length>=6&&f.guards.length<=8,'expanded mobile soldiers');
    assert.ok(f.postGuards.length>=4&&f.postGuards.length<=8,'keep barracks soldiers');
    assert.ok(f.guards.length+f.postGuards.length<=16,'cap soldiers per floor for performance');
    const seen=new Set();
    for(const h of f.guards){
      const key=Math.round(h.x)+':'+Math.round(h.y);
      assert.ok(!seen.has(key),'two patrol guards cannot start on the same position');
      seen.add(key);
      assert.ok(props.every(q=>!(
        h.x>q.x-10&&h.x<q.x+q.w+10&&h.y>q.y-10&&h.y<q.y+q.h+10
      )),'patrol guard cannot start inside hallway cargo');
    }
    // Hallway cell center line remains passable even when two supplies share one cell.
    for(const tile of f.corridors){
      const lineX=tile.x+tile.w/2;
      for(const prop of props){
        if(prop.x>=tile.x&&prop.x<tile.x+tile.w&&
          prop.y>=tile.y&&prop.y<tile.y+tile.h){
          assert.ok(lineX<prop.x-10||lineX>prop.x+prop.w+10,
            'keep central vertical lane at least 20px wider than props');
        }
      }
    }
  }
});

test('entrance has an open 2x2 hall and stair varies inside navigable corridors',()=>{
 const choices=new Set(),patterns=new Set(),lobbyOffsets=new Set();
 for(let seed=1;seed<=350;seed++)for(let floorNo=1;floorNo<=2;floorNo++){
   const f=indoorGenerateFloor(floorNo,random(seed*53+floorNo));
   patterns.add(f.pattern);choices.add(f.stairIndex);
   if(floorNo===2){assert.equal(f.lobbyArea,null);assert.deepEqual(f.lobby,[]);continue;}
   lobbyOffsets.add(f.lobbyArea.x);
   assert.equal(f.lobby.length,4,'entrance is an open two-by-two area');
   assert.equal(f.lobbyArea.w,360);assert.equal(f.lobbyArea.h,360);
   const tiles=new Set(f.corridors.map(q=>q.x+':'+q.y));
   for(const tile of f.lobby)assert.ok(tiles.has(tile.x+':'+tile.y),'lobby is fully connected corridor floor');
   assert.ok(f.entrance.x>=f.lobbyArea.x&&f.entrance.x<=f.lobbyArea.x+f.lobbyArea.w,
     'front entrance opens into the hall');
   assert.ok(f.stair.y<f.lobbyArea.y-80,'stairs are outside the entrance lobby');
   assert.ok(f.furniture.filter(p=>p.zone==='hallway').every(p=>
     !(p.x>=f.lobbyArea.x&&p.x<f.lobbyArea.x+f.lobbyArea.w&&
       p.y>=f.lobbyArea.y&&p.y<f.lobbyArea.y+f.lobbyArea.h)),
     'entrance hall remains clear of military crates');
   // 中央で接する区画同士に仕切り壁がないことを確認（外周壁は対象外）。
   const seamX=f.lobbyArea.x+180,seamY=f.lobbyArea.y+180;
   for(const step of [55,130,230,305]){
     const probes=[{x:seamX,y:f.lobbyArea.y+step},{x:f.lobbyArea.x+step,y:seamY}];
     for(const q of probes)assert.ok(!f.walls.some(w=>
       q.x>w.x&&q.x<w.x+w.w&&q.y>w.y&&q.y<w.y+w.h),
       'no partition wall inside entrance hall');
   }
 }
 for(const name of ['H','L','T','四角','コ'])assert.ok(patterns.has(name),'missing hall pattern '+name);
 assert.ok(choices.size>=8,'stairs vary over several locations');
 assert.ok(lobbyOffsets.size>=2,'front hall location varies with entry');
});
test('when forced to use a shared stair cell, both floor plans use that position',()=>{
 const indexFromRect=tile=>Math.round((tile.y-80)/180)*5+Math.round((tile.x-70)/180);
 for(let seed=1;seed<=260;seed++){
  const first=indoorGenerateFloor(1,random(seed*31));
  const second=indoorGenerateFloor(2,random(seed*31+13));
  const upstairs=new Set(second.corridors.map(indexFromRect));
  const common=first.corridors.map(indexFromRect)
    .filter(id=>Math.floor(id/5)>=1&&Math.floor(id/5)<=4&&upstairs.has(id));
  assert.ok(common.length>=2,'at least two candidate stairs shared by both levels');
  const stair=common[seed%common.length];
  const a=indoorGenerateFloor(1,random(seed*31),stair);
  const b=indoorGenerateFloor(2,random(seed*31+13),stair);
  assert.equal(a.stairIndex,stair);
  assert.equal(b.stairIndex,stair);
  assert.deepEqual(a.stair,b.stair,'paired floors have aligned stair landing');
  for(const f of [a,b])assert.ok(f.furniture.filter(x=>x.zone==='hallway')
     .every(x=>!(Math.abs(x.x-f.stair.x)<90&&Math.abs(x.y-f.stair.y)<90)),
     'no supply crate placed on stair tile');
 }
});

test('clustered wooden crates, barrels and shell pallets stay in groups of two or fewer',()=>{
 for(let seed=1;seed<=250;seed++)for(let number=1;number<=2;number++){
  const f=indoorGenerateFloor(number,random(seed*147+number));
  const g=new Map(),types=new Set(f.explosiveObjects.map(o=>o.kind));
  assert.ok(types.has('shellPallet'),'at least one shell crate per floor');
  assert.ok(f.explosiveObjects.length>=2&&f.explosiveObjects.length<=36,'moderate explosive cargo count');
  for(const obj of f.explosiveObjects){
   assert.ok(obj.zone==='hallway'||obj.zone==='room');
   assert.ok(obj.w>0&&obj.h>0);
   g.set(obj.group,(g.get(obj.group)||0)+1);
  }
  assert.ok([...g.values()].every(v=>v>=1&&v<=2),'maximum of two objects in a group');
  assert.ok(f.lightFixtures.length>=15,'ceiling lights regularly distributed');
  const loc=new Set(f.lightFixtures.map(p=>p.x+':'+p.y));
  assert.equal(loc.size,f.lightFixtures.length,'no duplicate light fixtures');
 }
});
test('room and corridor lights are placed at meaningful fixtures with shadow pockets',()=>{
 let darkTotal=0,spotTotal=0;
 for(let seed=1;seed<=150;seed++)for(let n=1;n<=2;n++){
  const f=indoorGenerateFloor(n,random(seed*199+n)),lights=f.lightFixtures;
  const table=f.furniture.find(o=>o.kind==='postTable');
  assert.ok(lights.some(l=>l.zone==='room'&&l.anchor==='table'&&
    Math.abs(l.x-table.x-table.w/2)<.01&&Math.abs(l.y-table.y-table.h/2)<.01),
    'barracks lamp must hang over the central table');
  assert.equal(lights.filter(l=>l.zone==='lobby').length,n===1?3:0,'only ground-floor entrance has lobby lights');
  const halls=lights.filter(l=>l.zone==='hall');
  assert.ok(halls.length>=3&&halls.every(l=>l.anchor==='hall-regular'||l.anchor==='hall-terminal'),
    'corridor lamps are placed at regular intervals and at short passage ends');
  const tileCenters=new Set(f.corridors.map(c=>(c.x+c.w/2)+':'+(c.y+c.h/2)));
  for(const light of halls){
    assert.ok(tileCenters.has(light.x+':'+light.y),'every corridor light is on the passage centerline');
    assert.ok(light.rx>0&&light.ry>0,'each lamp has a bounded pool of light');
    assert.ok(light.rx>light.ry?light.ry<=180*.45:light.rx<=180*.45,
      'the short light axis stays narrower than the passage');
  }
  assert.ok(lights.length>=22&&lights.length<=35,'added room lighting remains within a bounded fixture budget');
  const spots=f.corridors.concat(f.rooms.flatMap(r=>r.tiles));
  const samples=spots.map(t=>({x:t.x+t.w/2,y:t.y+t.h/2}));
  const dark=samples.filter(p=>lights.every(l=>Math.hypot(p.x-l.x,p.y-l.y)>185*.72));
  darkTotal+=dark.length;spotTotal+=samples.length;
 }
 assert.ok(darkTotal/spotTotal>.06&&darkTotal/spotTotal<.65,
   'meaningful shadow cover remains without blacking out the whole facility');
});
test('room lights are centered on table surfaces or room tiles and respect room limits',()=>{
 for(let seed=1;seed<=150;seed++)for(let n=1;n<=2;n++){
  const f=indoorGenerateFloor(n,random(seed*97+n));
  const rectInside=(p,r)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
  for(const lamp of f.lightFixtures.filter(l=>l.zone==='room')){
   const room=f.rooms[lamp.roomId];
   assert.ok(room&&room.tiles.some(t=>rectInside(lamp,t)),
     'room light must be inside its own room');
   assert.ok(lamp.rx<=180*.97&&lamp.ry<=180*.97,
     'room light is bounded and cannot cover unlimited floor area');
   if(lamp.anchor==='table')assert.ok(lamp.rx<=180*.45&&lamp.ry<=180*.45,
     'table task light is still compact');
   if(lamp.anchor==='table'){
    const tables=f.furniture.filter(o=>o.kind==='table'||o.kind==='desk'||o.kind==='postTable');
    assert.ok(tables.some(o=>Math.abs(lamp.x-(o.x+o.w/2))<.01&&
      Math.abs(lamp.y-(o.y+o.h/2))<.01),'table light is centered over furniture');
   }
  }
 }
});
test('each room has central lighting independently from furniture task lights',()=>{
 const random=seed=>{let x=Math.imul(seed,2654435761)>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};};
 let litCenters=0,roomCenters=0,shadowCorners=0,totalCorners=0;
 for(let seed=1;seed<=180;seed++)for(let n=1;n<=2;n++){
  const f=indoorGenerateFloor(n,random(seed*41+n)),lights=f.lightFixtures;
  for(const room of f.rooms){
   const own=lights.filter(l=>l.roomId===room.id&&l.zone==='room');
   assert.ok(own.some(l=>l.anchor==='room-center'),'each room gets a central ceiling lamp');
   const center=room.tiles.reduce((p,t)=>({x:p.x+t.x+t.w/2,y:p.y+t.y+t.h/2}),{x:0,y:0});
   center.x/=room.tiles.length;center.y/=room.tiles.length;
   const main=own.find(l=>l.anchor==='room-center');
   const inRoom=room.tiles.some(tile=>center.x>=tile.x&&center.x<=tile.x+tile.w&&
     center.y>=tile.y&&center.y<=tile.y+tile.h);
   const tileCenters=room.tiles.map(tile=>({x:tile.x+tile.w/2,y:tile.y+tile.h/2}));
   const closest=tileCenters.sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-
     Math.hypot(b.x-center.x,b.y-center.y))[0];
   const desired=inRoom?center:closest;
   assert.ok(Math.hypot(desired.x-main.x,desired.y-main.y)<.01,
     'room light at center, or nearest indoor tile for irregular geometry');
   const tables=f.furniture.filter(o=>(o.kind==='table'||o.kind==='desk'||o.kind==='postTable')&&
     room.tiles.some(tile=>o.x>=tile.x&&o.x<tile.x+tile.w&&o.y>=tile.y&&o.y<tile.y+tile.h));
   if(tables.some(o=>Math.hypot(o.x+o.w/2-main.x,o.y+o.h/2-main.y)>5))
      assert.ok(own.some(l=>l.anchor==='table'),'furniture may have a separate task lamp');
   for(const tile of room.tiles){
    const x=tile.x+tile.w/2,y=tile.y+tile.h/2;
    const v=Math.max(0,...own.map(l=>1-Math.hypot((x-l.x)/l.rx,(y-l.y)/l.ry)));
    roomCenters++;if(v>.30)litCenters++;
    for(const [dx,dy] of [[12,12],[168,12],[12,168],[168,168]]){
     const px=tile.x+dx,py=tile.y+dy;
     const q=Math.max(0,...own.map(l=>1-Math.hypot((px-l.x)/l.rx,(py-l.y)/l.ry)));
     totalCorners++;if(q<.12)shadowCorners++;
    }
   }
  }
 }
 assert.ok(litCenters/roomCenters>.70,'more than 70% of room tile centers receive direct light');
 assert.ok(shadowCorners/totalCorners>.10,'wall edges and furniture areas retain stealth shadows');
});
test('lighting draws only inside matching floor regions with no overflowing mask',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 assert.ok(src.includes('const clipTiles=item.zone===\'room\'?rooms[item.roomId].tiles'),
   'room lights clip to their exact floor plan');
 assert.ok(src.includes('item.zone===\'lobby\'?[lobbyArea]:corridors'),
   'hall lights clip to corridor tiles');
 assert.ok(src.includes('q.clip();'),'lighting is clipped before drawing');
 assert.ok(src.includes('ry:item.ry*INDOOR_SCALE_Y'),'light sizes follow floor scale');
 assert.ok(src.includes('function indoorLightingStamp()'),'radial stamp is reused');
});
test('ceiling lighting transitions smoothly rather than switching abruptly',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const start=src.indexOf('function indoorLightLevel('),end=src.indexOf('\n}\n',start);
 assert.ok(start>=0&&end>start);
 const fn=new Function('indoorWorld','INDOOR_LIGHT_RADIUS',
   src.slice(start,end+2)+'\nreturn indoorLightLevel;')({
     floors:[{footprint:{y:0,h:1800},lightFixtures:[{x:200,y:200}]}]},185);
 const levels=[0,45,90,135,180,260].map(d=>fn(200+d,200));
 for(let i=1;i<levels.length;i++)assert.ok(levels[i]<=levels[i-1],'light must fade with distance');
 assert.ok(levels[0]>.90&&levels[2]>.40&&levels[2]<.80&&levels[4]<.25);
 assert.ok(levels[1]<levels[0]&&levels[3]>levels[4],'intermediate gradient zones exist');
 assert.ok(src.includes('indoorLightStamp'),'gradient texture is cached for mobile');
});
test('indoor cargo artwork retains image aspect ratios without altering outdoor sprites',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const extract=(start,end)=>{
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'function found: '+start);return src.slice(a,b);
 };
 const fitFn=new Function('assetOK',
   extract('function fitAspect(', '\nfunction centerRect(')+'\nreturn fitAspect;')(
      im=>!!im&&im.naturalWidth>0&&im.naturalHeight>0);
 const crate={naturalWidth:80,naturalHeight:120},shell={naturalWidth:200,naturalHeight:100};
 const draws=[],drawSprite=(im,x,y,w,h)=>{draws.push({im,w,h});return true;};
 const drawFn=new Function('COVER_IMG','fitAspect','drawAssetSprite',
   extract('function drawObject(o){','\nfunction drawBuiltConcrete(')+'\nreturn drawObject;')(
   {crate,shell_pallet:shell},fitFn,drawSprite);
 drawFn({x:0,y:0,w:60,h:60,kind:'crate',indoorExplosive:true});
 drawFn({x:0,y:0,w:120,h:120,kind:'shellPallet',indoorExplosive:true});
 assert.ok(Math.abs(draws[0].w/draws[0].h-80/120)<.0001,'wooden crate source ratio');
 assert.ok(Math.abs(draws[1].w/draws[1].h-200/100)<.0001,'pallet source ratio');
 drawFn({x:0,y:0,w:60,h:60,kind:'crate'});
 assert.equal(draws[2].w,60*1.02,'outdoor crate size remains unchanged');
 assert.equal(draws[2].h,60*1.02,'outdoor crate keeps original rendering behavior');
 assert.ok(src.includes('const [dw,dh]=fitAspect(im,o.w*1.30,o.h*1.76)'),
  'barrel artwork preserves native aspect ratio');
});
test('indoor darkness reduces sight without guard flashlights',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const a=src.indexOf('function indoorLightLevel('),b=src.indexOf('\n}\n',a);
 assert.ok(a>=0&&b>a,'light level helper exists');
 const light=new Function('indoorWorld','INDOOR_LIGHT_RADIUS',
   src.slice(a,b+2)+'\nreturn indoorLightLevel;')({
     floors:[{footprint:{y:0,h:1800},lightFixtures:[{x:200,y:200}]}]},185);
 assert.ok(light(200,200)>.90,'within the lit zone visibility remains high');
 assert.ok(light(400,500)<.30,'outside a ceiling light, detection is much harder');
 assert.ok(!src.includes('function indoorFlashlightInside('),'no guard flashlight mechanics');
 assert.ok(!src.includes('INDOOR_TORCH_RADIUS'),'no guard spotlight overlay');
 assert.ok(!src.includes("gm.arc(x,y,5,0,Math.PI*2)"),'no fixture dots');
});
test('all advertised indoor door apertures remain wall-free and cargo clusters are homogeneous',()=>{
 const cross=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(let seed=1;seed<=200;seed++)for(let n=1;n<=2;n++){
  const f=indoorGenerateFloor(n,random(seed*17+n));
  const kinds=new Map();
  for(const o of f.explosiveObjects){
   assert.equal(o.w,o.kind==='crate'?60:o.kind==='shellPallet'?120:30);
   assert.equal(o.h,o.w,'enlarged objects have matching physical bounds');
   const previous=kinds.get(o.group);
   if(previous)assert.equal(previous,o.kind,'cluster must not mix kinds');
   kinds.set(o.group,o.kind);
  }
  for(const d of f.doors.filter(d=>!d.outer)){
    const gap=d.vertical?{x:d.x-11,y:d.y-42,w:22,h:84}:{x:d.x-42,y:d.y-11,w:84,h:22};
    assert.ok(!f.walls.some(w=>cross(gap,w)),'visible door gap must be clear of solid walls');
  }
  for(const tile of f.corridors){
   const mid=tile.x+tile.w/2;
   for(const o of f.explosiveObjects.filter(o=>o.zone==='hallway')){
    if(o.x>=tile.x&&o.x<tile.x+tile.w&&o.y>=tile.y&&o.y<tile.y+tile.h){
     assert.ok(o.x+o.w+10<mid||o.x-10>mid,'keep center hallway lane free of explosives');
    }
   }
  }
 }
});
test('indoor graph routes through actual passages and never through an unwalled cell edge',()=>{
 const {indoorGuardCellRoute}=require('../js/infiltration-world.js');
 for(let seed=1;seed<=120;seed++)for(let floorNo=1;floorNo<=2;floorNo++){
  const f=indoorGenerateFloor(floorNo,random(seed*53+floorNo));
  const owner=new Map(f.rooms.flatMap(room=>room.cellIds.map(id=>[id,room.id])));
  for(const tile of f.corridors)owner.set(Math.round((tile.y-80)/180)*5+Math.round((tile.x-70)/180),-1);
  const doors=new Set(f.doors.filter(d=>d.cells).map(d=>[Math.min(...d.cells),Math.max(...d.cells)].join(':')));
  const nav={neighbors:Array.from({length:35},(_,id)=>{
    if(!owner.has(id))return[];
    return [id%5>0?id-1:-1,id%5<4?id+1:-1,id>=5?id-5:-1,id<30?id+5:-1]
     .filter(j=>owner.has(j)&&(owner.get(id)===owner.get(j)||
       doors.has([Math.min(id,j),Math.max(id,j)].join(':'))));
  })};
  const valid=[...owner.keys()];
  for(const target of valid){
   const route=indoorGuardCellRoute(nav,valid[0],target);
   assert.ok(route&&route.length,'every navigable cell has a route');
   for(let i=1;i<route.length;i++)
    assert.ok(nav.neighbors[route[i-1]].includes(route[i]),
      'each route leg passes through an open room or a doorway');
  }
  assert.equal(indoorGuardCellRoute(nav,-1,valid[0]),null);
 }
});
function guardScenario(){
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/infiltration-world.js'),'utf8');
 const avatar={x:200,y:100};let visible=false,patrols=0,finished=0,shots=0,wallClear=true,light=1,blockedMovement=false;
 const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const ray=(a,b)=>typeof wallClear==='function'?wallClear(a,b):wallClear;
 const api=new Function('p','R','D','angD','pauseAfterEnemyDetection','fire','los','cachedLos',
 'debugMode','weather','inTumbleweed','inBush','inWaterAt','detectRange','DETECT_CENTER_HALF','DETECT_OUTER_HALF','DETECT_OUTER_SCALE',
 'patrol','findDetectedTarget','enterHumanFound','mv',
 'const module={exports:{}};'+src+`
 indoorMoveGuardTo=(h,q,dt,sp)=>{if(movementBlocked())return false;const d=D(h,q),k=Math.min(1,sp*dt/Math.max(.001,d));h.x+=(q.x-h.x)*k;h.y+=(q.y-h.y)*k;return true;};
 indoorGuardSeesPlayer=()=>visibleNow();
 indoorLightLevel=()=>lightNow();
 return {relay:indoorObserveFoundGuard,begin:indoorStartGuardPursuit,update:updateInfiltrationGuardAI,points:indoorSearchPoints,share:indoorShareGuardSighting,approach:indoorReportApproachPoint,
 setSensors:(v,l,b)=>{visibleNow=v;lightNow=l;movementBlocked=b;},setWorld:w=>{indoorWorld=w;},
 finish:indoorFinishGuardSearch,returnPlan:indoorPatrolReturnPlan,
 gen:indoorGenerateFloor,grid:indoorMakeGuardGrid,at:indoorAt};
 function visibleNow(){return false;} function lightNow(){return 1;} function movementBlocked(){return false;}
 `)(avatar,()=>.5,d,(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),()=>{finished++;},()=>{shots++;},
 ray,ray,0,'clear',()=>false,()=>false,()=>false,()=>250,.2,1,.7,
 h=>{patrols++;return h.face;},()=>null,h=>{
  h.st=1;h.target='p';h.sus=0;if(!h.indoorAlert||h.indoorAlert.phase!=='found')api.begin(h);
 },(h,dx,dy)=>{h.x+=dx;h.y+=dy;});
 api.setSensors(()=>visible,()=>light,()=>blockedMovement);
 api.setWorld({currentFloor:0,floors:[{}]});
 const h={indoorGuard:true,indoorFloor:1,alive:true,st:1,target:'p',x:0,y:100,face:0,cd:100,ct:0};
 return {api,h,avatar,setVisible:v=>visible=v,setWall:v=>wallClear=v,setLight:v=>light=v,setBlocked:v=>blockedMovement=v,
 get finished(){return finished;},get patrols(){return patrols;},get shots(){return shots;}};
}
test('sight loss travels to the last sighting, then searches with a hard timeout',()=>{
 const s=guardScenario(),{api,h,avatar}=s;api.begin(h);
 api.update(h,1.36);assert.equal(h.indoorAlert.phase,'lastSeen');
 assert.equal(h.indoorAlert.lastSeen.x,200);
 avatar.x=900; // Hidden avatar position must not change the destination.
 for(let i=0;i<200&&h.indoorAlert?.phase!=='search';i++)api.update(h,.05);
 assert.equal(h.indoorAlert.phase,'search');assert.ok(Math.abs(h.x-200)<25);
 for(let i=0;i<162&&h.indoorAlert;i++)api.update(h,.05);
 assert.equal(h.indoorAlert,null);assert.equal(h.st,0);assert.equal(h.sus,0);assert.equal(s.finished,1);
 h.st=1;h.target='p';api.begin(h);api.update(h,1.36);
 s.setVisible(true);api.update(h,.14);assert.equal(h.indoorAlert.phase,'found');
 assert.equal(h.indoorAlert.lastSeen.x,900);
});
test('indoor guards follow current visible player and last seen position if hidden',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const piece=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+a.length));
 const code=piece('function indoorStartGuardPursuit(h){','function indoorGuardSeesPlayer(h){')+
  piece('function updateInfiltrationGuardAI(h,dt){','function updateInfiltrationDoors(dt){');
 const avatar={x:180,y:110},destinations=[];let visible=true;
 const [begin,update]=new Function('p','R','D','indoorGuardSeesPlayer','indoorMoveGuardTo',
  'indoorEstimateEscape','angD','pauseAfterEnemyDetection','enterHumanFound','enemyBombPoint','bombs','fire',
  'performance','INDOOR_TRAIL_LIMIT','indoorShareGuardSighting','indoorRecordGuardDiscovery','indoorObserveFoundGuard',code+'\nreturn [indoorStartGuardPursuit,updateInfiltrationGuardAI];')(
  avatar,()=>.6,(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),()=>visible,
  (h,p)=>{destinations.push({...p});return true;},(_h,state)=>state.lastSeen,()=>0,()=>{},()=>{},()=>({x:0,y:0}),
  [],()=>{}, {now:()=>0},48,()=>0,()=>{},()=>false);
 const h={indoorGuard:true,x:0,y:110,st:1,target:'p',cd:100,bu:true};
 begin(h);avatar.x=240;update(h,.1);
 assert.equal(destinations.at(-1).x,240,'immediately chase current visible position');
 assert.equal(h.indoorAlert.trail.length,0,'discard stale points while player stays visible');
 h.x=180;avatar.x=320;update(h,.14);
 assert.equal(destinations.at(-1).x,320,'keep steering forward, not back to original spot');
 visible=false;avatar.x=900;update(h,.14);
 assert.equal(h.indoorAlert.lastSeen.x,320,'do not reveal unseen player location');
 assert.equal(destinations.at(-1).x,320,'pursue last seen position while hidden');
});
test('infiltration pursuit follows stable door midpoints and keeps short sight loss',()=>{
 const fs=require('node:fs'),path=require('node:path'),src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 assert.ok(src.includes("(target.x-nav.centers[from].x)*.78"),'door waypoint crosses to next cell');
 assert.ok(src.includes("a.stuck>.44"),'avoid reacting to a single blocked movement frame');
 assert.ok(src.includes("indoorGridDetour(nav,h,desired,1700)"),'use an obstacle-aware cached detour');
 assert.ok(src.includes("state.remaining=1.35"),'transient loss has grace period');
 assert.ok(src.includes("state.remaining=1.35"),'fresh sight renews pursuit memory');
 assert.ok(src.includes("enterHumanFound(h,'p');indoorStartGuardPursuit(h)"),'reacquisition transitions to found');
});
test('indoor navigation crosses beyond door boundaries and throttles vision checks',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 assert.ok(src.includes('(target.x-nav.centers[from].x)*.78'),'door waypoint crosses the doorway');
 assert.ok(src.includes('(target.y-nav.centers[from].y)*.78'),'door waypoint advances beyond the door');
 assert.ok(src.includes('state.sightCheckT=.12+'),'vision rays are throttled');
 assert.ok(src.includes('state.sightCheckT=0;'),'search transition checks vision immediately');
 assert.ok(src.includes('state.remaining=1.35'),'brief visibility loss remains tolerated');
});
test('entrance has three soft ceiling pools and indoor lighting retains a brighter base',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 assert.ok(src.includes("q.fillStyle='rgba(7,13,15,.58)'"),'lighter rendered shadow overlay');
 assert.ok(src.includes('return withinFloor?.24:1'),'indoor darkness floor is increased');
 assert.ok(src.includes('Math.max(.78,.5+.5*illumination)'),'alerted guards remain able to see into shadow');
 for(let seed=1;seed<=100;seed++){
  const f=indoorGenerateFloor(1,random(seed*41));
  const lobby=f.lightFixtures.filter(l=>l.zone==='lobby');
  assert.equal(lobby.length,3);
  assert.ok(lobby.some(l=>l.anchor==='lobby-center'));
  assert.equal(lobby.filter(l=>l.anchor==='lobby-side').length,2);
 }
});
test('guard detours are bounded and avoid fixed walls, furniture, and cargo',()=>{
 const {indoorMakeGuardGrid,indoorGridDetour,indoorAt,indoorGridPoint}=
  require('../js/infiltration-world.js');
 let total=0,missing=0;
 for(let seed=1;seed<=55;seed++)for(let floorNo=1;floorNo<=2;floorNo++){
  const f=indoorGenerateFloor(floorNo,random(seed*73+floorNo)),grid=indoorMakeGuardGrid(f,9300);
  const owner=new Map(f.rooms.flatMap(r=>r.cellIds.map(i=>[i,r.id])));
  for(const tile of f.corridors){
   const c=Math.round((tile.x-70)/180),r=Math.round((tile.y-80)/180);
   owner.set(r*5+c,-1);
  }
  const doors=new Set(f.doors.filter(d=>d.cells)
   .map(d=>[Math.min(...d.cells),Math.max(...d.cells)].join(':')));
  assert.ok(grid.solid.length<=9000,'fine grid memory is bounded');
  for(const a of owner.keys())for(const [dx,dy] of [[1,0],[0,1]]){
   const c=a%5+dx,r=Math.floor(a/5)+dy;if(c>=5||r>=7)continue;
   const b=r*5+c;
   if(!owner.has(b)||owner.get(a)!==owner.get(b)&&!doors.has(a+':'+b))continue;
   const pa=indoorAt(70+(a%5+.5)*180,80+(Math.floor(a/5)+.5)*180,9300);
   const pb=indoorAt(70+(b%5+.5)*180,80+(Math.floor(b/5)+.5)*180,9300);
   const points=indoorGridDetour({grid},pa,pb,1700);
   total++;if(!points){missing++;continue;}
   assert.ok(points.length<=30,'bounded waypoint allocation');
   for(const point of points){
    const id=indoorGridPoint(grid,point);
    assert.ok(id>=0&&!grid.solid[id],'all waypoints must avoid static objects');
   }
  }
 }
 assert.ok(missing/total<.015,'98.5%+ of adjacent room paths have a safe detour');
});
test('indoor pursuing guards cross automatic doors and skirt cargo in simulated movement',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 let blocks=[],doors=[];
 const hit=(p,r,q)=>p.x+r>q.x&&p.x-r<q.x+q.w&&p.y+r>q.y&&p.y-r<q.y+q.h;
 const mv=(o,dx,dy,r)=>{
   if(!blocks.some(q=>hit({x:o.x+dx,y:o.y},r,q))&&
      !doors.some(q=>!q.noHit&&hit({x:o.x+dx,y:o.y},r,q)))o.x+=dx;
   if(!blocks.some(q=>hit({x:o.x,y:o.y+dy},r,q))&&
      !doors.some(q=>!q.noHit&&hit({x:o.x,y:o.y+dy},r,q)))o.y+=dy;
 };
 const sim=new Function('mv','D','R','angD',
   "const module={exports:{}};"+src+
   "\nreturn {gen:indoorGenerateFloor,grid:indoorMakeGuardGrid,move:indoorMoveGuardTo,at:indoorAt,setWorld:w=>{indoorWorld=w;}};"
 )(mv,d,()=>.55,angleDiff);
 for(const [seed,guardIndex] of Array.from({length:160},(_,i)=>[1+Math.floor(i/4),i%4])){
  const raw=sim.gen(1,random(seed*13+1)),off=9300;
  const owners=new Map(raw.rooms.flatMap(r=>r.cellIds.map(i=>[i,r.id])));
  for(const tile of raw.corridors){
   const c=Math.round((tile.x-70)/180),row=Math.round((tile.y-80)/180);
   owners.set(row*5+c,-1);
  }
  const joins=new Set(raw.doors.filter(o=>o.cells).map(o=>
    [Math.min(...o.cells),Math.max(...o.cells)].join(':')));
  const nav={
   origin:sim.at(70,80,off),stepX:180,stepY:315,
   centers:Array.from({length:35},(_,i)=>sim.at(70+(i%5+.5)*180,80+(Math.floor(i/5)+.5)*180,off)),
   neighbors:Array.from({length:35},(_,i)=>{
    if(!owners.has(i))return[];
    return[i%5?i-1:-1,i%5<4?i+1:-1,i>=5?i-5:-1,i<30?i+5:-1]
     .filter(j=>owners.has(j)&&(owners.get(i)===owners.get(j)||
       joins.has([Math.min(i,j),Math.max(i,j)].join(':'))));
   }),
   grid:sim.grid(raw,off)
  };
  sim.setWorld({floors:[{navigation:nav}]});
  blocks=[...raw.walls,...raw.furniture,...raw.explosiveObjects].map(q=>({
    x:q.x-40,y:q.y*1.75+off,w:q.w,h:q.h*1.75
  }));
  doors=raw.doors.filter(o=>o.cells).map(q=>({
    x:q.vertical?q.x-46:q.x-82,
    y:q.vertical?q.y*1.75+off-73.5:q.y*1.75+off-6,
    w:q.vertical?12:84,h:q.vertical?147:12,noHit:false,original:q
  }));
  const guard=raw.guards[guardIndex];
  const actor={...sim.at(guard.x,guard.y,off),face:guard.face,indoorFloor:1,indoorAlert:{},alive:true};
  const intel=raw.intel[guardIndex%raw.intel.length],goal=sim.at(intel.x,intel.y,off);
  for(let tick=0;tick<1000&&d(actor,goal)>=35;tick++){
   for(const door of doors){
    const q=door.original,x=q.x-40,y=q.y*1.75+off;
    door.noHit=Math.abs(q.vertical?actor.x-x:actor.y-y)<=22&&
      Math.abs(q.vertical?actor.y-y:actor.x-x)<=80;
   }
   sim.move(actor,goal,.05,95);
  }
  assert.ok(d(actor,goal)<35,'guard stalled before reaching last known position, map '+seed+' guard '+guardIndex);
 }
});
test('infiltration expensive recovery is limited to genuinely stalled pursuits',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 assert.ok(src.includes('a.noGoalProgressT>4.5&&a.rescueCooldown<=0'),
   'long-distance rescue only starts after no approach progress');
 assert.ok(src.includes('a.rescueCooldown=7'),'rescue has a strict per-guard cooldown');
 assert.ok(src.includes('indoorGridDetour(nav,h,goal,5200)'),
   'rare recovery searches a wider area and does not just repeat a blocked door edge');
 assert.ok(src.includes('a.detourGoalCell!==to'),'do not keep obsolete paths when target changes rooms');
});
test('indoor guards search the last credible direction without tracking unseen position',()=>{
 const fs=require('node:fs'),path=require('node:path'),
  src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 assert.ok(src.includes('predicted=indoorEstimateEscape(h,state)'));
 assert.ok(src.includes('for(let i=1;i<=7;i++)'),'prediction ends after 112 pixels');
 assert.ok(src.includes('if(id<0||g.solid[id])break'),'prediction stops at solid walls');
 assert.ok(src.includes('const next=state.approachGoal||state.lastSeen;'));
 assert.ok(src.includes("state.phase='lastSeen';state.travelLeft=10"),'bound last-sighting travel before searching');
 assert.ok(src.includes('state.searchLeft=Math.max(0,state.searchLeft-dt)'),
  'scanning timer is counted separately from travel');
 assert.ok(src.includes('a.replanT=.85+R()*.2'),'avoid frame-by-frame pathfinding');
});
test('last-seen direction prediction stops at walls and is capped',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const start=src.indexOf('function indoorEstimateEscape(h,state){');
 const end=src.indexOf('function updateInfiltrationGuardAI(h,dt){',start);
 assert.ok(start>=0&&end>start);
 const {indoorGridPoint,indoorGuardCell,indoorGuardCellRoute}=
   require('../js/infiltration-world.js');
 const solid=new Uint8Array(20*10);
 for(let row=0;row<10;row++)solid[row*20+10]=1; // A solid obstacle at x=160.
 const nav={grid:{x:0,y:0,step:16,cols:20,rows:10,solid},
   origin:{x:0,y:0},stepX:180,stepY:315,
   neighbors:Array.from({length:35},(_,i)=>[i-1,i+1].filter(j=>j>=0&&j<35))};
 const f=new Function('indoorWorld','indoorGridPoint','indoorGuardCell',
   'indoorGuardCellRoute',src.slice(start,end)+'\nreturn indoorEstimateEscape;')(
    {floors:[{navigation:nav}]},indoorGridPoint,indoorGuardCell,indoorGuardCellRoute);
 const guard={indoorFloor:1},state={lastSeen:{x:80,y:64},lastDir:{x:1,y:0}};
 const predicted=f(guard,state);
 assert.ok(predicted.x>=80&&predicted.x<160,'predicted point must not cross wall');
 assert.ok(predicted.x-state.lastSeen.x<=112,'prediction never exceeds 112px');
 assert.equal(predicted.y,64,'prediction respects last visible travel direction');
});
test('two gun hits instantly detonate only the new shell-pallet kind',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const a=src.indexOf("function damageObject(o,source='impact'){"),b=src.indexOf('\n}\n',a);
 assert.ok(a>=0&&b>a);
 const body=src.slice(a,b+2);
 const shell={kind:'shellPallet',x:0,y:0,w:30,h:30},other={kind:'crate',x:100,y:0,w:30,h:30};
 const objs=[shell,other];
 let exploded=0;
 const fn=new Function('objects','explodeObject','radioStrikeKillContext','performance','burst','destroyObject',
 body+'\nreturn damageObject;')(objs,o=>{exploded++;objs.splice(objs.indexOf(o),1);return true;},0,{now:()=>0},()=>{},()=>true);
 assert.equal(fn(shell,'mg'),true);
 assert.equal(exploded,0,'one hit must not explode');
 assert.equal(fn(shell,'mg'),true);
 assert.equal(exploded,1,'second hit explodes immediately');
 assert.equal(fn(other,'mg'),true);
 assert.equal(exploded,1,'existing crates keep their own damage behavior');
});

test('brief exposure can fade and darkness gives more time before recognition',()=>{
 const notice=light=>{const s=guardScenario();s.h.st=0;s.h.target=null;s.setLight(light);s.setVisible(true);return s;};
 const bright=notice(1),dark=notice(.24);
 for(let i=0;i<10;i++){bright.api.update(bright.h,.05);dark.api.update(dark.h,.05);}
 assert.equal(bright.h.indoorAlert.phase,'found');assert.equal(dark.h.st,0);
 for(let i=0;i<12;i++)dark.api.update(dark.h,.05);
 assert.equal(dark.h.indoorAlert.phase,'found');
 const brief=notice(1);
 for(let i=0;i<4;i++)brief.api.update(brief.h,.05);
 brief.setVisible(false);for(let i=0;i<12;i++)brief.api.update(brief.h,.05);
 assert.equal(brief.h.st,0);assert.equal(brief.h.indoorAlert,undefined);
 assert.equal(brief.h.sus,0);assert.ok(brief.patrols>0);
});
test('nearby moving footsteps investigate a snapshot, while walls and standing remain quiet',()=>{
 for(const wall of [true,false]){
  const s=guardScenario();s.h.st=0;s.h.target=null;s.h.x=160;s.setWall(wall);
  s.api.update(s.h,.13);assert.equal(s.h.indoorAlert,undefined,'standing is silent');
  s.avatar.x+=15;s.api.update(s.h,.13);
  if(wall){
   assert.equal(s.h.indoorAlert.phase,'lastSeen');assert.equal(s.h.st,0);
   const heard=s.h.indoorAlert.lastSeen.x;s.avatar.x=800;s.api.update(s.h,.13);
   assert.equal(s.h.indoorAlert.lastSeen.x,heard,'sound destination does not follow hidden player');
  }else assert.equal(s.h.indoorAlert,undefined,'walls block hearing');
 }
});
test('footsteps stay silent in the rear 45-degree sector across facing wraparound',()=>{
 for(const face of [0,Math.PI,-Math.PI+.1,Math.PI/2])for(const offset of [0,-22,22,-23,23,90,180]){
  const s=guardScenario();s.h.st=0;s.h.target=null;s.h.face=face;
  const angle=face+Math.PI+offset*Math.PI/180;
  const place=radius=>{s.avatar.x=s.h.x+Math.cos(angle)*radius;s.avatar.y=s.h.y+Math.sin(angle)*radius;};
  place(60);s.api.update(s.h,.13);
  place(45);s.api.update(s.h,.13);
  if(Math.abs(offset)<=22){
   assert.equal(s.h.indoorAlert,undefined,'rear approach must not trigger investigation');
   assert.equal(s.h.sus,0,'rear footsteps must not show suspicion');
  }else assert.equal(s.h.indoorAlert?.phase,'lastSeen','outside rear sector footsteps are still heard');
 }
});
test('cached sight never supplies new hidden coordinates and walls stop firing',()=>{
 const s=guardScenario();s.api.begin(s.h);s.setVisible(true);s.api.update(s.h,.02);
 assert.equal(s.h.indoorAlert.lastSeen.x,200);
 s.setVisible(false);s.avatar.x=900;s.h.cd=0;s.setWall(false);s.api.update(s.h,.05);
 assert.equal(s.h.indoorAlert.lastSeen.x,200,'coordinates refresh only with sight sample');
 assert.equal(s.shots,0);
});
test('both lost-sight approach and search reacquire confirmed sightings',()=>{
 for(const phase of ['lastSeen','search']){
  const s=guardScenario();s.api.begin(s.h);s.api.update(s.h,1.36);
  if(phase==='search'){s.h.x=200;s.api.update(s.h,.05);}
  assert.equal(s.h.indoorAlert.phase,phase);
  s.avatar.x=240;s.setVisible(true);s.api.update(s.h,.14);
  assert.equal(s.h.indoorAlert.phase,'found');assert.equal(s.h.st,1);
  assert.equal(s.h.indoorAlert.lastSeen.x,240);
 }
});
test('search locations stay on reachable nearby floor without querying hidden player',()=>{
 const s=guardScenario(),{api,h,avatar}=s;
 const grid={x:0,y:0,step:16,cols:40,rows:40,solid:new Uint8Array(1600)};
 for(let y=0;y<40;y++)grid.solid[y*40+20]=1;
 api.setWorld({currentFloor:0,floors:[{navigation:{grid,origin:{x:0,y:0},stepX:180,stepY:315,
  neighbors:Array.from({length:35},()=>[])}}]});
 const state={lastSeen:{x:240,y:240},lastDir:null};
 Object.defineProperty(avatar,'x',{get(){throw Error('hidden player position read');}});
 const points=api.points(h,state);assert.ok(points.length>0&&points.length<=2);
 for(const q of points){assert.ok(Math.hypot(q.x-240,q.y-240)<=180);assert.ok(q.x<320,'cannot cross solid wall');}
});
test('stalled approach and blocked searches expire and dedicated AI skips outdoor guards',()=>{
 const s=guardScenario();s.api.begin(s.h);s.h.indoorAlert.phase='search';
 Object.assign(s.h.indoorAlert,{searchLeft:.1,searchPoints:[{x:200,y:100}],searchIndex:0});
 s.api.update(s.h,.11);assert.equal(s.h.indoorAlert,null);
 const outdoor={x:1,y:2,st:0};const copy={...outdoor};
 assert.equal(s.api.update(outdoor,.1),false);assert.deepEqual(outdoor,copy);
});


test('hallway furniture and cargo share one side with at most two items per cell',()=>{
 const sides=new Set();
 for(let seed=1;seed<=300;seed++)for(let floorNo=1;floorNo<=2;floorNo++){
  const f=indoorGenerateFloor(floorNo,random(seed*157+floorNo));
  const props=[...f.furniture,...f.explosiveObjects].filter(o=>o.zone==='hallway');
  const floorSides=new Set();
  for(const tile of f.corridors){
   const items=props.filter(o=>o.x>=tile.x&&o.x<tile.x+tile.w&&o.y>=tile.y&&o.y<tile.y+tile.h);
   assert.ok(items.length<=2,'maximum two items including static cover and explosive cargo');
   for(const o of items){
    const mid=tile.x+tile.w/2;
    assert.ok(o.x+o.w+10<mid||o.x-10>mid,'central lane stays open');
    floorSides.add(o.x+o.w/2<mid?'left':'right');
   }
  }
  assert.equal(floorSides.size,1,'all hall items use the same side, including door relocations');
  for(const side of floorSides)sides.add(side);
 }
 assert.equal(sides.size,2,'either side may be selected for a new floor');
});


function coordinationScenario(){
 const s=guardScenario();
 const guard=(x,extra={})=>({indoorGuard:true,indoorFloor:1,alive:true,x,y:100,face:0,st:0,target:null,cd:100,...extra});
 const source=s.h;source.x=100;
 const recipients=[guard(130),guard(160),guard(190)];
 const world={currentFloor:0,floors:[{guards:[source,...recipients]}]};
 s.api.setWorld(world);s.api.begin(source);
 source.indoorAlert.visible=true;
 return {...s,source,recipients,world,guard};
}
test('seeing a found guard relays found mode across a chain using copied memories',()=>{
 const s=coordinationScenario();s.source.indoorAlert.lastSeen={x:220,y:120};
 s.source.indoorAlert.remaining=.8;s.source.indoorAlert.lastDir={x:1,y:0};
 for(const h of s.recipients)h.face=Math.PI;
 const a=s.recipients[0],b=s.recipients[1];
 Object.defineProperty(s.avatar,'x',{get(){throw Error('hidden player read during visual relay');}});
 assert.equal(s.api.relay(a,.2),true);assert.equal(a.st,1);assert.equal(a.indoorAlert.phase,'found');
 assert.equal(a.indoorAlert.remaining,.8);assert.equal(a.indoorAlert.visible,false);
 s.source.indoorAlert.phase='lastSeen';a.indoorAlert.remaining=.6;
 assert.equal(s.api.relay(b,.2),true,'an indirectly alerted guard can relay onward');
 assert.equal(b.indoorAlert.remaining,.6,'relay never renews pursuit memory');
 a.indoorAlert.lastSeen.x=900;a.indoorAlert.lastDir.x=-1;
 assert.equal(b.indoorAlert.lastSeen.x,220);assert.equal(b.indoorAlert.lastDir.x,1);
 b.indoorAlert.phase='lastSeen';a.indoorAlert.phase='lastSeen';
 assert.equal(s.api.relay(b,.2),false,'search and last-seen guards cannot propagate found mode');
 assert.equal(s.world.alarm,undefined,'relay does not increment firsthand discovery count');
});
test('visual relay requires sight, range, same active floor and conscious guards',()=>{
 for(const reason of ['wall','behind','far','otherFloor','inactiveFloor','stunnedSource','stunnedObserver','deadSource','deadObserver','search']){
  const s=coordinationScenario(),h=s.recipients[0];s.world.floors[0].guards=[s.source,h];h.face=Math.PI;
  if(reason==='wall')s.setWall(false);
  if(reason==='behind')h.face=0;
  if(reason==='far')h.x=900;
  if(reason==='otherFloor')s.source.indoorFloor=2;
  if(reason==='inactiveFloor')s.world.currentFloor=1;
  if(reason==='stunnedSource')s.source.stun=1;
  if(reason==='stunnedObserver')h.stun=1;
  if(reason==='deadSource')s.source.alive=false;
  if(reason==='deadObserver')h.alive=false;
  if(reason==='search')s.source.indoorAlert.phase='search';
  assert.equal(s.api.relay(h,.2),false,reason);assert.equal(h.st,0,reason);
 }
});
test('visual relay expires into last-seen pursuit without shooting at a hidden player',()=>{
 const s=coordinationScenario(),h=s.recipients[0];h.face=Math.PI;
 s.source.indoorAlert.remaining=.1;
 s.api.update(h,.02);assert.equal(h.indoorAlert.phase,'found');assert.equal(h.st,1);
 s.api.update(h,.15);assert.equal(h.indoorAlert.phase,'lastSeen');assert.equal(s.shots,0);
});
test('a firsthand sighting recruits only two nearest available guards on the same floor',()=>{
 const s=coordinationScenario(),{source,recipients,world,guard}=s;
 const excluded=[guard(102,{alive:false}),guard(104,{stun:1}),guard(106,{stunRecover:1}),
  guard(108,{houndPinned:true}),guard(110,{blastAirT:1}),guard(112,{indoorFloor:2}),
  guard(114,{st:1,target:'ally:1'}),guard(116,{indoorGuard:false}),guard(350)];
 world.floors[0].guards.push(...excluded);
 assert.equal(s.api.share(source,source.indoorAlert,1000),2);
 for(const h of recipients.slice(0,2)){
  assert.equal(h.indoorAlert.phase,'lastSeen');assert.equal(h.st,0);assert.equal(h.target,null);
  assert.equal(h.indoorAlert.travelLeft,6);assert.equal(h.sharePause,.35);
 }
 assert.equal(recipients[2].indoorAlert,undefined);
 for(const h of excluded)assert.equal(h.indoorAlert,undefined,'unavailable/distant/other-floor guards are excluded');
 assert.equal(world.floors[0].nextGuardReportAt,5000);
});
test('reports carry a copied last sighting and cannot relay hidden player coordinates',()=>{
 const s=coordinationScenario();
 s.source.indoorAlert.lastSeen={x:220,y:120};s.source.indoorAlert.lastDir={x:1,y:0};
 Object.defineProperty(s.avatar,'x',{get(){throw Error('hidden player read during report');}});
 assert.equal(s.api.share(s.source,s.source.indoorAlert,1000),2);
 const receiver=s.recipients[0];
 s.source.indoorAlert.lastSeen.x=900;s.source.indoorAlert.lastDir.x=-1;
 assert.equal(receiver.indoorAlert.lastSeen.x,220);assert.equal(receiver.indoorAlert.lastDir.x,1);
 assert.equal(s.api.share(receiver,receiver.indoorAlert,6000),0,'a received report cannot relay itself');
 assert.equal(s.recipients[2].indoorAlert,undefined);
});
test('walls block voice reports and the floor cooldown prevents repeated alarm waves',()=>{
 const s=coordinationScenario();s.setWall((_a,b)=>b!==s.recipients[0]);
 assert.equal(s.api.share(s.source,s.source.indoorAlert,1000),2);
 assert.equal(s.recipients[0].indoorAlert,undefined,'the wall-blocked nearest guard stays idle');
 assert.ok(s.recipients[1].indoorAlert&&s.recipients[2].indoorAlert);
 s.api.begin(s.source);s.source.indoorAlert.visible=true;
 s.setWall(true);
 assert.equal(s.api.share(s.source,s.source.indoorAlert,2000),0,'new firsthand report respects floor cooldown');
 assert.equal(s.recipients[0].indoorAlert,undefined);
 s.api.begin(s.source);s.source.indoorAlert.visible=true;
 assert.equal(s.api.share(s.source,s.source.indoorAlert,5001),1);
});
test('unconfirmed noise and reports from inactive floors never recruit other guards',()=>{
 const s=coordinationScenario();s.source.indoorAlert.visible=false;
 assert.equal(s.api.share(s.source,s.source.indoorAlert,1000),0);
 s.source.indoorAlert.visible=true;s.source.indoorAlert.phase='lastSeen';
 assert.equal(s.api.share(s.source,s.source.indoorAlert,1000),0);
 s.source.indoorAlert.phase='found';s.world.currentFloor=1;
 assert.equal(s.api.share(s.source,s.source.indoorAlert,1000),0);
 assert.ok(s.recipients.every(h=>!h.indoorAlert));
});
test('cooperating guards search opposite reachable sectors and give up without renewed sight',()=>{
 const s=coordinationScenario(),grid={x:0,y:0,step:16,cols:40,rows:40,solid:new Uint8Array(1600)};
 const nav={grid,origin:{x:0,y:0},stepX:180,stepY:315,
  neighbors:Array.from({length:35},(_,i)=>[i-1,i+1,i-5,i+5].filter(j=>j>=0&&j<35))};
 s.world.floors[0].navigation=nav;s.source.indoorAlert.lastSeen={x:240,y:240};
 s.source.indoorAlert.lastDir={x:1,y:0};
 s.api.share(s.source,s.source.indoorAlert,1000);
 const [a,b]=s.recipients,pa=s.api.points(a,a.indoorAlert),pb=s.api.points(b,b.indoorAlert);
 assert.ok(pa[0].y<240&&pb[0].y>240,'first search targets spread to opposite sides');
 for(const q of [...pa,...pb])assert.ok(Math.hypot(q.x-240,q.y-240)<=180);
 for(let tick=0;tick<310;tick++)for(const h of [a,b])s.api.update(h,.05);
 assert.equal(a.indoorAlert,null);assert.equal(b.indoorAlert,null);
 assert.equal(a.st,0);assert.equal(b.st,0);
});
test('the pursuit visibility sample triggers coordination only on an actual sighting',()=>{
 const s=coordinationScenario();s.source.indoorAlert.visible=false;
 s.api.update(s.source,.02);
 assert.ok(s.recipients.every(h=>!h.indoorAlert));
 s.setVisible(true);s.api.update(s.source,.14);
 assert.ok(s.recipients[0].indoorAlert&&s.recipients[1].indoorAlert);
 assert.equal(s.recipients[2].indoorAlert,undefined);
 assert.deepEqual(s.recipients[0].indoorAlert.lastSeen,{x:s.avatar.x,y:s.avatar.y});
});


function predictionScenario(){
 const s=coordinationScenario(),grid={x:0,y:0,step:16,cols:40,rows:40,solid:new Uint8Array(1600)};
 const nav={grid,origin:{x:0,y:0},stepX:180,stepY:315,
  neighbors:Array.from({length:35},(_,i)=>[i-1,i+1,i-5,i+5].filter(j=>j>=0&&j<35))};
 s.world.floors[0].navigation=nav;
 s.source.indoorAlert.lastSeen={x:240,y:240};s.source.indoorAlert.lastDir={x:1,y:0};
 return {...s,grid};
}
test('only one responder checks a short predicted route while the other checks the sighting',()=>{
 const s=predictionScenario();
 s.api.share(s.source,s.source.indoorAlert,1000);
 const [first,second]=s.recipients;
 assert.equal(first.indoorAlert.approachGoal,null);
 assert.deepEqual(second.indoorAlert.approachGoal,{x:352,y:240});
 assert.deepEqual(second.indoorAlert.lastSeen,{x:240,y:240},'prediction does not overwrite the actual last sighting');
 s.avatar.x=30;s.api.update(second,.4);s.api.update(second,.1);
 assert.equal(second.indoorAlert.lastSeen.x,240);
 assert.equal(second.indoorAlert.approachGoal.x,352,'doubling back does not update the mistaken prediction');
 assert.ok(second.x>160,'second responder follows predicted direction');
});
test('prediction stops at static walls and cancels at a closed door or missing movement evidence',()=>{
 const s=predictionScenario();
 for(let y=0;y<40;y++)s.grid.solid[y*40+18]=1;
 const report=s.source.indoorAlert;
 const point=s.api.approach(s.recipients[1],report);
 assert.ok(point.x<288&&point.x>=272,'prediction stops before the wall');
 s.setWall(false);assert.equal(s.api.approach(s.recipients[1],report),null,'closed door blocks prediction');
 s.setWall(true);report.lastDir=null;
 assert.equal(s.api.approach(s.recipients[1],report),null,'stationary or unknown movement gives no prediction');
});
test('prediction reads only the report and is cleared upon confirmed visual reacquisition',()=>{
 const s=predictionScenario();
 const report=s.source.indoorAlert;
 Object.defineProperty(s.avatar,'x',{configurable:true,get(){throw Error('hidden player queried');}});
 assert.deepEqual(s.api.approach(s.recipients[1],report),{x:352,y:240});
 s.api.share(s.source,report,1000);
 Object.defineProperty(s.avatar,'x',{value:120,writable:true});
 const second=s.recipients[1];s.setVisible(true);s.api.update(second,.14);
 assert.equal(second.indoorAlert.phase,'found');
 assert.equal(second.indoorAlert.approachGoal,undefined,'new pursuit drops the old inferred destination');
 assert.equal(second.indoorAlert.lastSeen.x,120);
});
test('initial recognition retains only movement witnessed in successive visible samples',()=>{
 const s=guardScenario();s.h.st=0;s.h.target=null;s.setVisible(true);
 s.api.update(s.h,.13);s.avatar.x+=20;s.api.update(s.h,.13);s.avatar.x+=20;s.api.update(s.h,.13);
 s.avatar.x+=20;s.api.update(s.h,.13);
 assert.equal(s.h.indoorAlert.phase,'found');
 assert.deepEqual(s.h.indoorAlert.lastDir,{x:1,y:0},'observed movement can inform the first report');
 const hidden=guardScenario();hidden.h.st=0;hidden.h.target=null;
 hidden.api.update(hidden.h,.13);hidden.avatar.x=800;hidden.setVisible(true);
 for(let i=0;i<5;i++)hidden.api.update(hidden.h,.13);
 assert.equal(hidden.h.indoorAlert.lastDir,null,'unseen displacement is not treated as observed direction');
});


test('upper floors have sealed exterior walls, no lobby or exterior exit, and reachable documents',()=>{
 for(let seed=1;seed<=200;seed++){
  const f=indoorGenerateFloor(2,random(seed*173));
  assert.equal(f.entrance,null);assert.equal(f.emergency,null);assert.equal(f.exit,null);
  assert.equal(f.lobbyArea,null);assert.deepEqual(f.lobby,[]);
  assert.ok(!f.doors.some(d=>d.outer||d.kind==='main'||d.kind==='emergency'));
  assert.ok(!f.lightFixtures.some(l=>l.zone==='lobby'));
  const isWall=(x,y)=>f.walls.some(w=>x>=w.x&&x<=w.x+w.w&&y>=w.y&&y<=w.y+w.h);
  const {x,y,w,h}=f.footprint;
  for(let px=x+2;px<x+w-2;px+=5){assert.ok(isWall(px,y));assert.ok(isWall(px,y+h));}
  for(let py=y+2;py<y+h-2;py+=5){assert.ok(isWall(x,py));assert.ok(isWall(x+w,py));}
  reachablePoints(f);
 }
});
test('upper-floor drawing omits exterior paths and entrance signs while preserving stairs',()=>{
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/infiltration-world.js'),'utf8');
 const from=src.indexOf('function drawInfiltrationFloors(cx,cy){'),to=src.indexOf('function drawInfiltrationProps(cx,cy){',from);
 const labels=[],fills=[];
 const g=new Proxy({fillText:t=>labels.push(t),fillRect:(...r)=>fills.push(r)},
  {get:(o,k)=>k in o?o[k]:()=>{}});
 for(const floorNo of [1,2]){
  const f=indoorGenerateFloor(floorNo,random(313));
  const draw=new Function('g','indoorWorld','WW','H',src.slice(from,to)+';return drawInfiltrationFloors;')(
   g,{floors:[f]},960,2500);
  labels.length=0;fills.length=0;draw(0,0);
  if(floorNo===1){
   for(const label of ['エントランスホール','正面玄関','非常口','2F ▲'])assert.ok(labels.includes(label));
  }else{
   assert.ok(labels.includes('1F ▼'));
   for(const label of ['エントランスホール','正面玄関','非常口'])assert.ok(!labels.includes(label));
   assert.ok(!fills.some(r=>r[1]>f.footprint.y+f.footprint.h),'no exterior entrance path');
  }
 }
});
test('world setup accepts upstairs null entry metadata and preserves paired stairs',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const sandbox={ZONE_STYLE:{'敵迷路基地':{p:[]}},WH:14000,p:{},scoreStats:{},R:random(917),
  document:{body:{classList:{remove(){}}}},rebuildSpatialGrid(){},say(){},module:{exports:{}}};
 vm.createContext(sandbox);
 vm.runInContext(source+';setupInfiltrationWorld();result=indoorWorld;',sandbox);
 const [ground,upper]=sandbox.result.floors;
 assert.ok(ground.entrance&&ground.emergency&&ground.lobbyArea);
 assert.equal(upper.entrance,null);assert.equal(upper.exit,null);
 assert.equal(upper.emergency,null);assert.equal(upper.lobbyArea,null);
 assert.ok(upper.doors.every(d=>!d.outer));
 assert.ok(upper.lightFixtures.every(l=>l.clipTiles.length>0&&l.clipTiles.every(Boolean)));
 assert.equal(ground.stair.x,upper.stair.x);
 assert.equal(ground.stair.y-ground.offset,upper.stair.y-upper.offset);
 assert.equal(sandbox.result.intel.filter(q=>q.floor===2).length,2);
});

function returnNavigation(){
 return {origin:{x:0,y:0},stepX:180,stepY:315,
  centers:Array.from({length:35},(_,i)=>({x:(i%5+.5)*180,y:(Math.floor(i/5)+.5)*315})),
  neighbors:Array.from({length:35},(_,i)=>[i-1,i+1,i-5,i+5].filter(j=>j>=0&&j<35))};
}
test('blocked search points are skipped and the final blocked point becomes a timed lookout',()=>{
 const s=guardScenario();s.api.begin(s.h);s.setBlocked(true);
 Object.assign(s.h.indoorAlert,{phase:'search',searchLeft:8,searchPoints:[{x:300,y:100},{x:400,y:100}],searchIndex:0});
 for(let i=0;i<16;i++)s.api.update(s.h,.1);
 assert.equal(s.h.indoorAlert.searchIndex,1);
 for(let i=0;i<16;i++)s.api.update(s.h,.1);
 assert.equal(s.h.indoorAlert.searchHold,true);
 assert.ok(s.h.indoorAlert.searchLeft<5);
 for(let i=0;i<50&&s.h.indoorAlert;i++)s.api.update(s.h,.1);
 assert.equal(s.h.indoorAlert,null);assert.equal(s.h.sus,0);assert.equal(s.h.st,0);
});
test('stationary post guards return to their original post after the search ends',()=>{
 const s=guardScenario();s.api.setWorld({currentFloor:0,floors:[{navigation:returnNavigation()}]});
 s.h.x=180;s.h.path=[{x:20,y:100}];s.h.indoorPost=true;
 s.api.finish(s.h);assert.deepEqual(s.h.indoorReturn.goal,{x:20,y:100});
 for(let tick=0;tick<80;tick++)s.api.update(s.h,.1);
 assert.equal(s.h.indoorReturn,null);assert.ok(Math.abs(s.h.x-20)<=12);
 assert.equal(s.h.wi,0);assert.ok(s.patrols>0,'normal stationary patrol resumes');
});
test('return planning prefers a nearby connected waypoint over one behind a long wall detour',()=>{
 const s=guardScenario(),nav={origin:{x:0,y:0},stepX:100,stepY:100,
  centers:Array.from({length:35},(_,i)=>({x:(i%5+.5)*100,y:(Math.floor(i/5)+.5)*100})),
  neighbors:Array.from({length:35},()=>[])};
 nav.neighbors[0]=[5];nav.neighbors[5]=[0,6];nav.neighbors[6]=[5,1];nav.neighbors[1]=[6];
 s.api.setWorld({currentFloor:0,floors:[{navigation:nav}]});
 s.h.x=90;s.h.y=50;s.h.path=[{x:110,y:50},{x:50,y:90},{x:450,y:650}];
 const plan=s.api.returnPlan(s.h);assert.equal(plan.index,1);
 s.api.finish(s.h);assert.equal(s.h.wi,1);assert.ok(s.h.indoorReturn);
 s.api.begin(s.h);assert.equal(s.h.indoorReturn,null,'new discovery cancels the return route');
});
test('a completed mission cannot escape from the upper floor through an emergency exit',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 let completed=0;
 const sandbox={ZONE_STYLE:{'敵迷路基地':{p:[]}},WH:14000,p:{},scoreStats:{},R:random(1221),
  document:{body:{classList:{remove(){}}}},rebuildSpatialGrid(){},say(){},sfx(){},
  module:{exports:{}},partner:null,hound:null,state:'play',playerDetectedNow:()=>false,
  D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),completeMission(){completed++;},
  mission:{index:3,points:[],progress:0,current:null}};
 vm.createContext(sandbox);
 vm.runInContext(source+`;setupInfiltrationWorld();
  indoorWorld.currentFloor=1;
  p.x=indoorWorld.emergency.x;p.y=indoorWorld.emergency.y;
  updateInfiltrationMission(.01);`,sandbox);
 assert.equal(completed,0,'upper-floor state cannot use any exterior exit');
 vm.runInContext('indoorWorld.currentFloor=0;updateInfiltrationMission(.01);',sandbox);
 assert.equal(completed,1,'ground-floor emergency exit remains usable');
});

function alarmWorld(){
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const labels=[],rectangles=[],gradients=[],bubbles=[],eyePupils=[];let currentArc=null;
 const gm=new Proxy({beginPath(){currentArc=null;},arc(...args){currentArc=args;},
  fill(){if(currentArc&&currentArc[1]===48&&currentArc[2]===3)eyePupils.push({x:currentArc[0],color:this.fillStyle});},
  fillText:t=>labels.push(t),fillRect(...r){rectangles.push({r,style:this.fillStyle});},
  createLinearGradient(...args){const stops=[];const gradient={args,stops,addColorStop:(...s)=>stops.push(s)};gradients.push(gradient);return gradient;}},
  {get:(o,k)=>k in o?o[k]:()=>{}});
 const sandbox={ZONE_STYLE:{'敵迷路基地':{p:[]}},WH:14000,W:840,H:720,p:{},scoreStats:{},R:random(1771),
  document:{body:{classList:{remove(){}}},getElementById:()=>({style:{},innerHTML:''})},
  rebuildSpatialGrid(){},say(){},sfx(){},module:{exports:{}},partner:null,hound:null,
  stageMode:'indoor',state:'play',debugMode:0,detectRange:()=>250,playerDetectedNow:()=>false,performance:{now:()=>1000},
  los:()=>true,drawPatrolChatBubbleAt:(...args)=>bubbles.push(args),
  DETECT_CENTER_HALF:7.5*Math.PI/180,DETECT_OUTER_HALF:52.5*Math.PI/180,DETECT_OUTER_SCALE:.7,
  enemyCannonSpeed:()=>630,fire:(...args)=>sandbox.bullets.push({args}),
  D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),angD:(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),
  mv:(h,dx,dy)=>{h.x+=dx;h.y+=dy;},pauseAfterEnemyDetection(){},gm,cam:0,camX:0};
 vm.createContext(sandbox);
 vm.runInContext(source+`;setupInfiltrationWorld();setupInfiltrationMission();
  indoorGuardSeesPlayer=()=>false;
  api={get world(){return indoorWorld;},record:indoorRecordGuardDiscovery,begin:indoorStartGuardPursuit,
   update:updateInfiltrationGuardAI,finish:indoorFinishGuardSearch,sweep:indoorBeginAlarmSweep,
   draw:drawInfiltrationMission,setup:setupInfiltrationWorld,chats:indoorUpdateAlarmChats,
   cancelChat:indoorCancelAlarmChat,scanBodies:indoorScanStunnedGuards,level:indoorAlarmLevel,weapon:indoorUpdateCommanderWeapon,setVisible:h=>{indoorGuardSeesPlayer=q=>q===h;}};`,sandbox);
 sandbox.enterHumanFound=h=>{h.st=1;h.target='p';sandbox.api.begin(h);};
 const sight=h=>{sandbox.api.world.currentFloor=h.indoorFloor-1;h.st=1;h.target='p';sandbox.api.begin(h);sandbox.api.record(h);};
 return {api:sandbox.api,sandbox,sight,labels,rectangles,gradients,bubbles,eyePupils};
}
test('three distinct firsthand witnesses trigger one building alarm across both floors',()=>{
 const s=alarmWorld(),world=s.api.world,[a,b,c]=world.floors[0].guards;
 s.sight(a);s.sight(a);assert.equal(world.alarm.witnesses.size,1);assert.equal(world.alarm.active,false);
 s.sight(b);assert.equal(world.alarm.active,false);
 const noise=world.floors[1].guards[0];s.api.record(noise);
 assert.equal(world.alarm.witnesses.size,2,'hearing a noise or receiving a report is not discovery');
 s.sight(c);assert.equal(world.alarm.active,true);assert.equal(world.alarm.witnesses.size,3);
 for(const floor of world.floors)for(const h of floor.guards){
  if([a,b,c].includes(h)){assert.equal(h.indoorAlert.phase,'found');continue;}
  assert.equal(h.indoorAlert.phase,'sweep');assert.equal(h.st,0);assert.equal(h.target,null);
 }
});
test('alarm activation and search never read the hidden player position',()=>{
 const s=alarmWorld(),world=s.api.world;
 const observers=world.floors[0].guards.slice(0,3);s.sight(observers[0]);s.sight(observers[1]);
 const third=observers[2];third.st=1;third.target='p';s.api.begin(third);
 Object.defineProperty(s.sandbox.p,'x',{get(){throw Error('hidden player coordinates read');}});
 s.api.record(third);
 const h=world.floors[1].guards[0],visited=new Set();
 for(let i=0;i<800;i++){s.api.update(h,.1);visited.add(h.indoorAlert.sweepCell);}
 assert.ok(visited.size>=4,'search actively visits different connected cells');
 assert.equal(h.indoorAlert.phase,'sweep');assert.equal(world.alarm.active,true);
});
test('an active alarm resumes global search after local pursuit and recovering from stun',()=>{
 const s=alarmWorld(),world=s.api.world,guard=world.floors[1].guards[0];guard.stun=1;
 for(const h of world.floors[0].guards.slice(0,3))s.sight(h);
 assert.equal(guard.indoorAlert,undefined,'stunned guards do not move');
 guard.stun=0;s.api.update(guard,.1);assert.equal(guard.indoorAlert.phase,'sweep');
 const pursuer=world.floors[0].guards[0];s.api.finish(pursuer);
 assert.equal(pursuer.indoorAlert.phase,'sweep');assert.equal(pursuer.indoorReturn,null);
 s.api.setup();assert.equal(s.api.world.alarm.active,false);assert.equal(s.api.world.alarm.witnesses.size,0);
});
test('red alarm shading is drawn only when active and its gradient is cached',()=>{
 const s=alarmWorld();s.api.draw();assert.ok(!s.labels.includes('館内アラート'));
 for(const h of s.api.world.floors[0].guards.slice(0,3))s.sight(h);
 s.api.draw();s.api.draw();
 assert.ok(s.labels.includes('館内アラート'));assert.equal(s.gradients.length,1);
 assert.equal(s.gradients[0].stops[0][1],'rgba(190,22,18,.48)');
 assert.ok(s.rectangles.some(q=>q.r[0]===0&&q.r[1]===0&&q.r[2]===840&&q.r[3]===144));
});
test('approximately one third of all building enemies are commanders without adding guards',()=>{
 const s=alarmWorld();let patrolCommanders=0,postCommanders=0;
 for(let seed=0;seed<50;seed++){
  s.api.setup();const guards=s.api.world.floors.flatMap(f=>f.guards);
  const commanders=guards.filter(h=>h.indoorCommander);
  assert.equal(commanders.length,Math.round(guards.length/3));
  assert.ok(guards.length>=20&&guards.length<=32,'existing building population remains bounded');
  patrolCommanders+=commanders.filter(h=>!h.indoorPost).length;
  postCommanders+=commanders.filter(h=>h.indoorPost).length;
 }
 assert.ok(patrolCommanders>0&&postCommanders>0,'commanders occur in patrols and posts');
});
test('building commanders use the radio pose and retain the dedicated indoor AI',()=>{
 const s=alarmWorld();let commanders=[];
 for(let i=0;i<12&&!commanders.length;i++){
  s.api.setup();commanders=s.api.world.floors.flatMap(f=>f.guards).filter(h=>h.indoorCommander);
 }
 assert.ok(commanders.length>0);
 for(const h of commanders){
  assert.equal(h.indoorGuard,true);
  assert.equal(h.frontCommander,true,'reuse the existing radio-equipped blue pose');
  assert.equal(h.commander,null,'outdoor commander AI is not enabled');
 }
});


function alarmChatPair(){
 const s=alarmWorld(),world=s.api.world;
 for(const h of world.floors[0].guards.slice(0,3))s.sight(h);
 for(const floor of world.floors)for(const h of floor.guards)h.indoorChatCooldown=100;
 const [a,b]=world.floors[0].guards.slice(3,5),y=world.floors[0].footprint.y+160;
 Object.assign(a,{x:200,y,indoorChatCooldown:0});Object.assign(b,{x:220,y,indoorChatCooldown:0});
 s.sandbox.cam=world.floors[0].footprint.y;
 return {...s,a,b};
}
test('question-mark alarm searchers stop on contact and display one shared speech bubble',()=>{
 const s=alarmChatPair(),{a,b}=s;
 s.api.chats(.1);
 assert.equal(a.indoorChatT,5);assert.equal(b.indoorChatT,5);
 assert.equal(a.indoorChatMate,b);assert.equal(b.indoorChatMate,a);
 assert.equal(a.chatT,undefined,'outdoor conversation state remains untouched');
 assert.equal(a.sus,1);assert.equal(b.sus,1);
 const before=[a.x,a.y,b.x,b.y];s.api.update(a,.1);s.api.update(b,.1);
 assert.deepEqual([a.x,a.y,b.x,b.y],before,'both searchers pause while talking');
 s.api.draw();assert.equal(s.bubbles.length,1,'one bubble per speaking pair');
});
test('alarm conversations last five seconds, then resume search with a cooldown',()=>{
 const s=alarmChatPair(),{a,b}=s;s.api.chats(.1);
 s.api.chats(4.9);assert.ok(a.indoorChatT>0&&b.indoorChatT>0);
 s.api.chats(.2);assert.equal(a.indoorChatT,0);assert.equal(b.indoorChatT,0);
 assert.ok(a.indoorChatCooldown>0&&b.indoorChatCooldown>0);
 assert.equal(a.indoorAlert.phase,'sweep');assert.equal(b.indoorAlert.phase,'sweep');
 const before=a.x;s.api.update(a,.6);s.api.update(a,.1);
 assert.notEqual(a.x,before,'search movement resumes after the brief pause');
 s.api.chats(.1);assert.equal(a.indoorChatT,0,'the same contact cannot immediately restart conversation');
});
test('discovery or stun interrupts both members of an alarm conversation',()=>{
 for(const cause of ['discovery','stun']){
  const s=alarmChatPair(),{a,b}=s;s.api.chats(.1);
  if(cause==='discovery'){s.api.setVisible(a);s.api.update(a,.14);assert.equal(a.indoorAlert.phase,'found');}
  else{a.stun=1;s.api.chats(.1);}
  assert.equal(a.indoorChatT,0);assert.equal(b.indoorChatT,0);
  assert.equal(a.indoorChatMate,null);assert.equal(b.indoorChatMate,null);
 }
});
test('alarm conversations require contact, a clear line and eligible search states',()=>{
 for(const condition of ['wall','distance','found','stunned','no-alarm']){
  const s=alarmChatPair(),{a,b}=s;
  if(condition==='wall')s.sandbox.los=()=>false;
  if(condition==='distance')b.x=a.x+50;
  if(condition==='found'){b.st=1;b.target='p';}
  if(condition==='stunned')b.stun=1;
  if(condition==='no-alarm')s.api.world.alarm.active=false;
  s.api.chats(.1);assert.ok(!(a.indoorChatT>0)&&!(b.indoorChatT>0),condition);
 }
});


function bodyDiscoveryPair(){
 const s=alarmWorld(),floor=s.api.world.floors[0];
 for(const f of s.api.world.floors)for(const h of f.guards)h.stunRecover=1;
 const [observer,body,other]=floor.guards;
 const y=floor.footprint.y+200;
 Object.assign(observer,{x:200,y,face:0,stunRecover:0});
 Object.assign(body,{x:250,y,stun:60,stunRecover:0});
 return {...s,observer,body,other};
}
test('a visible stunned enemy adds one eye and duplicate observers do not add more',()=>{
 const s=bodyDiscoveryPair();s.api.scanBodies(.21);
 assert.equal(s.api.level(),1);assert.equal(s.api.world.alarm.bodyCount,1);
 assert.equal(s.body.indoorBodyReported,true);
 assert.equal(s.observer.indoorAlert.phase,'lastSeen');
 assert.deepEqual({...s.observer.indoorAlert.lastSeen},{x:s.body.x,y:s.body.y});
 Object.assign(s.other,{x:210,y:s.body.y,face:0,stunRecover:0});
 s.api.scanBodies(.21);assert.equal(s.api.level(),1);
 s.body.stun=0;s.api.scanBodies(.21);s.body.stun=60;s.api.scanBodies(.21);
 assert.equal(s.api.level(),2,'a separate later stun can be discovered again');
});
test('body discovery requires line of sight, facing and a living observer',()=>{
 for(const condition of ['wall','behind','stunned-observer','dead-body']){
  const s=bodyDiscoveryPair();
  if(condition==='wall')s.sandbox.los=()=>false;
  if(condition==='behind')s.observer.face=Math.PI;
  if(condition==='stunned-observer')s.observer.stun=60;
  if(condition==='dead-body')s.body.alive=false;
  s.api.scanBodies(.21);assert.equal(s.api.level(),0,condition);
 }
});
test('two player witnesses plus one body discovery trigger the same three-eye alarm',()=>{
 const s=bodyDiscoveryPair(),guards=s.api.world.floors[0].guards;
 for(const h of guards.slice(3,5)){h.stunRecover=0;s.sight(h);}
 assert.equal(s.api.level(),2);assert.equal(s.api.world.alarm.active,false);
 Object.defineProperty(s.sandbox.p,'x',{get(){throw Error('hidden player position used by body discovery');}});
 s.api.scanBodies(.21);
 assert.equal(s.api.level(),3);assert.equal(s.api.world.alarm.active,true);
});
test('the upper-right eye slots fill red from zero through three warnings',()=>{
 const s=alarmWorld(),guards=s.api.world.floors[0].guards;
 for(let level=0;level<=3;level++){
  if(level)s.sight(guards[level-1]);
  s.eyePupils.length=0;s.api.draw();
  assert.equal(s.eyePupils.length,3);
  assert.equal(s.eyePupils.filter(q=>q.color==='#ff4b45').length,level);
  assert.deepEqual(s.eyePupils.map(q=>q.x),[758,786,814]);
 }
});
test('indoor commanders charge and fire bazooka rockets with no outdoor commander state',()=>{
 const s=alarmWorld(),h=s.api.world.floors[0].guards.find(h=>h.indoorCommander);
 const point={x:h.x+200,y:h.y};h.cd=0;
 assert.equal(s.api.weapon(h,point,true,false,.1),true);
 assert.equal(s.sandbox.bullets.length,0,'brief aim before firing');
 for(let i=0;i<6;i++)s.api.weapon(h,point,true,false,.1);
 assert.equal(s.sandbox.bullets.length,1);
 const bullet=s.sandbox.bullets[0];
 assert.equal(bullet.args[4],'c');assert.equal(bullet.args[5],630);assert.equal(bullet.args[6],480);
 assert.equal(bullet.commanderRocket,true);assert.equal(bullet.commanderShooter,h);
 assert.equal(h.cd,4);assert.equal(h.commander,null);assert.equal(h.whistleT,undefined);
 h.cd=0;s.api.weapon(h,point,true,false,.1);s.api.weapon(h,point,false,false,.1);
 assert.equal(h.indoorRocketCharge,0,'losing sight cancels the shot');
 assert.equal(s.sandbox.bullets.length,1);
});
test('only indoor commander artwork selects the bazooka through the dedicated actor flag',()=>{
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/characters.js'),'utf8');
 const a=src.indexOf('function drawCharacterWebP('),b=src.indexOf('function drawCharacterProne(',a);
 const weapons=[],bodies=[],art=Object.fromEntries(['player','player_plain','player_blue','blue','blue_commander','white','white_commander']
  .map(id=>[id,{id,naturalWidth:175,naturalHeight:192}]));
 const g=new Proxy({},{get:()=>()=>{}});
 const draw=new Function('CHARACTER_GRAPHICS_MODE','CHARACTER_ART','assetOK','performance','characterGait',
  'CHARACTER_GRAPHICS_SCALE','g','drawCharacterWeapon','drawOverheadCutout','characterArtKey','p',
  src.slice(a,b)+';return drawCharacterWebP;')('webp',art,()=>true,{now:()=>1000},()=>0,.84,g,
  (...v)=>weapons.push(v),im=>bodies.push(im.id),(_p,elite,c)=>c==='blue'?'blue_commander':elite?'white':'blue',{});
 for(const [actor,commander,expectedWeapon,expectedBody] of [
  [{indoorGuard:true,indoorCommander:true},'', 'blue','blue_commander'],
  [{},'', '', 'blue'],
  [{},'blue','blue','blue_commander'],
  [{indoorCommander:true},'', '', 'blue']]){
  weapons.length=0;bodies.length=0;draw(0,0,0,false,true,false,false,commander,true,false,actor);
  assert.equal(weapons[0][0],expectedWeapon);assert.equal(bodies[0],expectedBody);
 }
});
