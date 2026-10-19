/* Indoor environment adapter: NO replacement game loop or controls. */
const INDOOR_FILES_TOTAL=3,INDOOR_ACQUIRE_SECONDS=8,INDOOR_ACQUIRE_RADIUS=68;
const indoorRand=(rng,a,b)=>a+(b-a)*rng();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const indoorShuffle=(arr,rng)=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
function indoorGenerateFloor(number,rng=Math.random,sharedStairIndex=null){
  // 5×7の180px区画を接続。廊下の形だけ先に確定し、残りを10室に分割する。
  // 同じ部屋に割り当てた区画間は壁を作らず、大小さまざまな連結部屋にする。
  const COLS=5,ROWS=7,SIZE=180,X0=70,Y0=80,ROOM_COUNT=10;
  const index=(c,r)=>r*COLS+c;
  const coord=i=>({c:i%COLS,r:Math.floor(i/COLS)});
  const all=Array.from({length:COLS*ROWS},(_,i)=>i);
  const neighbors=i=>{const {c,r}=coord(i),a=[];if(r>0)a.push(index(c,r-1));if(c<COLS-1)a.push(index(c+1,r));if(r<ROWS-1)a.push(index(c,r+1));if(c>0)a.push(index(c-1,r));return a;};
  const center=i=>{const {c,r}=coord(i);return{x:X0+(c+.5)*SIZE,y:Y0+(r+.5)*SIZE};};
  const patterns=['H','L','T','四角','コ'];
  const pattern=patterns[Math.floor(rng()*patterns.length)];
  const hall=new Set(),add=(c,r)=>hall.add(index(c,r));
  if(pattern==='H'){
    for(let r=1;r<=5;r++){add(1,r);add(3,r);}
    const bridge=2+Math.floor(rng()*3);
    for(let c=1;c<=3;c++)add(c,bridge);
  }else if(pattern==='L'){
    const rail=rng()<.5?1:3,cap=rng()<.5?1:5;
    for(let r=1;r<=5;r++)add(rail,r);
    for(let c=1;c<=4;c++)add(c,cap);
  }else if(pattern==='T'){
    const bar=rng()<.5?1:5;
    for(let c=0;c<COLS;c++)add(c,bar);
    for(let r=1;r<=5;r++)add(2,r);
  }else if(pattern==='四角'){
    for(let r=1;r<=5;r++){add(1,r);add(3,r);}
    for(let c=1;c<=3;c++){add(c,1);add(c,5);}
  }else{
    for(let r=1;r<=5;r++){add(1,r);add(3,r);}
    for(let c=1;c<=3;c++)add(c,5);
  }
  // Exterior entrances and the broad lobby belong only to the ground floor.
  const hasExterior=number===1;
  add(2,1);add(1,1);if(hasExterior)add(2,0);
  const south=[1,2,3].filter(c=>hall.has(index(c,5)));
  const entranceCol=south.length?south[Math.floor(rng()*south.length)]:1;
  // 南端の縦2×横2区画をつなぎ、ゆったりした玄関ホールとする。
  const lobbyIds=[],lobbyLeft=entranceCol===3?2:entranceCol;
  if(hasExterior)for(let r=5;r<=6;r++)for(let c=lobbyLeft;c<=lobbyLeft+1;c++){add(c,r);lobbyIds.push(index(c,r));}
  const mainDoor={x:center(index(entranceCol,6)).x,y:Y0+ROWS*SIZE,side:'bottom'};
  const entrance=hasExterior?{x:mainDoor.x,y:mainDoor.y+54}:null;
  const emergencyDoor={x:center(index(2,0)).x,y:Y0,side:'top'};
  const emergency=hasExterior?{x:emergencyDoor.x,y:emergencyDoor.y-54}:null;
  // 固定(2,1)を廃止し、生成された廊下の中から階段を抽選する。
  const halls=Array.from(hall);
  const stairOptions=halls.filter(i=>{const {r}=coord(i);return r>=1&&r<=4;});
  const stairDraw=stairOptions[Math.floor(rng()*stairOptions.length)];
  const stairIndex=Number.isInteger(sharedStairIndex)&&hall.has(sharedStairIndex)?sharedStairIndex:stairDraw;
  const stair=center(stairIndex);
  const distToStair=new Map([[stairIndex,0]]),queue=[stairIndex];
  for(let at=0;at<queue.length;at++){
    const i=queue[at],d=distToStair.get(i);
    for(const n of neighbors(i))if(hall.has(n)&&!distToStair.has(n)){distToStair.set(n,d+1);queue.push(n);}
  }
  if(distToStair.size!==hall.size)throw Error('屋内廊下が分断されています');
  const exit=entrance; // 外周玄関がスタート地点と通常の脱出地点
  const free=all.filter(i=>!hall.has(i)),freeSet=new Set(free);
  const adjacency=new Map(free.map(i=>[i,neighbors(i).filter(n=>freeSet.has(n))]));
  const boundary=free.filter(i=>neighbors(i).some(n=>hall.has(n)));
  // 非廊下の連結成分から最低1室を確保。各部屋には必ず廊下側の扉が存在する。
  const seen=new Set(),components=[];
  for(const cell of free){
    if(seen.has(cell))continue;
    const comp=[],q=[cell];seen.add(cell);
    for(let at=0;at<q.length;at++){
      const i=q[at];comp.push(i);
      for(const n of adjacency.get(i))if(!seen.has(n)){seen.add(n);q.push(n);}
    }
    components.push(comp);
  }
  const seeds=[];
  for(const comp of components){
    const edges=comp.filter(i=>boundary.includes(i));
    if(!edges.length)throw Error('廊下への出入口がない部屋群');
    seeds.push(edges[Math.floor(rng()*edges.length)]);
  }
  while(seeds.length<ROOM_COUNT){
    const options=boundary.filter(i=>!seeds.includes(i));
    if(!options.length)throw Error('部屋の出入口が不足');
    // 少し離れた扉から順に部屋を成長させて、大部屋の偏りを避ける。
    let max=-1,selected=null;
    for(const i of indoorShuffle(options.slice(),rng)){
      const p=coord(i),score=Math.min(...seeds.map(k=>{const q=coord(k);return Math.abs(p.c-q.c)+Math.abs(p.r-q.r);}))+(rng()-.5)*1.2;
      if(score>max){max=score;selected=i;}
    }
    seeds.push(selected);
  }
  const owner=Array(COLS*ROWS).fill(-2);
  for(const i of hall)owner[i]=-1;
  seeds.forEach((i,k)=>{owner[i]=k;});
  const grouped=seeds.map(i=>[i]);
  const targets=indoorShuffle([1,1,1,2,2,3,3,4,4,5],rng);
  // 小部屋を必ず1室確保。ほかの部屋から到達できる区画を塞がない
  // （連結成分から1区画だけ除いた状態で、残り全区画に別の部屋から届く）候補のみ固定。
  let frozen=-1;
  for(const comp of indoorShuffle(components.slice(),rng)){
    const local=seeds.map((cell,k)=>comp.includes(cell)?k:-1).filter(k=>k>=0);
    for(const k of indoorShuffle(local.slice(),rng)){
      if(comp.length===1){frozen=k;break;}
      if(local.length<2)continue;
      const allowed=new Set(comp.filter(cell=>cell!==seeds[k]));
      const stack=local.filter(id=>id!==k).map(id=>seeds[id]),visited=new Set(stack);
      for(let at=0;at<stack.length;at++)for(const n of adjacency.get(stack[at]))if(allowed.has(n)&&!visited.has(n)){
        visited.add(n);stack.push(n);
      }
      if(visited.size===allowed.size){frozen=k;break;}
    }
    if(frozen>=0)break;
  }
  if(frozen>=0){const other=targets.indexOf(1);[targets[frozen],targets[other]]=[targets[other],targets[frozen]];}
  let remaining=free.length-seeds.length,rounds=0;
  // 広いホールを確保しても、少なくとも1室は3区画以上の大部屋にする。
  // 成長可能な部屋を一つ選び、空き区画を2つ先に取り込む。
  let lead=-1,planned=[];
  const leadOptions=indoorShuffle(seeds.map((cell,k)=>k).filter(k=>k!==frozen&&targets[k]>=3),rng);
  for(const k of leadOptions){
    const seen2=new Set([seeds[k]]),todo=[seeds[k]],freeCells=[];
    for(let at=0;at<todo.length&&freeCells.length<2;at++){
      for(const n of adjacency.get(todo[at])){
        if(seen2.has(n)||owner[n]!==-2)continue;
        seen2.add(n);todo.push(n);freeCells.push(n);
      }
    }
    if(freeCells.length>=2){lead=k;planned=freeCells.slice(0,2);break;}
  }
  if(lead>=0){
    for(const cell of planned){
      owner[cell]=lead;grouped[lead].push(cell);remaining--;
    }
  }
  while(remaining>0){
    const candidates=[];
    for(let k=0;k<ROOM_COUNT;k++)if(k!==frozen)for(const cell of grouped[k])for(const n of adjacency.get(cell))if(owner[n]===-2){
      const growth=grouped[k].length,goal=targets[k];
      candidates.push({k,n,weight:growth<goal?5+(goal-growth):1/(growth+1)});
    }
    if(!candidates.length)throw Error('割り当てられない部屋区画');
    let weightSum=0;
    for(const item of candidates)weightSum+=item.weight;
    let r=rng()*weightSum,choice=candidates[candidates.length-1];
    for(const item of candidates){r-=item.weight;if(r<=0){choice=item;break;}}
    if(owner[choice.n]!==-2)continue;
    owner[choice.n]=choice.k;grouped[choice.k].push(choice.n);remaining--;
    if(++rounds>1000)throw Error('部屋分割が終了しない');
  }
  const names=indoorShuffle(['資料室','通信室','作戦室','兵員室','書庫','会議室','倉庫','解析室','記録室','機材室'],rng);
  const rooms=grouped.map((cells,id)=>{
    const xs=cells.map(i=>coord(i).c),ys=cells.map(i=>coord(i).r);
    const minC=Math.min(...xs),minR=Math.min(...ys),maxC=Math.max(...xs),maxR=Math.max(...ys);
    const tiles=cells.map(i=>{const {c,r}=coord(i);return{x:X0+c*SIZE,y:Y0+r*SIZE,w:SIZE,h:SIZE};});
    return{id,name:names[id],size:cells.length,cellIds:cells.slice(),tiles,
      x:X0+minC*SIZE,y:Y0+minR*SIZE,w:(maxC-minC+1)*SIZE,h:(maxR-minR+1)*SIZE};
  });
  // 区画境界の壁を既存カバー物として作り、部屋間・廊下側の扉には84pxの開口を設ける。
  const doors=new Map(),doorMarks=[],windows=[];
  const doorKey=(a,b)=>[Math.min(a,b),Math.max(a,b)].join(':');
  const addDoor=(a,b,kind='room')=>{
    const key=doorKey(a,b);
    if(doors.has(key))return false;
    doors.set(key,kind);
    const ca=coord(a),cb=coord(b),vertical=ca.c!==cb.c;
    const pt={x:vertical?X0+Math.max(ca.c,cb.c)*SIZE:X0+(ca.c+.5)*SIZE,
      y:vertical?Y0+(ca.r+.5)*SIZE:Y0+Math.max(ca.r,cb.r)*SIZE};
    doorMarks.push({...pt,vertical,outer:false,kind,cells:[a,b]});
    return true;
  };
  for(const room of rooms){
    const edges=[];
    for(const cell of room.cellIds)for(const other of neighbors(cell))if(hall.has(other))edges.push([cell,other]);
    if(!edges.length)throw Error('廊下に面していない部屋');
    // まず各部屋に最低1つの廊下側ドアを設置。後で部屋同士・廊下側の追加ドアを置く。
    const chosen=edges[Math.floor(rng()*edges.length)];
    addDoor(chosen[0],chosen[1],'room-hall');
    room.door={inside:chosen[0],outside:chosen[1],point:{...doorMarks[doorMarks.length-1]}};
    // 窓は外壁のみ。廊下側や部屋間の間仕切りには作らない。
    const outside=[];
    for(const i of room.cellIds){
      const {c,r}=coord(i);
      if(c===0)outside.push({x:X0,y:Y0+(r+.5)*SIZE,vertical:true,external:true});
      if(c===COLS-1)outside.push({x:X0+COLS*SIZE,y:Y0+(r+.5)*SIZE,vertical:true,external:true});
      if(r===0)outside.push({x:X0+(c+.5)*SIZE,y:Y0,vertical:false,external:true});
      if(r===ROWS-1)outside.push({x:X0+(c+.5)*SIZE,y:Y0+ROWS*SIZE,vertical:false,external:true});
    }
    if(outside.length)windows.push(outside[Math.floor(rng()*outside.length)]);
  }
  // 大きめの部屋や隣接する部屋には、2つ目・3つ目の出入口を追加。
  // 直接部屋同士をつなぐ扉と、廊下への予備扉を混ぜて、回り道を減らす。
  const extraEdges=[];
  for(const cell of all)for(const other of neighbors(cell)){
    if(other<=cell||owner[cell]===owner[other])continue;
    const a=owner[cell],b=owner[other];
    if(a===-1&&b===-1)continue;
    if(doors.has(doorKey(cell,other)))continue;
    extraEdges.push({a:cell,b:other,kind:a>=0&&b>=0?'room-room':'room-hall',
      size:Math.max(a>=0?rooms[a].size:0,b>=0?rooms[b].size:0),
      rooms:[a,b].filter(v=>v>=0)});
  }
  const extraCounts=Array(ROOM_COUNT).fill(0);
  const candidates=indoorShuffle(extraEdges.slice(),rng);
  const roomRoom=candidates.filter(e=>e.kind==='room-room')
    .sort((a,b)=>b.size-a.size);
  const roomHall=candidates.filter(e=>e.kind==='room-hall')
    .sort((a,b)=>b.size-a.size);
  let connectingRooms=0,moreHallDoors=0;
  const takeEdges=(pool,max,kind)=>{
    for(const edge of pool){
      if(kind==='room-room'&&connectingRooms>=max)break;
      if(kind==='room-hall'&&moreHallDoors>=max)break;
      if(edge.rooms.some(id=>extraCounts[id]>=(rooms[id].size>=4?2:1)))continue;
      if(addDoor(edge.a,edge.b,kind)){
        edge.rooms.forEach(id=>extraCounts[id]++);
        if(kind==='room-room')connectingRooms++;else moreHallDoors++;
      }
    }
  };
  // 直接つながる室間扉を優先し、必ず複数箇所（候補がある場合）。
  takeEdges(roomRoom,4,'room-room');
  takeEdges(roomHall,4,'room-hall');
  // 室間の候補が少ない間取りでは、廊下に接する別扉を補充。
  if(connectingRooms<2)takeEdges(roomHall,5,'room-hall');
  for(const room of rooms){
    room.doors=doorMarks.filter(q=>q.cells&&q.cells.some(cell=>room.cellIds.includes(cell)));
  }
  const walls=[];
  const put=(x,y,w,h)=>{if(w>1&&h>1)walls.push({x,y,w,h});};
  const edgeWall=(i,other,side)=>{
    const {c,r}=coord(i),x=X0+c*SIZE,y=Y0+r*SIZE;
    const vertical=side==='left'||side==='right';
    const length=SIZE,wx=vertical?(side==='left'?x:x+SIZE):x;
    const wy=vertical?y:(side==='top'?y:y+SIZE);
    const key=other===null?'':[Math.min(i,other),Math.max(i,other)].join(':');
    const externalEntry=hasExterior&&other===null&&(
      (side==='bottom'&&c===entranceCol&&r===ROWS-1)||
      (side==='top'&&c===2&&r===0)
    );
    if(doors.has(key)||externalEntry){
      const gap=84,shift=(SIZE-gap)/2,thick=22;
      if(vertical){put(wx-thick/2,wy,thick,shift);put(wx-thick/2,wy+shift+gap,thick,length-shift-gap);}
      else{put(wx,wy-thick/2,shift,thick);put(wx+shift+gap,wy-thick/2,length-shift-gap,thick);}
    }else if(vertical)put(wx-11,wy,22,length);
    else put(wx,wy-11,length,22);
  };
  for(const i of all){
    const {c,r}=coord(i),id=owner[i];
    for(const [dc,dr,side] of [[0,-1,'top'],[1,0,'right'],[0,1,'bottom'],[-1,0,'left']]){
      const nc=c+dc,nr=r+dr;
      if(nc<0||nc>=COLS||nr<0||nr>=ROWS){edgeWall(i,null,side);continue;}
      const n=index(nc,nr);
      if(id===owner[n]||n<i)continue;
      edgeWall(i,n,side);
    }
  }
  // A visible doorway must also be a physical gap, including overlapping wall joins.
  // Limited to the indoor generator; outdoor collision stays unchanged.
  for(const door of doorMarks){
    const aperture=door.vertical
      ?{x:door.x-11,y:door.y-42,w:22,h:84}
      :{x:door.x-42,y:door.y-11,w:84,h:22};
    for(let i=walls.length-1;i>=0;i--){
      const w=walls[i],x=Math.max(w.x,aperture.x),y=Math.max(w.y,aperture.y);
      const right=Math.min(w.x+w.w,aperture.x+aperture.w),bottom=Math.min(w.y+w.h,aperture.y+aperture.h);
      if(right<=x||bottom<=y)continue;
      walls.splice(i,1);
      for(const part of [
        {x:w.x,y:w.y,w:w.w,h:y-w.y},
        {x:w.x,y:bottom,w:w.w,h:w.y+w.h-bottom},
        {x:w.x,y,w:x-w.x,h:bottom-y},
        {x:right,y,w:w.x+w.w-right,h:bottom-y}
      ])if(part.w>1&&part.h>1)walls.push(part);
    }
  }
  // 最大の部屋を詰所にしてテーブルを囲む青兵4～8体を用意.
  const largest=Math.max(...rooms.map(r=>r.size));
  const postCandidates=rooms.filter(r=>r.size===largest);
  const postRoom=postCandidates[Math.floor(rng()*postCandidates.length)];
  postRoom.name='青兵詰所';postRoom.isGuardPost=true;
  // 部屋の奥を詰所中心にして、扉を塞がず待機できる位置を優先。
  const doorCell=coord(postRoom.door.inside);
  const postCell=postRoom.cellIds.slice().sort((a,b)=>{
    const aa=coord(a),bb=coord(b);
    const da=Math.abs(aa.c-doorCell.c)+Math.abs(aa.r-doorCell.r);
    const db=Math.abs(bb.c-doorCell.c)+Math.abs(bb.r-doorCell.r);
    return db-da;
  })[0];
  const postTile=postRoom.tiles[postRoom.cellIds.indexOf(postCell)];
  const postCenter={x:postTile.x+SIZE/2,y:postTile.y+SIZE/2};
  const postCount=Math.max(4,Math.min(8,postRoom.size+1)),postGuards=[];
  for(let k=0;k<postCount;k++){
    const a=-Math.PI/2+Math.PI*2*k/postCount;
    const pos={x:postCenter.x+Math.cos(a)*66,y:postCenter.y+Math.sin(a)*63};
    postGuards.push({...pos,waypoints:[pos],face:Math.atan2(postCenter.y-pos.y,postCenter.x-pos.x),post:true});
  }
  const furniture=[];
  const addFurniture=(kind,x,y,w,h,zone)=>furniture.push({kind,x,y,w,h,zone});
  for(const room of rooms){
    const tiles=indoorShuffle(room.tiles.slice(),rng);
    for(let k=0;k<Math.min(room.size>=3?3:2,tiles.length);k++){
      const tile=tiles[k];
      if(room===postRoom&&tile===postTile)continue;
      const kind=k===0?'cabinet':k===1?'table':'desk';
      addFurniture(kind,tile.x+(rng()<.5?22:SIZE-78),
        tile.y+(k%2?SIZE-68:22),kind==='cabinet'?50:56,kind==='cabinet'?44:40,'room');
    }
  }
  addFurniture('postTable',postCenter.x-47,postCenter.y-28,94,56,'post');
  // Keep one consistent side throughout each floor, including doorway fallback
  // positions and explosive cargo. Never alternate sides in adjacent hall cells.
  let hallLeft;
  const hallCorners=(w,h,margin=16)=>{
    const x=hallLeft?margin:SIZE-w-margin;
    return [[x,margin],[x,SIZE-h-margin]];
  };
  const supplies=indoorShuffle(['ammo','supply','barrel','sandbag','kit'],rng);
  const safeHalls=indoorShuffle(halls.filter(i=>i!==stairIndex&&i!==index(2,0)&&!lobbyIds.includes(i)),rng);
  const supplyCount=safeHalls.length;
  for(let k=0;k<supplyCount;k++){
    // Preserve random draws so unrelated room layouts and patrol routes stay stable.
    const {c,r}=coord(safeHalls[k]),left=rng()<.5,top=rng()<.5;
    if(hallLeft===undefined)hallLeft=left;
    const [dx,dy]=hallCorners(52,40)[top?0:1];
    addFurniture(supplies[k%supplies.length],X0+c*SIZE+dx,Y0+r*SIZE+dy,52,40,'hallway');
  }
  // Stage-exclusive cargo: each cluster contains one kind; collisions match visual scale.
  // Crates are 2x and shell pallets 4x along BOTH axes. Barrels keep their size.
  const explosiveObjects=[];
  const clusterCells=indoorShuffle(halls.filter(i=>!lobbyIds.includes(i)&&i!==stairIndex&&i!==index(2,0)),rng);
  const roomCells=indoorShuffle(rooms.filter(r=>r!==postRoom).flatMap(r=>r.cellIds),rng);
  const overlap=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;
  const doorLane=d=>d.vertical
    ?{x:d.x-35,y:d.y-30,w:70,h:60}
    :{x:d.x-24,y:d.y-35,w:48,h:70};
  const doorLanes=doorMarks.map(doorLane);
  // Static furniture must leave the actual doorway approach open.
  for(let i=furniture.length-1;i>=0;i--){
    const item=furniture[i];
    if(!doorLanes.some(d=>overlap(item,d)))continue;
    const tx=X0+Math.floor((item.x-X0)/SIZE)*SIZE,ty=Y0+Math.floor((item.y-Y0)/SIZE)*SIZE;
    const corners=item.zone==='hallway'?hallCorners(item.w,item.h):
      [[16,16],[SIZE-item.w-16,16],[16,SIZE-item.h-16],[SIZE-item.w-16,SIZE-item.h-16]];
    const alternate=corners.map(([dx,dy])=>({...item,x:tx+dx,y:ty+dy})).find(o=>
      !doorLanes.some(d=>overlap(o,d))&&
      !furniture.some((f,j)=>j!==i&&overlap(o,f,3))&&
      distance({x:o.x+o.w/2,y:o.y+o.h/2},stair)>78);
    if(alternate){item.x=alternate.x;item.y=alternate.y;}
    else furniture.splice(i,1);
  }
  // Do not replenish the opposite side to satisfy an old density minimum.
  // At most two props/cargo pieces may occupy a hallway cell in total.
  const hallCellCount=cell=>{
    const {c,r}=coord(cell),x=X0+c*SIZE,y=Y0+r*SIZE;
    return [...furniture,...explosiveObjects].filter(o=>o.zone==='hallway'&&
      o.x>=x&&o.x<x+SIZE&&o.y>=y&&o.y<y+SIZE).length;
  };
  const isFree=o=>{
    const cx=o.x+o.w/2,cy=o.y+o.h/2;
    if(distance({x:cx,y:cy},stair)<98)return false;
    if(doorLanes.some(d=>overlap(o,d,5)))return false;
    if(walls.some(w=>overlap(o,w,3)))return false;
    if(furniture.some(f=>overlap(o,f,6)))return false;
    if(explosiveObjects.some(f=>overlap(o,f,7)))return false;
    return true;
  };
  const placeCluster=(cell,zone,kind,groupId)=>{
    const {c,r}=coord(cell),xx=X0+c*SIZE,yy=Y0+r*SIZE;
    const size=kind==='shellPallet'?120:kind==='crate'?60:30;
    const available=zone==='hallway'?2-hallCellCount(cell):2-explosiveObjects.filter(o=>
      o.x>=xx&&o.x<xx+SIZE&&o.y>=yy&&o.y<yy+SIZE).length;
    const count=Math.min(kind==='shellPallet'?1:2,available);
    if(count<=0)return false;
    const columns=zone==='hallway'||kind==='shellPallet'||kind==='crate'?1:2;
    const gap=kind==='shellPallet'?0:7;
    const rows=Math.ceil(count/columns),width=columns*size+(columns-1)*gap,height=rows*size+(rows-1)*gap;
    const positions=zone==='hallway'
      ?hallCorners(width,height,14)
      :[[14,14],[SIZE-width-14,14],[14,SIZE-height-14],[SIZE-width-14,SIZE-height-14]];
    for(const [dx,dy] of positions){
      const items=Array.from({length:count},(_,i)=>({
        x:xx+dx+(i%columns)*(size+gap),y:yy+dy+Math.floor(i/columns)*(size+gap),
        w:size,h:size,kind,zone,group:zone+'-'+groupId}));
      if(dx<10||dy<10||dx+width>SIZE-10||dy+height>SIZE-10)continue;
      if(items.every(o=>isFree(o))){
        explosiveObjects.push(...items);return true;
      }
    }
    return false;
  };
  // Guarantee a large shell pallet even when all free room corners contain furniture.
  // Prefer an undisturbed tile; as a fallback, replace only overlapping indoor decoration.
  const reserveLargePallet=()=>{
    let best=null;
    for(const cell of roomCells){
      const {c,r}=coord(cell),xx=X0+c*SIZE,yy=Y0+r*SIZE;
      for(const dx of [14,46])for(const dy of [14,46]){
        const o={x:xx+dx,y:yy+dy,w:120,h:120,kind:'shellPallet',zone:'room',group:'room-shell-large'};
        if(distance({x:o.x+60,y:o.y+60},stair)<98||
           doorLanes.some(d=>overlap(o,d,5))||
           walls.some(w=>overlap(o,w,3))||
           explosiveObjects.some(v=>overlap(o,v,7)))continue;
        const displaced=furniture.filter(v=>overlap(o,v,6));
        if(!best||displaced.length<best.displaced.length)best={o,displaced};
        if(!displaced.length)break;
      }
      if(best&&!best.displaced.length)break;
    }
    if(!best)return false;
    for(const o of best.displaced)furniture.splice(furniture.indexOf(o),1);
    explosiveObjects.push(best.o);return true;
  };
  reserveLargePallet();
  // Large pallets live inside rooms so they cannot block the hall center lane.
  for(let k=0;k<Math.min(7,clusterCells.length);k++)
    placeCluster(clusterCells[k],'hallway',k%2?'barrel':'crate',k);
  for(let k=0;k<Math.min(7,roomCells.length);k++)
    placeCluster(roomCells[k],'room',['crate','barrel','shellPallet'][k%3],k);
  // Ensure each floor has every key kind and cargo in both rooms and corridors.
  const reserve=(zone,kind)=>{
    const cells=zone==='hallway'?clusterCells:roomCells;
    for(let i=0;i<cells.length;i++)if(placeCluster(cells[i],zone,kind,'reserve-'+kind+'-'+i))return true;
    return false;
  };
  if(!explosiveObjects.some(o=>o.kind==='shellPallet'))reserve('room','shellPallet');
  if(!explosiveObjects.some(o=>o.zone==='hallway'))reserve('hallway','crate');
  if(!explosiveObjects.some(o=>o.zone==='room'))reserve('room','barrel');
  if(!explosiveObjects.some(o=>o.kind==='crate'))reserve('room','crate')||reserve('hallway','crate');
  if(!explosiveObjects.some(o=>o.kind==='barrel'))reserve('room','barrel')||reserve('hallway','barrel');
  // Ceiling lights are centered on real room/table locations, never in the walls.
  // All geometry and light strengths below are confined to the infiltration stage.
  const lightFixtures=[];
  const addLight=(pt,zone,anchor,rx,ry,roomId=null)=>{
    if(lightFixtures.some(q=>distance(q,pt)<SIZE*.44&&q.zone===zone))return false;
    lightFixtures.push({x:pt.x,y:pt.y,zone,anchor,rx,ry,roomId});return true;
  };
  const roomLight=(point,anchor,room,table=null)=>{
    // Ceiling lights cover the center of a room; table task lights stay smaller.
    // No light may spill into a neighboring room because the renderer clips to room tiles.
    const longRoom=room.size===2,wide=room.w>room.h,tall=room.h>room.w;
    const rx=table?Math.min(SIZE*.43,table.w/2+34):
      longRoom&&wide?SIZE*.96:SIZE*.76;
    const ry=table?Math.min(SIZE*.43,table.h/2+38):
      longRoom&&tall?SIZE*.96:SIZE*.76;
    // Keep a separate, more focused table light even near the central fixture.
    const near=anchor==='table';
    if(near&&lightFixtures.some(l=>l.zone==='room'&&l.roomId===room.id&&
      distance(l,point)<5))return false;
    if(near){
      lightFixtures.push({x:point.x,y:point.y,zone:'room',anchor,rx,ry,roomId:room.id});
      return true;
    }
    return addLight(point,'room',anchor,rx,ry,room.id);
  };
  // Broad lobby is deliberately a separate light region on the ground floor.
  if(hasExterior){
  addLight({x:X0+(lobbyLeft+1)*SIZE,y:Y0+6*SIZE},
    'lobby','lobby-center',SIZE*.74,SIZE*.74);
  // Broad, overlapping ceiling pools illuminate the entrance without losing soft corners.
  addLight({x:X0+(lobbyLeft+.35)*SIZE,y:Y0+6*SIZE},
    'lobby','lobby-side',SIZE*.59,SIZE*.67);
  addLight({x:X0+(lobbyLeft+1.65)*SIZE,y:Y0+6*SIZE},
    'lobby','lobby-side',SIZE*.59,SIZE*.67);
  }
  // Straight corridor runs receive lamps exactly every two blocks, on the centerline.
  // Vertical/horizontal beam shapes illuminate along the passage, not through its sides.
  const corridorCells=new Set(halls.filter(i=>!lobbyIds.includes(i)&&i!==index(2,0)));
  const corridorRuns=[];
  for(const axis of ['vertical','horizontal']){
    for(const cell of corridorCells){
      const {c,r}=coord(cell),prev=axis==='vertical'?(r>0?index(c,r-1):-1):(c>0?index(c-1,r):-1);
      if(corridorCells.has(prev))continue;
      const run=[];let cc=c,rr=r;
      while(cc<COLS&&rr<ROWS&&corridorCells.has(index(cc,rr))){
        run.push(index(cc,rr));if(axis==='vertical')rr++;else cc++;
      }
      if(run.length>=2)corridorRuns.push({axis,run});
    }
  }
  // Runs of equal length use the same phase to keep the lights evenly spaced.
  for(const {axis,run} of corridorRuns){
    const start=run.length>=3?1:0;
    for(let j=start;j<run.length;j+=2){
      const pt=center(run[j]),vertical=axis==='vertical';
      addLight(pt,'hall','hall-regular',
        SIZE*(vertical?.41:.88),SIZE*(vertical?.88:.41));
    }
  }
  // One-block branches and short corridor terminals still get a centered ceiling light.
  for(const cell of corridorCells){
    const pt=center(cell),near=lightFixtures.some(l=>l.zone==='hall'&&distance(l,pt)<SIZE*1.3);
    if(near)continue;
    const {c,r}=coord(cell),up=r>0&&corridorCells.has(index(c,r-1)),
      down=r<ROWS-1&&corridorCells.has(index(c,r+1)),
      left=c>0&&corridorCells.has(index(c-1,r)),
      right=c<COLS-1&&corridorCells.has(index(c+1,r));
    const vertical=up||down;
    addLight(pt,'hall','hall-terminal',
      SIZE*(vertical?.41:.85),SIZE*(vertical?.85:.41));
  }
  for(const room of rooms){
    const centers=room.tiles.map(t=>({x:t.x+SIZE/2,y:t.y+SIZE/2}));
    const mid={x:centers.reduce((sum,p)=>sum+p.x,0)/centers.length,
      y:centers.reduce((sum,p)=>sum+p.y,0)/centers.length};
    const roomFurniture=furniture.filter(o=>o.zone==='room'&&
      room.tiles.some(t=>o.x>=t.x&&o.x<t.x+SIZE&&o.y>=t.y&&o.y<t.y+SIZE));
    const table=room===postRoom?furniture.find(o=>o.kind==='postTable'):
      roomFurniture.filter(o=>o.kind==='table'||o.kind==='desk')
        .sort((a,b)=>distance({x:a.x+a.w/2,y:a.y+a.h/2},mid)-
          distance({x:b.x+b.w/2,y:b.y+b.h/2},mid))[0];
    const inRoom=room.tiles.some(t=>mid.x>=t.x&&mid.x<=t.x+t.w&&
      mid.y>=t.y&&mid.y<=t.y+t.h);
    const primary=inRoom?mid:centers.slice().sort((a,b)=>distance(a,mid)-distance(b,mid))[0];
    roomLight(primary,'room-center',room);
    // A ceiling task light highlights the nearby table while general room lighting remains central.
    if(table){
      const point={x:table.x+table.w/2,y:table.y+table.h/2};
      roomLight(point,'table',room,table);
    }
    // Larger rooms need separate, broadly spaced lamps rather than an oversized central beam.
    const total=room.size>=5?4:room.size>=3?3:1;
    const installed=[primary];
    while(installed.length<total){
      const p=centers.filter(pt=>installed.every(q=>distance(pt,q)>=SIZE*.7))
        .sort((a,b)=>Math.min(...installed.map(q=>distance(b,q)))-
          Math.min(...installed.map(q=>distance(a,q))))[0];
      if(!p)break;
      roomLight(p,'room-wing',room);installed.push(p);
    }
  }
  // Select only rooms with a genuine walkable document position.
  const obstacles=[...walls,...furniture,...explosiveObjects];
  const intelCandidates=rooms.filter(r=>r!==postRoom).map(room=>{
    const tiles=indoorShuffle(room.tiles.slice(),rng);
    const doorsForRoom=room.doors;
    const candidates=tiles.flatMap(t=>[
      [90,90],[40,90],[140,90],[90,40],[90,140],
      [40,40],[140,40],[40,140],[140,140]
    ].map(([dx,dy])=>({x:t.x+dx,y:t.y+dy})));
    candidates.sort((a,b)=>Math.min(...doorsForRoom.map(d=>distance(a,d)))-
      Math.min(...doorsForRoom.map(d=>distance(b,d))));
    const point=candidates.find(p=>obstacles.every(o=>p.x<=o.x-15||p.x>=o.x+o.w+15||
      p.y<=o.y-15||p.y>=o.y+o.h+15));
    return point?{room,point}:null;
  }).filter(Boolean);
  if(intelCandidates.length<INDOOR_FILES_TOTAL)throw Error('資料への通行可能な配置が不足');
  const intel=indoorShuffle(intelCandidates,rng).slice(0,INDOOR_FILES_TOTAL).map(({room,point},i)=>
    ({...point,room:room.name,id:number+'-'+i,taken:false}));
  // 既存AIのpatrol()へ渡す巡回経路を、建物全体の通行グラフから探索。
  // 同じ部屋の区画と廊下内、およびドア部分だけを通行可能な辺とする。
  const walkNeighbors=i=>neighbors(i).filter(n=>owner[i]===owner[n]||
    doors.has([Math.min(i,n),Math.max(i,n)].join(':')));
  const shortest=(start,goal)=>{
    const parent=new Map([[start,-1]]),todo=[start];
    for(let k=0;k<todo.length&&!parent.has(goal);k++)for(const n of walkNeighbors(todo[k])){
      if(parent.has(n))continue;parent.set(n,todo[k]);todo.push(n);
    }
    if(!parent.has(goal))throw Error('巡回経路の探索に失敗');
    const route=[];for(let n=goal;n!==-1;n=parent.get(n))route.push(n);
    return route.reverse();
  };
  // 各兵士が廊下と複数の部屋を行き来する閉路を持つ。
  // 個別の短い往復巡回ではなく、異なる区画を通り抜ける長距離の巡回ルートにする。
  const guards=[],roomCenters=indoorShuffle(rooms.filter(r=>r!==postRoom).map(r=>r.cellIds[0]),rng);
  const hallStarts=indoorShuffle(halls.filter(i=>distance(center(i),stair)>(hasExterior?SIZE:SIZE*.5)),rng);
  // 廊下の複雑さに応じて巡回兵を6～8体に増員。出発地点は異なる区画へ分散。
  const patrolCount=Math.min(8,hallStarts.length);
  for(let guardIndex=0;guardIndex<patrolCount;guardIndex++){
    const start=hallStarts[guardIndex];
    const visitRooms=[],goals=[];
    // 施設の上端・中央・下端を必ず経由。大部屋は対象の区画へ入る位置を選ぶ。
    for(const band of [[0,1],[2,3,4],[5,6]]){
      const options=rooms.filter(room=>room!==postRoom&&room.cellIds.some(i=>band.includes(coord(i).r)));
      const choice=options[(guardIndex*3+Math.floor(rng()*Math.max(1,options.length)))%Math.max(1,options.length)];
      if(choice){
        const cells=choice.cellIds.filter(i=>band.includes(coord(i).r));
        goals.push(cells[Math.floor(rng()*cells.length)]);
        if(!visitRooms.includes(choice))visitRooms.push(choice);
      }
    }
    for(let shift=0;visitRooms.length<5&&shift<roomCenters.length;shift++){
      const id=owner[roomCenters[(shift+guardIndex*3)%roomCenters.length]];
      if(id>=0&&!visitRooms.includes(rooms[id])){
        visitRooms.push(rooms[id]);
        const cells=rooms[id].cellIds;
        goals.push(cells[Math.floor(rng()*cells.length)]);
      }
    }
    let cell=start;const route=[start];
    for(const target of [...goals,start]){
      const path=shortest(cell,target);
      for(const n of path.slice(1))route.push(n);
      cell=target;
    }
    // 連続した直線の中間区画だけを省略し、曲がり角・扉は残す。
    // 既存patrol()の各ウェイポイントに2秒停止があるため経路を短縮。
    const compact=[route[0]];
    for(let j=1;j<route.length-1;j++){
      const a=coord(route[j-1]),b=coord(route[j]),c=coord(route[j+1]);
      if((a.c===b.c&&b.c===c.c)||(a.r===b.r&&b.r===c.r))continue;
      compact.push(route[j]);
    }
    compact.push(route[route.length-1]);
    const path=compact.map(center),next=path[1];
    guards.push({...path[0],waypoints:path,cellRoute:route,loop:true,
      index:1,face:Math.atan2(next.y-path[0].y,next.x-path[0].x),
      wait:indoorRand(rng,0,1),speed:65,sight:245});
  }
  if(hasExterior){
    doorMarks.push({...mainDoor,vertical:false,outer:true,kind:'main'});
    doorMarks.push({...emergencyDoor,vertical:false,outer:true,kind:'emergency'});
  }
  return{number,pattern,rooms,walls,furniture,explosiveObjects,lightFixtures,guards,postGuards,postCount,postRoomId:postRoom.id,intel,stair,exit,entrance,emergency,
    roomRoomDoors:connectingRooms,extraHallDoors:moreHallDoors,
    doors:doorMarks,windows,
    footprint:{x:X0,y:Y0,w:COLS*SIZE,h:ROWS*SIZE},
    stairIndex,entranceCol:hasExterior?entranceCol:null,lobbyArea:hasExterior?{x:X0+lobbyLeft*SIZE,y:Y0+5*SIZE,w:2*SIZE,h:2*SIZE}:null,
    lobby:lobbyIds.map(i=>{const {c,r}=coord(i);return{x:X0+c*SIZE,y:Y0+r*SIZE,w:SIZE,h:SIZE};}),
    corridors:halls.map(i=>{const {c,r}=coord(i);return{x:X0+c*SIZE,y:Y0+r*SIZE,w:SIZE,h:SIZE};}),
    center:stair.x};
}
// A stage map adapter; uses the main game's player, enemies, all skills,
// collisions, rendering and scoring loops without duplicating their behavior.
// 屋内専用の縦長座標変換。幅は画面内に収め、奥行きを広げて総床面積を約2倍にする。
const INDOOR_FLOOR_OFFSETS=[9300,5500],INDOOR_SCALE_X=1,INDOOR_SCALE_Y=1.75,INDOOR_OFFSET_X=-40;
let indoorWorld=null,indoorHudSnapshot='',indoorHudRefresh=0;

let indoorShadeCanvas=null,indoorShadeCtx=null,indoorLightStamp=null;
// 天井灯は床に落ちる固定光。暗所は視認性を落とすが、完全な真っ暗にはしない。
const INDOOR_LIGHT_RADIUS=185;
function indoorLightLevel(x,y){
  if(!indoorWorld)return 1;
  let near=Infinity,withinFloor=false;
  for(const f of indoorWorld.floors){
    if(y<f.footprint.y-80||y>f.footprint.y+f.footprint.h+80)continue;
    withinFloor=true;
    for(const lamp of f.lightFixtures){
      const rx=lamp.rx||INDOOR_LIGHT_RADIUS,ry=lamp.ry||INDOOR_LIGHT_RADIUS;
      if(Math.abs(x-lamp.x)>=rx||Math.abs(y-lamp.y)>=ry)continue;
      if(lamp.clipTiles&&!lamp.clipTiles.some(t=>x>=t.x&&x<=t.x+t.w&&y>=t.y&&y<=t.y+t.h))continue;
      near=Math.min(near,Math.hypot((x-lamp.x)/rx,(y-lamp.y)/ry));
    }
  }
  if(near===Infinity)return withinFloor?.24:1;
  const t=Math.max(0,1-near);
  return .24+.72*t*t*(3-2*t);
}
function indoorLightingStamp(){
  // Cache a single translucent beam texture; avoid building many gradients per frame.
  if(indoorLightStamp)return indoorLightStamp;
  const r=INDOOR_LIGHT_RADIUS,c=document.createElement('canvas');
  c.width=c.height=Math.ceil(2*r);
  const q=c.getContext('2d'),gr=q.createRadialGradient(r,r,0,r,r,r);
  gr.addColorStop(0,'rgba(0,0,0,.96)');
  gr.addColorStop(.20,'rgba(0,0,0,.91)');
  gr.addColorStop(.47,'rgba(0,0,0,.70)');
  gr.addColorStop(.73,'rgba(0,0,0,.34)');
  gr.addColorStop(.91,'rgba(0,0,0,.08)');
  gr.addColorStop(1,'rgba(0,0,0,0)');
  q.fillStyle=gr;q.fillRect(0,0,c.width,c.height);
  indoorLightStamp=c;return c;
}
function drawInfiltrationLighting(cx,cy){
  if(!indoorWorld||!gm)return;
  // Reuse the shadow mask and the cached radial texture on mobile.
  if(!indoorShadeCanvas){indoorShadeCanvas=document.createElement('canvas');indoorShadeCtx=indoorShadeCanvas.getContext('2d');}
  const mask=indoorShadeCanvas,q=indoorShadeCtx,r=INDOOR_LIGHT_RADIUS,stamp=indoorLightingStamp();
  if(mask.width!==Math.ceil(W)||mask.height!==Math.ceil(H)){mask.width=Math.ceil(W);mask.height=Math.ceil(H);}
  q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,W,H);
  q.fillStyle='rgba(7,13,15,.58)';q.fillRect(0,0,W,H);
  q.globalCompositeOperation='destination-out';
  for(const f of indoorWorld.floors){
    if(f.footprint.y>cy+H+r||f.footprint.y+f.footprint.h<cy-r)continue;
    for(const lamp of f.lightFixtures){
      const x=lamp.x-cx,y=lamp.y-cy,rx=lamp.rx||r,ry=lamp.ry||r;
      if(x<-rx||x>W+rx||y<-ry||y>H+ry)continue;
      q.save();q.beginPath();
      for(const tile of lamp.clipTiles){
        if(tile.x+tile.w<cx-rx||tile.x>cx+W+rx||
          tile.y+tile.h<cy-ry||tile.y>cy+H+ry)continue;
        q.rect(tile.x-cx,tile.y-cy,tile.w,tile.h);
      }
      q.clip();
      q.drawImage(stamp,x-rx,y-ry,rx*2,ry*2);
      q.restore();
    }
  }
  q.globalCompositeOperation='source-over';
  gm.save();gm.drawImage(mask,0,0);gm.restore();
}

const INDOOR_DOOR_WIDTH=84,INDOOR_DOOR_THICKNESS=12,INDOOR_DOOR_SPEED=5.2;
function indoorDoorCollisionRect(q){
  // 縦横とも世界座標で12pxの薄型パネル。当たり判定も描画と一致させる。
  const half=INDOOR_DOOR_WIDTH/2,thick=INDOOR_DOOR_THICKNESS;
  return q.vertical
    ?{x:q.x-thick/2,y:q.y-half*INDOOR_SCALE_Y,w:thick,h:INDOOR_DOOR_WIDTH*INDOOR_SCALE_Y}
    :{x:q.x-half*INDOOR_SCALE_X,y:q.y-thick/2,
      w:INDOOR_DOOR_WIDTH*INDOOR_SCALE_X,h:thick};
}
const indoorAt=(x,y,offset)=>({x:INDOOR_OFFSET_X+x*INDOOR_SCALE_X,y:y*INDOOR_SCALE_Y+offset});
const indoorRect=(rect,offset)=>({x:INDOOR_OFFSET_X+rect.x*INDOOR_SCALE_X,y:rect.y*INDOOR_SCALE_Y+offset,
 w:rect.w*INDOOR_SCALE_X,h:rect.h*INDOOR_SCALE_Y});
function setupInfiltrationWorld(){
  const ground=ZONE_STYLE['敵迷路基地'];
  ZONES=[{n:'敵迷路基地',y0:WH,y1:-400,g:'#202820',p:ground.p.slice(),pat:null,indoor:true}];
  roadBands=[];areaDebugLabels=[];covers=[];objects=[];bushes=[];mud=[];water=[];bridges=[];cars=[];
  etanks=[];humans=[];bullets=[];parts=[];bombs=[];items=[];waves=[];fx=[];allies=[];
  builtWalls=[];tankWrecks=[];decoy=null;radio=null;airstrike=null;airbombs=[];
  weather='clear';weatherT=0;rainIntensity=0;weatherNext=99999;baseSpawnT=99999;
  // Off-map base avoids outdoor destruction / HQ spawning while preserving core state shape.
  base={x:-5000,y:-5000,w:100,h:100,hp:30,maxHp:30,deadAt:0};
  document.body.classList.remove('front-battle');
  indoorWorld={floors:[],intel:[],currentFloor:0,stairArmed:true,stairsCooldown:0,exit:null,emergency:null,entrance:null};
  // 同じ階段位置を1F/2Fで共有させる。間取りは各階別々のランダムシード。
  const indoorSeedRng=seed=>{let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};};
  const seeds=[Math.floor(R()*4294967296),Math.floor(R()*4294967296)];
  const trial=[1,2].map((n,i)=>indoorGenerateFloor(n,indoorSeedRng(seeds[i])));
  const cellId=tile=>Math.round((tile.y-80)/180)*5+Math.round((tile.x-70)/180);
  const onSecond=new Set(trial[1].corridors.map(cellId));
  const sharedOptions=trial[0].corridors.map(cellId).filter(id=>{
    const row=Math.floor(id/5);
    return row>=1&&row<=4&&onSecond.has(id);
  });
  const sharedStair=sharedOptions[Math.floor(R()*sharedOptions.length)];
  if(!Number.isInteger(sharedStair))throw Error('共通階段の設置候補がありません');
  const rawFloors=[1,2].map((n,i)=>indoorGenerateFloor(n,indoorSeedRng(seeds[i]),sharedStair));
  const shuffled=[1,2];
  for(const n of shuffled){
    const raw=rawFloors[n-1],off=INDOOR_FLOOR_OFFSETS[n-1];
    const to=pt=>indoorAt(pt.x,pt.y,off);
    const rooms=raw.rooms.map(r=>{const rect=indoorRect(r,off);
      return{...rect,id:r.id,name:r.name,size:r.size,isGuardPost:!!r.isGuardPost,tiles:r.tiles.map(tile=>indoorRect(tile,off))};
    });
    // Walls use the existing concrete wall cover kind. Doors remain actual gaps in the core collision grid.
    for(const wall of raw.walls){
      const q=indoorRect(wall,off);
      covers.push({...q,kd:1,indoorWall:true,hp:999999});
    }
    // 補給物資と室内家具は既存遮蔽判定を利用。描画だけ屋内用に区別。
    // 固定家具なので、砲撃などがあっても配置グリッドを再生成しない。
    const props=[];
    for(const piece of raw.furniture){
      const q=indoorRect(piece,off);
      const prop={...q,kd:1,indoorProp:true,propKind:piece.kind,propZone:piece.zone,hp:999999};
      covers.push(prop);props.push(prop);
    }
    // 共通の木箱/ドラム缶/砲弾ケースを通常の爆発オブジェクトとして登録。
    for(const item of raw.explosiveObjects){
      const q=indoorRect(item,off);
      objects.push({...q,kind:item.kind==='shellPallet'?'shellPallet':item.kind,
        indoorExplosive:true,indoorGroup:item.group,mgHits:0});
    }
    const corridors=raw.corridors.map(tile=>indoorRect(tile,off));
    const lobbyArea=raw.lobbyArea?indoorRect(raw.lobbyArea,off):null;
    const lightFixtures=raw.lightFixtures.map(item=>{
      const clipTiles=item.zone==='room'?rooms[item.roomId].tiles:
        item.zone==='lobby'?[lobbyArea]:corridors;
      return{...to(item),zone:item.zone,anchor:item.anchor,
        rx:item.rx*INDOOR_SCALE_X,ry:item.ry*INDOOR_SCALE_Y,clipTiles};
    });
    // Stage-specific passage graph: a room boundary is traversable only at a real door.
    const owners=new Map(raw.rooms.flatMap(room=>room.cellIds.map(i=>[i,room.id])));
    for(const tile of raw.corridors){
      const c=Math.round((tile.x-70)/180),r=Math.round((tile.y-80)/180);
      owners.set(r*5+c,-1);
    }
    const edges=new Set(raw.doors.filter(d=>d.cells).map(d=>
      [Math.min(...d.cells),Math.max(...d.cells)].join(':')));
    const navigation={
      origin:to({x:70,y:80}),stepX:180*INDOOR_SCALE_X,stepY:180*INDOOR_SCALE_Y,
      centers:Array.from({length:35},(_,i)=>to({x:70+(i%5+.5)*180,y:80+(Math.floor(i/5)+.5)*180})),
      neighbors:Array.from({length:35},(_,i)=>{
        if(!owners.has(i))return[];
        const c=i%5,r=Math.floor(i/5),out=[];
        for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
          const nc=c+dx,nr=r+dy;if(nc<0||nc>=5||nr<0||nr>=7)continue;
          const j=nr*5+nc;if(!owners.has(j))continue;
          if(owners.get(i)===owners.get(j)||edges.has([Math.min(i,j),Math.max(i,j)].join(':')))out.push(j);
        }
        return out;
      })
    };
    navigation.grid=indoorMakeGuardGrid(raw,off);
    const guards=[];
    for(const h of raw.guards){
      const pos=to(h),path=h.waypoints.map(to);
      const guard={...pos,path,loop:!!h.loop,wi:1,dir:1,stk:0,
        alive:true,elite:false,commander:null,st:0,sus:0,lost:0,cd:R()*1.2,burstLeft:0,face:h.face,
        target:null,patrolMode:'axis',zoneHeavy:'indoor',indoorGuard:true,indoorFloor:n};
      humans.push(guard);guards.push(guard);
    }
    // 待機兵にも潜入専用の認識・追跡・射撃AIを適用。通常時だけ動かない。
    const postGuards=[];
    for(const h of raw.postGuards){
      const pos=to(h);
      const guard={...pos,path:[{...pos}],loop:false,wi:0,dir:1,stk:0,
        alive:true,elite:false,commander:null,st:0,sus:0,lost:0,cd:R()*1.2,
        burstLeft:0,face:h.face,target:null,patrolMode:'post',
        zoneHeavy:'indoor',indoorGuard:true,indoorPost:true,indoorFloor:n};
      humans.push(guard);guards.push(guard);postGuards.push(guard);
    }
    // 施設全体で3箇所。1階1箇所・2階2箇所に分ける。
    const count=n===1?1:2;
    const intel=raw.intel.slice(0,count).map((q,i)=>({...to(q),id:q.id,name:'重要資料 '+n+'F-'+(i+1),done:false,floor:n,progress:0}));
    indoorWorld.intel.push(...intel);
    const stair=to(raw.stair),entrance=raw.entrance?to(raw.entrance):null,
      emergency=raw.emergency?to(raw.emergency):null;
    const openingPoint=q=>({...to(q),vertical:q.vertical,kind:q.kind,outer:!!q.outer});
    const doors=raw.doors.map(q=>{
      const door={...openingPoint(q),open:0};
      // 動的ドアは既存の壁コリジョン配列へ追加。開いた時はnoHitを切り替えるだけ。
      // 配列や空間グリッドを毎フレーム作り直さないため処理負荷を抑える。
      door.cover={...indoorDoorCollisionRect(door),kd:1,indoorDoor:true,noHit:false,hp:999999};
      covers.push(door.cover);return door;
    });
    indoorWorld.floors.push({number:n,offset:off,pattern:raw.pattern,
      corridors,lobbyArea,rooms,stair,
      entrance,exit:entrance,emergency,
      footprint:indoorRect(raw.footprint,off),
      doors,windows:raw.windows.map(openingPoint),guards,postGuards,
      guardPostId:raw.postRoomId,props,lightFixtures,navigation});
  }
  const entrance=indoorWorld.floors[0];
  p.x=entrance.entrance.x;p.y=entrance.entrance.y;p.hp=3;p.tank=null;p.body=-Math.PI/2;p.ang=-Math.PI/2;
  scoreStats.startY=p.y;scoreStats.debugUsed=true; // Sample run never unlocks stages or overwrites records.
  indoorWorld.exit={...entrance.entrance};
  indoorWorld.entrance={...entrance.entrance};
  indoorWorld.emergency={...entrance.emergency};
  indoorWorld.currentFloor=0;
  patrolRoutesVisible=false;
  rebuildSpatialGrid();
  say('拠点潜入：廊下の物資に身を隠し、重要資料3箇所を回収せよ');
}
function setupInfiltrationMission(){
  mission={index:0,progress:0,points:indoorWorld.intel,exit:indoorWorld.exit,detected:false,
    current:null,alarm:0};
}


function indoorMakeGuardGrid(raw,off){
 // Immutable room/wall/prop occupancy, built once per floor. Dynamic doors are open
 // to planning because a nearby guard opens them; collision still handles actual doors.
 const step=16,origin=indoorAt(70,80,off),cols=Math.ceil(900/step),rows=Math.ceil(1260*INDOOR_SCALE_Y/step);
 const solid=new Uint8Array(cols*rows),rects=[...raw.walls,...raw.furniture,...raw.explosiveObjects]
   .map(o=>indoorRect(o,off));
 const margin=10;
 for(const rect of rects){
  const minX=Math.max(0,Math.ceil((rect.x-margin-origin.x)/step-.5));
  const maxX=Math.min(cols-1,Math.floor((rect.x+rect.w+margin-origin.x)/step-.5));
  const minY=Math.max(0,Math.ceil((rect.y-margin-origin.y)/step-.5));
  const maxY=Math.min(rows-1,Math.floor((rect.y+rect.h+margin-origin.y)/step-.5));
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)solid[y*cols+x]=1;
 }
 return{x:origin.x,y:origin.y,step,cols,rows,solid,
   parents:new Int32Array(cols*rows),seen:new Uint16Array(cols*rows),
   queue:new Int32Array(cols*rows),epoch:0};
}
function indoorGridPoint(grid,p){
 const x=Math.floor((p.x-grid.x)/grid.step),y=Math.floor((p.y-grid.y)/grid.step);
 return x>=0&&x<grid.cols&&y>=0&&y<grid.rows?y*grid.cols+x:-1;
}
function indoorGridFreeNearest(grid,id){
 if(id<0)return-1;
 if(!grid.solid[id])return id;
 const x=id%grid.cols,y=(id/grid.cols)|0;
 for(let r=1;r<=4;r++){
  let candidate=-1,best=Infinity;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
   const xx=x+dx,yy=y+dy;if(xx<0||xx>=grid.cols||yy<0||yy>=grid.rows)continue;
   const n=yy*grid.cols+xx;
   if(!grid.solid[n]&&dx*dx+dy*dy<best){best=dx*dx+dy*dy;candidate=n;}
  }
  if(candidate>=0)return candidate;
 }
 return-1;
}
function indoorGridDetour(nav,start,goal,maxVisits=850){
 const g=nav?.grid;if(!g)return null;
 const source=indoorGridFreeNearest(g,indoorGridPoint(g,start));
 const dest=indoorGridFreeNearest(g,indoorGridPoint(g,goal));
 if(source<0||dest<0)return null;
 if(source===dest)return [{x:goal.x,y:goal.y}];
 g.epoch=(g.epoch+1)&65535;
 if(g.epoch===0){g.seen.fill(0);g.epoch=1;}
 const mark=g.epoch,visited=g.seen,parent=g.parents,queue=g.queue;
 let head=0,tail=1,found=false,closest=source,best=Infinity;
 queue[0]=source;visited[source]=mark;parent[source]=-1;
 for(let attempts=0;head<tail&&attempts<maxVisits;attempts++){
  const u=queue[head++],x=u%g.cols,y=(u/g.cols)|0,
    dx=(dest%g.cols)-x,dy=((dest/g.cols)|0)-y,dist=dx*dx+dy*dy;
  if(dist<best){best=dist;closest=u;}
  if(u===dest){found=true;closest=u;break;}
  // Avoid allocating neighbor arrays inside the search hot loop.
  for(let k=0;k<4;k++){
   if((k===0&&y===0)||(k===1&&y===g.rows-1)||
      (k===2&&x===0)||(k===3&&x===g.cols-1))continue;
   const v=u+(k===0?-g.cols:k===1?g.cols:k===2?-1:1);
   if(g.solid[v]||visited[v]===mark)continue;
   visited[v]=mark;parent[v]=u;queue[tail++]=v;
  }
 }
 if(closest===source)return null;
 const cells=[];
 for(let id=closest;id!==source&&id!==-1;id=parent[id])cells.push(id);
 cells.reverse();
 // Avoid hundreds of micro-targets. Keep corners and sample straight lines.
 const points=[];
 for(let i=0;i<cells.length;i++){
  const prev=i===0?source:cells[i-1],next=cells[i+1],
    before=cells[i]-prev,after=next===undefined?0:next-cells[i];
  if(i===cells.length-1||before!==after||(i%3===2)){
   const id=cells[i];
   points.push({x:g.x+((id%g.cols)+.5)*g.step,
     y:g.y+(((id/g.cols)|0)+.5)*g.step});
  }
 }
 if(found&&dest===indoorGridPoint(g,goal))points.push({x:goal.x,y:goal.y});
 return points.slice(0,30);
}

const INDOOR_TRAIL_LIMIT=48;
function indoorGuardCell(nav,q){
 const c=Math.floor((q.x-nav.origin.x)/nav.stepX),r=Math.floor((q.y-nav.origin.y)/nav.stepY);
 return c>=0&&c<5&&r>=0&&r<7?r*5+c:-1;
}
function indoorGuardCellRoute(nav,from,to){
 if(from<0||to<0||!nav.neighbors[from]||!nav.neighbors[to])return null;
 const parent=Array(35).fill(-1),seen=new Set([from]),queue=[from];
 for(let i=0;i<queue.length&&!seen.has(to);i++)for(const j of nav.neighbors[queue[i]]){
  if(seen.has(j))continue;seen.add(j);parent[j]=queue[i];queue.push(j);
 }
 if(!seen.has(to))return null;
 const path=[];for(let n=to;n!==-1;n=parent[n])path.push(n);
 return path.reverse();
}
function indoorStartGuardPursuit(h){
 if(!h||!h.indoorGuard||!p)return;
 indoorGuardAlertAt(h,p);
}
function indoorGuardAlertAt(h,observed){
 h.indoorReturn=null;
 const spot={x:observed.x,y:observed.y},duration=1.35;
 h.indoorAlert={phase:'found',duration,remaining:duration,trail:[spot],lastSeen:spot,
  searchLeft:0,scanT:0,route:null,routeKey:'',waypoint:null,stuck:0,blockedT:0,
  replanT:0,detour:null,detourKey:'',lastDir:null,estimate:null,searchTravelLeft:0,
  progressGoalCell:-1,bestGoalDistance:Infinity,noGoalProgressT:0,rescueCooldown:0,
  sightGrace:0,sightCheckT:0,visible:false,travelLeft:10,searchPoints:null,searchIndex:0,scanFace:h.face};
 h.lost=duration;h._detectCache=null;h._nextDetectAt=0;
}
function indoorGuardSeesPlayer(h){
 if(!p||debugMode>=2||p.dig>0||inTumbleweed(p)||(!p.tank&&inBush(p))||
   (weather==='rain'&&inWaterAt(p.x,p.y,0))||
   h.indoorFloor!==indoorWorld?.currentFloor+1)return false;
 const d=D(h,p),a=Math.abs(angD(Math.atan2(p.y-h.y,p.x-h.x),h.face));
 const illumination=indoorLightLevel(p.x,p.y);
 const tracking=h.indoorAlert?.phase==='found';
 const visibilityFactor=tracking?Math.max(.78,.5+.5*illumination):(.36+.64*illumination);
 const range=detectRange('p')*1.2*visibilityFactor;
 if(!((a<=DETECT_CENTER_HALF*1.2&&d<range)||
       (a<=DETECT_OUTER_HALF*1.2&&d<range*DETECT_OUTER_SCALE)))return false;
 return cachedLos(h,p);
}

function indoorMoveGuardTo(h,goal,dt,sp,moveState=null){
 const nav=indoorWorld?.floors[h.indoorFloor-1]?.navigation,a=moveState||h.indoorAlert;
 if(!nav||!goal||!a)return false;
 const from=indoorGuardCell(nav,h),to=indoorGuardCell(nav,goal);
 if(from<0||to<0)return false;
 // Separate the quick local detours from a rare, capped full-room recovery.
 // Otherwise a blocked doorway can send a soldier around the same 3 cells forever.
 if(a.progressGoalCell!==to){
  a.progressGoalCell=to;a.bestGoalDistance=D(h,goal);a.noGoalProgressT=0;
 }else{
  const dist=D(h,goal);
  if(dist<a.bestGoalDistance-28){a.bestGoalDistance=dist;a.noGoalProgressT=0;}
  else a.noGoalProgressT=(a.noGoalProgressT||0)+dt;
 }
 a.rescueCooldown=Math.max(0,(a.rescueCooldown||0)-dt);
 // Hierarchical room graph: doors are real edges, never shortcuts through walls.
 const key=from+':'+to;
 if(!a.route||a.routeKey!==key){
  a.route=indoorGuardCellRoute(nav,from,to);a.routeKey=key;
  // Do not discard a valid furniture detour when crossing a cell boundary.
  // That caused guards to reverse on door thresholds and become trapped.
  a.waypoint=null;
 }
 if(!a.route)return false;
 const target=a.route.length>1?nav.centers[a.route[1]]:goal;
 const routeKey=key+':'+(a.route[1]??from);
 const doorStep=a.route.length>1;
 // A waypoint on the far side of a door guarantees it can finish crossing.
 const desired=doorStep?{
  x:nav.centers[from].x+(target.x-nav.centers[from].x)*.78,
  y:nav.centers[from].y+(target.y-nav.centers[from].y)*.78
 }:target;
 if(a.detour&&(a.detourGoalCell!==to||a.detourGoal&&D(a.detourGoal,goal)>64))a.detour=null;
 if(a.noGoalProgressT>4.5&&a.rescueCooldown<=0){
  a.rescueCooldown=7;a.noGoalProgressT=0;
  const rescue=indoorGridDetour(nav,h,goal,5200);
  if(rescue?.length){
   a.detour=rescue;a.detourGoalCell=to;a.detourGoal={...goal};a.detourKey='recovery';
   a.replanT=1.7;
  }
 }
 let dest=desired;
 if(a.detour?.length){
  while(a.detour.length&&D(h,a.detour[0])<15)a.detour.shift();
  if(a.detour.length)dest=a.detour[0];else a.detour=null;
 }
 const heading=Math.atan2(dest.y-h.y,dest.x-h.x);
 const step=Math.min(sp*dt,D(h,dest));
 if(step<=0)return true;
 const oldX=h.x,oldY=h.y;
 mv(h,Math.cos(heading)*step,Math.sin(heading)*step,8);
 const moved=Math.hypot(h.x-oldX,h.y-oldY);
 if(moved>=Math.max(.02,step*.19)){
  a.stuck=0;
  h.face+=Math.max(-dt*4.2,Math.min(dt*4.2,angD(heading,h.face)));
 }else{
  a.stuck=(a.stuck||0)+dt;
  a.replanT=Math.max(0,(a.replanT||0)-dt);
  if(a.stuck>.44&&a.replanT<=0){
   // Obstacle-aware short path, calculated only on collision and cached.
   const detour=indoorGridDetour(nav,h,desired,1700);
   a.replanT=.85+R()*.2;a.stuck=0;
   if(detour?.length){a.detour=detour;a.detourKey=routeKey;a.detourGoalCell=to;a.detourGoal={...goal};}
   else a.detour=null;
  }
 }
 return true;
}
function indoorEstimateEscape(h,state){
 // The last observed movement gives a short, imperfect prediction (<= 112px).
 // Once unseen the real player coordinates are NEVER used to make this estimate.
 const nav=indoorWorld?.floors[h.indoorFloor-1]?.navigation,g=nav?.grid;
 const q=state.lastSeen,dir=state.lastDir;
 if(!g||!dir)return {...q};
 let far={...q};
 for(let i=1;i<=7;i++){
  const pt={x:q.x+dir.x*i*16,y:q.y+dir.y*i*16},
    id=indoorGridPoint(g,pt);
  if(id<0||g.solid[id])break;
  // Do not predict the player crossing a wall without a connected door.
  const a=indoorGuardCell(nav,q),b=indoorGuardCell(nav,pt);
  if(!indoorGuardCellRoute(nav,a,b))break;
  far=pt;
 }
 return far;
}
// These helpers are called only by the existing indoor-guard hook. Outdoor AI stays intact.
function indoorPatrolReturnPlan(h){
 const nav=indoorWorld?.floors[h.indoorFloor-1]?.navigation;
 if(!nav||!h.path?.length)return null;
 const from=indoorGuardCell(nav,h);
 let best=null;
 for(let index=0;index<h.path.length;index++){
  const goal=h.path[index],route=indoorGuardCellRoute(nav,from,indoorGuardCell(nav,goal));
  if(!route)continue;
  // Prefer a nearby connected patrol point, not a point behind a long wall detour.
  let cost=D(h,goal);
  for(let i=1;i<route.length;i++)cost+=D(nav.centers[route[i-1]],nav.centers[route[i]]);
  if(!best||cost<best.cost)best={goal:{x:goal.x,y:goal.y},index,cost,nav:{}};
 }
 return best;
}
function indoorFinishGuardSearch(h){
 h.indoorAlert=null;h.indoorNotice=null;
 h.st=0;h.target=null;h.sus=0;h.susMax=0;h.lost=0;
 h.susPause=0;h.burstLeft=0;h.foundPause=0;h.sharePause=0;
 h._detectCache=null;h._nextDetectAt=0;pauseAfterEnemyDetection(h);
 h.indoorReturn=indoorPatrolReturnPlan(h);
 if(h.indoorReturn){h.wi=h.indoorReturn.index;h.turnPause=0;h.stk=0;}
}
function indoorSearchPoints(h,state){
 const nav=indoorWorld?.floors[h.indoorFloor-1]?.navigation,g=nav?.grid;
 if(!g)return [{...state.lastSeen}];
 // A single small flood fill per search. Only reachable positions within 180px
 // of the actual last sighting qualify; there is no live-player input here.
 const source=indoorGridFreeNearest(g,indoorGridPoint(g,state.lastSeen));
 if(source<0)return [{...state.lastSeen}];
 const queue=[source],seen=new Set(queue),candidates=[];
 for(let i=0;i<queue.length&&i<400;i++){
  const id=queue[i],x=id%g.cols,y=(id/g.cols)|0;
  const q={x:g.x+(x+.5)*g.step,y:g.y+(y+.5)*g.step};
  if(D(q,state.lastSeen)>180)continue;
  if(D(q,state.lastSeen)>=64)candidates.push(q);
  for(let k=0;k<4;k++){
   if((k===0&&y===0)||(k===1&&y===g.rows-1)||(k===2&&x===0)||(k===3&&x===g.cols-1))continue;
   const n=id+(k===0?-g.cols:k===1?g.cols:k===2?-1:1);
   if(!g.solid[n]&&!seen.has(n)){seen.add(n);queue.push(n);}
  }
 }
 const points=[],predicted=indoorEstimateEscape(h,state);
 if(candidates.length){
  let preferred=candidates;
  const direction=state.lastDir||state.reportDirection;
  if(state.searchSide&&direction){
   const sector=candidates.filter(q=>
    (direction.x*(q.y-state.lastSeen.y)-direction.y*(q.x-state.lastSeen.x))*state.searchSide>16);
   if(sector.length)preferred=sector;
  }
  preferred.sort((a,b)=>D(a,predicted)-D(b,predicted));points.push(preferred[0]);
  const other=candidates.filter(q=>D(q,points[0])>=96);
  if(other.length)points.push(other[Math.floor(R()*other.length)]);
 }
 return points.length?points:[{...state.lastSeen}];
}
function indoorReportApproachPoint(h,report){
 // A short extrapolation of witnessed movement, never a route to the live player.
 // A closed door, wall or cargo between the sighting and estimate cancels it.
 if(!report.lastDir)return null;
 const point=indoorEstimateEscape(h,report),distance=D(point,report.lastSeen);
 if(distance<32||distance>112.01||!los(report.lastSeen,point))return null;
 return {x:point.x,y:point.y};
}
// One firsthand report may enlist at most two nearby idle guards. A floor-wide
// cooldown prevents a shout from turning into an instant building-wide alarm.
function indoorShareGuardSighting(h,state,now=performance.now()){
 if(!h.indoorGuard||state.phase!=='found'||!state.visible||state.reported)return 0;
 state.reported=true;
 const floor=indoorWorld?.floors[h.indoorFloor-1];
 if(!floor?.guards||h.indoorFloor!==indoorWorld.currentFloor+1||
    !h.alive||h.stun>0||h.stunRecover>0||h.houndPinned||h.blastAirT>0||
    now<(floor.nextGuardReportAt||0))return 0;
 const nearby=floor.guards.filter(other=>other!==h&&other.indoorGuard&&
  other.indoorFloor===h.indoorFloor&&other.alive&&!other.st&&!other.indoorAlert&&
  !(other.stun>0)&&!(other.stunRecover>0)&&!other.houndPinned&&!(other.blastAirT>0)&&D(h,other)<=240)
  .sort((a,b)=>D(h,a)-D(h,b));
 let count=0;
 for(const other of nearby){
  if(count>=2)break;
  if(!los(h,other))continue; // Closed walls/doors block this local voice report.
  indoorGuardAlertAt(other,state.lastSeen);
  const alert=other.indoorAlert;
  alert.phase='lastSeen';alert.remaining=0;alert.travelLeft=6;
  alert.lastDir=state.lastDir?{...state.lastDir}:null;
  // Only the second responder checks ahead. The first still verifies the sighting.
  alert.approachGoal=count===1?indoorReportApproachPoint(other,state):null;
  alert.reportDirection={x:Math.cos(h.face),y:Math.sin(h.face)};
  alert.searchSide=count===0?-1:1;alert.reported=true;
  other.indoorNotice=null;other.st=0;other.target=null;
  other.sus=6;other.susMax=6;other.lost=0;other.burstLeft=0;
  other.foundPause=0;other.sharePause=.35;
  count++;
 }
 if(count)floor.nextGuardReportAt=now+4000;
 return count;
}
function indoorBeginGuardSearch(h,state){
 state.phase='search';state.searchLeft=8;state.searchTravelLeft=0;
 state.scanT=0;state.scanFace=h.face;state.sightCheckT=0;
 state.searchPoints=indoorSearchPoints(h,state);state.searchIndex=0;
 state.searchStall=0;state.searchHold=false;
 state.detour=null;state.route=null;state.noGoalProgressT=0;
 h.st=0;h.target=null;h.sus=8;h.susMax=8;
 h.foundPause=0;h.burstLeft=0;h.lost=0;
}
function indoorUpdateGuardNotice(h,dt){
 // Ordinary patrol still uses the established path and speed, but player
 // recognition and suspicion belong exclusively to this stage.
 const n=h.indoorNotice||(h.indoorNotice={checkT:0,exposure:0,visible:false,sampleX:p.x,sampleY:p.y,sampleAge:0});
 n.checkT-=dt;n.sampleAge+=dt;
 if(n.checkT<=0){
  const elapsed=Math.max(.001,n.sampleAge),distanceMoved=Math.hypot(p.x-n.sampleX,p.y-n.sampleY);
  const sameFloor=h.indoorFloor===indoorWorld?.currentFloor+1;
  const previouslyVisible=n.visible;
  n.visible=indoorGuardSeesPlayer(h);n.checkT=.12;n.sampleAge=0;
  n.sampleX=p.x;n.sampleY=p.y;
  if(n.visible){
   const illumination=indoorLightLevel(p.x,p.y),d=D(h,p);
   n.threshold=d<40?.15:.45+(1-illumination)*.65;
   if(previouslyVisible&&n.spot){
    const moved=D(n.spot,p);
    if(moved>=6)n.lastDir={x:(p.x-n.spot.x)/moved,y:(p.y-n.spot.y)/moved};
   }else n.lastDir=null;
   n.spot={x:p.x,y:p.y};
  }else if(sameFloor&&debugMode<2&&!(p.dig>0)&&distanceMoved/elapsed>80&&distanceMoved<50&&D(h,p)<72&&cachedLos(h,p)){
   // Nearby footsteps cause investigation, never instant discovery. Walls block
   // this conservative hearing model; teleporting between floors emits no step.
   indoorStartGuardPursuit(h);
   const a=h.indoorAlert;a.phase='lastSeen';a.lastSeen={x:p.x,y:p.y};
   a.travelLeft=3;a.visible=false;a.sightCheckT=.12;
   h.st=0;h.target=null;h.sus=3;h.susMax=3;return true;
  }
 }
 n.exposure=n.visible?Math.min(1.5,n.exposure+dt):Math.max(0,n.exposure-dt*2);
 if(n.visible&&n.exposure>=n.threshold){
  if(!indoorGuardSeesPlayer(h)||!los(h,p)){n.visible=false;n.checkT=0;return true;}
  enterHumanFound(h,'p');
  if(h.indoorAlert&&n.lastDir)h.indoorAlert.lastDir={...n.lastDir};
  h.indoorNotice=null;return true;
 }
 if(n.exposure>0){
  // Reuse the existing suspicion icon; no extra drawing or UI work per frame.
  h.sus=n.exposure;h.susMax=n.threshold||1;
  if(n.spot){const angle=Math.atan2(n.spot.y-h.y,n.spot.x-h.x);h.face+=Math.max(-dt*2,Math.min(dt*2,angD(angle,h.face)));}
  return true;
 }
 h.sus=0;h.susMax=0;
 // Other skill targets retain their existing combat handling.
 const other=findDetectedTarget(h,h.face);
 if(other&&other.key!=='p'){enterHumanFound(h,other.key);return false;}
 if(h.chatResumeT>0)return true;
 if(h.indoorReturn){
  const back=h.indoorReturn;
  if(D(h,back.goal)<=12){h.indoorReturn=null;h.wi=back.index;h.turnPause=0;}
  else indoorMoveGuardTo(h,back.goal,dt,30,back.nav);
  return true;
 }
 h.face=patrol(h,dt,30,8);return true;
}
function updateInfiltrationGuardAI(h,dt){
 if(!h.indoorGuard)return false;
 if(!h.indoorAlert){
  if(h.st&&h.target==='p')indoorStartGuardPursuit(h);
  else if(h.st)return false;
  else return indoorUpdateGuardNotice(h,dt);
 }
 const state=h.indoorAlert;
 if((h.stun>0)||(h.stunRecover>0)||h.houndPinned||h.blastAirT>0||
    (state.phase==='found'&&(!h.st||h.target!=='p'))){
  h.indoorAlert=null;h.indoorNotice=null;return false;
 }
 // Sample visibility and the observed position together. Cached visibility must
 // never reveal new coordinates after the player has gone around a corner.
 state.sightCheckT=(state.sightCheckT||0)-dt;
 if(state.sightCheckT<=0){
  state.sightCheckT=.12+((h.indoorFloor||1)%3)*.01;
  state.visible=indoorGuardSeesPlayer(h);
  if(state.visible){
   const previous=state.lastSeen,distanceSeen=D(previous,p);
   if(distanceSeen>18)state.lastDir={x:(p.x-previous.x)/distanceSeen,y:(p.y-previous.y)/distanceSeen};
   state.lastSeen={x:p.x,y:p.y};state.approachGoal=null;state.estimate=null;state.trail.length=0;
   indoorShareGuardSighting(h,state);
  }
 }
 const visible=!!state.visible;
 if(visible){
  if(state.phase!=='found'){
   // Confirmed visual reacquisition resumes pursuit, not the initial notice delay.
   enterHumanFound(h,'p');indoorStartGuardPursuit(h);return true;
  }
  state.remaining=1.35;
 }else state.remaining=Math.max(0,state.remaining-dt);
 const pause=(h.modePause||0)>0||(h.foundPause||0)>0||
   (h.sharePause||0)>0||(h.chatResumeT||0)>0;
 h.modePause=Math.max(0,(h.modePause||0)-dt);
 h.foundPause=Math.max(0,(h.foundPause||0)-dt);h.sharePause=Math.max(0,(h.sharePause||0)-dt);
 if(state.phase==='search'){
  // Total search time includes movement, so blocked furniture cannot prolong it.
  state.searchLeft=Math.max(0,state.searchLeft-dt);h.sus=state.searchLeft;h.susMax=8;
  if(state.searchLeft<=0){indoorFinishGuardSearch(h);return true;}
  if(pause)return true;
  const inspect=state.searchPoints[state.searchIndex];
  if(inspect&&!state.searchHold&&D(h,inspect)>24){
   const beforeX=h.x,beforeY=h.y;
   indoorMoveGuardTo(h,inspect,dt,62);state.scanFace=h.face;state.scanT=0;
   state.searchStall=Math.hypot(h.x-beforeX,h.y-beforeY)<62*dt*.2?(state.searchStall||0)+dt:0;
   if(state.searchStall>=1.5){
    if(state.searchIndex<state.searchPoints.length-1)state.searchIndex++;
    else state.searchHold=true;
    state.detour=null;state.route=null;state.searchStall=0;
   }
  }else{
   state.scanT+=dt;
   const sweep=Math.floor(state.scanT/.7)%4;
   const angle=state.scanFace+[.8,-.8,1.6,0][sweep];
   h.face+=Math.max(-dt*1.8,Math.min(dt*1.8,angD(angle,h.face)));
   if(state.scanT>=1.4&&state.searchIndex<state.searchPoints.length-1){
    state.searchIndex++;state.detour=null;state.searchStall=0;state.searchHold=false;
   }
  }
  return true;
 }
 if(!visible&&state.remaining<=0&&state.phase==='found'){
  state.phase='lastSeen';state.travelLeft=10;state.detour=null;
  h.burstLeft=0;
 }
 const next=state.approachGoal||state.lastSeen;
 if(state.phase==='lastSeen'){
  state.travelLeft=Math.max(0,state.travelLeft-dt);
  if(D(h,next)<=24||state.travelLeft<=0){indoorBeginGuardSearch(h,state);return true;}
 }
 h.lost=state.phase==='found'?Math.max(.01,state.remaining):state.travelLeft;
 h.cd-=dt;h.ct=(h.ct||0)+dt;h.plantT=0;h.plantA=null;
 if(!pause){
  if(D(h,next)>20)indoorMoveGuardTo(h,next,dt,state.phase==='found'?95:78);
  else if(visible)h.face+=Math.max(-dt*4,Math.min(dt*4,angD(Math.atan2(next.y-h.y,next.x-h.x),h.face)));
 }
 // Recheck the actual wall ray before shooting; a cached sample may be stale.
 if(!pause&&visible&&D(h,next)<150&&h.cd<=0&&los(h,p)){
  const angle=Math.atan2(next.y-h.y,next.x-h.x);
  if(!(h.burstLeft>0))h.burstLeft=3;
  h.characterShotAt=performance.now();fire(h.x,h.y,angle+(R()-.5)*.15,'e','r',330,150);
  h.burstLeft--;h.cd=h.burstLeft>0?.14:2;
 }
 return true;
}
function updateInfiltrationDoors(dt){
  if(!indoorWorld)return;
  // PC、味方、敵兵の誰でも近づけば自動で開く。離れたら自然に閉じる。
  // 気絶・拘束中の古い追跡情報は、AI更新がスキップされる間も破棄する。
  for(const floor of indoorWorld.floors){
    for(const h of floor.guards||[])if(!h.alive||h.stun>0||h.stunRecover>0||h.houndPinned||h.blastAirT>0){h.indoorAlert=null;h.indoorNotice=null;}
    const players=[p,...floor.guards,...(allies||[])];
    if(partner)players.push(partner);
    if(hound)players.push(hound);
    for(const door of floor.doors){
      let near=false;
      for(const a of players){
        if(!a||a.alive===false||a.down||a.stun>0)continue;
        // 詰所で待機中の兵士が、近くの扉を開きっぱなしにしない。
        if(a.indoorPost&&!a.st&&!(a.sus>0))continue;
        // 扉パネルの当たり判定近傍に触れたときだけ反応する。
        // 従来の半径140pxセンサーと違い、付近を通り過ぎても開かない。
        const perpendicular=door.vertical?Math.abs(a.x-door.x):Math.abs(a.y-door.y);
        const along=door.vertical?Math.abs(a.y-door.y):Math.abs(a.x-door.x);
        const contact=INDOOR_DOOR_THICKNESS/2+16; // 同一厚みのパネル接触半径
        const half=INDOOR_DOOR_WIDTH/2*(door.vertical?INDOOR_SCALE_Y:INDOOR_SCALE_X);
        if(perpendicular<=contact&&along<=half+12){near=true;break;}
      }
      door.open=Math.max(0,Math.min(1,door.open+(near?1:-1)*INDOOR_DOOR_SPEED*dt));
      // 開扉中は当たり判定・視線遮蔽ともに解除。閉扉時は再び遮る。
      door.cover.noHit=near||door.open>.65;
    }
  }
}
function updateInfiltrationMission(dt){
  if(!indoorWorld||!mission||state!=='play')return;
  const w=indoorWorld,m=mission;
  const detected=playerDetectedNow();
  m.detected=detected;
  updateInfiltrationDoors(dt);
  // 発見だけでは終了させず、潜入専用AIの追跡・最終目撃地点確認・捜索を継続する。
  w.stairsCooldown=Math.max(0,w.stairsCooldown-dt);
  const floor=w.floors[w.currentFloor],nearStair=D(p,floor.stair)<48;
  if(!nearStair)w.stairArmed=true;
  if(nearStair&&w.stairArmed&&w.stairsCooldown<=0&&!p.tank){
    w.currentFloor=1-w.currentFloor;
    const target=w.floors[w.currentFloor];
    p.x=target.stair.x;p.y=target.stair.y+38;
    w.stairsCooldown=2;w.stairArmed=false;
    if(m.current&&!m.current.done)m.current.progress=0;
    m.progress=0;m.current=null;
    cam=Math.max(0,Math.min(WH-H,p.y-H*.6));
    say((w.currentFloor+1)+'階へ移動');sfx('skill');
  }
  const near=m.points.find(q=>!q.done&&D(p,q)<INDOOR_ACQUIRE_RADIUS);
  if(near&&!p.tank){
    if(m.current!==near){m.current=near;m.progress=0;}
    m.progress=Math.min(INDOOR_ACQUIRE_SECONDS,m.progress+dt);
    near.progress=m.progress;
    if(m.progress>=INDOOR_ACQUIRE_SECONDS){
      near.done=true;m.index++;m.progress=0;m.current=null;sfx('pickup');
      say('重要資料回収 '+m.index+'/'+m.points.length);
      if(m.index===m.points.length)say('全資料回収！ 1階の玄関か非常口から脱出せよ');
    }
  }else{
    if(m.current&&!m.current.done)m.current.progress=0;
    m.progress=0;m.current=null;
  }
  // 外周にある玄関と非常口の両方を脱出地点として扱う。
  if(m.index===INDOOR_FILES_TOTAL&&w.currentFloor===0&&!p.tank&&
     (D(p,w.exit)<90||D(p,w.emergency)<90))completeMission();
}
function drawInfiltrationFloors(cx,cy){
  if(!indoorWorld)return;
  for(const f of indoorWorld.floors){
    const minY=f.footprint.y-140,maxY=f.footprint.y+f.footprint.h+155;
    if(maxY<cy-100||minY>cy+H+100)continue;
    // Corridor tiles are generated in H/L/T/ring/U patterns instead of a vertical stripe.
    g.fillStyle='#171e1c';g.fillRect(0,minY-15,WW,maxY-minY+30);
    // 建物外側に玄関前の通路を設ける。二つの出入口の前は屋外地面。
    g.fillStyle='#777766';
    if(f.entrance)g.fillRect(f.entrance.x-45,f.footprint.y+f.footprint.h,90,Math.max(0,f.entrance.y-f.footprint.y-f.footprint.h+30));
    if(f.emergency)g.fillRect(f.emergency.x-45,f.emergency.y-30,90,Math.max(0,f.footprint.y-f.emergency.y+30));
    g.fillStyle='#626658';
    for(const tile of f.corridors){
      if(tile.y+tile.h<cy-30||tile.y>cy+H+30)continue;
      g.fillRect(tile.x,tile.y,tile.w,tile.h);
    }
    // エントランスホールは廊下より明るい広い共用床として描き、家具は置かない。
    const lobby=f.lobbyArea;
    if(lobby&&lobby.y+lobby.h>=cy-40&&lobby.y<=cy+H+40){
      g.fillStyle='#74796b';g.fillRect(lobby.x+2,lobby.y+2,lobby.w-4,lobby.h-4);
      g.strokeStyle='rgba(210,212,181,.28)';g.lineWidth=2;g.strokeRect(lobby.x+14,lobby.y+16,lobby.w-28,lobby.h-32);
      g.fillStyle='rgba(56,71,59,.35)';g.fillRect(lobby.x+lobby.w*.22,lobby.y+lobby.h*.38,lobby.w*.56,lobby.h*.17);
      g.font='bold 17px system-ui';g.textAlign='center';g.fillStyle='#f0eacb';
      g.fillText('エントランスホール',lobby.x+lobby.w*.5,lobby.y+lobby.h*.52);
    }
    for(const room of f.rooms){
      if(room.y+room.h<cy-40||room.y>cy+H+40)continue;
      g.fillStyle=room.id%2===0?'#55594b':'#50564a';
      for(const tile of room.tiles){
        if(tile.y+tile.h<cy-30||tile.y>cy+H+30)continue;
        // Adjacent same-room tiles share an open interior, never draw an internal wall.
        g.fillRect(tile.x,tile.y,tile.w,tile.h);
        g.strokeStyle='rgba(215,205,174,.05)';g.lineWidth=1;
        g.beginPath();g.moveTo(tile.x+14,tile.y+24);g.lineTo(tile.x+tile.w-14,tile.y+24);g.stroke();
      }
      const label=room.tiles[0];
      if(label&&label.y+label.h>=cy-15&&label.y<=cy+H+15){
        g.font='bold 13px system-ui';g.textAlign='left';g.fillStyle='rgba(229,228,199,.82)';
        g.fillText(room.name+(room.size>=3?' ▣':''),label.x+13,label.y+45);
      }
    }
    // 俯瞰の階段。段板・影・手すりを軽量Canvas図形だけで描く。
    if(f.stair.y>cy-130&&f.stair.y<cy+H+130){
      const x=f.stair.x,y=f.stair.y;
      g.save();g.translate(x,y);
      g.fillStyle='#283c37';g.fillRect(-44,-58,88,116);
      g.fillStyle='#8a9684';g.fillRect(-36,-52,72,103);
      g.fillStyle='#354740';g.fillRect(-36,-52,72,10);
      for(let step=0;step<7;step++){
        const yy=-40+step*13;
        g.fillStyle=step%2?'#718477':'#9aa79a';
        g.fillRect(-33,yy,66,12);
        g.strokeStyle='rgba(22,35,30,.42)';g.lineWidth=1.5;
        g.beginPath();g.moveTo(-33,yy+12);g.lineTo(33,yy+12);g.stroke();
      }
      g.fillStyle='#ced7bc';g.fillRect(-42,-50,5,96);g.fillRect(37,-50,5,96);
      g.strokeStyle='#e1f5dd';g.lineWidth=2;g.beginPath();
      g.moveTo(0,20);g.lineTo(0,-24);g.lineTo(-11,-12);g.moveTo(0,-24);g.lineTo(11,-12);g.stroke();
      g.font='bold 12px system-ui';g.fillStyle='#f1efcf';g.textAlign='center';
      g.fillText(f.number===1?'2F ▲':'1F ▼',0,67);
      g.restore();
    }
    // 玄関・非常口の看板と足元の案内（壁の切れ目には出入口以外の隙間はない）。
    for(const gateway of [{point:f.entrance,label:'正面玄関',color:'#d0a75d'},
                           {point:f.emergency,label:'非常口',color:'#82dcb4'}]){
      const q=gateway.point;
      if(!q||q.y<cy-90||q.y>cy+H+90)continue;
      g.fillStyle=gateway.color;g.fillRect(q.x-43,q.y-24,86,40);
      g.strokeStyle='#292b26';g.lineWidth=2;g.strokeRect(q.x-43,q.y-24,86,40);
      g.font='bold 13px system-ui';g.fillStyle='#1b211c';g.textAlign='center';
      g.fillText(gateway.label,q.x,q.y+1);
    }
  }
}

function drawInfiltrationProps(cx,cy){
  // 背景の上・兵士の下に描画する軽量な俯瞰家具。コリジョンと視線遮蔽は同じcover。
  if(!indoorWorld)return;
  for(const floor of indoorWorld.floors){
    if(floor.footprint.y>cy+H+90||floor.footprint.y+floor.footprint.h<cy-90)continue;
    for(const o of floor.props){
      const {x,y,w,h}=o;
      if(x>cx+W+50||x+w<cx-50||y>cy+H+50||y+h<cy-50)continue;
      const type=o.propKind;
      g.save();
      g.fillStyle='rgba(0,0,0,.26)';g.fillRect(x+4,y+5,w,h);
      if(type==='barrel'){
        g.fillStyle='#283c40';g.fillRect(x+5,y+3,w-10,h-6);
        for(const ax of [.28,.72]){
          const bx=x+w*ax,by=y+h*.5,rad=Math.min(w*.19,h*.34);
          g.fillStyle='#426169';g.beginPath();g.arc(bx,by,rad+2,0,Math.PI*2);g.fill();
          g.strokeStyle='#a3b9ad';g.lineWidth=2;g.stroke();
          g.fillStyle='#17272b';g.beginPath();g.arc(bx,by,rad*.42,0,Math.PI*2);g.fill();
        }
      }else if(type==='sandbag'){
        g.fillStyle='#766e4c';g.fillRect(x,y,w,h);
        for(let k=0;k<3;k++){
          const yy=y+5+k*(h-9)/3;
          g.fillStyle=k%2?'#9d9064':'#b2a278';g.fillRect(x+4,yy,w-8,(h-12)/3);
          g.strokeStyle='rgba(53,47,34,.7)';g.strokeRect(x+4,yy,w-8,(h-12)/3);
        }
      }else if(type==='ammo'||type==='supply'||type==='kit'){
        g.fillStyle=type==='ammo'?'#4a6348':type==='supply'?'#76664b':'#55616a';
        g.fillRect(x,y,w,h);
        g.strokeStyle='#1e2a26';g.lineWidth=3;g.strokeRect(x+1.5,y+1.5,w-3,h-3);
        g.fillStyle='rgba(196,190,136,.35)';g.fillRect(x+5,y+5,w-10,5);
        g.strokeStyle='#c9c8aa';g.lineWidth=2;
        g.beginPath();g.moveTo(x+9,y+10);g.lineTo(x+w-9,y+h-9);
        g.moveTo(x+w-9,y+10);g.lineTo(x+9,y+h-9);g.stroke();
        g.textAlign='center';g.font='bold 10px system-ui';g.fillStyle='#e2e8c5';
        g.fillText(type==='ammo'?'弾薬':type==='kit'?'補給':'物資',x+w/2,y+h/2+4);
      }else if(type==='cabinet'){
        g.fillStyle='#66777b';g.fillRect(x,y,w,h);
        g.fillStyle='#899699';g.fillRect(x+3,y+4,w-6,h-8);
        for(let k=1;k<=3;k++){
          g.strokeStyle='#374c4f';g.lineWidth=2;g.beginPath();
          g.moveTo(x+5,y+k*h/4);g.lineTo(x+w-5,y+k*h/4);g.stroke();
          g.fillStyle='#d5ded6';g.fillRect(x+w/2-7,y+k*h/4-5,14,2);
        }
      }else if(type==='postTable'||type==='table'||type==='desk'){
        g.fillStyle=type==='postTable'?'#67593e':type==='desk'?'#6a6550':'#827158';
        g.fillRect(x,y,w,h);g.strokeStyle='#37362d';g.lineWidth=3;g.strokeRect(x+1,y+1,w-2,h-2);
        g.fillStyle='#a59775';g.fillRect(x+7,y+6,w-14,Math.max(6,h-12));
        if(type==='postTable'){
          g.fillStyle='#c1c9b0';g.fillRect(x+11,y+12,Math.min(24,w/3),Math.min(18,h/2));
          g.fillStyle='#3c584f';g.fillRect(x+w-34,y+10,25,18);
          g.strokeStyle='#d3d3ad';g.lineWidth=1;g.strokeRect(x+w-34,y+10,25,18);
        }else if(type==='desk'){
          g.fillStyle='#d2d3b8';g.fillRect(x+11,y+9,17,13);
          g.fillStyle='#4e585a';g.fillRect(x+w-26,y+8,17,18);
        }else{
          g.fillStyle='#d1c9a7';g.fillRect(x+8,y+8,18,12);
          g.fillStyle='#615944';g.fillRect(x+w-17,y+8,9,11);
        }
      }else{
        g.fillStyle='#696d63';g.fillRect(x,y,w,h);
      }
      g.restore();
    }
  }
}

function drawInfiltrationOpenings(cx,cy){
  if(!indoorWorld)return;
  drawInfiltrationProps(cx,cy);
  for(const f of indoorWorld.floors){
    if(f.footprint.y+f.footprint.h<cy-130||f.footprint.y>cy+H+130)continue;
    // 壁上に窓を描く。壁と当たり判定を除去しないため、窓からは通り抜けない。
    for(const q of f.windows){
      if(q.x<cx-65||q.x>cx+W+65||q.y<cy-65||q.y>cy+H+65)continue;
      g.save();
      g.fillStyle='#30464c';g.strokeStyle='#9bb9bd';g.lineWidth=3;
      const x=q.x,y=q.y;
      if(q.vertical){
        g.fillRect(x-8,y-30,16,60);g.strokeRect(x-8,y-30,16,60);
        g.beginPath();g.moveTo(x,y-28);g.lineTo(x,y+28);g.stroke();
      }else{
        g.fillRect(x-33,y-10,66,20);g.strokeRect(x-33,y-10,66,20);
        g.beginPath();g.moveTo(x,y-9);g.lineTo(x,y+9);g.stroke();
      }
      g.restore();
    }
    // 室内扉・正面玄関・非常口はパネルへの接触で左右にスライドして開く。
    for(const q of f.doors){
      if(q.x<cx-130||q.x>cx+W+130||q.y<cy-150||q.y>cy+H+150)continue;
      g.save();
      const panel=q.kind==='emergency'?'#6eac8c':q.kind==='main'?'#aa8452':'#968572';
      const border=q.kind==='emergency'?'#b0f5d1':'#d5c0a0';
      g.fillStyle=panel;g.strokeStyle=border;g.lineWidth=2;
      const open=Math.max(0,Math.min(1,q.open||0)),half=INDOOR_DOOR_WIDTH/2*(q.vertical?INDOOR_SCALE_Y:INDOOR_SCALE_X);
      const part=half*(1-open),thick=INDOOR_DOOR_THICKNESS,frame=thick/2+4;
      if(q.vertical){
        const top=q.y-half,bottom=q.y+half;
        if(part>1){
          g.fillRect(q.x-thick/2,top,thick,part);
          g.fillRect(q.x-thick/2,bottom-part,thick,part);
        }
        g.beginPath();g.moveTo(q.x-frame,top);g.lineTo(q.x-frame,bottom);
        g.moveTo(q.x+frame,top);g.lineTo(q.x+frame,bottom);g.stroke();
      }else{
        if(part>1){
          g.fillRect(q.x-half,q.y-thick/2,part,thick);
          g.fillRect(q.x+half-part,q.y-thick/2,part,thick);
        }
        g.beginPath();g.moveTo(q.x-half,q.y-frame);g.lineTo(q.x+half,q.y-frame);
        g.moveTo(q.x-half,q.y+frame);g.lineTo(q.x+half,q.y+frame);g.stroke();
      }
      g.restore();
    }
  }
}

function drawInfiltrationMission(){
  const el=document.getElementById('missionHud');
  const visible=stageMode==='indoor'&&state==='play'&&mission&&indoorWorld;
  if(!visible){if(el.style.display!=='none')el.style.display='none';return;}
  if(el.style.display!=='block')el.style.display='block';
  const now=performance.now();
  if(now>=indoorHudRefresh){
    indoorHudRefresh=now+120;
    const next=mission.points.find(q=>!q.done),floor=indoorWorld.floors[indoorWorld.currentFloor],text='拠点潜入 '+(indoorWorld.currentFloor+1)+'階（'+floor.pattern+'型）　重要資料 '+mission.index+'/'+INDOOR_FILES_TOTAL;
    const desc=mission.index===INDOOR_FILES_TOTAL?'1階の正面玄関または非常口から脱出':mission.detected?'発見中：追跡・攻撃に注意':next?'資料の円の中に8秒留まる':'1階の出口へ';
    const progress='<progress max="8" value="'+mission.progress+'"></progress>';
    const nextText='<b>'+text+'</b>'+progress+'<small>'+desc+'</small>';
    if(nextText!==indoorHudSnapshot){indoorHudSnapshot=nextText;el.innerHTML=nextText;}
  }
  gm.save();gm.setTransform(1,0,0,1,0,0);
  for(const q of mission.points){
    if(q.done)continue;
    const x=q.x-camX,y=q.y-cam,r=INDOOR_ACQUIRE_RADIUS;
    if(x<-r-15||x>W+r+15||y<-r-15||y>H+r+15)continue;
    gm.fillStyle='rgba(241,208,112,.12)';gm.strokeStyle='rgba(250,220,130,.65)';
    gm.lineWidth=3;gm.beginPath();gm.arc(x,y,r,0,Math.PI*2);gm.fill();gm.stroke();
    const ratio=Math.min(1,(q.progress||0)/INDOOR_ACQUIRE_SECONDS);
    gm.strokeStyle='#ffdf83';gm.lineWidth=8;gm.lineCap='round';gm.beginPath();
    gm.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);if(ratio>0)gm.stroke();
    gm.lineCap='butt';gm.font='bold 18px system-ui';gm.textAlign='center';
    gm.fillStyle='#fff0ad';gm.fillText('資料',x,y+2);
    gm.font='bold 13px system-ui';gm.fillText((q.progress||0).toFixed(1)+' / 8秒',x,y+22);
  }
  // 画面右上の方角ガイドは表示領域の外にある重要資料も案内する。
  let target=mission.points.filter(q=>!q.done&&q.floor===indoorWorld.currentFloor+1)
    .sort((a,b)=>D(a,p)-D(b,p))[0];
  if(!target){
    target=mission.index===INDOOR_FILES_TOTAL?
      (indoorWorld.currentFloor===0?(D(p,indoorWorld.exit)<D(p,indoorWorld.emergency)?indoorWorld.exit:indoorWorld.emergency):indoorWorld.floors[indoorWorld.currentFloor].stair):
      indoorWorld.floors[indoorWorld.currentFloor].stair;
  }
  if(target){
    const angle=Math.atan2(target.y-p.y,target.x-p.x),cx=W-115,cy=84,distancePx=Math.round(D(target,p));
    // 黒背景・ラベルを使わない、右上のシンプルな方向矢印のみ。
    gm.save();gm.translate(W-37,85);gm.rotate(angle);
    gm.fillStyle='#ffe1a0';gm.strokeStyle='rgba(51,45,26,.65)';gm.lineWidth=2;
    gm.beginPath();gm.moveTo(20,0);gm.lineTo(-12,-11);gm.lineTo(-5,0);gm.lineTo(-12,11);gm.closePath();
    gm.fill();gm.stroke();gm.restore();
  }
  gm.restore();
}
if(typeof module!=='undefined'&&module.exports)module.exports={indoorGenerateFloor,indoorAt,indoorRect,indoorGuardCell,indoorGuardCellRoute,indoorMakeGuardGrid,indoorGridDetour,indoorGridPoint};
