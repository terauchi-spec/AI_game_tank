const test=require('node:test');
const assert=require('node:assert/strict');
const {indoorGenerateFloor,indoorAt,indoorRect}=require('../js/infiltration-world.js');
const random=seed=>{let x=Math.imul(seed,2654435761)>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}};
const offset=9300,STEP=12,COLS=80,ROWS=360,GRID_Y=-700;
function reachablePoints(f){
 const rectangles=[...f.walls,...f.furniture].map(r=>indoorRect(r,offset));
 const occupied=new Uint8Array(COLS*ROWS);
 // Collision radius: conservatively inflate 9px. The doorway must stay wide.
 for(const r of rectangles){
  const x0=Math.max(0,Math.ceil((r.x-9)/STEP)),x1=Math.min(COLS-1,Math.floor((r.x+r.w+9)/STEP));
  const y0=Math.max(0,Math.ceil((r.y-offset-GRID_Y-9)/STEP)),y1=Math.min(ROWS-1,Math.floor((r.y+r.h-offset-GRID_Y+9)/STEP));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)occupied[y*COLS+x]=1;
 }
 const start=f.entrance||f.stair;
 const entrance=indoorAt(start.x,start.y,offset);
 const at=p=>{const q=indoorAt(p.x,p.y,offset);return [Math.round(q.x/STEP),Math.round((q.y-offset-GRID_Y)/STEP)]};
 const [sx,sy]=[Math.round(entrance.x/STEP),Math.round((entrance.y-offset-GRID_Y)/STEP)];
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
  assert.ok(f.intel.length>=2&&f.intel.length<=3,'each floor has enough candidates for its maximum two documents');
  assert.ok(f.rooms.some(r=>r.size===1));
  assert.ok(f.rooms.some(r=>r.size>=3));
  assert.equal(f.rooms.reduce((s,r)=>s+r.tiles.length,0)+f.corridors.length,35);
  assert.ok(f.doors.length>=14&&f.doors.length<=18,'interior doors plus ground-floor exits');
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
   if(!f.emergency||Math.abs(px-f.emergency.x)>92)assert.ok(isWall(px,y),'north boundary hole');
   if(px<f.lobbyArea.x-2||px>f.lobbyArea.x+f.lobbyArea.w+2)assert.ok(isWall(px,y+h),'south boundary hole');
  }
  for(const win of f.windows)assert.ok(isWall(win.x,win.y),'window must not leave a traversable hole');
  assert.ok(!isWall(f.entrance.x,y+h),'main doorway opening');
  if(f.emergency)assert.ok(!isWall(f.emergency.x,y),'emergency doorway opening');
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
test('large barracks has four to eight stationary guards outside the table',()=>{
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
   assert.equal(guard.waypoints.length,1,'guards stay at their original post');
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
  assert.ok(f.doors.length>=14&&f.doors.length<=18);
  assert.equal(f.doors.filter(d=>d.kind==='main'||d.kind==='emergency').length,0);
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
   save(){},restore(){},fillRect(){},imageSmoothingEnabled:true,
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

test('automatic doors keep 6px colliders while vertical artwork is 10 percent thinner than the previous 1.5 scale',()=>{
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
   save(){},restore(){},translate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
   fillRect(...args){fills.push(args);}
 };
 const doors=[{...q,vertical:true,open:0,kind:'room-hall'},
   {...q,x:600,vertical:false,open:0,kind:'room-room'}];
 const floor={footprint:{y:100,h:850},windows:[],doors};
 const drawer=new Function('drawInfiltrationDoorPanels','g','indoorWorld','drawInfiltrationProps','W','H','INDOOR_SCALE_X','INDOOR_SCALE_Y',
  'INDOOR_DOOR_WIDTH','INDOOR_DOOR_THICKNESS',
  extract('drawInfiltrationOpenings')+'\nreturn drawInfiltrationOpenings;')(
  ()=>false,g,{floors:[floor]},()=>{},840,720,1,1.75,84,thickness
 );
 drawer(0,250);
 assert.equal(fills.length,4,'two sliding panels per closed door');
 for(const rc of fills.slice(0,2))assert.equal(rc[2],6*1.35,'vertical fallback is 10 percent thinner');
 for(const rc of fills.slice(2))assert.equal(rc[3],6,'horizontal drawn thickness');
 // 触れる前は閉じたまま。薄くしても近接開閉のルールは維持する。
 const entities=[{x:450,y:400}],cover={noHit:false},door={...q,vertical:true,open:0,cover};
 const updater=new Function('indoorWorld','p','allies','partner','hound','indoorEndAllyCombat',
   'INDOOR_DOOR_THICKNESS','INDOOR_DOOR_SPEED','INDOOR_DOOR_WIDTH','INDOOR_SCALE_X','INDOOR_SCALE_Y',
   extract('updateInfiltrationDoors')+'\nreturn updateInfiltrationDoors;')(
     {floors:[{doors:[door],guards:[]}]},entities[0],[],null,null,()=>{},thickness,5.2,84,1,1.75
   );
 updater(.2);assert.equal(cover.noHit,false,'stays shut away from the panel');
 entities[0].x=419;updater(.2);assert.equal(cover.noHit,true,'opens on contact');
 entities[0].x=470;updater(.3);assert.equal(cover.noHit,false,'closes on departure');
});

test('automatic door WebP leaves retract without stretching with independent horizontal and vertical sprites',()=>{
 const fs=require('node:fs'),path=require('node:path'),src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const from=src.indexOf('function drawInfiltrationDoorPanels('),to=src.indexOf('function drawInfiltrationOpenings(',from);
 const image={naturalWidth:512,naturalHeight:75},horizontalImage={naturalWidth:512,naturalHeight:206},calls=[],rotations=[],requests=[];
 const g={save(){},restore(){},translate(){},rotate:a=>rotations.push(a),drawImage:(...a)=>calls.push(a)};
 const draw=new Function('g','indoorPropImage','INDOOR_DOOR_THICKNESS',src.slice(from,to)+';return drawInfiltrationDoorPanels;')(g,key=>{requests.push(key);return key==='automatic_door_cyan'?image:horizontalImage;},6);
 for(const vertical of [false,true])for(const open of [0,.5]){
  const half=vertical?73.5:42,part=half*(1-open),before=calls.length;
  assert.equal(draw({x:100,y:100,vertical},open,half,part),true);
  const chosen=vertical?image:horizontalImage,height=chosen.naturalHeight,depth=vertical?13.5:13*206/84,top=vertical?-6.75:-5;
  const [left,right]=calls.slice(before);assert.equal(left[0],chosen);assert.equal(right[0],chosen);
  assert.deepEqual(left.slice(1),[256*open,0,256*(1-open),height,-half,top,part,depth]);
  assert.deepEqual(right.slice(1),[256,0,256*(1-open),height,half-part,top,part,depth]);
 }
 assert.deepEqual(rotations,[Math.PI/2,Math.PI/2]);
 assert.deepEqual(requests,['automatic_door_horizontal_cyan','automatic_door_horizontal_cyan','automatic_door_cyan','automatic_door_cyan']);
});
test('automatic door rendering skips offscreen and fully retracted panels and keeps a loading fallback',()=>{
 const fs=require('node:fs'),path=require('node:path'),src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const from=src.indexOf('function drawInfiltrationDoorPanels('),to=src.indexOf('function drawInfiltrationAlarmEyes(',from);
 const calls=[],fills=[],requests=[],image={naturalWidth:512,naturalHeight:75};let ready=false;
 const g=new Proxy({drawImage:(...a)=>calls.push(a),fillRect:(...a)=>fills.push(a)},{get:(o,k)=>k in o?o[k]:()=>{}});
 const floor={footprint:{y:0,h:800},windows:[],doors:[{x:200,y:200,open:0},{x:300,y:200,open:1},{x:200,y:2000,open:0}]};
 const draw=new Function('g','indoorPropImage','indoorWorld','drawInfiltrationProps','W','H','INDOOR_SCALE_X','INDOOR_SCALE_Y','INDOOR_DOOR_WIDTH','INDOOR_DOOR_THICKNESS',
  src.slice(from,to)+';return drawInfiltrationOpenings;')(g,key=>{requests.push(key);return ready?image:null;},{floors:[floor]},()=>{},840,720,1,1.75,84,6);
 draw(0,0);assert.equal(calls.length,0);assert.equal(fills.length,2);assert.equal(requests.length,1);
 ready=true;draw(0,0);assert.equal(calls.length,2);assert.equal(fills.length,2);assert.equal(requests.length,2);
 assert.ok(!src.slice(from,to).includes('createElement'),'no per-door raster canvas');
});
test('automatic door asset is one small transparent WebP with no ground padding',()=>{
 const fs=require('node:fs'),path=require('node:path'),data=fs.readFileSync(path.join(__dirname,'../assets/indoor/automatic_door_cyan.webp'));
 assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data.length<24000);
 assert.ok(data[20]&16,'transparent alpha');
 assert.equal(1+data.readUIntLE(24,3),512);assert.equal(1+data.readUIntLE(27,3),75);
});
test('horizontal door WebP preserves the front-face size while original door sources stay available',()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const old=fs.readFileSync(path.join(__dirname,'../assets/indoor/automatic_door.webp'));
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+old.length+'\0'),old])).digest('hex'),'6d0a4cde06234a72140f17b0089d93d35f66e54b');
 const data=fs.readFileSync(path.join(__dirname,'../assets/indoor/automatic_door_horizontal_cyan.webp'));
 assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data.length<45000);assert.ok(data[20]&16);
 assert.equal(1+data.readUIntLE(24,3),512);assert.equal(1+data.readUIntLE(27,3),206);
});
test('horizontal door position is retained while widened vertical artwork stays centered on its unchanged logical position',()=>{
 const fs=require('node:fs'),path=require('node:path'),src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const from=src.indexOf('function drawInfiltrationDoorPanels('),to=src.indexOf('function drawInfiltrationAlarmEyes(',from);
 const image={naturalWidth:512,naturalHeight:206},doors=[{x:100,y:200,vertical:true,open:0},{x:300,y:200,open:0}];
 let tx=0,ty=0,ready=false;const stack=[],fills=[],images=[],lines=[];
 const g=new Proxy({save(){stack.push([tx,ty]);},restore(){[tx,ty]=stack.pop();},translate(x,y){tx+=x;ty+=y;},
  fillRect(x,y,w,h){fills.push([x+tx,y+ty,w,h]);},drawImage(...a){images.push([a[5]+tx,a[6]+ty]);},moveTo(x,y){lines.push([x+tx,y+ty]);}},
  {get:(o,k)=>k in o?o[k]:()=>{}});
 const draw=new Function('g','indoorPropImage','indoorWorld','drawInfiltrationProps','W','H','INDOOR_SCALE_X','INDOOR_SCALE_Y','INDOOR_DOOR_WIDTH','INDOOR_DOOR_THICKNESS',
  src.slice(from,to)+';return drawInfiltrationOpenings;')(g,()=>ready?image:null,{floors:[{footprint:{y:0,h:800},windows:[],doors}]},()=>{},840,720,1,1.75,84,6);
 draw(0,0);assert.equal(fills[0][1],126.5,'vertical fallback is unchanged');
 assert.equal(fills[0][0],95.95,'widened vertical fallback remains centered');
 assert.deepEqual(lines.slice(0,2),[[90.55,126.5],[109.45,126.5]],'vertical frame is reduced by 10 percent');
 assert.equal(fills[2][1],187,'horizontal fallback moves 6px south from its previous offset');
 assert.deepEqual(lines.slice(2),[[258,183],[258,197]],'both horizontal frame rails move with the leaves');
 ready=true;draw(0,0);assert.equal(images[2][1],185,'horizontal WebP moves 6px south from its previous offset');
 assert.equal(doors[0].y,200);assert.equal(doors[1].y,200,'logical door positions are unchanged');
 assert.equal(tx,0);assert.equal(ty,0,'offset cannot leak to following graphics');
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
  assert.ok(halls.length>=3&&halls.every(l=>l.anchor==='hall-regular'||l.anchor==='hall-terminal'||l.anchor==='hall-extra'),
    'corridor lamps are placed at regular intervals and at short passage ends');
  const tileCenters=new Set(f.corridors.map(c=>(c.x+c.w/2)+':'+(c.y+c.h/2)));
  for(const light of halls){
    assert.ok(tileCenters.has(light.x+':'+light.y),'every corridor light is on the passage centerline');
    assert.ok(light.rx>0&&light.ry>0,'each lamp has a bounded pool of light');
    assert.equal(light.rx,light.ry,'corridor light is circular');
    assert.ok(light.rx<=180*.65,'corridor pool size is bounded');
  }
  assert.ok(lights.length>=22&&lights.length<=45,'added room lighting remains within a bounded fixture budget');
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
    const tables=f.furniture.filter(o=>o.artKind==='desk'||o.artKind==='operations_table'||o.kind==='postTable');
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
   const tables=f.furniture.filter(o=>(o.artKind==='desk'||o.artKind==='operations_table'||o.kind==='postTable')&&
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
 assert.ok(src.includes('item.zone===\'lobby\'?corridors:'),
   'lobby lights share the open corridor floor');
 assert.ok(src.includes('q.clip();'),'lighting is clipped before drawing');
 assert.ok(src.includes('rx:radius,ry:radius'),'light aspect ratio is preserved in world coordinates');
 assert.ok(src.includes('function indoorLightingStamp()'),'radial stamp is reused');
});
test('ceiling lighting transitions smoothly rather than switching abruptly',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const start=src.indexOf('function indoorLightLevel('),end=src.indexOf('\n}\n',start);
 assert.ok(start>=0&&end>start);
 const fn=new Function('indoorWorld','INDOOR_LIGHT_RADIUS','INDOOR_FORECOURT_DEPTH',
   src.slice(start,end+2)+'\nreturn indoorLightLevel;')({
     floors:[{footprint:{y:0,h:1800},lightFixtures:[{x:200,y:200}]}]},185,900);
 const levels=[0,45,90,135,180,260].map(d=>fn(200+d,200));
 for(let i=1;i<levels.length;i++)assert.ok(levels[i]<=levels[i-1],'light must fade with distance');
 assert.ok(levels[0]>.90&&levels[2]>.40&&levels[2]<.80&&levels[4]<.25);
 assert.ok(levels[1]<levels[0]&&levels[3]>levels[4],'intermediate gradient zones exist');
 assert.ok(src.includes('indoorLightStamp'),'gradient texture is cached for mobile');
});
test('indoor crates use a 1.5:1 horizontal shape while pallets and outdoor sprites retain their ratios',()=>{
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
 const drawFn=new Function('COVER_IMG','fitAspect','drawAssetSprite','drawInfiltrationShellPallet',
   extract('function drawObject(o){','\nfunction drawBuiltConcrete(')+'\nreturn drawObject;')(
   {crate,shell_pallet:shell},fitFn,drawSprite,()=>false);
 drawFn({x:0,y:0,w:60,h:40,kind:'crate',indoorExplosive:true});
 drawFn({x:0,y:0,w:120,h:120,kind:'shellPallet',indoorExplosive:true});
 assert.ok(Math.abs(draws[0].w/draws[0].h-1.5)<.0001,'indoor crate is 1.5 times as wide as tall');
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
 const light=new Function('indoorWorld','INDOOR_LIGHT_RADIUS','INDOOR_FORECOURT_DEPTH',
   src.slice(a,b+2)+'\nreturn indoorLightLevel;')({
     floors:[{footprint:{y:0,h:1800},lightFixtures:[{x:200,y:200}]}]},185,900);
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
   assert.equal(o.h,o.kind==='crate'?o.w/1.5/1.75:o.w,'crate ratio accounts for the indoor world scale');
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
 const avatar={x:200,y:100};let visible=false,patrols=0,patrolSpeed=0,finished=0,shots=0,wallClear=true,light=1,blockedMovement=false,visionChecks=0;
 const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const ray=(a,b)=>typeof wallClear==='function'?wallClear(a,b):wallClear;
 const api=new Function('p','R','D','angD','pauseAfterEnemyDetection','fire','los','cachedLos',
 'debugMode','weather','inTumbleweed','inBush','inWaterAt','detectRange','DETECT_CENTER_HALF','DETECT_OUTER_HALF','DETECT_OUTER_SCALE',
 'patrol','findDetectedTarget','enterHumanFound','mv',
 'const module={exports:{}};'+src+`
 indoorMoveGuardTo=(h,q,dt,sp)=>{if(movementBlocked())return false;const d=D(h,q),k=Math.min(1,sp*dt/Math.max(.001,d));h.x+=(q.x-h.x)*k;h.y+=(q.y-h.y)*k;return true;};
 indoorGuardSeesPlayer=()=>visibleNow();
 indoorLightLevel=()=>lightNow();
 return {risk:indoorVisualSuspicionRate,relay:indoorObserveFoundGuard,begin:indoorStartGuardPursuit,update:updateInfiltrationGuardAI,points:indoorSearchPoints,share:indoorShareGuardSighting,approach:indoorReportApproachPoint,
 setSensors:(v,l,b)=>{visibleNow=v;lightNow=l;movementBlocked=b;},setWorld:w=>{indoorWorld=w;},
 finish:indoorFinishGuardSearch,returnPlan:indoorPatrolReturnPlan,
 gen:indoorGenerateFloor,grid:indoorMakeGuardGrid,at:indoorAt};
 function visibleNow(){return false;} function lightNow(){return 1;} function movementBlocked(){return false;}
 `)(avatar,()=>.5,d,(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),()=>{finished++;},()=>{shots++;},
 ray,ray,0,'clear',()=>false,()=>false,()=>false,()=>250,.2,1,.7,
 (h,_dt,sp)=>{patrols++;patrolSpeed=sp;return h.face;},()=>null,h=>{
  h.st=1;h.target='p';h.sus=0;if(!h.indoorAlert||h.indoorAlert.phase!=='found')api.begin(h);
 },(h,dx,dy)=>{h.x+=dx;h.y+=dy;});
 api.setSensors(()=>{visionChecks++;return visible;},()=>light,()=>blockedMovement);
 api.setWorld({currentFloor:0,floors:[{}]});
 const h={indoorGuard:true,indoorFloor:1,alive:true,st:1,target:'p',x:0,y:100,face:0,cd:100,ct:0};
 return {api,h,avatar,setVisible:v=>visible=v,setWall:v=>wallClear=v,setLight:v=>light=v,setBlocked:v=>blockedMovement=v,
 get visionChecks(){return visionChecks;},get finished(){return finished;},get patrolSpeed(){return patrolSpeed;},get patrols(){return patrols;},get shots(){return shots;}};
}
test('sight loss travels to the last sighting, then searches with a hard timeout',()=>{
 const s=guardScenario(),{api,h,avatar}=s;api.begin(h);
 api.update(h,2.71);assert.equal(h.indoorAlert.phase,'lastSeen');
 assert.equal(h.indoorAlert.lastSeen.x,200);
 avatar.x=900; // Hidden avatar position must not change the destination.
 for(let i=0;i<200&&h.indoorAlert?.phase!=='search';i++)api.update(h,.05);
 assert.equal(h.indoorAlert.phase,'search');assert.ok(Math.abs(h.x-200)<25);
 for(let i=0;i<162&&h.indoorAlert;i++)api.update(h,.05);
 assert.equal(h.indoorAlert,null);assert.equal(h.st,0);assert.equal(h.sus,0);assert.equal(s.finished,1);
 h.st=1;h.target='p';api.begin(h);api.update(h,2.71);
 s.setVisible(true);api.update(h,.14);assert.notEqual(h.indoorAlert.phase,'found');
 for(let i=0;i<60&&h.indoorAlert?.phase!=='found';i++)api.update(h,.1);
 assert.equal(h.indoorAlert.phase,'found');
 assert.equal(h.indoorAlert.lastSeen.x,900);
});
test('indoor guards follow current visible player and last seen position if hidden',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const piece=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+a.length));
 const code=piece('function indoorStartGuardPursuit(h){','function indoorGuardSeesPlayer(')+
  piece('function updateInfiltrationGuardAI(h,dt){','function updateInfiltrationDoors(dt){');
 const avatar={x:180,y:110},destinations=[];let visible=true;
 const [begin,update]=new Function('p','R','D','indoorGuardSeesPlayer','indoorMoveGuardTo',
  'indoorEstimateEscape','angD','pauseAfterEnemyDetection','enterHumanFound','enemyBombPoint','bombs','fire',
  'performance','INDOOR_TRAIL_LIMIT','indoorShareGuardSighting','indoorRecordGuardDiscovery','indoorObserveFoundGuard','indoorUpdateAllyCombat','indoorStairProtected',code+'\nreturn [indoorStartGuardPursuit,updateInfiltrationGuardAI];')(
  avatar,()=>.6,(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),()=>visible,
  (h,p)=>{destinations.push({...p});return true;},(_h,state)=>state.lastSeen,()=>0,()=>{},()=>{},()=>({x:0,y:0}),
  [],()=>{}, {now:()=>0},48,()=>0,()=>{},()=>false,()=>false,()=>false);
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
 assert.ok(src.includes("state.remaining=2.7"),'transient loss has grace period');
 assert.ok(src.includes("state.remaining=2.7"),'fresh sight renews pursuit memory');
 assert.ok(src.includes("enterHumanFound(h,'p');indoorStartGuardPursuit(h)"),'reacquisition transitions to found');
});
test('indoor navigation crosses beyond door boundaries and throttles vision checks',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 assert.ok(src.includes('(target.x-nav.centers[from].x)*.78'),'door waypoint crosses the doorway');
 assert.ok(src.includes('(target.y-nav.centers[from].y)*.78'),'door waypoint advances beyond the door');
 assert.ok(src.includes('state.sightCheckT=.12+'),'vision rays are throttled');
 assert.ok(src.includes('state.sightCheckT=0;'),'search transition checks vision immediately');
 assert.ok(src.includes('state.remaining=2.7'),'brief visibility loss remains tolerated');
});
test('entrance has three soft ceiling pools and indoor lighting retains a brighter base',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 assert.ok(src.includes("q.fillStyle='rgba(7,13,15,.58)'"),'uniform ambient light without selective wall cutouts');
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
 const {indoorMakeGuardGrid,indoorGridDetour,indoorAt,indoorGridPoint,indoorGridSafePoint}=
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
   const pa=indoorGridSafePoint(grid,indoorAt(70+(a%5+.5)*180,80+(Math.floor(a/5)+.5)*180,9300));
   const pb=indoorGridSafePoint(grid,indoorAt(70+(b%5+.5)*180,80+(Math.floor(b/5)+.5)*180,9300));
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
   "\nreturn {gen:indoorGenerateFloor,grid:indoorMakeGuardGrid,safe:indoorGridSafePoint,move:indoorMoveGuardTo,at:indoorAt,setWorld:w=>{indoorWorld=w;}};"
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
  const actor={...sim.safe(nav.grid,sim.at(guard.x,guard.y,off)),face:guard.face,indoorFloor:1,indoorAlert:{},alive:true};
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

test('patrol suspicion confirms at 90 percent while investigation confirms at 55 percent with fresh sight',()=>{
 for(const investigating of [false,true])for(const above of [false,true])for(const clear of [false,true]){
  const s=guardScenario();s.h.st=0;s.h.target=null;s.h.x=-300;
  if(investigating){s.api.begin(s.h);s.h.indoorAlert.phase='lastSeen';}
  const threshold=investigating?.55:.9;
  s.h.indoorNotice={checkT:1,sampleAge:0,exposure:threshold+(above?.01:-.01),visible:true,rate:0};
  s.setVisible(true);s.setWall(clear);s.api.update(s.h,.001);
  assert.equal(s.h.st,above&&clear?1:0);
  if(above&&clear)assert.equal(s.h.indoorAlert.phase,'found');
 }
 // A stale positive sample still needs real sight before recognition.
 const s=guardScenario();s.h.st=0;s.h.target=null;
 s.h.indoorNotice={checkT:1,sampleAge:0,exposure:.95,visible:true,rate:0};
 s.setVisible(false);s.api.update(s.h,.001);assert.equal(s.h.st,0);
});
test('brief exposure can fade and darkness gives more time before recognition',()=>{
 const notice=light=>{const s=guardScenario();s.h.st=0;s.h.target=null;s.setLight(light);s.setVisible(true);return s;};
 const bright=notice(1),dark=notice(.24);
 for(let i=0;i<25;i++){bright.api.update(bright.h,.05);dark.api.update(dark.h,.05);}
 assert.equal(bright.h.indoorAlert.phase,'found');assert.equal(dark.h.st,0);
 for(let i=0;i<60;i++)dark.api.update(dark.h,.05);
 assert.equal(dark.h.indoorAlert.phase,'found');
 const brief=notice(1);
 for(let i=0;i<4;i++)brief.api.update(brief.h,.05);
 brief.setVisible(false);for(let i=0;i<12;i++)brief.api.update(brief.h,.05);
 assert.equal(brief.h.st,0);assert.equal(brief.h.indoorAlert,undefined);
 assert.equal(brief.h.sus,0);assert.ok(brief.patrols>0);
});
test('each visual cue increases risk and overlapping cues compound',()=>{
 const {api}=guardScenario();
 const rate=mask=>api.risk(mask&1?.96:.24,mask&2?120:0,mask&4?35:260,mask&8?0:1.4);
 for(let mask=0;mask<16;mask++)for(let bit=1;bit<=8;bit*=2){
  if(!(mask&bit))assert.ok(rate(mask|bit)>rate(mask),'every cue raises risk at every combination');
 }
 assert.equal(rate(0),.08);assert.ok(Math.abs(rate(15)-2.8)<1e-9);
 assert.ok(rate(15)-rate(0)>[1,2,4,8].reduce((sum,bit)=>sum+rate(bit)-rate(0),0),
  'overlapping cues compound instead of applying a single fixed delay');
 assert.equal(api.risk(-1,-100,2000,10),rate(0));
 assert.equal(api.risk(2,1000,-100,0),rate(15));
});
test('a dark stationary peripheral glimpse can pass without stopping patrol',()=>{
 const s=guardScenario();s.h.st=0;s.h.target=null;s.h.face=-1.15;s.setLight(.24);s.setVisible(true);
 for(let i=0;i<20;i++)s.api.update(s.h,.05);
 assert.equal(s.h.sus,0);assert.equal(s.h.st,0);assert.ok(s.patrols>=20);
 assert.equal(s.h.indoorAlert,undefined);
 s.setVisible(false);for(let i=0;i<10;i++)s.api.update(s.h,.05);
 assert.equal(s.h.indoorNotice.exposure,0,'concealment clears unconfirmed evidence');
});
test('moving in a nearby bright sightline is confirmed faster than standing still',()=>{
 const recognitionTime=(moving,light)=>{
  const s=guardScenario();s.h.st=0;s.h.target=null;s.setLight(light);s.setVisible(true);s.avatar.x=58;
  for(let i=0;i<200;i++){
   if(moving)s.avatar.x=i%2?66:50;
   s.api.update(s.h,.04);if(s.h.st)return (i+1)*.04;
  }
  return Infinity;
 };
 const moving=recognitionTime(true,1),standing=recognitionTime(false,1),shadow=recognitionTime(false,.24);
 assert.ok(moving>=.3&&moving<standing,`${moving} < ${standing}`);
 assert.ok(standing<shadow&&shadow<4,`${standing} < ${shadow}`);
});
test('visual suspicion retains throttled sight checks for patrol and search',()=>{
 for(const search of [false,true]){
  const s=guardScenario();s.h.st=0;s.h.target=null;
  if(search){s.api.begin(s.h);s.h.indoorAlert.phase='lastSeen';s.h.indoorAlert.travelLeft=10;}
  for(let i=0;i<120;i++)s.api.update(s.h,1/120);
  assert.ok(s.visionChecks>=7&&s.visionChecks<=10,'no per-frame vision rays');
 }
});
test('same-floor search cannot read hidden displacement or refresh its report',()=>{
 const s=guardScenario();s.api.begin(s.h);s.api.update(s.h,1.36);
 const report={...s.h.indoorAlert.lastSeen};
 Object.defineProperty(s.avatar,'x',{get(){throw Error('hidden displacement queried');}});
 for(let i=0;i<5;i++)s.api.update(s.h,.1);
 assert.deepEqual(s.h.indoorAlert.lastSeen,report);
});
test('visual suspicion begins above 11 percent without confirming or attacking',()=>{
 for(const exposure of [.10,.12]){
  const s=guardScenario();s.h.st=0;s.h.target=null;s.setVisible(true);
  s.h.indoorNotice={checkT:1,sampleAge:0,exposure,visible:true,rate:0};
  s.api.update(s.h,.001);
  assert.equal(s.h.sus>0,exposure>.11);assert.equal(s.h.st,0);
  assert.equal(s.h.indoorAlert,undefined);assert.equal(s.shots,0);
 }
});
test('slower nearby footsteps start investigation within 84 pixels while walls and distance protect',()=>{
 for(const distance of [83,85])for(const clear of [true,false]){
  const s=guardScenario();s.h.st=0;s.h.target=null;s.h.x=120;s.setWall(clear);
  s.avatar.x=s.h.x+distance+10;
  s.api.update(s.h,.13);assert.equal(s.h.indoorAlert,undefined,'standing remains silent');
  s.avatar.x-=10;s.api.update(s.h,.13); // 77px/s: audible above 70, below the previous 80.
  if(clear&&distance===83){
   assert.equal(s.h.indoorAlert.phase,'lastSeen');assert.equal(s.h.st,0);
  }else assert.equal(s.h.indoorAlert,undefined);
 }
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
  const s=guardScenario();s.h.x=-300;s.api.begin(s.h);s.api.update(s.h,2.71);
  if(phase==='search'){s.h.x=200;s.api.update(s.h,.05);}
  assert.equal(s.h.indoorAlert.phase,phase);
  s.avatar.x=240;s.setVisible(true);s.api.update(s.h,.14);
  assert.equal(s.h.indoorAlert.phase,phase,'a glimpse must not instantly confirm');
  assert.equal(s.h.indoorAlert.lastSeen.x,200,'unconfirmed glimpse cannot overwrite the report');
  for(let i=0;i<60&&s.h.indoorAlert?.phase!=='found';i++)s.api.update(s.h,.1);
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
 assert.notEqual(second.indoorAlert.phase,'found');
 for(let i=0;i<60&&second.indoorAlert?.phase!=='found';i++)s.api.update(second,.1);
 assert.equal(second.indoorAlert.phase,'found');
 assert.equal(second.indoorAlert.approachGoal,undefined,'new pursuit drops the old inferred destination');
 assert.equal(second.indoorAlert.lastSeen.x,120);
});
test('initial recognition retains only movement witnessed in successive visible samples',()=>{
 const s=guardScenario();s.h.st=0;s.h.target=null;s.setVisible(true);
 s.api.update(s.h,.13);s.avatar.x+=20;s.api.update(s.h,.13);s.avatar.x+=20;s.api.update(s.h,.13);
 s.avatar.x+=20;s.api.update(s.h,.13);
 for(let i=0;i<20&&!s.h.st;i++){s.avatar.x+=20;s.api.update(s.h,.13);}
 assert.equal(s.h.indoorAlert.phase,'found');
 assert.deepEqual(s.h.indoorAlert.lastDir,{x:1,y:0},'observed movement can inform the first report');
 const hidden=guardScenario();hidden.h.st=0;hidden.h.target=null;
 hidden.api.update(hidden.h,.13);hidden.avatar.x=800;hidden.setVisible(true);
 for(let i=0;i<40&&!hidden.h.st;i++)hidden.api.update(hidden.h,.13);
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
  const draw=new Function('g','indoorWorld','WW','H','INDOOR_FORECOURT_DEPTH','W','terrainSurfacePattern','indoorOutdoorTerrain','indoorConcretePattern','INDOOR_EXIT_RADIUS','INDOOR_EXIT_SECONDS','drawInfiltrationStairSprite',src.slice(from,to)+';return drawInfiltrationFloors;')(
   g,{floors:[f]},960,2500,900,960,()=>null,{g:0},()=>null,90,5,()=>false);
  labels.length=0;fills.length=0;draw(0,0);
  if(floorNo===1){
   assert.ok(labels.includes('EXIT'));assert.ok(!labels.includes('2F ▲'));
   for(const label of ['エントランスホール','正面玄関','非常口',...f.rooms.map(r=>r.name)])assert.ok(!labels.includes(label));
  }else{
   assert.ok(!labels.includes('1F ▼'));
   for(const label of ['エントランスホール','正面玄関','非常口'])assert.ok(!labels.includes(label));
   assert.ok(!fills.some(r=>r[2]===110&&r[1]===f.footprint.y+f.footprint.h),'no exterior entrance path');
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
 assert.ok(ground.entrance&&ground.lobbyArea);
 assert.equal(ground.openings.some(q=>q.side===-1),!!ground.emergency);
 assert.equal(upper.entrance,null);assert.equal(upper.exit,null);
 assert.equal(upper.emergency,null);assert.equal(upper.lobbyArea,null);
 assert.ok(upper.doors.every(d=>!d.outer));
 assert.ok(upper.lightFixtures.every(l=>l.clipTiles.length>0&&l.clipTiles.every(Boolean)));
 assert.equal(ground.stair.x,upper.stair.x);
 assert.equal(ground.stair.y-ground.offset,upper.stair.y-upper.offset);
 assert.equal(sandbox.result.intel.length,3);
 assert.ok([1,2].includes(sandbox.result.intel.filter(q=>q.floor===2).length));
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
 assert.equal(s.h.wi,0);assert.equal(s.patrols,0,'post guard never invokes the general patrol pathfinder');
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
 const sandbox={ZONE_STYLE:{'敵迷路基地':{p:[]}},WH:14000,WW:960,W:840,H:720,p:{},scoreStats:{},R:random(1221),
  document:{body:{classList:{remove(){}}}},rebuildSpatialGrid(){},say(){},sfx(){},
  module:{exports:{}},partner:null,hound:null,stageMode:'indoor',state:'play',playerDetectedNow:()=>false,
  D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),los:()=>true,completeMission(){completed++;},
  mission:{index:3,points:[],progress:0,current:null}};
 vm.createContext(sandbox);
 vm.runInContext(source+`;setupInfiltrationWorld();
  for(let i=0;i<30&&!indoorWorld.emergency;i++)setupInfiltrationWorld();
  indoorWorld.currentFloor=1;
  p.x=indoorWorld.emergency.x;p.y=indoorWorld.emergency.y;
  updateInfiltrationMission(.01);`,sandbox);
 assert.equal(completed,0,'upper-floor state cannot use any exterior exit');
 vm.runInContext('indoorWorld.currentFloor=0;for(let i=0;i<50;i++)updateInfiltrationMission(.1);',sandbox);
 assert.equal(completed,1,'ground-floor emergency exit remains usable');
});

function alarmWorld(seed=1771){
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const labels=[],rectangles=[],gradients=[],bubbles=[],eyePupils=[],rotations=[],strokes=[];let currentArc=null;
 const gm=new Proxy({stroke(){strokes.push(this.strokeStyle);},rotate:angle=>rotations.push(angle),beginPath(){currentArc=null;},arc(...args){currentArc=args;},
  fill(){if(currentArc&&currentArc[1]===48&&currentArc[2]===3)eyePupils.push({x:currentArc[0],color:this.fillStyle});},
  fillText:t=>labels.push(t),fillRect(...r){rectangles.push({r,style:this.fillStyle});},
  createLinearGradient(...args){const stops=[];const gradient={args,stops,addColorStop:(...s)=>stops.push(s)};gradients.push(gradient);return gradient;}},
  {get:(o,k)=>k in o?o[k]:()=>{}});
 const sandbox={ZONE_STYLE:{'敵迷路基地':{p:[]}},WH:14000,WW:960,W:840,H:720,p:{},scoreStats:{},R:random(seed),
  document:{body:{classList:{remove(){}}},getElementById:()=>({style:{},innerHTML:''})},
  rebuildSpatialGrid(){},say(){},sfx(){},module:{exports:{}},partner:null,hound:null,
  stageMode:'indoor',state:'play',skill:'partner',patrol:h=>h.face,findDetectedTarget:()=>null,hitsM:()=>false,debugMode:0,detectRange:()=>250,playerDetectedNow:()=>false,performance:{now:()=>1000},
  los:()=>true,drawPatrolChatBubbleAt:(...args)=>bubbles.push(args),
  DETECT_CENTER_HALF:7.5*Math.PI/180,DETECT_OUTER_HALF:52.5*Math.PI/180,DETECT_OUTER_SCALE:.7,
  enemyCannonSpeed:()=>630,fire:(...args)=>sandbox.bullets.push({args}),
  D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),angD:(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),
  mv:(h,dx,dy)=>{h.x+=dx;h.y+=dy;},pauseAfterEnemyDetection(){},gm,cam:0,camX:0};
 vm.createContext(sandbox);
 vm.runInContext(source+`;setupInfiltrationWorld();setupInfiltrationMission();
  indoorGuardSeesPlayer=()=>false;
  api={entranceGuards:indoorUpdateEntranceGuards,hearExplosion:indoorHearExplosion,postChats:indoorUpdatePostChats,lightLevel:indoorLightLevel,seesAlly:indoorGuardSeesAlly,allyCombat:indoorUpdateAllyCombat,selectSweep:indoorSelectSweepGoal,sweepPoints:indoorAlarmSweepPoints,reinforce:indoorReplenishGuards,spawnPoint:indoorReinforcementPoint,get world(){return indoorWorld;},record:indoorRecordGuardDiscovery,begin:indoorStartGuardPursuit,
   updateMission:updateInfiltrationMission,update:updateInfiltrationGuardAI,finish:indoorFinishGuardSearch,sweep:indoorBeginAlarmSweep,
   draw:drawInfiltrationMission,setup:setupInfiltrationWorld,chats:indoorUpdateAlarmChats,
   cancelChat:indoorCancelAlarmChat,scanBodies:indoorScanStunnedGuards,level:indoorAlarmLevel,weapon:indoorUpdateCommanderWeapon,setVisible:h=>{indoorGuardSeesPlayer=q=>q===h;}};`,sandbox);
 sandbox.enterHumanFound=(h,key='p')=>{h.st=1;h.target=key;if(key==='p')sandbox.api.begin(h);};
 const sight=h=>{sandbox.api.world.currentFloor=h.indoorFloor-1;h.st=1;h.target='p';sandbox.api.begin(h);sandbox.api.record(h);};
 return {api:sandbox.api,sandbox,sight,labels,rectangles,gradients,bubbles,eyePupils,rotations,strokes};
}
test('indoor decoys distract every guard mode and add a unique red eye without player coordinates',()=>{
 for(const phase of ['patrol','suspicion','found','lastSeen','search','sweep']){
  const s=alarmWorld(),h=s.api.world.floors[0].guards.find(q=>!q.indoorCommander);
  h.cd=99;const point={x:h.x+100,y:h.y,t:5,indoorFloor:1};s.sandbox.decoy=point;
  if(phase==='suspicion')h.sus=2;
  if(['found','lastSeen','search'].includes(phase)){s.api.begin(h);h.indoorAlert.phase=phase;h.indoorAlert.visible=false;h.st=phase==='found'?1:0;h.target=phase==='found'?'p':null;}
  if(phase==='sweep'){s.api.world.alarm.active=true;s.api.sweep(h);}
  const previous=h.indoorAlert,eyes=s.api.level(),moves=[];
  s.sandbox.los=(_h,target)=>{assert.equal(target,point);return false;};
  s.sandbox.mv=(actor,dx,dy)=>{moves.push([dx,dy]);actor.x+=dx;actor.y+=dy;};
  Object.defineProperty(s.sandbox.p,'x',{get(){throw Error('decoy AI must not read hidden player');}});
  assert.equal(s.api.update(h,.1),true,phase);assert.equal(h.target,'decoy');assert.equal(h.st,1);
  assert.equal(h.indoorDecoy.source,point);assert.equal(h.indoorAlert,previous,'preserve the interrupted route');
  assert.equal(s.api.level(),eyes+(phase==='sweep'?0:1),'decoy discovery uses the normal warning counter until the alarm activates');
  assert.equal(s.sandbox.bullets.length,0,'no shooting through a wall');
  assert.ok(moves.length>0,'hearing moves toward the lure even without sight: '+phase);
 }
});
test('three distinct decoy discoveries activate the building alarm once without cancelling lure reactions',()=>{
 const s=alarmWorld(),guards=s.api.world.floors[0].guards.slice(0,4),source={x:guards[0].x,y:guards[0].y,t:5,indoorFloor:1};
 s.sandbox.decoy=source;s.sandbox.los=()=>false;
 for(const [i,h] of guards.entries()){
  Object.assign(h,{x:source.x-40-i*10,y:source.y,cd:99});
  s.api.update(h,.1);
  assert.equal(s.api.level(),Math.min(3,i+1));
  assert.equal(h.target,'decoy');assert.equal(h.st,1);
  for(let frame=0;frame<5;frame++)s.api.update(h,.1);
  assert.equal(s.api.level(),Math.min(3,i+1),'the same guard never adds an eye each frame');
 }
 assert.equal(s.api.world.alarm.active,true);assert.equal(s.api.world.alarm.witnesses.size,3);
 for(const h of guards){assert.equal(h.target,'decoy');assert.ok(h.indoorDecoy,'alarm activation preserves the distraction');}
 source.t=0;s.sandbox.decoy=null;
 for(const h of guards){s.api.update(h,.1);assert.equal(h.indoorAlert.phase,'sweep');assert.ok(!h.indoorDecoy);}
});
test('player and decoy discoveries share the same per-guard warning identity',()=>{
 const s=alarmWorld(),h=s.api.world.floors[0].guards[0];s.sight(h);assert.equal(s.api.level(),1);
 s.sandbox.decoy={x:h.x+60,y:h.y,t:5,indoorFloor:1};s.api.update(h,.1);
 assert.equal(h.target,'decoy');assert.equal(s.api.level(),1,'a guard already counted for the player cannot be counted again for the decoy');
});

test('indoor decoy expires into its previous patrol or search and ignores other floors, distant and stunned guards',()=>{
 for(const phase of ['patrol','found','sweep']){
  const s=alarmWorld(),h=s.api.world.floors[0].guards.find(q=>!q.indoorCommander);
  if(phase==='found'){s.api.begin(h);h.st=1;h.target='p';}
  if(phase==='sweep'){s.api.world.alarm.active=true;s.api.sweep(h);}
  const previous=h.indoorAlert,st=h.st,target=h.target;
  s.sandbox.decoy={x:h.x+60,y:h.y,t:5,indoorFloor:1};s.api.update(h,.1);assert.equal(h.target,'decoy');
  s.sandbox.decoy=null;s.sandbox.los=()=>false;
  // Expiry restores state before the regular AI performs its next observation.
  require('node:vm').runInContext('indoorEndDecoy(h)',Object.assign(s.sandbox,{h}));
  assert.equal(h.indoorDecoy,null);assert.equal(h.indoorAlert,previous);assert.equal(h.st,st||0);assert.equal(h.target,target||null);
 }
 for(const reason of ['floor','distance','stun','dead']){
  const s=alarmWorld(),h=s.api.world.floors[0].guards[0];
  s.sandbox.decoy={x:h.x+60,y:h.y,t:5,indoorFloor:reason==='floor'?2:1};
  if(reason==='distance')s.sandbox.decoy.x=h.x+501;
  if(reason==='stun')h.stun=2;if(reason==='dead')h.alive=false;
  require('node:vm').runInContext('result=indoorUpdateDecoy(h,.1)',Object.assign(s.sandbox,{h}));
  assert.equal(s.sandbox.result,false);assert.ok(!h.indoorDecoy,reason);
 }
});
test('indoor decoy uses infantry and commander weapons, throttles sight rays and cancels safely on stun',()=>{
 for(const commander of [false,true]){
  const s=alarmWorld(),h=s.api.world.floors[0].guards[0];h.indoorCommander=commander;h.cd=0;
  const point=s.sandbox.decoy={x:h.x+100,y:h.y,t:5,indoorFloor:1};
  for(let i=0;i<8;i++)s.api.update(h,.1);
  assert.ok(s.sandbox.bullets.length>0);
  for(const b of s.sandbox.bullets)assert.equal(b.args[4],commander?'c':'r');
  h.stun=2;require('node:vm').runInContext('indoorEndDecoy(h,false)',Object.assign(s.sandbox,{h}));
  assert.equal(h.indoorDecoy,null);assert.equal(h.st,0);assert.equal(h.target,null);
 }
 const s=alarmWorld(),h=s.api.world.floors[0].guards.find(q=>!q.indoorCommander);h.cd=99;let rays=0;
 s.sandbox.los=()=>{rays++;return false;};s.sandbox.decoy={x:h.x+60,y:h.y,t:5,indoorFloor:1};
 for(let i=0;i<60;i++)s.api.update(h,1/60);
 assert.ok(rays<=9,'visibility sampling stays near 8 Hz instead of once per frame');
});

test('indoor decoy deployment records its floor while outdoor deployment and lure scoring stay unchanged',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const start=html.indexOf(" else if(skill==='decoy'){"),end=html.indexOf('\n else if(',start+10),branch=html.slice(start,end).replace('else if','if');
 const deploy=new Function('p','stageMode','indoorWorld','setSkillCooldown','sfx','say',"let skill='decoy',decoy=null;"+branch+';return decoy;');
 for(const mode of ['base','front','indoor']){
  const decoy=deploy({x:100,y:200,body:0},mode,{currentFloor:1},()=>{},()=>{},()=>{});
  assert.equal(decoy.t,5);assert.equal(decoy.indoorFloor,mode==='indoor'?2:undefined);
  if(mode!=='indoor')assert.deepEqual(decoy,{x:100,y:200,t:5,face:0,sound:.05});
 }
 const s=alarmWorld(),h=s.api.world.floors[0].guards.find(q=>!q.indoorCommander);
 Object.assign(s.sandbox,{recordDecoyLure:(actor,key)=>{if(key==='decoy'&&!actor.styleDecoyCounted){actor.styleDecoyCounted=true;s.sandbox.scoreStats.decoyLures++;}},targetObj:key=>key==='decoy'?s.sandbox.decoy:s.sandbox.p,
  humanMemory:()=>3,foundModePause:()=>.5,commanderWhistle:()=>{},enemyModePaused:()=>{}});
 s.sandbox.scoreStats.decoyLures=0;
 const a=html.indexOf('function enterHumanFound('),b=html.indexOf('function activateStaticTank(',a);vm.runInContext(html.slice(a,b),s.sandbox);
 s.sandbox.decoy={x:h.x+60,y:h.y,t:5,indoorFloor:1};
 for(let i=0;i<10;i++)s.api.update(h,.1);
 assert.equal(h.target,'decoy');assert.equal(s.sandbox.scoreStats.decoyLures,1,'lure counted once through the real found transition');
 s.sandbox.decoy=null;s.api.update(h,.1);assert.ok(!h.indoorDecoy);assert.notEqual(h.target,'decoy','actual AI resumes after expiry');
});

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
 // The larger roster must move together; frozen reservations would artificially occupy sectors.
 for(let i=0;i<800;i++){
  for(const guard of world.floors[1].guards)s.api.update(guard,.1);
  visited.add(h.indoorAlert.sweepCell);
 }
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
test('building patrols retain 60 percent and stationary posts 70 percent of the doubled roster without overlap',()=>{
 for(const seed of [1771,14,28,67,91,2834,3931]){
  const s=alarmWorld(seed);
  for(const floor of s.api.world.floors){
   const originals=floor.guards.filter(h=>!h.indoorDoubled),added=floor.guards.filter(h=>h.indoorDoubled);
   for(const [post,keep] of [[false,.6],[true,.7]]){
    const before=originals.filter(h=>!!h.indoorPost===post).length*2;
    const after=floor.guards.filter(h=>!!h.indoorPost===post).length;
    assert.equal(after,Math.round(before*keep));
   }
   const grid=floor.navigation.grid;
   for(const h of added){
    const col=Math.floor((h.x-grid.x)/grid.step),row=Math.floor((h.y-grid.y)/grid.step);
    assert.ok(col>=0&&col<grid.cols&&row>=0&&row<grid.rows);
    assert.equal(grid.solid[row*grid.cols+col],0);
    assert.ok(floor.guards.every(other=>other===h||Math.hypot(h.x-other.x,h.y-other.y)>=24),'new soldiers spawn separately');
    if(h.indoorPost){
     assert.equal(h.path.length,1);assert.equal(h.path[0].x,h.x);assert.equal(h.path[0].y,h.y);
    }
   }
  }
 }
});
test('approximately one third of all building enemies are commanders without adding guards',()=>{
 const s=alarmWorld();let patrolCommanders=0,postCommanders=0;
 for(let seed=0;seed<50;seed++){
  s.api.setup();const guards=s.api.world.floors.flatMap(f=>f.guards);
  const commanders=guards.filter(h=>h.indoorCommander);
  assert.equal(commanders.length,Math.round(guards.length/3));
  assert.ok(guards.length>=26&&guards.length<=42,'reduced building population remains bounded');
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
  if(cause==='discovery'){
   s.api.setVisible(a);s.api.update(a,.14);
   for(let i=0;i<80&&a.indoorAlert?.phase!=='found';i++)s.api.update(a,.1);
   assert.equal(a.indoorAlert.phase,'found');
  }
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
  (...v)=>weapons.push(v),im=>bodies.push(im.id),(_p,elite,c)=>c==='blue'?'blue_commander':c==='white'?'white_commander':elite?'white':'blue',{});
 for(const [actor,commander,expectedWeapon,expectedBody] of [
  [{indoorGuard:true,indoorCommander:true},'', 'blue','blue_commander'],
  [{indoorGuard:true,indoorWhiteCommander:true},'', '', 'white_commander'],
  [{},'', '', 'blue'],
  [{},'blue','blue','blue_commander'],
  [{indoorCommander:true},'', '', 'blue']]){
  weapons.length=0;bodies.length=0;draw(0,0,0,false,true,false,false,commander,true,false,actor);
  assert.equal(weapons[0][0],expectedWeapon);assert.equal(bodies[0],expectedBody);
  if(actor.indoorGuard&&actor.indoorWhiteCommander){assert.equal(weapons[0][4],false);assert.equal(weapons[0][5],1.5,'same gun dimensions as blue infantry');}
 }
});

test('document guide points to nearest uncollected document on the current floor',()=>{
 const s=alarmWorld();Object.assign(s.sandbox.p,{x:100,y:100});
 s.sandbox.mission.points=[{x:100,y:300,floor:1,done:false},
  {x:150,y:100,floor:1,done:false},{x:101,y:100,floor:1,done:true},
  {x:100,y:101,floor:2,done:false}];
 s.api.draw();assert.deepEqual(s.rotations,[0],'nearest same-floor target determines direction');
 s.sandbox.mission.points[1].done=true;s.rotations.length=0;
 s.api.draw();assert.deepEqual(s.rotations,[Math.PI/2],'guide switches to next remaining document');
});
test('document guide shows the remaining floor without an arrow and EXIT after collection',()=>{
 for(const floor of [1,2]){
  const s=alarmWorld();s.api.world.currentFloor=floor-1;
  s.sandbox.mission.points=[{x:100,y:100,floor,done:true},
   {x:150,y:150,floor:3-floor,done:false}];
  s.api.draw();assert.equal(s.rotations.length,0,'no stair arrow on an empty floor');
  assert.ok(s.labels.includes('→'+(3-floor)+'F'));assert.ok(!s.labels.includes('重要書類'));
  assert.ok(!s.labels.includes('→EXIT'));
  s.sandbox.mission.points[1].done=true;s.labels.length=0;
  s.api.draw();assert.equal(s.rotations.length,0,'no exit arrow after all documents');
  assert.ok(s.labels.includes('→EXIT'));assert.ok(!s.labels.includes('重要書類'));
 }
});

test('document charge accumulates across leaving, switching documents and changing floors',()=>{
 const s=alarmWorld(),world=s.api.world,m=s.sandbox.mission;
 const [a,b]=m.points;Object.assign(b,{floor:1,x:-500,y:a.y});
 Object.assign(s.sandbox.p,{x:a.x,y:a.y});
 s.api.updateMission(3);assert.equal(a.progress,3);assert.equal(a.done,false);
 s.sandbox.p.x=-1000;s.api.updateMission(1);assert.equal(a.progress,3);assert.equal(m.progress,0);
 Object.assign(s.sandbox.p,{x:b.x,y:b.y});s.api.updateMission(2);assert.equal(b.progress,2);
 const stair=world.floors[0].stair;world.stairsCooldown=0;
 Object.assign(s.sandbox.p,{x:stair.x,y:stair.y+84});s.api.updateMission(.01);
 s.sandbox.p.y=stair.y-76;
 s.api.updateMission(.01);assert.equal(world.currentFloor,1);assert.equal(b.progress,2);assert.equal(a.progress,3);
 world.currentFloor=0;Object.assign(s.sandbox.p,{x:a.x,y:a.y});
 s.api.updateMission(5);assert.equal(a.done,true);assert.equal(a.progress,8);assert.equal(m.index,1);
 s.api.updateMission(.1);assert.equal(m.index,1,'completed document cannot be collected twice');
});
test('completed document region turns green briefly and fades away',()=>{
 const s=alarmWorld(),q=s.sandbox.mission.points[0];
 Object.assign(s.sandbox.p,{x:q.x,y:q.y});s.sandbox.cam=q.y-200;s.sandbox.camX=q.x-200;
 s.api.draw();assert.ok(!s.labels.includes('資料'),'document center uses an icon');
 s.api.updateMission(8);assert.equal(q.done,true);assert.equal(q.collectedT,.9);
 s.api.draw();assert.ok(s.labels.includes('回収完了'));assert.ok(s.strokes.includes('#79e8a2'));
 s.api.updateMission(.4);assert.ok(q.collectedT>0&&q.collectedT<.55,'green region enters fade');
 s.labels.length=0;s.api.draw();assert.ok(s.labels.includes('回収完了'));
 s.api.updateMission(.6);assert.equal(q.collectedT,0);
 s.labels.length=0;s.api.draw();assert.ok(!s.labels.includes('回収完了'),'completed region disappears');
});

test('alarm adds one bounded offscreen entrance detail, covering every ground-floor exit',()=>{
 for(const seed of [1771,14,28,67,91]){
  const s=alarmWorld(seed),w=s.api.world,f=w.floors[0],total=s.sandbox.humans.length;
  s.api.entranceGuards(.3);assert.equal(s.sandbox.humans.length,total,'no guards before an alarm');
  w.alarm.active=true;
  for(let i=0;i<10;i++)s.api.entranceGuards(.3);
  const guards=f.guards.filter(h=>h.indoorEntranceGuard);
  assert.ok(guards.length===6||guards.length===7);
  assert.equal(s.sandbox.humans.length,total+guards.length);
  assert.equal(new Set(guards.map(h=>h.indoorEntranceSlot.gate)).size,f.openings.length);
  for(const h of guards){
   const gate=f.openings[h.indoorEntranceSlot.gate];
   assert.equal(h.indoorFloor,1);assert.equal(h.indoorAlert.phase,'sweep');
   assert.ok(Math.hypot(h.x-gate.x,h.y-gate.y)<450,'guards stay near their assigned exit');
   assert.ok(h.x<s.sandbox.camX-100||h.x>s.sandbox.camX+940||h.y<s.sandbox.cam-100||h.y>s.sandbox.cam+820);
   const home={...h.indoorEntranceHome};
   s.api.update(h,.2);assert.equal(h.x,home.x);assert.equal(h.y,home.y,'watch instead of joining the interior sweep');
   s.api.begin(h);s.api.finish(h);
   assert.deepEqual({...h.indoorAlert.sweepGoal},home,'return to the gate after pursuit and search');
  }
  assert.equal(w.alarm.entranceGuards.pending.length,0);
 }
});
function entrancePerceptionScenario(seed=1771){
 const s=alarmWorld(seed),vm=require('node:vm'),src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/infiltration-world.js'),'utf8');
 s.api.world.alarm.active=true;s.api.entranceGuards(.3);
 const floor=s.api.world.floors[0],fp=floor.footprint;let h,point;
 for(const guard of floor.guards.filter(q=>q.indoorEntranceGuard)){
  for(let i=0;i<16;i++){
   const angle=i*Math.PI/8,q={x:guard.x+Math.cos(angle)*180,y:guard.y+Math.sin(angle)*180};
   const outside=q.x<fp.x||q.x>fp.x+fp.w||q.y<fp.y||q.y>fp.y+fp.h;
   if(q.x>16&&q.x<944&&outside&&s.api.lightLevel(q.x,q.y)===.24){h=guard;point=q;break;}
  }
  if(h)break;
 }
 assert.ok(h,'an unlit exterior location exists near the entrance detail');const gate=floor.openings[h.indoorEntranceSlot.gate];
 Object.assign(s.sandbox,{weather:'clear',inTumbleweed:()=>false,inBush:()=>false,inWaterAt:()=>false,
  cachedLos:(a,b)=>s.sandbox.los(a,b),detectRange:()=>200});
 const start=src.indexOf('function indoorGuardSeesPlayer('),end=src.indexOf('function indoorMoveGuardTo(',start);
 vm.runInContext(src.slice(start,end),s.sandbox);
 Object.assign(s.sandbox.p,{...point,dig:0});h.face=Math.atan2(point.y-h.y,point.x-h.x);
 return {...s,h,gate};
}
test('entrance sentries notice and pursue a stationary exposed player outside the building with real perception',()=>{
 const s=entrancePerceptionScenario(),h=s.h,home={...h.indoorEntranceHome};
 assert.equal(s.api.lightLevel(s.sandbox.p.x,s.sandbox.p.y),.24,'reproduce the exterior being classified as a dark indoor light region');
 for(let i=0;i<180&&h.target!=='p';i++)s.api.update(h,1/60);
 assert.equal(h.target,'p','a visible nearby exterior player must not leave the sentry stuck in question-mark mode');
 assert.equal(h.indoorAlert.phase,'found');h.cd=0;
 for(let i=0;i<10;i++)s.api.update(h,.1);
 assert.ok(Math.hypot(h.x-home.x,h.y-home.y)>10,'leaves the post to pursue the detected player');
 assert.ok(s.sandbox.bullets.length>0,'fires once the player is within rifle range');
});

test('entrance sentry daylight correction still respects walls, concealment, viewing angle and floor separation',()=>{
 for(const reason of ['wall','bush','dig','other-floor','behind']){
  const s=entrancePerceptionScenario(),h=s.h;
  if(reason==='wall')s.sandbox.los=()=>false;
  if(reason==='bush')s.sandbox.inBush=()=>true;
  if(reason==='dig')s.sandbox.p.dig=1;
  if(reason==='other-floor')s.api.world.currentFloor=1;
  if(reason==='behind')h.face+=Math.PI;
  for(let i=0;i<(reason==='behind'?30:180);i++)s.api.update(h,1/60);
  assert.notEqual(h.target,'p',reason+' must still prevent discovery');
 }
 const s=entrancePerceptionScenario(),h=s.h,vm=require('node:vm');s.sandbox.h=h;
 vm.runInContext('sample={};indoorGuardSeesPlayer(h,sample);',s.sandbox);
 assert.equal(s.sandbox.sample.light,1,'exterior sentry sees outdoor ambient light');
 h.indoorEntranceGuard=false;
 vm.runInContext('sample={};indoorGuardSeesPlayer(h,sample);',s.sandbox);
 assert.equal(s.sandbox.sample.light,.24,'ordinary room guards retain their existing light-sensitive vision');
 h.indoorEntranceGuard=true;
 const fp=s.api.world.floors[0].footprint;Object.assign(s.sandbox.p,{x:fp.x+fp.w/2,y:fp.y+fp.h/2});
 vm.runInContext('sample={};indoorGuardSeesPlayer(h,sample);',s.sandbox);
 assert.equal(s.sandbox.sample.light,s.api.lightLevel(s.sandbox.p.x,s.sandbox.p.y),'indoor targets retain room lighting even for entrance sentries');
});

test('all replacement entrance guard types retain real exterior detection',()=>{
 for(const roll of [.2,.7,.95]){
  const s=entrancePerceptionScenario(),floor=s.api.world.floors[0],index=floor.guards.indexOf(s.h);
  s.h.alive=false;s.sandbox.R=()=>roll;s.api.reinforce(.3);
  const h=floor.guards[index];assert.notEqual(h,s.h);assert.equal(h.indoorEntranceGuard,true);
  assert.equal(h.indoorCommander,roll<.5);assert.equal(h.indoorWhiteCommander,roll>=.9);
  h.face=Math.atan2(s.sandbox.p.y-h.y,s.sandbox.p.x-h.x);
  for(let i=0;i<180&&h.target!=='p';i++)s.api.update(h,1/60);
  assert.equal(h.target,'p');assert.equal(h.indoorAlert.phase,'found');
 }
});

test('entrance guards wait while visible or blocked and never spawn in other stages',()=>{
 const s=alarmWorld(),w=s.api.world,f=w.floors[0],total=s.sandbox.humans.length;
 w.alarm.active=true;s.sandbox.cam=0;s.sandbox.H=14000;
 s.api.entranceGuards(.3);const count=w.alarm.entranceGuards.pending.length;
 assert.ok(count===6||count===7);assert.equal(s.sandbox.humans.length,total);
 s.sandbox.H=720;s.sandbox.hitsM=()=>true;s.api.entranceGuards(.3);
 assert.equal(w.alarm.entranceGuards.pending.length,count,'solid terrain defers all candidates');
 s.sandbox.hitsM=()=>false;s.sandbox.stageMode='base';s.api.entranceGuards(.3);
 assert.equal(s.sandbox.humans.length,total);
 s.sandbox.stageMode='indoor';s.sandbox.state='pause';s.api.entranceGuards(.3);
 assert.equal(s.sandbox.humans.length,total);
 s.sandbox.state='play';s.api.entranceGuards(.3);
 assert.equal(f.guards.filter(h=>h.indoorEntranceGuard).length,count);
 s.api.setup();assert.equal(s.api.world.alarm.entranceGuards,undefined,'restart clears the detail');
});
test('dead entrance guards are replaced offscreen at an exit and keep their watch duty',()=>{
 const s=alarmWorld(),w=s.api.world,f=w.floors[0];w.alarm.active=true;s.api.entranceGuards(.3);
 const dead=f.guards.find(h=>h.indoorEntranceGuard),total=s.sandbox.humans.length;
 const index=f.guards.indexOf(dead);dead.alive=false;s.sandbox.R=()=>.7;
 s.api.reinforce(.3);const guard=f.guards[index];
 assert.notEqual(guard,dead);assert.equal(guard.indoorEntranceGuard,true);assert.equal(guard.indoorWhite,true);
 assert.equal(guard.indoorEntranceSlot,dead.indoorEntranceSlot);
 assert.equal(guard.indoorAlert.sweepGoal,guard.indoorEntranceHome);
 assert.equal(s.sandbox.humans.length,total,'replacement never grows the detail');
});

test('infiltration deaths mix blue commanders and white reinforcements without growing the roster',()=>{
 const s=alarmWorld(),world=s.api.world,total=s.sandbox.humans.length,floor=world.floors[0];
 for(const roll of [0,.499,.5,.899,.9,.999]){
  s.sandbox.R=()=>roll;
  const dead=floor.guards[0];dead.alive=false;
  s.api.reinforce(.3);const h=floor.guards[0];
  assert.notEqual(h,dead);assert.equal(h.alive,true);assert.equal(h.indoorWhite,roll>=.5);
  assert.equal(h.elite,roll>=.5);assert.equal(h.commander,null);assert.equal(h.indoorCommander,roll<.5);
  assert.equal(h.indoorWhiteCommander,roll>=.9);assert.equal(h.frontCommander,roll<.5);
  assert.equal(h.indoorFloor,1);assert.ok(s.sandbox.humans.includes(h));
  assert.ok(!s.sandbox.humans.includes(dead));assert.equal(s.sandbox.humans.length,total);
  assert.ok(h.x<s.sandbox.camX-100||h.x>s.sandbox.camX+840+100||
   h.y<s.sandbox.cam-100||h.y>s.sandbox.cam+720+100,'never appears inside viewport margin');
  const g=floor.navigation.grid,id=Math.floor((h.y-g.y)/g.step)*g.cols+Math.floor((h.x-g.x)/g.step);
  assert.equal(g.solid[id],0,'spawn position is free of walls and cargo');
 }
});
test('reinforcements preserve stunned guards and wait for an offscreen safe point',()=>{
 const s=alarmWorld(),floor=s.api.world.floors[0],h=floor.guards[0];
 h.stun=10;s.api.reinforce(.3);assert.equal(floor.guards[0],h,'stun is not a death');
 h.alive=false;s.sandbox.hitsM=()=>true;s.api.reinforce(.3);
 assert.equal(floor.guards[0],h,'blocked spawn points defer replacement');
 s.sandbox.hitsM=()=>false;floor.alarmSweepPoints=[{x:200,y:200}];s.api.reinforce(.3);
 assert.equal(floor.guards[0],h,'visible spawn points defer replacement');
 floor.alarmSweepPoints=null;h.sniperFallT=.4;s.api.reinforce(.3);
 assert.equal(floor.guards[0],h,'death animation finishes before replacing the actor');
 h.sniperFallT=0;s.sandbox.stageMode='base';s.api.reinforce(.3);
 assert.equal(floor.guards[0],h,'other stages cannot use replenishment');
 s.sandbox.stageMode='indoor';s.api.reinforce(.3);assert.notEqual(floor.guards[0],h);
});
test('all dead slots including commanders are refilled and alarm reinforcements start searching',()=>{
 const s=alarmWorld(),world=s.api.world,total=s.sandbox.humans.length;
 for(const h of world.floors[0].guards.slice(0,3))s.sight(h);
 for(const h of s.sandbox.humans)h.alive=false;
 s.api.reinforce(.3);
 assert.equal(s.sandbox.humans.length,total);assert.ok(s.sandbox.humans.every(h=>h.alive&&(h.indoorWhite||h.indoorCommander)));
 assert.ok(s.sandbox.humans.every(h=>h.indoorAlert.phase==='sweep'));
 assert.equal(world.alarm.witnesses.size,3,'alarm witness history remains bounded');
});
test('indoor white movement is exactly 20 percent faster without outdoor elite movement',()=>{
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/infiltration-world.js'),'utf8');
 const a=src.indexOf('function indoorMoveGuardTo('),b=src.indexOf('function indoorEstimateEscape(',a);
 const move=new Function('indoorWorld','indoorGuardCell','indoorGuardCellRoute','D','angD','mv',
  src.slice(a,b)+';return indoorMoveGuardTo;')({floors:[{navigation:{centers:[{x:0,y:0}]}}]},
  ()=>0,()=>[0],(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),(a,b)=>a-b,
  (h,dx,dy)=>{h.x+=dx;h.y+=dy;});
 const blue={x:0,y:0,face:0,indoorFloor:1,indoorAlert:{}},white={...blue,indoorWhite:true,indoorAlert:{}},commander={...white,indoorWhiteCommander:true,indoorAlert:{}};
 for(const speed of [30,62,78,95]){
  blue.x=0;white.x=0;commander.x=0;move(blue,{x:200,y:0},.5,speed);move(white,{x:200,y:0},.5,speed);move(commander,{x:200,y:0},.5,speed);
  assert.equal(white.x,blue.x*1.2);
  assert.equal(commander.x,blue.x*1.5,'white commander speed is based on blue infantry, without stacking the white multiplier');
 }
 const normal=guardScenario(),fast=guardScenario();
 for(const s of [normal,fast]){s.h.st=0;s.h.target=null;}
 fast.h.indoorWhite=true;normal.api.update(normal.h,.1);fast.api.update(fast.h,.1);
 assert.equal(normal.patrolSpeed,30);assert.equal(fast.patrolSpeed,36);
 fast.h.indoorWhiteCommander=true;fast.api.update(fast.h,.1);assert.equal(fast.patrolSpeed,45);
});

test('reinforcement roles split 50 percent blue commanders, 40 percent white, 10 percent white commanders',()=>{
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/infiltration-world.js'),'utf8');
 const start=src.indexOf('function indoorReinforcementRole('),end=src.indexOf('function indoorReplenishGuards(',start);
 const pick=new Function(src.slice(start,end)+';return indoorReinforcementRole;')();
 const counts={blue:0,white:0,commander:0};
 for(let i=0;i<1000;i++){
  const role=pick((i+.5)/1000);
  counts[role.indoorCommander?'blue':role.indoorWhiteCommander?'commander':'white']++;
  assert.equal(role.elite,role.indoorWhite);assert.equal(role.frontCommander,role.indoorCommander);
  assert.ok(!(role.indoorCommander&&role.indoorWhiteCommander));
 }
 assert.deepEqual(counts,{blue:500,white:400,commander:100});
});

test('indoor white commander scoped artwork keeps its infantry rifle while outdoor commander artwork is unchanged',()=>{
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/characters.js'),'utf8');
 const start=src.indexOf('function drawScopedCharacter('),body=src.slice(start);
 const bodies=[],weapons=[],g=new Proxy({},{get:()=>()=>{}}),art={scope_white_commander:{id:'commander'},scope_white:{id:'white'}};
 const draw=new Function('CHARACTER_GRAPHICS_MODE','CHARACTER_ART','characterArtKey','assetOK','CHARACTER_GRAPHICS_SCALE','performance','characterGait','g','drawPortraitCutout','drawCharacterWeapon',
  body+';return drawScopedCharacter;')('webp',art,(_p,_e,c)=>c==='white'?'white_commander':'white',()=>true,.84,{now:()=>1000},()=>0,g,im=>bodies.push(im.id),(...a)=>weapons.push(a));
 for(const [actor,weapon] of [[{indoorGuard:true,indoorWhiteCommander:true,commander:null,st:1},''],[{commander:'white',st:1},'white']]){
  bodies.length=0;weapons.length=0;draw(actor,true,0,0,100,false);
  assert.deepEqual(bodies,['commander']);assert.equal(weapons[0][0],weapon);
 }
});

test('indoor white commanders use standard blue infantry bursts with no outdoor sniper or bazooka AI',()=>{
 const s=alarmWorld(),h=s.api.world.floors[0].guards.find(h=>!h.indoorCommander);
 Object.assign(h,{indoorWhite:true,indoorWhiteCommander:true,elite:true,commander:null,indoorCommander:false,x:s.sandbox.p.x-100,y:s.sandbox.p.y,cd:0,foundPause:0,modePause:0,sharePause:0});
 s.api.begin(h);h.st=1;h.target='p';s.api.setVisible(h);
 for(let i=0;i<4;i++)s.api.update(h,.15);
 assert.equal(s.sandbox.bullets.length,3,'three-round infantry burst');
 for(const b of s.sandbox.bullets){assert.equal(b.args[4],'r');assert.equal(b.args[5],330);assert.equal(b.args[6],150);assert.ok(!b.commanderRocket);}
 assert.equal(h.commander,null);assert.equal(h.commanderCharge,undefined);assert.ok(!(h.indoorRocketCharge>0));
});

test('alarm guards clustered in one sector reserve distinct reachable search destinations',()=>{
 const s=alarmWorld(),floor=s.api.world.floors[0],points=s.api.sweepPoints(floor);
 const cell=points.findIndex(Boolean),pos=points[cell];
 for(const h of floor.guards){Object.assign(h,pos);h.st=0;h.target=null;}
 Object.defineProperty(s.sandbox.p,'x',{get(){throw Error('hidden player read during dispersed search');}});
 for(const h of floor.guards)assert.equal(s.api.sweep(h),true);
 const goals=new Set(floor.guards.map(h=>h.indoorAlert.sweepCell));
 assert.equal(goals.size,floor.guards.length,'each clustered guard reserves a separate sector');
 const {indoorGuardCellRoute}=require('../js/infiltration-world.js');
 for(const h of floor.guards){
  const a=h.indoorAlert;assert.notEqual(a.sweepCell,cell);
  assert.ok(indoorGuardCellRoute(floor.navigation,cell,a.sweepCell),'route follows actual door connectivity');
 }
 const work=floor.sweepWork;s.api.selectSweep(floor.guards[0],floor.guards[0].indoorAlert,floor,points);
 assert.equal(floor.sweepWork,work,'planning buffers are reused');
});
test('a stalled alarm guard tries a bounded detour then changes destination if still blocked',()=>{
 const s=alarmWorld(),floor=s.api.world.floors[0],h=floor.guards[0];
 s.api.sweep(h);const original=h.indoorAlert.sweepCell;
 s.sandbox.mv=()=>{};
 for(let i=0;i<23;i++)s.api.update(h,.1);
 assert.ok(h.indoorAlert.rescueCooldown>0,'bounded recovery starts after two seconds without movement');
 for(let i=0;i<23;i++)s.api.update(h,.1);
 assert.notEqual(h.indoorAlert.sweepCell,original);
 assert.equal(h.indoorAlert.phase,'sweep');
});
test('alarm conversations do not lock a crowd in place but a normal pair still talks',()=>{
 const s=alarmChatPair(),{a,b}=s,floor=s.api.world.floors[0];
 const third=floor.guards.find(h=>h!==a&&h!==b);
 Object.assign(third,{x:a.x+20,y:a.y+20});
 s.api.chats(.1);assert.equal(a.indoorChatT||0,0);assert.equal(b.indoorChatT||0,0);
 third.x+=200;s.api.chats(.2);assert.equal(a.indoorChatT,5);assert.equal(b.indoorChatT,5);
});

test('clustered alarm patrols disperse through collision-aware rooms over sustained movement',()=>{
 for(const seed of [1771,2834,3931]){
  const s=alarmWorld(seed),floor=s.api.world.floors[0],points=s.api.sweepPoints(floor);
  const origin=points.find(Boolean),g=floor.navigation.grid;
  s.sandbox.mv=(h,dx,dy)=>{
   const free=(x,y)=>{const col=Math.floor((x-g.x)/g.step),row=Math.floor((y-g.y)/g.step);
    return col>=0&&col<g.cols&&row>=0&&row<g.rows&&!g.solid[row*g.cols+col];};
   if(free(h.x+dx,h.y))h.x+=dx;if(free(h.x,h.y+dy))h.y+=dy;
  };
  for(const h of floor.guards){Object.assign(h,origin);h.st=0;h.target=null;s.api.sweep(h);}
  for(let frame=0;frame<300;frame++)for(const h of floor.guards)s.api.update(h,.1);
  const sectors=new Set(floor.guards.map(h=>Math.floor((h.x-floor.navigation.origin.x)/floor.navigation.stepX)+
   5*Math.floor((h.y-floor.navigation.origin.y)/floor.navigation.stepY)));
  assert.ok(sectors.size>=4,'patrols spread across rooms: seed '+seed);
  const remaining=floor.guards.filter(h=>Math.hypot(h.x-origin.x,h.y-origin.y)<90).length;
  assert.ok(remaining<=floor.guards.length/2,'original crowd clears: seed '+seed+' remaining '+remaining+'/'+floor.guards.length);
 }
});

function indoorAllyScenario(){
 const s=alarmWorld(),h=s.api.world.floors[0].guards[0],floor=s.api.world.floors[0];
 const point=s.api.sweepPoints(floor).find(Boolean);Object.assign(h,{x:point.x,y:point.y,face:0,cd:0,st:0,target:null,indoorCommander:false,frontCommander:false});
 const ally={x:h.x+50,y:h.y,id:9,alive:true,chute:0};s.sandbox.allies.push(ally);
 return {...s,h,ally,floor};
}
test('indoor guards recognize and shoot reinforcement allies while idle, sweeping or searching',()=>{
 for(const phase of ['idle','sweep','search']){
  const s=indoorAllyScenario(),{h,ally}=s;
  if(phase==='sweep')s.api.sweep(h);
  if(phase==='search'){s.api.begin(h);Object.assign(h.indoorAlert,{phase:'search',searchLeft:8,searchPoints:[],scanT:0});h.st=0;h.target=null;}
  const previous=h.indoorAlert;
  s.api.update(h,.16);assert.equal(h.target,'ally:9',phase);assert.equal(h.st,1,phase);
  for(let i=0;i<5;i++)s.api.update(h,.1);
  assert.ok(s.sandbox.bullets.length>0,phase+' guard shoots at ally');
  assert.equal(s.api.world.alarm.witnesses.size,0,'ally sighting is not a player discovery');
  ally.alive=false;s.api.update(h,.1);assert.equal(h.indoorAllyCombat,null);
  if(previous)assert.equal(h.indoorAlert,previous,'existing search is resumed');
 }
});
test('reinforcement detection requires sight, distance, same floor and a living landed target',()=>{
 for(const reason of ['wall','behind','distance','floor','dead','parachute']){
  const s=indoorAllyScenario();
  if(reason==='wall')s.sandbox.los=()=>false;
  if(reason==='behind')s.h.face=Math.PI;
  if(reason==='distance')s.ally.x+=1000;
  if(reason==='floor')s.h.indoorFloor=2;
  if(reason==='dead')s.ally.alive=false;
  if(reason==='parachute')s.ally.chute=1;
  s.api.update(s.h,.16);assert.equal(s.h.indoorAllyCombat,undefined,reason);
 }
});
test('lost reinforcement sight keeps a snapshot, stops firing and resumes alarm search',()=>{
 const s=indoorAllyScenario();s.api.sweep(s.h);const search=s.h.indoorAlert;
 s.api.update(s.h,.16);const x=s.h.indoorAllyCombat.lastSeen.x;
 s.sandbox.los=()=>false;s.ally.x+=180;
 s.api.update(s.h,.16);assert.equal(s.h.indoorAllyCombat.lastSeen.x,x);
 const shots=s.sandbox.bullets.length;
 for(let i=0;i<48;i++)s.api.update(s.h,.1);
 assert.equal(s.h.indoorAllyCombat,null);assert.equal(s.h.indoorAlert,search);
 assert.equal(s.sandbox.bullets.length,shots,'no firing through walls');
});
test('indoor commanders fire bazookas at visible allies using the ally wall ray',()=>{
 const s=indoorAllyScenario();s.h.indoorCommander=true;
 s.sandbox.los=(_a,b)=>b===s.ally;
 for(let i=0;i<15;i++)s.api.update(s.h,.1);
 assert.ok(s.sandbox.bullets.some(b=>b.commanderRocket),'commander attacks ally instead of checking hidden player');
});

test('ally combat remains valid when alarm search starts and clears on stun',()=>{
 const s=indoorAllyScenario();s.api.update(s.h,.16);
 s.api.sweep(s.h);s.api.update(s.h,.16);
 assert.equal(s.h.target,'ally:9');assert.equal(s.h.st,1,'alarm initialization cannot erase active combat target');
 s.ally.alive=false;s.api.update(s.h,.1);
 assert.equal(s.h.indoorAlert.phase,'sweep');assert.equal(s.h.st,0);assert.equal(s.h.target,null);
 s.ally.alive=true;s.api.update(s.h,.2);assert.ok(s.h.indoorAllyCombat);
 s.h.stun=2;s.api.updateMission(.1);assert.equal(s.h.indoorAllyCombat,null);
 assert.equal(s.h.indoorAlert,null,'stun clears stale combat and search memories');
});

function assistedDocumentScenario(){
 const s=alarmWorld(),q=s.sandbox.mission.points[0];
 Object.assign(s.sandbox.p,{x:q.x,y:q.y});
 s.sandbox.partner={x:q.x+20,y:q.y,down:false,stunT:0};
 return {...s,q};
}
test('a partner in the document circle halves collection time to four seconds',()=>{
 const s=assistedDocumentScenario();
 s.api.updateMission(3.9);assert.equal(s.q.done,false);assert.equal(s.q.progress,7.8);
 s.api.updateMission(.1);assert.equal(s.q.done,true);assert.equal(s.q.progress,8);
 assert.equal(s.sandbox.mission.index,1);assert.equal(s.q.collectedT,.9);
});
test('partner bonus switches as they enter or leave without resetting accumulated charge',()=>{
 const s=assistedDocumentScenario();s.sandbox.partner.x+=200;
 s.api.updateMission(2);assert.equal(s.q.progress,2);
 s.sandbox.partner.x=s.q.x;s.api.updateMission(2);assert.equal(s.q.progress,6);
 s.sandbox.partner.x+=200;s.api.updateMission(1);assert.equal(s.q.progress,7);
 s.sandbox.p.x+=200;s.api.updateMission(1);assert.equal(s.q.progress,7,'player leaving preserves charge');
 s.sandbox.p.x=s.q.x;s.api.updateMission(1);assert.equal(s.q.done,true);
});
test('document assistance requires an active foot partner and works without the player',()=>{
 for(const condition of ['absent','down','stunned','vehicle','passenger','other-skill','player-away']){
  const s=assistedDocumentScenario();
  if(condition==='absent')s.sandbox.partner=null;
  if(condition==='down')s.sandbox.partner.down=true;
  if(condition==='stunned')s.sandbox.partner.stunT=2;
  if(condition==='vehicle')s.sandbox.partner.vehicle={};
  if(condition==='passenger')s.sandbox.partner.passengerVehicle={};
  if(condition==='other-skill')s.sandbox.skill='reinforce';
  if(condition==='player-away')s.sandbox.p.x+=200;
  s.api.updateMission(1);
  assert.equal(s.q.progress,1,condition);
 }
});
test('assisted document shows the cooperation indicator only inside the active circle',()=>{
 const s=assistedDocumentScenario();s.sandbox.cam=s.q.y-200;s.sandbox.camX=s.q.x-200;
 s.api.draw();assert.ok(s.labels.includes('相棒協力 ×2'));
 s.sandbox.partner.x+=200;s.labels.length=0;s.api.draw();assert.ok(!s.labels.includes('相棒協力 ×2'));
});

test('a solo partner collects documents in eight seconds, pauses on leaving and completes only once',()=>{
 const s=assistedDocumentScenario();s.sandbox.p.x+=200;
 s.api.updateMission(3);assert.equal(s.q.progress,3);assert.equal(s.q.done,false);
 s.sandbox.partner.x+=200;s.api.updateMission(1);assert.equal(s.q.progress,3,'leaving preserves charge');
 s.sandbox.partner.x=s.q.x;s.api.updateMission(4.9);assert.equal(s.q.progress,7.9);assert.equal(s.q.done,false);
 s.sandbox.cam=s.q.y-200;s.sandbox.camX=s.q.x-200;s.api.draw();assert.ok(s.labels.includes('相棒が回収中'));assert.ok(!s.labels.includes('相棒協力 ×2'));
 s.api.updateMission(.1);assert.equal(s.q.done,true);assert.equal(s.q.progress,8);assert.equal(s.sandbox.mission.index,1);
 s.api.updateMission(1);assert.equal(s.sandbox.mission.index,1,'no duplicate completion');
});

test('player and partner can independently collect separate documents on the same floor',()=>{
 const s=assistedDocumentScenario(),q2={...s.q,x:s.q.x+300,done:false,progress:0};s.sandbox.mission.points=[s.q,q2];
 Object.assign(s.sandbox.partner,{x:q2.x,y:q2.y});s.api.updateMission(2);
 assert.equal(s.q.progress,2);assert.equal(q2.progress,2);
 q2.floor=2;s.api.updateMission(1);assert.equal(q2.progress,2,'no collection on another floor');
 s.sandbox.p.tank={};s.api.updateMission(1);assert.equal(s.q.progress,3,'a mounted player cannot collect');
});

test('lighting is circular after world scaling, varies in size and lights the outdoor entrances',()=>{
 const s=alarmWorld(),floor=s.api.world.floors[0],radii=new Set();
 for(const f of s.api.world.floors)for(const lamp of f.lightFixtures){
  assert.equal(lamp.rx,lamp.ry,'world-coordinate light pools are 1:1');radii.add(Math.round(lamp.rx));
 }
 assert.ok(radii.size>=4,'different pool sizes');
 for(const entry of [...floor.entrances,floor.emergency].filter(Boolean))assert.ok(s.api.lightLevel(entry.x,entry.y)>.55,'outside entry is bright');
});
test('wide front openings are wall-free and all start and exit pads are outside',()=>{
 for(let seed=1;seed<=100;seed++){
  const f=indoorGenerateFloor(1,random(seed*147));
  assert.equal(f.entrances.length,2);assert.equal(f.doors.filter(d=>d.outer).length,0);
  for(const entry of f.entrances){
   assert.ok(entry.y>f.footprint.y+f.footprint.h+90);
   const aperture={x:entry.x-35,y:f.footprint.y+f.footprint.h-10,w:70,h:20};
   assert.ok(!f.walls.some(w=>w.x<aperture.x+aperture.w&&w.x+w.w>aperture.x&&w.y<aperture.y+aperture.h&&w.y+w.h>aperture.y));
  }
  if(f.emergency)assert.ok(f.emergency.y<f.footprint.y-90);
 }
});
test('escape completes outside any ground-floor exit, never from inside the entrance',()=>{
 const s=alarmWorld(),floor=s.api.world.floors[0];let completions=0;
 s.sandbox.completeMission=()=>{completions++;};s.sandbox.mission.index=3;
 Object.assign(s.sandbox.p,{x:floor.entrance.x,y:floor.footprint.y+floor.footprint.h-20});
 s.api.updateMission(.01);assert.equal(completions,0);
 for(const exit of s.api.world.exits){
  s.sandbox.state='play';s.sandbox.mission.extraction=null;
  s.sandbox.mission.escapeComplete=false;s.sandbox.mission.escapeProgress=0;s.sandbox.mission.escapeExit=null;
  Object.assign(s.sandbox.p,exit);s.api.updateMission(4.9);assert.equal(completions,s.api.world.exits.indexOf(exit));s.api.updateMission(.1);
 }
 assert.equal(completions,s.api.world.exits.length);
});

test('front deployment and exit pads are deep in a lit forecourt',()=>{
 const s=alarmWorld(),f=s.api.world.floors[0],bottom=f.footprint.y+f.footprint.h;
 assert.equal(s.sandbox.p.y-bottom,672);
 for(const q of f.entrances){
  assert.equal(q.y-bottom,672);assert.ok(q.y<12800-200,'deployment remains inside playable bounds');
  for(const dy of [50,160,300,450,600,672])assert.ok(s.api.lightLevel(q.x,bottom+dy)>.55,'lit approach at '+dy);
 }
});
test('static indoor lighting reuses one mask across frames and preserves camera cropping',()=>{
 const s=alarmWorld();const contexts=[],presentations=[];
 s.sandbox.document.createElement=()=>({width:0,height:0});
 s.sandbox.gameCanvasContext=canvas=>{
  const context={canvas,clears:0,stamps:0,wallCuts:0,fillRect(){if(this.globalCompositeOperation==='destination-out'&&this.fillStyle==='rgba(0,0,0,.72)')this.wallCuts++;},clearRect(){this.clears++;},drawImage(){this.stamps++;},
   createRadialGradient(){return {addColorStop(){}};}};
  contexts.push(context);return new Proxy(context,{get:(o,k)=>k in o?o[k]:()=>{}});
 };
 s.sandbox.gm.drawImage=(...args)=>presentations.push(args);
 const vm=require('node:vm');
 const y=s.api.world.floors[0].footprint.y;
 const draw=(x,dy)=>vm.runInContext('drawInfiltrationLighting('+x+','+dy+');',s.sandbox);
 draw(0,y);const first=contexts[0].clears,stamps=contexts[0].stamps;
 assert.ok(stamps>0);const wallCuts=contexts[0].wallCuts;assert.equal(wallCuts,0,'no artificial bright rectangle around walls');assert.equal(contexts.length,2,'one mask and one light texture');
 for(let i=0;i<120;i++)draw(0,y);
 assert.equal(contexts[0].clears,first,'stationary frames do no lighting recomposition');
 assert.equal(contexts[0].stamps,stamps,'light stamps are not redrawn on every frame');
 assert.equal(contexts[0].wallCuts,wallCuts,'wall shadow work is cached as well');
 for(let i=0;i<60;i++)draw(i,y+i);
 assert.equal(contexts[0].clears,first,'camera scrolls inside cached overscan');
 draw(300,y+300);assert.equal(contexts[0].clears,first+1,'moving beyond coverage rebuilds once');
 const after=contexts[0].clears;
 for(let i=0;i<20;i++)draw(300+(i%2),y+300);
 assert.equal(contexts[0].clears,after,'small camera oscillations cannot thrash the cache');
 for(const args of presentations){
  assert.equal(args.length,9);const [canvas,sx,sy,w,h]=args;
  assert.ok(sx>=0&&sy>=0&&sx+w<=canvas.width&&sy+h<=canvas.height,'crop stays inside cached mask');
 }
 s.api.setup();draw(300,y+300);assert.equal(contexts[0].clears,after+1,'new map invalidates old lighting');
 assert.equal(contexts.length,2,'new runs reuse the bounded canvases');
});
test('post guards remain stationary without calling movement or patrol pathfinding',()=>{
 const s=alarmWorld(),h=s.api.world.floors[0].postGuards[0],point={x:h.x,y:h.y};
 s.sandbox.patrol=()=>{throw Error('post patrol should remain stationary');};
 s.sandbox.mv=()=>{throw Error('stationary guard attempted movement');};
 for(let i=0;i<120;i++)s.api.update(h,.1);
 assert.equal(h.x,point.x);assert.equal(h.y,point.y);
});


test('document distribution includes both 1+2 and 2+1 patterns with exactly three files',()=>{
 const patterns=new Set();
 for(let seed=1;seed<=12;seed++){
  const s=alarmWorld(seed),files=s.api.world.intel;
  const first=files.filter(q=>q.floor===1).length,second=files.filter(q=>q.floor===2).length;
  assert.equal(files.length,3);assert.equal(first+second,3);assert.ok(first>=1&&second>=1);
  patterns.add(first+':'+second);
 }
 assert.deepEqual([...patterns].sort(),['1:2','2:1']);
});
test('post guards occasionally share a bubble without moving, then resume after a cooldown',()=>{
 const s=alarmWorld(),floor=s.api.world.floors[0];floor.postChatWait=0;
 const positions=floor.postGuards.map(h=>[h.x,h.y]);
 s.api.postChats(.1);assert.ok(floor.postChat);const chat=floor.postChat;
 s.sandbox.cam=chat.a.y-200;s.sandbox.camX=chat.a.x-200;
 s.api.draw();assert.equal(s.bubbles.length,1,'one bubble for a stationary pair');
 assert.deepEqual(floor.postGuards.map(h=>[h.x,h.y]),positions);
 assert.ok(!chat.a.st&&!chat.b.st);assert.equal(s.api.world.alarm.witnesses.size,0);
 s.api.postChats(4);assert.equal(floor.postChat,null);
 s.api.postChats(.1);assert.equal(floor.postChat,null,'conversation cannot immediately restart');
 floor.postChatWait=0;s.api.postChats(.1);assert.ok(floor.postChat,'another occasional chat starts later');
});
test('discovery, stun or an alarm interrupts idle post conversations',()=>{
 for(const reason of ['discovery','stun','alarm']){
  const s=alarmWorld(),floor=s.api.world.floors[0];floor.postChatWait=0;s.api.postChats(.1);
  const chat=floor.postChat;assert.ok(chat);
  if(reason==='discovery'){chat.a.st=1;chat.a.target='p';}
  if(reason==='stun')chat.a.stun=2;
  if(reason==='alarm')s.api.world.alarm.active=true;
  s.api.postChats(.1);assert.equal(floor.postChat,null,reason);
 }
});

test('indoor concrete loads lazily and reuses one pattern per render context',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const start=source.indexOf('let indoorConcreteImage=null;'),end=source.indexOf('function drawInfiltrationFloors(cx,cy){',start);
 let loads=0,patterns=0;const images=[];
 class MockImage{constructor(){loads++;images.push(this);this.complete=false;}set src(value){this.url=value;}}
 const a={createPattern:(image,mode)=>{patterns++;assert.equal(mode,'repeat');return {image};}};
 const b={createPattern:a.createPattern};
 const api=new Function('Image','assetOK','g',source.slice(start,end)+';return {get:indoorConcretePattern,context:value=>g=value};')(
  MockImage,image=>image.complete,a);
 assert.equal(loads,0);assert.equal(api.get(),null);assert.equal(loads,1);
 assert.equal(images[0].url,'assets/terrain/indoor_concrete.webp');
 assert.equal(api.get(),null);assert.equal(patterns,0,'unloaded texture uses solid fallback');
 images[0].complete=true;const first=api.get();
 for(let i=0;i<240;i++)assert.equal(api.get(),first);
 assert.equal(patterns,1);api.context(b);assert.notEqual(api.get(),first);
 assert.equal(patterns,2);api.context(a);assert.equal(api.get(),first);assert.equal(loads,1);
});

test('infiltration floors use hills outdoors and concrete only within the building',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
 const start=source.indexOf('function drawInfiltrationFloors(cx,cy){'),end=source.indexOf('function drawInfiltrationProps(cx,cy){',start);
 const fills=[],hill={},concrete={};let terrain;
 const g=new Proxy({fillRect(...rect){fills.push({style:this.fillStyle,rect});}},{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 const f={footprint:{x:100,y:200,w:700,h:800},entrances:[],corridors:[],rooms:[],stair:{x:300,y:-1000}};
 const draw=new Function('g','indoorWorld','WW','W','H','INDOOR_FORECOURT_DEPTH','terrainSurfacePattern','indoorOutdoorTerrain','indoorConcretePattern','INDOOR_EXIT_RADIUS','INDOOR_EXIT_SECONDS',source.slice(start,end)+';return drawInfiltrationFloors;')(
  g,{floors:[f]},960,480,720,900,z=>{terrain=z;return hill;},{n:'丘陵',g:'#6b7a3a'},()=>concrete,90,5);
 draw(50,100);
 assert.deepEqual(terrain,{n:'丘陵',g:'#6b7a3a'});
 assert.deepEqual(fills[0],{style:hill,rect:[26,76,528,768]});
 assert.deepEqual(fills[1],{style:concrete,rect:[100,200,454,644]});
 fills.length=0;draw(50,2000);assert.equal(fills.length,1,'outside view draws no indoor floor');
});

test('exit requires five continuous seconds, resets on leaving or switching exits and needs all files',()=>{
 let s=alarmWorld();for(let seed=1;s.api.world.exits.length<2;seed++)s=alarmWorld(seed);
 const m=s.sandbox.mission,w=s.api.world,p=s.sandbox.p;let completed=0;
 s.sandbox.completeMission=()=>completed++;
 Object.assign(p,w.exits[0]);m.index=2;s.api.updateMission(6);
 assert.equal(completed,0);assert.equal(m.escapeProgress,0);
 m.index=3;s.api.updateMission(3);assert.equal(m.escapeProgress,3);assert.equal(completed,0);
 p.y+=110;s.api.updateMission(.1);assert.equal(m.escapeProgress,0);
 Object.assign(p,w.exits[0]);s.api.updateMission(3);
 Object.assign(p,w.exits[1]);s.api.updateMission(1);assert.equal(m.escapeProgress,1,'switching circles starts again');
 p.tank={};s.api.updateMission(.1);assert.equal(m.escapeProgress,0);p.tank=null;
 s.api.updateMission(4.9);assert.equal(completed,0);s.api.updateMission(.1);assert.equal(completed,1);
 s.api.updateMission(1);assert.equal(completed,1,'finish only once');
});



test('audible explosions add one eye per event, investigate snapshots and activate the alarm at three',()=>{
 const s=alarmWorld(),world=s.api.world,floor=world.floors[0];
 const listeners=floor.guards.slice(0,2),point={x:listeners[0].x,y:listeners[0].y};
 for(const f of world.floors)for(const h of f.guards)h.stunRecover=1;
 for(const h of listeners)Object.assign(h,{stunRecover:0,x:point.x,y:point.y,st:0});
 s.api.hearExplosion(point.x,point.y,500);
 assert.equal(s.api.level(),1,'several listeners hear the same explosion only once');
 assert.equal(world.alarm.witnesses.size,0,'hearing is not visual discovery');
 for(const h of listeners){
  assert.ok(h.sus>0);assert.equal(h.st,0);assert.equal(h.target,null);
  assert.equal(h.indoorAlert.phase,'lastSeen');
  assert.equal(h.indoorAlert.lastSeen.x,point.x);
 }
 s.sandbox.p.x=point.x+900;
 assert.equal(listeners[0].indoorAlert.lastSeen.x,point.x,'hidden movement never updates the noise snapshot');
 s.api.hearExplosion(point.x+5000,point.y,100);assert.equal(s.api.level(),1,'unheard blasts add no eye');
 world.currentFloor=1;s.api.hearExplosion(point.x,point.y,500);
 assert.equal(s.api.level(),1,'other-floor listeners cannot hear the event');
 world.currentFloor=0;
 s.api.hearExplosion(point.x,point.y,500);assert.equal(s.api.level(),2);
 s.api.hearExplosion(point.x,point.y,500);assert.equal(s.api.level(),3);assert.equal(world.alarm.active,true);
 s.api.hearExplosion(point.x,point.y,500);assert.equal(world.alarm.noiseCount,3,'completed warning set stays bounded');
});

test('pursuit keeps found status beyond the old grace and releases after twice the old duration',()=>{
 const s=guardScenario();s.h.x=-300;s.api.begin(s.h);s.setVisible(false);
 s.api.update(s.h,1.36);assert.equal(s.h.indoorAlert.phase,'found');
 s.api.update(s.h,1.33);assert.equal(s.h.indoorAlert.phase,'found');
 s.api.update(s.h,.02);assert.equal(s.h.indoorAlert.phase,'lastSeen');
});

test('infiltration patrol sight grows moderately and pursuit release distance doubles',()=>{
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/infiltration-world.js'),'utf8');
 const start=src.indexOf('function indoorGuardSeesPlayer('),end=src.indexOf('function indoorMoveGuardTo(',start);
 const p={x:0,y:0};let wall=true;
 const sees=new Function('p','indoorStairProtected','debugMode','inTumbleweed','inBush','weather','inWaterAt',
  'indoorWorld','D','angD','indoorLightLevel','detectRange','DETECT_CENTER_HALF','DETECT_OUTER_HALF','DETECT_OUTER_SCALE','cachedLos',
  src.slice(start,end)+';return indoorGuardSeesPlayer;')(
  p,()=>false,0,()=>false,()=>false,'clear',()=>false,{currentFloor:0},
  (a,b)=>Math.hypot(a.x-b.x,a.y-b.y),(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),()=>1,()=>250,
  7.5*Math.PI/180,52.5*Math.PI/180,.7,()=>wall);
 const h={x:0,y:0,face:0,indoorFloor:1};
 p.x=340;assert.equal(sees(h),true,'patrol now sees beyond the old 300px range');
 p.x=351;assert.equal(sees(h),false,'patrol remains bounded');
 const angle=70*Math.PI/180;p.x=200*Math.cos(angle);p.y=200*Math.sin(angle);
 assert.equal(sees(h),true,'outer half-angle expands from 63 to 73.5 degrees');
 p.x=590;p.y=0;h.indoorAlert={phase:'found'};
 assert.equal(sees(h),true);p.x=601;assert.equal(sees(h),false,'release distance doubles from 300 to 600px');
 p.x=100;wall=false;assert.equal(sees(h),false,'walls still block extended sight');
});

test('explosion dispatch preserves outdoor suspicion and isolates the indoor hearing handler',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const start=html.indexOf('function suspectHumansNear('),end=html.indexOf('\nfunction alertedHumanInSearch(',start);
 for(const mode of ['base','beginner','front','indoor'])for(const explosion of [false,true]){
  const calls=[],h={alive:true,x:0,y:0},stunned={alive:true,stun:1,x:0,y:0},far={alive:true,x:900,y:0};
  const fn=new Function('stageMode','debugMode','humans','setSuspicion','suspectTanksNear','indoorHearExplosion',
   html.slice(start,end)+';return suspectHumansNear;')(
   mode,0,[h,stunned,far],(...a)=>calls.push(['human',...a]),(...a)=>calls.push(['tank',...a]),(...a)=>calls.push(['indoor',...a]));
  fn(0,0,500,explosion);
  if(mode==='indoor'&&explosion)assert.deepEqual(calls,[['indoor',0,0,500]]);
  else assert.deepEqual(calls,[['human',h,2,0,0],['tank',0,0,500]],mode+' keeps the original suspicion behavior');
 }
});


test('open lobby has no floor outline or inset shading that could imitate a missing wall',()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/infiltration-world.js'),'utf8');
 const start=source.indexOf('function drawInfiltrationFloors(cx,cy){'),end=source.indexOf('function drawInfiltrationProps(cx,cy){',start);
 const operations=[],g=new Proxy({fillRect(...r){operations.push(['fill',this.fillStyle,...r]);},strokeRect(...r){operations.push(['border',...r]);}},
  {get:(o,k)=>k in o?o[k]:()=>{}});
 const tile={x:200,y:200,w:180,h:315},f={footprint:{x:0,y:0,w:960,h:1200},corridors:[tile],
  rooms:[],stair:{x:0,y:-1000},lobbyArea:{x:200,y:200,w:360,h:630}};
 const draw=new Function('g','indoorWorld','WW','W','H','INDOOR_FORECOURT_DEPTH','terrainSurfacePattern','indoorOutdoorTerrain','indoorConcretePattern','INDOOR_EXIT_RADIUS','INDOOR_EXIT_SECONDS',
  source.slice(start,end)+';return drawInfiltrationFloors;')(g,{floors:[f]},960,960,720,900,()=>null,{g:'#123'},()=>null,90,5);
 draw(0,0);const withLobby=JSON.stringify(operations);operations.length=0;f.lobbyArea=null;draw(0,0);
 assert.equal(JSON.stringify(operations),withLobby,'lobby metadata cannot paint a false boundary on the same floor');
 assert.ok(!operations.some(op=>op[0]==='border'));
});

test('lobby lighting crosses a wall-free boundary while remaining excluded from rooms',()=>{
 const s=alarmWorld(),f=s.api.world.floors[0],lobby=f.lobbyArea;
 const lobbyLights=f.lightFixtures.filter(q=>q.zone==='lobby');
 for(const light of lobbyLights)assert.equal(light.clipTiles,f.corridors,'clip to continuous open circulation area');
 for(const light of f.lightFixtures.filter(q=>q.zone==='entry'&&!q.anchor.startsWith('entry-north')))
  assert.ok(f.corridors.every(tile=>light.clipTiles.includes(tile)),'entry lights also avoid an artificial lobby seam');
 for(const light of f.lightFixtures.filter(q=>q.zone==='room'))
  assert.ok(f.rooms.some(room=>light.clipTiles===room.tiles),'closed rooms retain their existing light boundary');
 // Two connected floor tiles on either side of the old lobby edge.
 const y=lobby.y+100,x=lobby.x,tiles=[{x:x-180,y:lobby.y,w:180,h:315},{x,y:lobby.y,w:180,h:315}];
 f.lightFixtures=[{x,y,rx:185,ry:185,clipTiles:tiles}];
 const a=s.api.lightLevel(x-1,y),b=s.api.lightLevel(x+1,y);
 assert.ok(a>.9&&b>.9);assert.ok(Math.abs(a-b)<.001,'no vertical lighting cutoff through an open floor');
});
