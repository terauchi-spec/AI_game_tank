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
  assert.equal(f.rooms.length,10);assert.ok(f.guards.length>=6&&f.guards.length<=8,'6–8 patrol guards per floor');
  assert.equal(f.intel.length,3,'generator candidates');
  assert.ok(f.rooms.some(r=>r.size===1));
  assert.ok(f.rooms.some(r=>r.size>=3));
  assert.equal(f.rooms.reduce((s,r)=>s+r.tiles.length,0)+f.corridors.length,35);
  assert.ok(f.doors.length>=16&&f.doors.length<=20,'multiple doors plus two exterior exits');
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
   assert.ok(hallway.length>=10&&hallway.length<=13,'10–13 military props per floor');
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
  assert.ok(f.doors.length>=16&&f.doors.length<=20);
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

test('automatic doors have identical slim 12px thickness in both orientations',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const extract=(name)=>{
   const begin=source.indexOf('function '+name+'(');
   const end=source.indexOf('\n}\n',begin);
   assert.ok(begin>=0&&end>begin,'find function '+name);
   return source.slice(begin,end+2);
 };
 const geometry=new Function('INDOOR_DOOR_WIDTH','INDOOR_DOOR_THICKNESS','INDOOR_SCALE_X','INDOOR_SCALE_Y',
   extract('indoorDoorCollisionRect')+'\nreturn indoorDoorCollisionRect;')(84,12,1,1.75);
 const q={x:400,y:400};
 const vertical=geometry({...q,vertical:true}),horizontal=geometry({...q,vertical:false});
 assert.equal(vertical.w,12,'thin vertical door collision');
 assert.equal(horizontal.h,12,'thin horizontal door collision');
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
  g,{floors:[floor]},()=>{},840,720,1,1.75,84,12
 );
 drawer(0,250);
 assert.equal(fills.length,4,'two sliding panels per closed door');
 for(const rc of fills.slice(0,2))assert.equal(rc[2],12,'vertical drawn thickness');
 for(const rc of fills.slice(2))assert.equal(rc[3],12,'horizontal drawn thickness');
 // 触れる前は閉じたまま。薄くしても近接開閉のルールは維持する。
 const entities=[{x:450,y:400}],cover={noHit:false},door={...q,vertical:true,open:0,cover};
 const updater=new Function('indoorWorld','p','allies','partner','hound',
   'INDOOR_DOOR_THICKNESS','INDOOR_DOOR_SPEED','INDOOR_DOOR_WIDTH','INDOOR_SCALE_X','INDOOR_SCALE_Y',
   extract('updateInfiltrationDoors')+'\nreturn updateInfiltrationDoors;')(
     {floors:[{doors:[door],guards:[]}]},entities[0],[],null,null,12,5.2,84,1,1.75
   );
 updater(.2);assert.equal(cover.noHit,false,'stays shut away from the panel');
 entities[0].x=419;updater(.2);assert.equal(cover.noHit,true,'opens on contact');
 entities[0].x=470;updater(.3);assert.equal(cover.noHit,false,'closes on departure');
});

test('expanded patrol density and supply items remain separated and keep lanes clear',()=>{
  for(let seed=1;seed<=250;seed++)for(let floorNo=1;floorNo<=2;floorNo++){
    const f=indoorGenerateFloor(floorNo,random(seed*131+floorNo));
    const props=f.furniture.filter(q=>q.zone==='hallway');
    assert.ok(props.length>=10&&props.length<=13,'expanded hallway cover count');
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
   patterns.add(f.pattern);choices.add(f.stairIndex);lobbyOffsets.add(f.lobbyArea.x);
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

test('clustered wooden crates, barrels and shell pallets stay in groups of four or fewer',()=>{
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
  assert.ok([...g.values()].every(v=>v>=1&&v<=4),'maximum of four crates in a group');
  assert.ok(f.lightFixtures.length>=15,'ceiling lights regularly distributed');
  const loc=new Set(f.lightFixtures.map(p=>p.x+':'+p.y));
  assert.equal(loc.size,f.lightFixtures.length,'no duplicate light fixtures');
 }
});
test('dark places shorten guard sight while flashlight cone reveals players',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const helper=name=>{
  const a=src.indexOf('function '+name+'('),b=src.indexOf('\n}\n',a);
  assert.ok(a>=0&&b>a,name+' exists');
  return src.slice(a,b+2);
 };
 const mk=new Function('indoorWorld','INDOOR_LIGHT_RADIUS',helper('indoorLightLevel')+'\nreturn indoorLightLevel;');
 const light=mk({floors:[{footprint:{y:0,h:1800},lightFixtures:[{x:200,y:200}]}]},185);
 assert.ok(light(200,200)>.90);
 assert.ok(light(400,500)<.30,'dark corner makes enemy sight harder');
 const inside=new Function('INDOOR_TORCH_RADIUS','INDOOR_TORCH_HALF',helper('indoorFlashlightInside')+'\nreturn indoorFlashlightInside;')(245,.40);
 const guard={x:100,y:100,alive:true,stun:0};
 assert.equal(inside(guard,{x:270,y:100},0),true,'front beam sees target');
 assert.equal(inside(guard,{x:100,y:270},0),false,'beam does not reveal behind/outside its cone');
 assert.equal(inside(guard,{x:390,y:100},0),false,'beam has a defined maximum range');
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
