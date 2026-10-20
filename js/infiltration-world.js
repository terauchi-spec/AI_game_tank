/* Indoor environment adapter: NO replacement game loop or controls. */
const INDOOR_FILES_TOTAL=3,INDOOR_ACQUIRE_SECONDS=8,INDOOR_ACQUIRE_RADIUS=68;
const INDOOR_EXIT_RADIUS=90,INDOOR_EXIT_SECONDS=5;
// 透過余白を除いたWebPの実寸比。生成時の当たり判定も元画像の比率に揃える。
const INDOOR_PROP_ASPECT={container:119/256,equipment:207/256,shelf:108/256,
  cabinet:137/256,desk:147/256,bed:106/256,weapon_rack:179/384,server_rack:127/384,
  operations_table:241/384,personal_lockers:194/384,generator:253/384};
const INDOOR_ROOM_ART={
  operations:['operations_table','cabinet','desk'],armory:['weapon_rack','personal_lockers','shelf'],
  communications:['server_rack','equipment','desk'],utilities:['generator','equipment','cabinet'],
  quarters:['bed','personal_lockers','desk'],storage:['container','shelf','cabinet'],
  records:['cabinet','desk','shelf'],guard_post:['desk','cabinet','equipment']
};
const INDOOR_PROP_LENGTH={weapon_rack:112,server_rack:224,operations_table:144,personal_lockers:106,generator:232*2/3};
const indoorRand=(rng,a,b)=>a+(b-a)*rng();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const indoorShuffle=(arr,rng)=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
// 大型設備の配置時だけ、部屋の扉同士と歩ける余白の接続を検査する。
function indoorRoomEquipmentWalkable(room,rects){
  const sx=12,sy=8,cols=Math.ceil(room.w/sx),rows=Math.ceil(room.h/sy),free=new Uint8Array(cols*rows);
  const nearby=rects.filter(o=>o.x<room.x+room.w+12&&o.x+o.w>room.x-12&&o.y<room.y+room.h+8&&o.y+o.h>room.y-8);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const x=room.x+(c+.5)*sx,y=room.y+(r+.5)*sy;
    if(room.tiles.some(t=>x>=t.x&&x<t.x+t.w&&y>=t.y&&y<t.y+t.h)&&
      !nearby.some(o=>x>o.x-11&&x<o.x+o.w+11&&y>o.y-7&&y<o.y+o.h+7))free[r*cols+c]=1;
  }
  const entry=room.doors[0];let first=-1,best=Infinity;
  for(let id=0;id<free.length;id++)if(free[id]){
    const d=Math.hypot(room.x+(id%cols+.5)*sx-entry.x,(room.y+(((id/cols)|0)+.5)*sy-entry.y)*1.75);
    if(d<best){best=d;first=id;}
  }
  if(first<0||best>50)return false;
  const seen=new Uint8Array(free.length),queue=new Int32Array(free.length);let head=0,tail=1;queue[0]=first;seen[first]=1;
  while(head<tail){const id=queue[head++],x=id%cols,y=(id/cols)|0;
    for(const n of [x? id-1:-1,x+1<cols?id+1:-1,y?id-cols:-1,y+1<rows?id+cols:-1])
      if(n>=0&&free[n]&&!seen[n]){seen[n]=1;queue[tail++]=n;}
  }
  const near=(p,rx,ry)=>{
    for(let id=0;id<seen.length;id++)if(seen[id]&&Math.abs(room.x+(id%cols+.5)*sx-p.x)<=rx&&
      Math.abs(room.y+(((id/cols)|0)+.5)*sy-p.y)<=ry)return true;
    return false;
  };
  if(room.doors.some(d=>!near(d,38,26)))return false;
  return room.tiles.every(t=>[.23,.5,.77].some(u=>[.23,.5,.77].some(v=>near({x:t.x+t.w*u,y:t.y+t.h*v},20,7))));
}
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
  const hasExterior=number===1,hasEmergency=hasExterior&&rng()<.5;
  add(2,1);add(1,1);if(hasExterior)add(2,0);
  const south=[1,2,3].filter(c=>hall.has(index(c,5)));
  const entranceCol=south.length?south[Math.floor(rng()*south.length)]:1;
  // 南端の縦2×横2区画をつなぎ、ゆったりした玄関ホールとする。
  const lobbyIds=[],lobbyLeft=entranceCol===3?2:entranceCol;
  if(hasExterior)for(let r=5;r<=6;r++)for(let c=lobbyLeft;c<=lobbyLeft+1;c++){add(c,r);lobbyIds.push(index(c,r));}
  const mainDoor={x:center(index(entranceCol,6)).x,y:Y0+ROWS*SIZE,side:'bottom'};
  const frontDoors=hasExterior?[mainDoor,{...mainDoor,x:center(index(entranceCol===lobbyLeft?lobbyLeft+1:lobbyLeft,6)).x}]:[];
  const entrances=frontDoors.map(d=>({x:d.x,y:d.y+384}));
  const entrance=hasExterior?{x:X0+(lobbyLeft+1)*SIZE,y:entrances[0].y}:null;
  const emergencyDoor={x:center(index(2,0)).x,y:Y0,side:'top'};
  const emergency=hasEmergency?{x:emergencyDoor.x,y:emergencyDoor.y-384}:null;
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
      (side==='bottom'&&(c===lobbyLeft||c===lobbyLeft+1)&&r===ROWS-1)||
      (hasEmergency&&side==='top'&&c===2&&r===0)
    );
    if(externalEntry)return; // 屋外の入口は区画全幅の開口。扉や袖壁を残さない。
    if(doors.has(key)){
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
  postRoom.name='青兵詰所';postRoom.isGuardPost=true;postRoom.purpose='guard_post';
  // 用途は生成時だけ決定。大きい部屋を作戦室にし、残りを役割ごとに装備する。
  const roleRooms=rooms.filter(r=>r!==postRoom).sort((a,b)=>b.size-a.size||a.id-b.id);
  for(const [purpose,name] of [['utilities','設備室'],['communications','通信室'],['operations','作戦室'],['armory','武器庫']]){
    const preferred=purpose==='utilities'?roleRooms.findIndex(r=>r.tiles.some(t=>r.tiles.some(u=>u.y===t.y&&u.x===t.x+SIZE))):0;
    const room=roleRooms.splice(Math.max(0,preferred),1)[0];room.purpose=purpose;room.name=name;
  }
  for(const [i,room] of roleRooms.entries()){
    room.purpose=room.size===1?'quarters':i%2?'records':'storage';
    room.name=room.purpose==='quarters'?'兵員室':room.purpose==='records'?'資料室':'倉庫';
  }
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
  // 各部屋に補助家具を一つ追加。入口・壁との衝突があれば後段で移動または省略する。
  for(const room of rooms)if(room!==postRoom){
    const tile=room.tiles[0];
    addFurniture('roomSupport',tile.x+SIZE-68,tile.y+SIZE-62,50,40,'room');
  }
  addFurniture('postTable',postCenter.x-47,postCenter.y-28,94,56,'post');
  // Keep one consistent side throughout each floor, including doorway fallback
  // positions and explosive cargo. Never alternate sides in adjacent hall cells.
  let hallLeft;
  const hallCorners=(w,h,margin=14)=>{
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
  // 元の縦横比で家具を配置。ベッドは1区画の小部屋に限り、全て世界座標で同じ大きさ。
  const roomSlots=new Map();
  for(const item of furniture){
    const cx=item.x+item.w/2,cy=item.y+item.h/2;
    const room=item.zone==='room'?rooms.find(r=>r.tiles.some(t=>cx>=t.x&&cx<t.x+t.w&&cy>=t.y&&cy<t.y+t.h)):null;
    const slot=roomSlots.get(room?.id)||0;
    if(room){item.roomId=room.id;item.purpose=room.purpose;roomSlots.set(room.id,slot+1);}
    const palette=room&&INDOOR_ROOM_ART[room.purpose];
    item.artKind=item.kind==='postTable'?'desk':palette?palette[Math.min(slot,palette.length-1)]:
      ({ammo:'container',supply:'shelf',kit:'equipment'}[item.kind]||null);
    item.primaryAsset=!!(room&&slot===0);
    const ar=INDOOR_PROP_ASPECT[item.artKind];if(!ar)continue;
    const maxW=item.w*INDOOR_SCALE_X,maxH=item.h*INDOOR_SCALE_Y;
    let h=Math.min(maxH,maxW/ar),w=h*ar;
    if(item.artKind==='bed'){h=104;w=h*ar;}
    if(INDOOR_PROP_LENGTH[item.artKind]){h=INDOOR_PROP_LENGTH[item.artKind];w=h*ar;}
    if(item.artKind==='container'){w*=2;h*=2;}
    item.w=w/INDOOR_SCALE_X;item.h=h/INDOOR_SCALE_Y;
    const tx=X0+Math.floor((cx-X0)/SIZE)*SIZE,ty=Y0+Math.floor((cy-Y0)/SIZE)*SIZE;
    item.x=item.zone==='hallway'?tx+(hallLeft?14:SIZE-item.w-14):
      Math.max(tx+16,Math.min(tx+SIZE-item.w-16,cx-item.w/2));
    item.y=Math.max(ty+16,Math.min(ty+SIZE-item.h-16,cy-item.h/2));
  }
  for(let i=furniture.length-1;i>=0;i--)if(!furniture[i].artKind)furniture.splice(i,1);
  // Stage-exclusive cargo: each cluster contains one kind; collisions match visual scale.
  // Crates use a vertical 2:1 world ratio; shell pallets keep their large footprint.
  const explosiveObjects=[];
  const clusterCells=indoorShuffle(halls.filter(i=>!lobbyIds.includes(i)&&i!==stairIndex&&i!==index(2,0)),rng);
  const roomCells=indoorShuffle(rooms.filter(r=>r!==postRoom).flatMap(r=>r.cellIds),rng);
  const overlap=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;
  const doorLane=d=>d.vertical
    ?{x:d.x-35,y:d.y-30,w:70,h:60}
    :{x:d.x-24,y:d.y-35,w:48,h:70};
  const doorLanes=doorMarks.map(doorLane);
  const roomWalkLanes=[];
  const addWalkLane=(a,b)=>roomWalkLanes.push({x:Math.min(a.x,b.x)-18,y:Math.min(a.y,b.y)-12,
    w:Math.abs(a.x-b.x)+36,h:Math.abs(a.y-b.y)+24});
  for(const room of rooms)for(const id of room.cellIds){
    const a=center(id);addWalkLane(a,a);
    for(const n of neighbors(id))if(n>id&&room.cellIds.includes(n))addWalkLane(a,center(n));
  }
  for(const door of doorMarks)for(const id of door.cells||[])if(owner[id]>=0)addWalkLane(center(id),door);
  const largeEquipment=o=>o.artKind==='server_rack'||o.artKind==='generator';
  const blocksRoomWalk=o=>o.zone==='room'&&!largeEquipment(o)&&roomWalkLanes.some(q=>overlap(o,q));
  // Static furniture must leave the actual doorway approach open.
  for(let i=furniture.length-1;i>=0;i--){
    const item=furniture[i];
    if(!largeEquipment(item)&&!blocksRoomWalk(item)&&!doorLanes.some(d=>overlap(item,d))&&!walls.some(w=>overlap(item,w,3))&&
       !furniture.some((f,j)=>j!==i&&overlap(item,f,3)))continue;
    const tx=X0+Math.floor((item.x-X0)/SIZE)*SIZE,ty=Y0+Math.floor((item.y-Y0)/SIZE)*SIZE;
    const corners=item.zone==='hallway'?hallCorners(item.w,item.h):
      [[16,16],[SIZE-item.w-16,16],[16,SIZE-item.h-16],[SIZE-item.w-16,SIZE-item.h-16]];
    const alternate=(largeEquipment(item)?[]:corners).map(([dx,dy])=>({...item,x:tx+dx,y:ty+dy})).find(o=>
      !blocksRoomWalk(o)&&!doorLanes.some(d=>overlap(o,d))&&!walls.some(w=>overlap(o,w,3))&&
      !furniture.some((f,j)=>j!==i&&overlap(o,f,3))&&
      distance({x:o.x+o.w/2,y:o.y+o.h/2},stair)>78);
    if(alternate){item.x=alternate.x;item.y=alternate.y;}
    else furniture.splice(i,1);
  }
  // 主設備が入口との干渉で省略された場合、同じ部屋内で安全な配置を探し直す。
  // 補助家具だけを置き換え、部屋の主設備・階段・扉の通行域を守る。
  for(const room of rooms.filter(r=>['operations','armory','communications','utilities'].includes(r.purpose))){
    const artKind=INDOOR_ROOM_ART[room.purpose][0];
    if(furniture.some(o=>o.roomId===room.id&&o.artKind===artKind))continue;
    let best=null;
    const large=artKind==='server_rack'||artKind==='generator';let walkChecks=0;
    for(const scale of large?[1]:[1,.88,.76,.67,.6]){
      const h=INDOOR_PROP_LENGTH[artKind]*scale/INDOOR_SCALE_Y,w=INDOOR_PROP_LENGTH[artKind]*scale*INDOOR_PROP_ASPECT[artKind];
      placementSearch: for(const [pw,ph] of [[w,h],[h*INDOOR_SCALE_Y,w/INDOOR_SCALE_Y]]){
        // 発電機は南向きの原画を回転せず置く。
        if(artKind==='generator'&&pw>ph*INDOOR_SCALE_Y)continue;
        for(let y=room.y+14;y+ph<=room.y+room.h-14;y+=8)for(let x=room.x+14;x+pw<=room.x+room.w-14;x+=8){
          const o={kind:'cabinet',artKind,roomId:room.id,purpose:room.purpose,primaryAsset:true,zone:'room',x,y,w:pw,h:ph};
          const area=room.tiles.reduce((sum,t)=>sum+Math.max(0,Math.min(x+pw,t.x+t.w)-Math.max(x,t.x))*
            Math.max(0,Math.min(y+ph,t.y+t.h)-Math.max(y,t.y)),0);
          if(Math.abs(area-pw*ph)>.01||blocksRoomWalk(o)||walls.some(q=>overlap(o,q,3))||doorLanes.some(q=>overlap(o,q,5)))continue;
          const displaced=furniture.filter(q=>large?q.roomId===room.id:overlap(o,q,6));
          if(displaced.some(q=>q.primaryAsset||q.roomId!==room.id))continue;
          if(large){
            if(++walkChecks>40)break placementSearch;
            if(!indoorRoomEquipmentWalkable(room,[...walls,...furniture.filter(q=>!displaced.includes(q)),o]))continue;
          }
          if(!best||displaced.length<best.displaced.length)best={o,displaced};
          if(large||!displaced.length)break placementSearch;
        }
      }
      if(best)break;
    }
    if(best){for(const q of best.displaced)furniture.splice(furniture.indexOf(q),1);furniture.push(best.o);}
  }
  const machineryRooms=new Set(furniture.filter(largeEquipment).map(o=>o.roomId));
  // Do not replenish the opposite side to satisfy an old density minimum.
  // At most two props/cargo pieces may occupy a hallway cell in total.
  const hallCellCount=cell=>{
    const {c,r}=coord(cell),x=X0+c*SIZE,y=Y0+r*SIZE;
    return [...furniture,...explosiveObjects].filter(o=>o.zone==='hallway'&&
      o.x>=x&&o.x<x+SIZE&&o.y>=y&&o.y<y+SIZE).length;
  };
  const isFree=o=>{
    const cx=o.x+o.w/2,cy=o.y+o.h/2;
    if(rooms.some(r=>machineryRooms.has(r.id)&&r.tiles.some(t=>cx>=t.x&&cx<t.x+t.w&&cy>=t.y&&cy<t.y+t.h)))return false;
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
    const itemH=kind==='crate'?size/1.5/INDOOR_SCALE_Y:size;
    const rows=Math.ceil(count/columns),width=columns*size+(columns-1)*gap,height=rows*itemH+(rows-1)*gap;
    const positions=zone==='hallway'
      ?hallCorners(width,height,14)
      :[[14,14],[SIZE-width-14,14],[14,SIZE-height-14],[SIZE-width-14,SIZE-height-14]];
    for(const [dx,dy] of positions){
      const items=Array.from({length:count},(_,i)=>({
        x:xx+dx+(i%columns)*(size+gap),y:yy+dy+Math.floor(i/columns)*(itemH+gap),
        w:size,h:itemH,kind,zone,group:zone+'-'+groupId}));
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
    for(const allowMachinery of [false,true]){
    for(const cell of roomCells){
      if(machineryRooms.has(owner[cell])&&!allowMachinery)continue;
      const {c,r}=coord(cell),xx=X0+c*SIZE,yy=Y0+r*SIZE;
      for(const dx of [14,46])for(const dy of [14,46]){
        const o={x:xx+dx,y:yy+dy,w:120,h:120,kind:'shellPallet',zone:'room',group:'room-shell-large'};
        if(distance({x:o.x+60,y:o.y+60},stair)<98||
           doorLanes.some(d=>overlap(o,d,5))||
           walls.some(w=>overlap(o,w,3))||
           explosiveObjects.some(v=>overlap(o,v,7)))continue;
        const displaced=furniture.filter(v=>overlap(o,v,6));
        if(displaced.some(v=>v.primaryAsset))continue;
        if(machineryRooms.has(owner[cell])&&!indoorRoomEquipmentWalkable(rooms[owner[cell]],
          [...walls,...furniture.filter(v=>!displaced.includes(v)),...explosiveObjects,o]))continue;
        if(!best||displaced.length<best.displaced.length)best={o,displaced};
        if(!displaced.length)break;
      }
      if(best&&!best.displaced.length)break;
    }
    if(best)break;
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
  // 廊下の家具・貨物を同じ区画の実在する壁へ寄せる。生成時に一度だけ実行。
  const hallPieces=[...furniture,...explosiveObjects].filter(o=>o.zone==='hallway');
  for(const item of hallPieces){
    const tx=X0+Math.floor((item.x-X0)/SIZE)*SIZE,ty=Y0+Math.floor((item.y-Y0)/SIZE)*SIZE;
    const candidates=[];
    for(const wall of walls){
      if(wall.h>wall.w&&wall.y<=item.y&&wall.y+wall.h>=item.y+item.h){
        if(hallLeft&&wall.x+wall.w<=item.x)candidates.push({...item,x:wall.x+wall.w+3});
        if(!hallLeft&&wall.x>=item.x+item.w)candidates.push({...item,x:wall.x-item.w-3});
      }
      if(wall.w>wall.h&&wall.x<=item.x&&wall.x+wall.w>=item.x+item.w){
        if(wall.y+wall.h<=item.y)candidates.push({...item,y:wall.y+wall.h+3});
        if(wall.y>=item.y+item.h)candidates.push({...item,y:wall.y-item.h-3});
      }
    }
    candidates.sort((a,b)=>distance(a,item)-distance(b,item));
    const near=candidates.find(o=>o.x>=tx+10&&o.x+o.w<=tx+SIZE-10&&o.y>=ty+10&&o.y+o.h<=ty+SIZE-10&&
      distance(o,item)<=48&&!walls.some(w=>overlap(o,w,2))&&!doorLanes.some(d=>overlap(o,d,5))&&
      ![...furniture,...explosiveObjects].some(q=>q!==item&&overlap(o,q,6)));
    if(near){item.x=near.x;item.y=near.y;}
  }
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
    let table=room===postRoom?furniture.find(o=>o.kind==='postTable'):
      roomFurniture.filter(o=>o.artKind==='desk'||o.artKind==='operations_table')
        .sort((a,b)=>distance({x:a.x+a.w/2,y:a.y+a.h/2},mid)-
          distance({x:b.x+b.w/2,y:b.y+b.h/2},mid))[0];
    const inRoom=room.tiles.some(t=>mid.x>=t.x&&mid.x<=t.x+t.w&&
      mid.y>=t.y&&mid.y<=t.y+t.h);
    const primary=inRoom?mid:centers.slice().sort((a,b)=>distance(a,mid)-distance(b,mid))[0];
    roomLight(primary,'room-center',room);
    if(table&&distance({x:table.x+table.w/2,y:table.y+table.h/2},primary)<5){
      table=roomFurniture.find(o=>(o.artKind==='desk'||o.artKind==='operations_table')&&
        distance({x:o.x+o.w/2,y:o.y+o.h/2},primary)>5)||table;
    }
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
  // Up to three extra pools fill the darkest corridor gaps, only at map creation.
  const lightGaps=[...corridorCells].map(cell=>center(cell)).sort((a,b)=>
    Math.min(...lightFixtures.map(l=>distance(b,l)))-Math.min(...lightFixtures.map(l=>distance(a,l))));
  let extraLights=0;
  for(const point of lightGaps){
    if(extraLights>=3)break;
    if(addLight(point,'hall','hall-extra',SIZE*.54,SIZE*.54))extraLights++;
  }
  if(hasExterior){
    for(const door of frontDoors){
      addLight({x:door.x,y:door.y+36},'entry','entry-main',180,180);
      addLight({x:door.x,y:door.y+176},'entry','entry-approach',190,190);
      addLight({x:door.x,y:door.y+336},'entry','entry-forecourt',195,195);
    }
    if(hasEmergency)for(const [i,dy] of [36,176,336].entries())
      addLight({x:emergencyDoor.x,y:emergencyDoor.y-dy},'entry',i?'entry-north-'+i:'entry-north',190,190);
  }
  // Circular light pools of different sizes; preserve each former ellipse's area.
  for(const lamp of lightFixtures){const radius=Math.sqrt(lamp.rx*lamp.ry);lamp.rx=radius;lamp.ry=radius;}
  // Furnish the unused room edges more densely, after cargo has reserved its space.
  // Keep the existing light layout; extra tables use rooms that already have a task lamp.
  // This is a bounded generation-only pass: no new assets or per-frame planning.
  let extraFurniture=0;
  for(const room of rooms){
    if(room===postRoom)continue; // Keep the seated guard formation and its table clear.
    const target=Math.min(9,Math.max(3,room.size*2));
    const palette=INDOOR_ROOM_ART[room.purpose].filter(art=>
      art!=='server_rack'&&art!=='generator'&&(art!=='bed'||room.size===1)&&
      (!['desk','operations_table'].includes(art)||lightFixtures.some(l=>l.roomId===room.id&&l.anchor==='table')));
    let count=furniture.filter(o=>o.roomId===room.id).length,walkChecks=0;
    densityRoom: for(let pass=0;pass<3;pass++)for(const tile of room.tiles){
      if(count>=target||extraFurniture>=24||walkChecks>=10)break densityRoom;
      let placed=false;
      for(let slot=0;slot<palette.length&&!placed;slot++){
        const artKind=palette[(slot+pass+room.id)%palette.length];
        if(artKind==='bed'&&furniture.some(o=>o.roomId===room.id&&o.artKind==='bed'))continue;
        const worldH=artKind==='bed'?104:artKind==='container'?140:(INDOOR_PROP_LENGTH[artKind]||70);
        const w=worldH*INDOOR_PROP_ASPECT[artKind],h=worldH/INDOOR_SCALE_Y;
        const positions=[[14,14],[SIZE-w-14,14],[14,SIZE-h-14],[SIZE-w-14,SIZE-h-14],
          [14,(SIZE-h)/2],[SIZE-w-14,(SIZE-h)/2],[(SIZE-w)/2,14],[(SIZE-w)/2,SIZE-h-14]];
        for(const [dx,dy] of positions){
          if(dx<12||dy<12||dx+w>SIZE-12||dy+h>SIZE-12)continue;
          const o={kind:'roomSupport',artKind,roomId:room.id,purpose:room.purpose,zone:'room',
            x:tile.x+dx,y:tile.y+dy,w,h,densityExtra:true};
          if(blocksRoomWalk(o)||doorLanes.some(q=>overlap(o,q,5))||walls.some(q=>overlap(o,q,3))||
             distance({x:o.x+w/2,y:o.y+h/2},stair)<98||
             furniture.some(q=>overlap(o,q,6))||explosiveObjects.some(q=>overlap(o,q,7)))continue;
          // Include cargo and large machines: an empty corner is not enough if it
          // closes the last route between doors, room tiles or collection space.
          if(++walkChecks>10)break;
          if(!indoorRoomEquipmentWalkable(room,[...walls,...furniture,...explosiveObjects,o]))continue;
          furniture.push(o);count++;extraFurniture++;placed=true;break;
        }
      }
    }
  }
  // Select only rooms with a genuine walkable document position.
  const obstacles=[...walls,...furniture,...explosiveObjects];
  // 貨物も含む実際の移動グリッドで、廊下から到達できる回収位置だけを選ぶ。
  const documentGrid=indoorMakeGuardGrid({number,stair,walls,furniture,explosiveObjects},0);
  const sourceCell=indoorGridFreeNearest(documentGrid,indoorGridPoint(documentGrid,indoorAt(stair.x,stair.y,0)));
  const reachable=documentGrid.seen,documentQueue=documentGrid.queue;
  let documentHead=0,documentTail=0;
  if(sourceCell>=0){documentQueue[documentTail++]=sourceCell;reachable[sourceCell]=1;}
  while(documentHead<documentTail){
    const id=documentQueue[documentHead++],x=id%documentGrid.cols,y=(id/documentGrid.cols)|0;
    for(let k=0;k<4;k++){
      if((k===0&&!y)||(k===1&&y===documentGrid.rows-1)||(k===2&&!x)||(k===3&&x===documentGrid.cols-1))continue;
      const n=id+(k===0?-documentGrid.cols:k===1?documentGrid.cols:k===2?-1:1);
      if(!documentGrid.solid[n]&&!reachable[n]){reachable[n]=1;documentQueue[documentTail++]=n;}
    }
  }
  const documentReachable=p=>{
    const id=indoorGridPoint(documentGrid,indoorAt(p.x,p.y,0));
    return id>=0&&!documentGrid.solid[id]&&!!reachable[id];
  };
  const documentArts=new Set(['cabinet','desk','server_rack','operations_table','personal_lockers','shelf','equipment']);
  const worldDistance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*INDOOR_SCALE_Y);
  const intelCandidates=rooms.filter(r=>r!==postRoom).map(room=>{
    const fixtures=furniture.filter(o=>o.roomId===room.id&&documentArts.has(o.artKind));
    const candidates=[];
    for(const fixture of fixtures){
      const cx=fixture.x+fixture.w/2,cy=fixture.y+fixture.h/2;
      for(const gap of [26,38])for(const t of [.25,.5,.75]){
        candidates.push({x:fixture.x-gap,y:fixture.y+fixture.h*t,fixture},
          {x:fixture.x+fixture.w+gap,y:fixture.y+fixture.h*t,fixture},
          {x:fixture.x+fixture.w*t,y:fixture.y-gap/INDOOR_SCALE_Y,fixture},
          {x:fixture.x+fixture.w*t,y:fixture.y+fixture.h+gap/INDOOR_SCALE_Y,fixture});
      }
    }
    const doorDistance=p=>Math.min(...room.doors.map(d=>worldDistance(p,d)));
    const valid=candidates.filter(p=>documentReachable(p)&&room.tiles.some(t=>p.x>=t.x+14&&p.x<=t.x+t.w-14&&p.y>=t.y+10&&p.y<=t.y+t.h-10)&&
      doorDistance(p)>=86&&obstacles.every(o=>p.x<=o.x-15||p.x>=o.x+o.w+15||p.y<=o.y-15||p.y>=o.y+o.h+15));
    valid.sort((a,b)=>doorDistance(b)-doorDistance(a));
    return valid.length?{room,point:valid[0]}:null;
  }).filter(Boolean);
  if(intelCandidates.length<2)throw Error('家具付近の資料への通行可能な配置が不足');
  const intel=indoorShuffle(intelCandidates,rng).slice(0,INDOOR_FILES_TOTAL).map(({room,point},i)=>
    ({x:point.x,y:point.y,room:room.name,roomId:room.id,fixtureArt:point.fixture.artKind,id:number+'-'+i,taken:false}));
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
  const entryOpenings=hasExterior?[{x:entrance.x,y:mainDoor.y,side:1,w:2*SIZE},
    ...(hasEmergency?[{x:emergencyDoor.x,y:emergencyDoor.y,side:-1,w:SIZE}]:[])]:[];
  return{number,pattern,rooms,walls,furniture,entryOpenings,explosiveObjects,lightFixtures,guards,postGuards,postCount,postRoomId:postRoom.id,intel,stair,exit,entrance,entrances,emergency,
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
const INDOOR_FLOOR_OFFSETS=[9300,5500],INDOOR_SCALE_X=1,INDOOR_SCALE_Y=1.75,INDOOR_OFFSET_X=-40,INDOOR_FORECOURT_DEPTH=900;
let indoorWorld=null,indoorHudSnapshot='',indoorHudRefresh=0,indoorAlarmGradient=null;

let indoorShadeCanvas=null,indoorShadeCtx=null,indoorLightStamp=null,indoorShadeSnapshot=null;
// 天井灯は床に落ちる固定光。暗所は視認性を落とすが、完全な真っ暗にはしない。
const INDOOR_LIGHT_RADIUS=185;
function indoorLightLevel(x,y){
  if(!indoorWorld)return 1;
  let near=Infinity,withinFloor=false;
  for(const f of indoorWorld.floors){
    if(y<f.footprint.y-260||y>f.footprint.y+f.footprint.h+INDOOR_FORECOURT_DEPTH)continue;
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
  const q=gameCanvasContext(c),gr=q.createRadialGradient(r,r,0,r,r,r);
  gr.addColorStop(0,'rgba(0,0,0,.99)');
  gr.addColorStop(.20,'rgba(0,0,0,.97)');
  gr.addColorStop(.47,'rgba(0,0,0,.85)');
  gr.addColorStop(.73,'rgba(0,0,0,.24)');
  gr.addColorStop(.91,'rgba(0,0,0,.04)');
  gr.addColorStop(1,'rgba(0,0,0,0)');
  q.fillStyle=gr;q.fillRect(0,0,c.width,c.height);
  indoorLightStamp=c;return c;
}
// Shared static mask painter, also used once to compensate a destroyed wall scar.
function indoorPaintLightingMask(q,left,top,mw,mh){
    const r=INDOOR_LIGHT_RADIUS,stamp=indoorLightingStamp();
    q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,mw,mh);
    q.fillStyle='rgba(7,13,15,.58)';q.fillRect(0,0,mw,mh);
    q.globalCompositeOperation='destination-out';
    for(const f of indoorWorld.floors){
      if(f.footprint.y>top+mh+INDOOR_FORECOURT_DEPTH||f.footprint.y+f.footprint.h<top-INDOOR_FORECOURT_DEPTH)continue;
      for(const lamp of f.lightFixtures){
        const x=lamp.x-left,y=lamp.y-top,rx=lamp.rx||r,ry=lamp.ry||r;
        if(x<-rx||x>mw+rx||y<-ry||y>mh+ry)continue;
        q.save();q.beginPath();
        for(const tile of lamp.clipTiles){
          if(tile.x+tile.w<left-rx||tile.x>left+mw+rx||
            tile.y+tile.h<top-ry||tile.y>top+mh+ry)continue;
          q.rect(tile.x-left,tile.y-top,tile.w,tile.h);
        }
        q.clip();q.drawImage(stamp,x-rx,y-ry,rx*2,ry*2);q.restore();
      }
    }
    q.globalCompositeOperation='source-over';
}
function indoorWallGroundSprite(mark){
 if(mark.indoorShadowRaster)return mark.indoorShadowRaster;
 const c=document.createElement('canvas'),mask=document.createElement('canvas');
 c.width=mask.width=Math.max(1,Math.ceil(mark.w));c.height=mask.height=Math.max(1,Math.ceil(mark.h));
 const q=gameCanvasContext(c),mq=gameCanvasContext(mask);
 indoorPaintLightingMask(mq,mark.x,mark.y,c.width,c.height);
 // Convert mask alpha to opaque gray using compositing, without CPU readback.
 mq.globalCompositeOperation='source-in';mq.fillStyle='#fff';mq.fillRect(0,0,c.width,c.height);
 mq.globalCompositeOperation='destination-over';mq.fillStyle='#000';mq.fillRect(0,0,c.width,c.height);
 // color-dodge computes 21/(1-alpha); adding the light tint gives the same
 // precompensated charcoal as the previous pixel loop: tint+21/(1-alpha).
 q.fillStyle='#151515';q.fillRect(0,0,c.width,c.height);
 q.globalCompositeOperation='color-dodge';q.drawImage(mask,0,0);
 q.globalCompositeOperation='lighter';q.fillStyle='#070d0f';q.fillRect(0,0,c.width,c.height);
 q.globalCompositeOperation='destination-in';q.drawImage(buildingShadowSprite('indoorWall'),0,0,c.width,c.height);
 q.globalCompositeOperation='source-over';
 // Keep only the finished small raster: no CPU readback, pixel upload or later lamp loop.
 mark.indoorShadowRaster=c;return c;
}
function drawInfiltrationLighting(cx,cy){
  if(!indoorWorld||!gm)return;
  // One bounded, overscanned mask. Static lighting is rebuilt only when the
  // viewport approaches its edge, rather than composited and transferred each frame.
  // Match the main Canvas backing settings, especially on readback-first iPhones.
  if(!indoorShadeCanvas){
    indoorShadeCanvas=document.createElement('canvas');indoorShadeCtx=gameCanvasContext(indoorShadeCanvas);
  }
  const mask=indoorShadeCanvas,q=indoorShadeCtx,mw=Math.ceil(W)+256,mh=Math.ceil(H)+256;
  let cached=indoorShadeSnapshot;
  if(!cached||cached.world!==indoorWorld||mask.width!==mw||mask.height!==mh||
     cx<cached.x+32||cy<cached.y+32||cx+W>cached.x+mw-32||cy+H>cached.y+mh-32){
    if(mask.width!==mw)mask.width=mw;if(mask.height!==mh)mask.height=mh;
    const left=Math.floor(cx/64)*64-96,top=Math.floor(cy/64)*64-96;
    indoorPaintLightingMask(q,left,top,mw,mh);
    cached=indoorShadeSnapshot={world:indoorWorld,x:left,y:top};
  }
  gm.save();gm.drawImage(mask,cx-cached.x,cy-cached.y,W,H,0,0,W,H);gm.restore();
}

const INDOOR_DOOR_WIDTH=84,INDOOR_DOOR_THICKNESS=6,INDOOR_DOOR_SPEED=5.2;
function indoorDoorCollisionRect(q){
  // 縦横とも世界座標で6pxの薄型パネル。当たり判定も描画と一致させる。
  const half=INDOOR_DOOR_WIDTH/2,thick=INDOOR_DOOR_THICKNESS;
  return q.vertical
    ?{x:q.x-thick/2,y:q.y-half*INDOOR_SCALE_Y,w:thick,h:INDOOR_DOOR_WIDTH*INDOOR_SCALE_Y}
    :{x:q.x-half*INDOOR_SCALE_X,y:q.y-thick/2,
      w:INDOOR_DOOR_WIDTH*INDOOR_SCALE_X,h:thick};
}
const indoorAt=(x,y,offset)=>({x:INDOOR_OFFSET_X+x*INDOOR_SCALE_X,y:y*INDOOR_SCALE_Y+offset});
const indoorRect=(rect,offset)=>({x:INDOOR_OFFSET_X+rect.x*INDOOR_SCALE_X,y:rect.y*INDOOR_SCALE_Y+offset,
 w:rect.w*INDOOR_SCALE_X,h:rect.h*INDOOR_SCALE_Y});
// 屋外のみ、固定回数の抽選で疎らに配置。建物・玄関導線・脱出地点は必ず空ける。
function indoorGenerateExterior(floor,rng,worldWidth=960){
  if(floor.number!==1)return[];
  const out=[],fp=floor.footprint,south=fp.y+fp.h;
  const gateways=[floor.entrance,...(floor.entrances||[]),floor.emergency].filter(Boolean);
  for(const side of ['south','north']){
    const limit=side==='south'?8:2;let placed=0;
    for(let attempt=0;attempt<160&&placed<limit;attempt++){
      const tree=placed%2===0,size=tree?72+rng()*24:48+rng()*20;
      const cx=65+rng()*(worldWidth-130),cy=side==='south'
        ?south+110+rng()*(INDOOR_FORECOURT_DEPTH-220):fp.y-190+rng()*70;
      if(gateways.some(q=>Math.hypot(cx-q.x,cy-q.y)<145+size/2||Math.abs(cy-q.y)<110+size/2))continue;
      if(side==='south'&&[floor.entrance,...(floor.entrances||[])].filter(Boolean).some(q=>Math.abs(cx-q.x)<92+size/2))continue;
      if(side==='north'&&floor.emergency&&Math.abs(cx-floor.emergency.x)<110+size/2)continue;
      if(out.some(q=>Math.hypot(cx-q.x-q.w/2,cy-q.y-q.h/2)<155))continue;
      out.push({x:cx-size/2,y:cy-size/2,w:size,h:size,kd:tree?6:8,
        indoorExterior:true,hp:999999});placed++;
    }
  }
  return out;
}
function setupInfiltrationWorld(){
  const ground=ZONE_STYLE['敵迷路基地'];
  ZONES=[{n:'敵迷路基地',y0:WH,y1:-400,g:'#202820',p:ground.p.slice(),pat:null,indoor:true}];
  roadBands=[];areaDebugLabels=[];covers=[];objects=[];bushes=[];mud=[];water=[];bridges=[];cars=[];
  etanks=[];humans=[];bullets=[];parts=[];bombs=[];items=[];waves=[];fx=[];allies=[];
  builtWalls=[];tankWrecks=[];buildingGroundMarks=[];decoy=null;radio=null;airstrike=null;airbombs=[];
  weather='clear';weatherT=0;rainIntensity=0;weatherNext=99999;baseSpawnT=99999;
  // Off-map base avoids outdoor destruction / HQ spawning while preserving core state shape.
  base={x:-5000,y:-5000,w:100,h:100,hp:30,maxHp:30,deadAt:0};
  document.body.classList.remove('front-battle');
  indoorWorld={floors:[],intel:[],currentFloor:0,stairEntryFloor:null,stairMoveLock:0,stairsCooldown:0,exit:null,emergency:null,entrance:null,
    alarm:{active:false,witnesses:new Set(),elapsed:0}};
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
  const groundFiles=R()<.5?1:2;
  const shuffled=[1,2];
  for(const n of shuffled){
    const raw=rawFloors[n-1],off=INDOOR_FLOOR_OFFSETS[n-1];
    const to=pt=>indoorAt(pt.x,pt.y,off);
    const rooms=raw.rooms.map(r=>{const rect=indoorRect(r,off);
      return{...rect,id:r.id,name:r.name,purpose:r.purpose,size:r.size,isGuardPost:!!r.isGuardPost,tiles:r.tiles.map(tile=>indoorRect(tile,off))};
    });
    // Walls use the existing concrete wall cover kind. Doors remain actual gaps in the core collision grid.
    const wallRects=[];
    for(const wall of raw.walls){
      const q={...indoorRect(wall,off),kd:1,indoorWall:true,hp:999999};
      covers.push(q);wallRects.push(q);
    }
    // 階段は南側だけを開口。壁は通常の衝突・視線遮蔽にも登録する。
    for(const wall of indoorStairWalls(to(raw.stair),n)){
      const q={...wall,kd:1,indoorWall:true,indoorStairWall:true,hp:999999};
      covers.push(q);wallRects.push(q);
    }
    // 補給物資と室内家具は既存遮蔽判定を利用。描画だけ屋内用に区別。
    // 破壊時には共有の破片描画を使い、当たり判定と移動グリッドを同期する。
    const props=[];
    for(const piece of raw.furniture){
      const q=indoorRect(piece,off);
      const prop={...q,kd:1,indoorProp:true,propKind:piece.kind,propArt:piece.artKind,propZone:piece.zone,roomId:piece.roomId,purpose:piece.purpose,hp:999999};
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
    const footprint=indoorRect(raw.footprint,off);
    const southApron={x:footprint.x,y:footprint.y+footprint.h,w:footprint.w,h:INDOOR_FORECOURT_DEPTH};
    const northApron={x:footprint.x,y:footprint.y-INDOOR_FORECOURT_DEPTH,w:footprint.w,h:INDOOR_FORECOURT_DEPTH};
    const lightFixtures=raw.lightFixtures.map(item=>{
      const clipTiles=item.zone==='room'?rooms[item.roomId].tiles:
        item.zone==='lobby'?corridors:item.zone==='entry'?
          (item.anchor.startsWith('entry-north')?[northApron,...corridors.filter(t=>t.y===footprint.y)]:[southApron,...corridors]):corridors;
      const radius=item.rx*Math.sqrt(INDOOR_SCALE_X*INDOOR_SCALE_Y);
      return{...to(item),zone:item.zone,anchor:item.anchor,rx:radius,ry:radius,clipTiles};
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
    const stair=to(raw.stair),stairObstacle=indoorStairObstacleBounds(stair,n);
    const avoidStair=pt=>{
      if(!(pt.x>=stairObstacle.x-12&&pt.x<=stairObstacle.x+stairObstacle.w+12&&pt.y>=stairObstacle.y-12&&pt.y<=stairObstacle.y+stairObstacle.h+12))return pt;
      return indoorGridSafePoint(navigation.grid,pt);
    };
    const avoidFixed=pt=>indoorGridSafePoint(navigation.grid,pt);
    navigation.centers=navigation.centers.map(avoidStair);
    const openings=raw.entryOpenings.map(q=>({...to(q),side:q.side,w:q.w}));
    const guards=[];
    for(const [guardIndex,h] of raw.guards.entries()){
      const pos=avoidFixed(to(h)),path=h.waypoints.map(q=>avoidFixed(to(q)));
      const guard={...pos,path,loop:!!h.loop,wi:1,dir:1,stk:0,
        alive:true,elite:false,commander:null,st:0,sus:0,lost:0,cd:R()*1.2,burstLeft:0,face:h.face,
        target:null,patrolMode:'axis',zoneHeavy:'indoor',indoorGuard:true,indoorFloor:n,
        indoorCommander:false,frontCommander:false};
      if(n===1&&guardIndex<2){
        const gate=openings[Math.min(guardIndex,openings.length-1)],dx=openings.length===1?(guardIndex?60:-60):0;
        guard.path=[{x:gate.x+dx,y:gate.y-gate.side*64},{x:gate.x+dx,y:gate.y+gate.side*110},
          {x:gate.x+dx+(guardIndex?64:-64),y:gate.y+gate.side*200},{x:gate.x+dx,y:gate.y+gate.side*110}];
        guard.x=guard.path[0].x;guard.y=guard.path[0].y;guard.wi=1;guard.indoorEntrancePatrol=true;
      }
      humans.push(guard);guards.push(guard);
    }
    // 詰所兵は持ち場で静止。認識・追跡・射撃は潜入専用AIに統一。
    const postGuards=[];
    for(const h of raw.postGuards){
      const pos=to(h);
      const guard={...pos,path:h.waypoints.map(to),loop:false,wi:0,dir:1,stk:0,
        alive:true,elite:false,commander:null,st:0,sus:0,lost:0,cd:R()*1.2,
        burstLeft:0,face:h.face,target:null,patrolMode:'post',
        zoneHeavy:'indoor',indoorGuard:true,indoorPost:true,indoorFloor:n,
        indoorCommander:false,frontCommander:false};
      humans.push(guard);guards.push(guard);postGuards.push(guard);
    }
    // 合計3箇所を、1階1・2階2または1階2・2階1に分ける。
    const count=n===1?groundFiles:INDOOR_FILES_TOTAL-groundFiles;
    const intel=raw.intel.slice(0,count).map((q,i)=>({...to(q),id:q.id,name:'重要資料 '+n+'F-'+(i+1),roomId:q.roomId,fixtureArt:q.fixtureArt,done:false,floor:n,progress:0}));
    indoorWorld.intel.push(...intel);
    const entrances=raw.entrances.map(to);
    const entrance=raw.entrance?to(raw.entrance):null,
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
      corridors,lobbyArea,rooms,stair,stairObstacle,openings,
      entrance,entrances,exit:entrance,emergency,
      footprint:indoorRect(raw.footprint,off),
      doors,windows:raw.windows.map(openingPoint),guards,postGuards,
      guardPostId:raw.postRoomId,walls:wallRects,props,lightFixtures,navigation});
  }
  // Double the roster after layout generation so rooms, furniture and routes stay unchanged.
  for(const floor of indoorWorld.floors)indoorDoubleGuardRoster(floor);
  // Replace approximately one third of the existing building guards, including patrols.
  const commanderPool=indoorShuffle(humans.slice(),R);
  for(const h of commanderPool.slice(0,Math.round(commanderPool.length/3))){
    h.indoorCommander=true;h.frontCommander=true;
  }
  const entrance=indoorWorld.floors[0];
  p.x=entrance.entrance.x;p.y=entrance.entrance.y;p.hp=3;p.tank=null;p.body=-Math.PI/2;p.ang=-Math.PI/2;
  scoreStats.startY=p.y;scoreStats.debugUsed=true; // Sample run never unlocks stages or overwrites records.
  indoorWorld.exit={...entrance.entrance};
  indoorWorld.entrance={...entrance.entrance};
  indoorWorld.emergency=entrance.emergency?{...entrance.emergency}:null;
  indoorWorld.exits=[entrance.entrance,entrance.emergency].filter(Boolean);
  indoorWorld.currentFloor=0;
  indoorWorld.exterior=indoorGenerateExterior(entrance,indoorSeedRng(seeds[0]^0x7e31ac09));
  covers.push(...indoorWorld.exterior);
  patrolRoutesVisible=false;
  rebuildSpatialGrid();
  say('拠点潜入：廊下の物資に身を隠し、重要資料3箇所を回収せよ');
}
function indoorDoubleGuardRoster(floor){
 const originals=floor.guards.slice(),grid=floor.navigation.grid;
 for(const source of originals){
  const index=source.indoorPost||source.indoorEntrancePatrol?0:Math.floor(source.path.length/2);
  const anchor=source.path[index]||source,cell=indoorGuardCell(floor.navigation,anchor);
  const origin=indoorGridPoint(grid,anchor),ox=origin%grid.cols,oy=(origin/grid.cols)|0;
  let point=null;
  // Setup only: reuse the collision grid and keep each new soldier clear of the roster.
  for(let radius=0;radius<=10&&!point;radius++)for(let dy=-radius;dy<=radius&&!point;dy++)for(let dx=-radius;dx<=radius;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
   const col=ox+dx,row=oy+dy;
   if(col<0||col>=grid.cols||row<0||row>=grid.rows||grid.solid[row*grid.cols+col])continue;
   const q={x:grid.x+(col+.5)*grid.step,y:grid.y+(row+.5)*grid.step};
   if(indoorGuardCell(floor.navigation,q)!==cell)continue;
   if(floor.guards.some(h=>Math.hypot(h.x-q.x,h.y-q.y)<24))continue;
   point=q;break;
  }
  // A cramped route sector can use another safe point on the same patrol.
  if(!point){
   for(const q of source.path){
    const id=indoorGridPoint(grid,q);
    if(id>=0&&!grid.solid[id]&&!floor.guards.some(h=>Math.hypot(h.x-q.x,h.y-q.y)<24)){point={...q};break;}
   }
  }
  point=point||{x:source.x,y:source.y};
  const guard={...source,...point,indoorDoubled:true,
   wi:source.indoorPost?0:(index+1)%source.path.length};
  if(source.indoorPost)guard.path=[{...point}];
  floor.guards.push(guard);humans.push(guard);
  if(source.indoorPost)floor.postGuards.push(guard);
 }
}
// Keep the original roster slots: killed reinforcements are replaced too.
function indoorEntranceGuardPoint(floor,slot){
 const gate=floor.openings[slot.gate];if(!gate)return null;
 // Small, bounded exterior candidates; never materialize in the camera margin.
 for(let attempt=0;attempt<5;attempt++){
  const q={x:gate.x+(slot.seat%3-1)*96+(attempt===3?-32:attempt===4?32:0),
   y:gate.y+gate.side*(112+Math.floor(slot.seat/3)*80+attempt*40)};
  if(q.x<16||q.x>WW-16||q.y<16||q.y>WH-16)continue;
  if(q.x>=camX-100&&q.x<=camX+W+100&&q.y>=cam-100&&q.y<=cam+H+100)continue;
  if(D(q,p)<160||hitsM(q.x,q.y,10))continue;
  if(floor.guards.some(h=>h.alive&&D(h,q)<42)||bombs.some(b=>D(b,q)<120))continue;
  return q;
 }
 return null;
}
function indoorUpdateEntranceGuards(dt){
 if(stageMode!=='indoor'||state!=='play'||!indoorWorld?.alarm?.active)return;
 const floor=indoorWorld.floors[0],alarm=indoorWorld.alarm;
 if(!floor?.openings?.length)return;
 if(!alarm.entranceGuards){
  const total=(5+Math.floor(R()*2))*2,pending=[];
  for(let i=0;i<total;i++)pending.push({gate:i%floor.openings.length,seat:Math.floor(i/floor.openings.length)});
  alarm.entranceGuards={pending,checkT:0};
 }
 const wave=alarm.entranceGuards;if(!wave.pending.length)return;
 wave.checkT-=dt;if(wave.checkT>0)return;wave.checkT=.25;
 for(let i=wave.pending.length-1;i>=0;i--){
  const slot=wave.pending[i],point=indoorEntranceGuardPoint(floor,slot);if(!point)continue;
  const gate=floor.openings[slot.gate];
  const guard={...point,path:[{...point}],loop:false,wi:0,dir:1,stk:0,
   alive:true,elite:false,commander:null,st:0,sus:0,lost:0,cd:R()*1.2,burstLeft:0,
   face:gate.side>0?-Math.PI/2:Math.PI/2,target:null,patrolMode:'post',zoneHeavy:'indoor',
   indoorGuard:true,indoorFloor:1,indoorCommander:false,frontCommander:false,
   indoorEntranceGuard:true,indoorEntranceSlot:slot,indoorEntranceHome:{...point}};
  humans.push(guard);floor.guards.push(guard);indoorBeginAlarmSweep(guard);
  wave.pending.splice(i,1);
 }
}
function indoorReinforcementPoint(floor){
 const points=indoorAlarmSweepPoints(floor);if(!points?.length)return null;
 const start=(floor.reinforcementCursor||0)%points.length;
 for(let i=0;i<points.length;i++){
  const index=(start+i)%points.length,q=points[index];if(!q)continue;
  if(q.x>=camX-100&&q.x<=camX+W+100&&q.y>=cam-100&&q.y<=cam+H+100)continue;
  if(D(q,p)<160||hitsM(q.x,q.y,8))continue;
  if(floor.guards.some(h=>h.alive&&D(h,q)<36)||bombs.some(b=>D(b,q)<120))continue;
  floor.reinforcementCursor=index+1;return q;
 }
 return null;
}
function indoorReplenishGuards(dt){
 if(stageMode!=='indoor'||state!=='play'||!indoorWorld)return;
 indoorWorld.reinforcementCheckT=(indoorWorld.reinforcementCheckT||0)-dt;
 if(indoorWorld.reinforcementCheckT>0)return;indoorWorld.reinforcementCheckT=.25;
 for(const floor of indoorWorld.floors)for(let i=0;i<floor.guards.length;i++){
  const dead=floor.guards[i];
  if(dead.alive||dead.sniperFallT>0)continue;
  const point=dead.indoorEntranceGuard?indoorEntranceGuardPoint(floor,dead.indoorEntranceSlot):indoorReinforcementPoint(floor);if(!point)continue;
  // Existing patrol routes have real door crossings; rejoin one without cutting walls.
  const patrolGuard=floor.guards.find(h=>h.path?.length>1);
  const path=patrolGuard?.path||[{x:point.x,y:point.y}];
  const guard={x:point.x,y:point.y,path,loop:!!patrolGuard?.loop,wi:0,dir:1,stk:0,
   alive:true,elite:true,commander:null,st:0,sus:0,lost:0,cd:R()*1.2,burstLeft:0,
   face:dead.face||0,target:null,patrolMode:'axis',zoneHeavy:'indoor',
   indoorGuard:true,indoorFloor:floor.number,indoorWhite:true,
   indoorCommander:false,frontCommander:false};
  if(dead.indoorEntranceGuard){
   guard.indoorEntranceGuard=true;guard.indoorEntranceSlot=dead.indoorEntranceSlot;
   guard.indoorEntranceHome={...point};guard.path=[{...point}];guard.patrolMode='post';
  }
  floor.guards[i]=guard;
  const slot=humans.indexOf(dead);if(slot>=0)humans[slot]=guard;else humans.push(guard);
  const post=floor.postGuards?.indexOf(dead)??-1;if(post>=0)floor.postGuards.splice(post,1);
  if(dead.indoorChatMate)indoorCancelAlarmChat(dead);
  // Rejoin an established, door-aware patrol rather than walking straight to it.
  guard.indoorReturn=indoorPatrolReturnPlan(guard);
  if(indoorWorld.alarm?.active)indoorBeginAlarmSweep(guard);
 }
}
function setupInfiltrationMission(){
  mission={index:0,progress:0,points:indoorWorld.intel,exit:indoorWorld.exit,detected:false,
    current:null,alarm:0,escapeProgress:0,escapeExit:null,escapeComplete:false};
}


const INDOOR_STAIR_WIDTH=60;
function indoorStairBounds(stair,number){
  const h=INDOOR_STAIR_WIDTH*(number===1?320/100:320/162);
  return{x:stair.x-INDOOR_STAIR_WIDTH/2,y:stair.y-h/2,w:INDOOR_STAIR_WIDTH,h};
}
function indoorStairWalls(stair,number){
  const b=indoorStairBounds(stair,number),t=8;
  return [{x:b.x-t,y:b.y-t,w:t,h:b.h+t},
    {x:b.x+b.w,y:b.y-t,w:t,h:b.h+t},
    {x:b.x,y:b.y-t,w:b.w,h:t}];
}
function indoorStairObstacleBounds(stair,number){
  const b=indoorStairBounds(stair,number);
  return{x:b.x-8,y:b.y-8,w:b.w+16,h:b.h+8};
}
function indoorStairLanding(floor){
  const b=indoorStairBounds(floor.stair,floor.number);
  return{x:floor.stair.x,y:b.y+22};
}
function indoorStairTravelReady(floor){
  const b=indoorStairBounds(floor.stair,floor.number),w=indoorWorld;
  const inside=p.x>=b.x+8&&p.x<=b.x+b.w-8&&p.y>=b.y+8&&p.y<=b.y+b.h+12;
  if(!inside||p.tank){w.stairEntryFloor=null;return false;}
  // 開口部を通った後だけ奥の踊り場を有効にする。
  if(p.y>=b.y+b.h-28)w.stairEntryFloor=w.currentFloor;
  return w.stairEntryFloor===w.currentFloor&&p.y<=b.y+28;
}
function indoorGuardStairBlocked(h,x,y,r=8){
  if(!h.indoorGuard)return false;
  const floor=indoorWorld?.floors[h.indoorFloor-1];if(!floor)return false;
  const b=floor.stairObstacle||indoorStairObstacleBounds(floor.stair,floor.number);
  return x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h;
}
function indoorPatrolAroundStairs(h,dt){
  const floor=indoorWorld?.floors[h.indoorFloor-1],goal=h.path?.[h.wi||0];
  if(!floor||!goal||h.path.length<2||h.turnPause>0)return null;
  const b=floor.stairObstacle;
  const crosses=b&&Math.max(h.x,goal.x)>b.x-12&&Math.min(h.x,goal.x)<b.x+b.w+12&&
    Math.max(h.y,goal.y)>b.y-12&&Math.min(h.y,goal.y)<b.y+b.h+12;
  if(!crosses&&!h.indoorStairRoute)return null;
  const a=h.indoorStairRoute||(h.indoorStairRoute={});
  if(D(h,goal)<14){h.indoorStairRoute=null;h.turnPause=2;h.pauseFace=h.face;return null;}
  indoorMoveGuardTo(h,goal,dt,30,a);return h.face;
}
function indoorMakeGuardGrid(raw,off){
 // Immutable room/wall/prop occupancy, built once per floor. Dynamic doors are open
 // to planning because a nearby guard opens them; collision still handles actual doors.
 const step=16,origin=indoorAt(70,80,off),cols=Math.ceil(900/step),rows=Math.ceil(1260*INDOOR_SCALE_Y/step);
 const solid=new Uint8Array(cols*rows),rects=[...raw.walls,...raw.furniture,...raw.explosiveObjects]
   .map(o=>indoorRect(o,off));
 rects.push(indoorStairObstacleBounds(indoorAt(raw.stair.x,raw.stair.y,off),raw.number));
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
// 破壊があった階だけ更新。毎フレームのレイアウト再生成は行わない。
function indoorRefreshDamagedNavigation(x,y,r){
 if(!indoorWorld)return;
 for(const floor of indoorWorld.floors){
  const f=floor.footprint;if(x+r<f.x||x-r>f.x+f.w||y+r<f.y||y-r>f.y+f.h)continue;
  const grid=floor.navigation.grid;grid.solid.fill(0);grid.seen.fill(0);grid.epoch=0;
  const rects=[];floor.walls=[];
  for(const c of covers){
   if(c.indoorDoor||c.noHit||c.x+c.w<f.x||c.x>f.x+f.w||c.y+c.h<f.y||c.y>f.y+f.h)continue;
   const rect=coverHitRect(c);if(rect)rects.push(rect);
   if(c.indoorWall)floor.walls.push(c);
  }
  for(const o of objects)if(o.x+o.w>=f.x&&o.x<=f.x+f.w&&o.y+o.h>=f.y&&o.y<=f.y+f.h)rects.push(objectHitRect(o));
  rects.push(floor.stairObstacle);
  for(const rect of rects){if(!rect)continue;
   const x0=Math.max(0,Math.ceil((rect.x-10-grid.x)/grid.step-.5)),x1=Math.min(grid.cols-1,Math.floor((rect.x+rect.w+10-grid.x)/grid.step-.5));
   const y0=Math.max(0,Math.ceil((rect.y-10-grid.y)/grid.step-.5)),y1=Math.min(grid.rows-1,Math.floor((rect.y+rect.h+10-grid.y)/grid.step-.5));
   for(let row=y0;row<=y1;row++)for(let col=x0;col<=x1;col++)grid.solid[row*grid.cols+col]=1;
  }
  for(const h of floor.guards){
   for(const a of [h.indoorAlert,h.indoorReturn,h.indoorAllyCombat,h.indoorStairRoute])if(a){a.detour=null;a.replanT=0;a.rescueCooldown=0;}
   h._nextVisAt=0;h._detectCache=null;
  }
 }
}
function indoorGridPoint(grid,p){
 const x=Math.floor((p.x-grid.x)/grid.step),y=Math.floor((p.y-grid.y)/grid.step);
 return x>=0&&x<grid.cols&&y>=0&&y<grid.rows?y*grid.cols+x:-1;
}
function indoorGridFreeNearest(grid,id){
 if(id<0)return-1;
 if(!grid.solid[id])return id;
 const x=id%grid.cols,y=(id/grid.cols)|0;
 for(let r=1;r<=8;r++){
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
function indoorGridSafePoint(grid,point){
 const cell=indoorGridPoint(grid,point);if(cell<0||!grid.solid[cell])return point;
 const id=indoorGridFreeNearest(grid,cell);
 return id<0?point:{x:grid.x+(id%grid.cols+.5)*grid.step,y:grid.y+(((id/grid.cols)|0)+.5)*grid.step};
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
 if(found&&dest===indoorGridPoint(g,goal)&&!g.solid[dest])points.push({x:goal.x,y:goal.y});
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
function indoorPostChatEligible(h){
 return !!(h?.indoorPost&&h.alive&&!h.st&&!(h.sus>0)&&!h.indoorAlert&&!h.indoorReturn&&
  !h.indoorAllyCombat&&!(h.stun>0)&&!(h.stunRecover>0)&&!h.houndPinned&&!(h.blastAirT>0));
}
function indoorUpdatePostChats(dt){
 if(!indoorWorld)return;
 for(const floor of indoorWorld.floors){
  const chat=floor.postChat;
  if(chat){
   chat.remaining-=dt;
   if(chat.remaining<=0||indoorWorld.alarm?.active||!indoorPostChatEligible(chat.a)||!indoorPostChatEligible(chat.b))floor.postChat=null;
   continue;
  }
  if(floor.number!==indoorWorld.currentFloor+1||indoorWorld.alarm?.active)continue;
  if(floor.postChatWait===undefined)floor.postChatWait=3+R()*5;
  floor.postChatWait-=dt;if(floor.postChatWait>0)continue;
  floor.postChatWait=8+R()*8;
  const guards=floor.postGuards||[],start=floor.postChatCursor||0;
  for(let k=0;k<guards.length;k++){
   const index=(start+k)%guards.length,a=guards[index];if(!indoorPostChatEligible(a))continue;
   let b=null,best=140;
   for(const other of guards){
    if(other===a||!indoorPostChatEligible(other))continue;
    const d=D(a,other);if(d<best&&los(a,other)){b=other;best=d;}
   }
   if(b){floor.postChat={a,b,remaining:4};floor.postChatCursor=index+1;break;}
  }
 }
}
function drawInfiltrationPostChats(){
 const floor=indoorWorld?.floors[indoorWorld.currentFloor],chat=floor?.postChat;
 if(!chat||!indoorPostChatEligible(chat.a)||!indoorPostChatEligible(chat.b))return;
 const x=(chat.a.x+chat.b.x)*.5-camX,y=Math.min(chat.a.y,chat.b.y)-cam-25;
 if(x<-50||x>W+50||y<-50||y>H+50)return;
 drawPatrolChatBubbleAt(x,y,.88,Math.sin(performance.now()*.005+chat.a.x*.03)*.8);
}
// Alarm conversations use dedicated fields: the outdoor chat loop intentionally
// cancels chats for suspicious soldiers, so it must remain untouched.
function indoorAlarmChatEligible(h){
 if(h?.indoorEntranceGuard)return false;
 return !!(h?.indoorGuard&&h.alive&&!h.st&&!(h.chatT>0)&&h.sus>0&&
  ['sweep','search'].includes(h.indoorAlert?.phase)&&!(h.stun>0)&&
  !(h.stunRecover>0)&&!h.houndPinned&&!(h.blastAirT>0));
}
function indoorCancelAlarmChat(h,finished=false){
 const mate=h.indoorChatMate;
 for(const q of [h,mate]){
  if(!q)continue;
  q.indoorChatT=0;q.indoorChatMate=null;q.indoorChatLead=false;
  q.indoorChatCooldown=Math.max(q.indoorChatCooldown||0,finished?10:3);
  if(finished){q.sharePause=Math.max(q.sharePause||0,.5);}
 }
}
function indoorUpdateAlarmChats(dt){
 const world=indoorWorld;if(!world?.alarm?.active)return;
 for(const floor of world.floors)for(const h of floor.guards){
  h.indoorChatCooldown=Math.max(0,(h.indoorChatCooldown||0)-dt);
  if(!(h.indoorChatT>0))continue;
  const mate=h.indoorChatMate;
  if(!indoorAlarmChatEligible(h)||!indoorAlarmChatEligible(mate)){
   indoorCancelAlarmChat(h);continue;
  }
  h.indoorChatT=Math.max(0,h.indoorChatT-dt);
  if(h.indoorChatT<=0)indoorCancelAlarmChat(h,true);
 }
 world.alarm.chatScanT=(world.alarm.chatScanT||0)-dt;
 if(world.alarm.chatScanT>0)return;world.alarm.chatScanT=.1;
 for(const floor of world.floors){
  const guards=floor.guards.filter(h=>indoorAlarmChatEligible(h)&&!(h.indoorChatT>0)&&!(h.indoorChatCooldown>0));
  for(let i=0;i<guards.length;i++)for(let j=i+1;j<guards.length;j++){
   const a=guards[i],b=guards[j];
   if(a.indoorChatT>0||b.indoorChatT>0||D(a,b)>31||
      indoorAlarmCrowded(a,floor)||indoorAlarmCrowded(b,floor)||!los(a,b))continue;
   a.indoorChatT=b.indoorChatT=5;a.indoorChatMate=b;b.indoorChatMate=a;
   a.indoorChatLead=true;b.indoorChatLead=false;
   a.face=Math.atan2(b.y-a.y,b.x-a.x);b.face=Math.atan2(a.y-b.y,a.x-b.x);
  }
 }
}
function drawInfiltrationAlarmChats(){
 if(!indoorWorld?.alarm?.active)return;
 const floor=indoorWorld.floors[indoorWorld.currentFloor];
 for(const h of floor.guards){
  if(!(h.indoorChatT>0)||!h.indoorChatLead||!h.indoorChatMate)continue;
  const mate=h.indoorChatMate,x=(h.x+mate.x)*.5-camX,y=Math.min(h.y,mate.y)-cam-25;
  if(x<-50||x>W+50||y<-50||y>H+50)continue;
  drawPatrolChatBubbleAt(x,y,.88,Math.sin(performance.now()*.005+h.x*.03)*.8);
 }
}
function indoorAlarmSweepPoints(floor){
 if(floor.alarmSweepPoints)return floor.alarmSweepPoints;
 const nav=floor.navigation,g=nav?.grid;
 if(!nav||!g)return null;
 floor.alarmSweepPoints=nav.centers.map((point,cell)=>{
  if(!nav.neighbors[cell]?.length)return null;
  const id=indoorGridFreeNearest(g,indoorGridPoint(g,point));
  if(id<0)return null;
  const q={x:g.x+((id%g.cols)+.5)*g.step,y:g.y+(((id/g.cols)|0)+.5)*g.step};
  return indoorGuardCell(nav,q)===cell?q:null;
 });
 return floor.alarmSweepPoints;
}
// Select a reachable search sector using reservations and actual guard positions.
// The small 35-cell buffers are reused, and planning runs only at goal changes.
function indoorSelectSweepGoal(h,a,floor,points){
 const nav=floor.navigation,here=indoorGuardCell(nav,h);if(here<0)return false;
 const work=floor.sweepWork||(floor.sweepWork={pressure:new Uint8Array(35),distance:new Int8Array(35),queue:new Int16Array(35)});
 const {pressure,distance,queue}=work;pressure.fill(0);distance.fill(-1);
 for(const other of floor.guards){
  if(other===h||!other.alive||other.stun>0||other.stunRecover>0||other.houndPinned||other.blastAirT>0)continue;
  const cell=indoorGuardCell(nav,other);if(cell>=0)pressure[cell]+=2;
  const state=other.indoorAlert;
  if(state?.phase==='sweep'&&state.sweepCell>=0)pressure[state.sweepCell]+=3;
 }
 let tail=1,best=-1,bestScore=Infinity;queue[0]=here;distance[here]=0;
 for(let head=0;head<tail;head++){
  const cell=queue[head];
  if(cell!==here&&cell!==a.sweepAvoidCell&&points[cell]){
   const score=pressure[cell]*8+Math.min(20,a.sweepVisits[cell])*2+distance[cell]*.65+
    (cell===a.sweepPrevious?1:0)+((cell+a.sweepOrder)%35)*.001;
   if(score<bestScore){bestScore=score;best=cell;}
  }
  for(const next of nav.neighbors[cell]||[])if(distance[next]<0){
   distance[next]=distance[cell]+1;queue[tail++]=next;
  }
 }
 if(best<0){
  a.sweepWait=0;a.sweepTravel=1;a.sweepStall=0;a.sweepAvoidCell=-1;
  a.sweepGoal={x:h.x,y:h.y};return false;
 }
 a.sweepPrevious=here;a.sweepCell=best;a.sweepAvoidCell=-1;
 a.sweepVisits[best]=Math.min(65535,a.sweepVisits[best]+1);
 a.sweepGoal=points[best];a.sweepWait=0;a.sweepTravel=Math.min(24,4+distance[best]*6);
 a.sweepStall=0;a.detour=null;a.route=null;
 return true;
}
function indoorAlarmCrowded(h,floor){
 let nearby=0;
 for(const other of floor.guards)if(other!==h&&other.alive&&!(other.stun>0)&&
  !(other.stunRecover>0)&&!other.houndPinned&&!(other.blastAirT>0)&&D(h,other)<70){
  if(++nearby>=2)return true;
 }
 return false;
}
function indoorBeginAlarmSweep(h){
 const floor=indoorWorld?.floors[h.indoorFloor-1],points=floor&&indoorAlarmSweepPoints(floor);
 if(!h.indoorGuard||!h.alive||h.stun>0||h.stunRecover>0||h.houndPinned||h.blastAirT>0||!points)return false;
 const nav=floor.navigation,cell=indoorGuardCell(nav,h);
 if(cell<0&&!h.indoorEntranceGuard)return false;
 const visited=new Uint16Array(35);if(cell>=0)visited[cell]=1;
 h.indoorAlert={phase:'sweep',lastSeen:{x:h.x,y:h.y},trail:[],lastDir:null,
  sightCheckT:0,visible:false,remaining:0,sweepCell:cell,sweepPrevious:-1,
  sweepVisits:visited,sweepGoal:{x:h.x,y:h.y},sweepWait:0,sweepTravel:9,
  sweepOrder:(floor.guards||[]).indexOf(h)};
 h.indoorReturn=null;h.indoorNotice=null;h.st=0;h.target=null;
 h.sus=1;h.susMax=1;h.lost=0;h.burstLeft=0;h.plantT=0;
 if(h.indoorEntranceGuard)h.indoorAlert.sweepGoal=h.indoorEntranceHome;
 else indoorSelectSweepGoal(h,h.indoorAlert,floor,points);
 return true;
}
function indoorAlarmLevel(alarm=indoorWorld?.alarm){
 return Math.min(3,(alarm?.witnesses?.size||0)+(alarm?.bodyCount||0)+(alarm?.noiseCount||0));
}
function indoorRefreshAlarm(){
 const alarm=indoorWorld?.alarm;
 if(!alarm||alarm.active||indoorAlarmLevel(alarm)<3)return;
 alarm.active=true;alarm.elapsed=0;
 for(const floor of indoorWorld.floors)for(const other of floor.guards||[]){
  if(other.st&&other.target==='p')continue;
  indoorBeginAlarmSweep(other);
 }
}
function indoorRecordGuardDiscovery(h){
 if(indoorStairProtected()||indoorWorld?.alarm?.active)return; // Reinforcement waves must not grow the completed warning set.
 if(!h?.indoorGuard||!h.alive||!h.st||h.target!=='p'||h.stun>0||h.stunRecover>0||h.houndPinned||h.blastAirT>0||
    !indoorWorld||h.indoorFloor!==indoorWorld.currentFloor+1)return;
 const alarm=indoorWorld.alarm||(indoorWorld.alarm={active:false,witnesses:new Set(),elapsed:0});
 alarm.witnesses.add(h);indoorRefreshAlarm();
}
// One warning per audible explosion, regardless of how many guards investigate it.
// Only the current floor hears it; snapshots never reveal the hidden player.
function indoorHearExplosion(x,y,r){
 if(!indoorWorld||debugMode>=2)return;
 let heard=false;
 for(const h of indoorWorld.floors[indoorWorld.currentFloor].guards||[]){
  if(!h.alive||h.st||h.stun>0||h.stunRecover>0||h.houndPinned||h.blastAirT>0||
     Math.hypot(h.x-x,h.y-y)>r)continue;
  if(!(h.sus>0)&&scoreStats&&!scoreStats.finalized)scoreStats.suspicionEntries=(scoreStats.suspicionEntries||0)+1;
  indoorGuardAlertAt(h,{x,y});
  const a=h.indoorAlert;a.phase='lastSeen';a.remaining=0;a.travelLeft=6;
  h.sus=6;h.susMax=6;h.target=null;h.burstLeft=0;
  h.indoorNotice=null;heard=true;
 }
 const alarm=indoorWorld.alarm;
 if(heard&&alarm&&!alarm.active){
  alarm.noiseCount=Math.min(3,(alarm.noiseCount||0)+1);indoorRefreshAlarm();
 }
}
function indoorScanStunnedGuards(dt){
 const world=indoorWorld,alarm=world?.alarm;if(!alarm||alarm.active)return;
 alarm.bodyScanT=(alarm.bodyScanT||0)-dt;if(alarm.bodyScanT>0)return;alarm.bodyScanT=.2;
 for(const floor of world.floors){
  for(const h of floor.guards)if(!(h.stun>0))h.indoorBodyReported=false;
  const bodies=floor.guards.filter(h=>h.alive&&h.stun>0&&!h.indoorBodyReported);
  for(const body of bodies){
   for(const observer of floor.guards){
    if(observer===body||!observer.alive||observer.stun>0||observer.stunRecover>0||observer.houndPinned||observer.blastAirT>0)continue;
    const d=D(observer,body),angle=Math.abs(angD(Math.atan2(body.y-observer.y,body.x-observer.x),observer.face));
    const range=315*1.2*(.36+.64*indoorLightLevel(body.x,body.y))*(observer.indoorChatT>0?.5:1);
    if(!((angle<=DETECT_CENTER_HALF*1.2&&d<range)||
       (angle<=DETECT_OUTER_HALF*1.2&&d<range*DETECT_OUTER_SCALE))||!los(observer,body))continue;
    body.indoorBodyReported=true;alarm.bodyCount=(alarm.bodyCount||0)+1;
    // Finding a body reveals that position, never the hidden player's position.
    if(!(observer.st&&observer.target==='p')){
     indoorGuardAlertAt(observer,body);observer.indoorAlert.phase='lastSeen';
     observer.indoorAlert.travelLeft=4;observer.indoorAlert.remaining=0;
     observer.st=0;observer.target=null;observer.sus=4;observer.susMax=4;
    }
    indoorRefreshAlarm();break;
   }
   if(alarm.active)return;
  }
 }
}
function indoorUpdateCommanderWeapon(h,point,visible,paused,dt,target=p){
 if(!h.indoorCommander)return false;
 if((h.cd||0)>0&&!(h.indoorRocketCharge>0))return false;
 if(!visible||paused||D(h,point)>480||!los(h,target)){h.indoorRocketCharge=0;return false;}
 if(!(h.indoorRocketCharge>0)){
  h.indoorRocketCharge=.5;h.indoorRocketAim=Math.atan2(point.y-h.y,point.x-h.x);return true;
 }
 h.face=h.indoorRocketAim;h.indoorRocketCharge=Math.max(0,h.indoorRocketCharge-dt);
 if(h.indoorRocketCharge<=0){
  const angle=h.indoorRocketAim;h.characterShotAt=performance.now();
  fire(h.x+Math.cos(angle)*22,h.y+Math.sin(angle)*22,angle,'e','c',enemyCannonSpeed(),480);
  const bullet=bullets[bullets.length-1];
  bullet.commanderRocket=true;bullet.commanderShooter=h;h.cd=4;h.burstLeft=0;
 }
 return true;
}
function indoorUpdateAlarmSweep(h,a,dt){
 if(h.indoorEntranceGuard){
  const home=h.indoorEntranceHome;
  if(D(h,home)>14)indoorMoveGuardTo(h,home,dt,62);
  else h.face+=dt*.45;
  return;
 }
 const floor=indoorWorld.floors[h.indoorFloor-1],points=indoorAlarmSweepPoints(floor);
 h.sus=1;h.susMax=1;a.sweepTravel-=dt;
 const distance=D(h,a.sweepGoal);
 if(distance>20&&a.sweepTravel>0){
  const oldX=h.x,oldY=h.y;
  indoorMoveGuardTo(h,a.sweepGoal,dt,62);
  // A legitimate wall detour can temporarily lead away from the destination.
  const moved=Math.hypot(h.x-oldX,h.y-oldY);
  a.sweepStall=moved<62*dt*.2?(a.sweepStall||0)+dt:0;
  if(a.sweepStall<2)return;
  // Try the existing bounded recovery before abandoning a door approach.
  if(!(a.rescueCooldown>0)){
   a.rescueCooldown=7;
   const path=indoorGridDetour(floor.navigation,h,a.sweepGoal,5200);
   if(path?.length){
    a.detour=path;a.detourGoalCell=indoorGuardCell(floor.navigation,a.sweepGoal);
    a.detourGoal={...a.sweepGoal};a.replanT=1.7;a.sweepStall=0;return;
   }
  }
  // A blocked doorway or crowd cannot hold the whole patrol at one goal.
  a.sweepAvoidCell=a.sweepCell;
  indoorSelectSweepGoal(h,a,floor,points);return;
 }
 if(distance>20)a.sweepAvoidCell=a.sweepCell;
 a.sweepWait+=dt;
 if(a.sweepWait<.7){h.face+=dt*.65;return;}
 indoorSelectSweepGoal(h,a,floor,points);
}

function indoorStairSafeArea(floor){
  const b=indoorStairBounds(floor.stair,floor.number);
  return{x:b.x+8,y:b.y+8,w:b.w-16,h:44};
}
function indoorStairProtected(){
  const area=indoorWorld?.stairSanctuary;
  return !!(area&&area.floor===indoorWorld.currentFloor&&
    p.x>=area.x&&p.x<=area.x+area.w&&p.y>=area.y&&p.y<=area.y+area.h);
}
function indoorBeginStairSanctuary(floor){
  indoorWorld.stairSanctuary={...indoorStairSafeArea(floor),
    floor:indoorWorld.currentFloor};
  for(const h of floor.guards){
    h.indoorNotice=null;h._detectCache=null;h._nextDetectAt=0;h._nextVisAt=0;
    if(h.target==='p'||(h.indoorAlert&&h.indoorAlert.phase!=='sweep')){
      h.st=0;h.target=null;h.sus=0;h.susMax=0;h.lost=0;h.burstLeft=0;
      h.indoorAlert=null;h.indoorRocketCharge=0;h.indoorRocketAim=null;
      if(indoorWorld.alarm?.active)indoorBeginAlarmSweep(h);
    }
  }
}
function indoorTickStairSanctuary(dt){
  const area=indoorWorld?.stairSanctuary;if(!area)return;
  if(!indoorStairProtected())indoorWorld.stairSanctuary=null;
}
function indoorStartGuardPursuit(h){
 if(!h||!h.indoorGuard||!p)return;
 indoorGuardAlertAt(h,p);
}
function indoorGuardAlertAt(h,observed){
 if(h.indoorChatT>0)indoorCancelAlarmChat(h);
 h.indoorReturn=null;h.indoorRocketCharge=0;h.indoorRocketAim=null;
 const spot={x:observed.x,y:observed.y},duration=2.7;
 h.indoorAlert={phase:'found',duration,remaining:duration,trail:[spot],lastSeen:spot,
  searchLeft:0,scanT:0,route:null,routeKey:'',waypoint:null,stuck:0,blockedT:0,
  replanT:0,detour:null,detourKey:'',lastDir:null,estimate:null,searchTravelLeft:0,
  progressGoalCell:-1,bestGoalDistance:Infinity,noGoalProgressT:0,rescueCooldown:0,
  sightGrace:0,sightCheckT:0,visible:false,travelLeft:10,searchPoints:null,searchIndex:0,scanFace:h.face};
 h.lost=duration;h._detectCache=null;h._nextDetectAt=0;
}
function indoorGuardSeesPlayer(h,sample=null){
 if(!p||indoorStairProtected()||debugMode>=2||p.dig>0||inTumbleweed(p)||(!p.tank&&inBush(p))||
   (weather==='rain'&&inWaterAt(p.x,p.y,0))||
   h.indoorFloor!==indoorWorld?.currentFloor+1)return false;
 const d=D(h,p),a=Math.abs(angD(Math.atan2(p.y-h.y,p.x-h.x),h.face));
 const illumination=indoorLightLevel(p.x,p.y);
 if(sample){sample.light=illumination;sample.distance=d;sample.angle=a;}
 const tracking=h.indoorAlert?.phase==='found';
 const visibilityFactor=tracking?Math.max(.78,.5+.5*illumination):(.36+.64*illumination);
 // Patrol range grows modestly; pursuit release distance is exactly twice its previous value.
 const range=detectRange('p')*(tracking?2.4:1.4)*visibilityFactor*(h.indoorChatT>0?.5:1);
 if(!((a<=DETECT_CENTER_HALF*1.4&&d<range)||
       (a<=DETECT_OUTER_HALF*1.4&&d<range*DETECT_OUTER_SCALE)))return false;
 return cachedLos(h,p);
}

function indoorMoveGuardTo(h,goal,dt,sp,moveState=null){
 const nav=indoorWorld?.floors[h.indoorFloor-1]?.navigation,a=moveState||h.indoorAlert;
 if(!nav||!goal||!a)return false;
 const from=indoorGuardCell(nav,h),to=indoorGuardCell(nav,goal);
 if(from<0||to<0){
   const floor=indoorWorld.floors[h.indoorFloor-1];if(floor.number!==1)return false;
   const gate=floor.openings?.find(q=>q.side===(h.y<floor.footprint.y||goal.y<floor.footprint.y?-1:1));
   if(!gate)return false;
   const inner={x:gate.x,y:gate.y-gate.side*64},outer={x:gate.x,y:gate.y+gate.side*64};
   const aligned=Math.abs(h.x-gate.x)<50;
   if(from>=0&&!(aligned&&gate.side*(h.y-gate.y)>-92))return indoorMoveGuardTo(h,inner,dt,sp,a);
   let dest=goal;
   if(from>=0)dest=outer;
   else if(to>=0)dest=aligned&&gate.side*(h.y-gate.y)<92?inner:outer;
   const angle=Math.atan2(dest.y-h.y,dest.x-h.x),step=Math.min(sp*(h.indoorWhite?1.2:1)*dt,D(h,dest));
   mv(h,Math.cos(angle)*step,Math.sin(angle)*step,8);h.face=angle;return true;
 }
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
 const step=Math.min(sp*(h.indoorWhite?1.2:1)*dt,D(h,dest));
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
 if(h.indoorChatT>0)indoorCancelAlarmChat(h);
 h.indoorAlert=null;h.indoorNotice=null;
 h.st=0;h.target=null;h.sus=0;h.susMax=0;h.lost=0;
 h.susPause=0;h.burstLeft=0;h.foundPause=0;h.sharePause=0;
 h._detectCache=null;h._nextDetectAt=0;pauseAfterEnemyDetection(h);
 if(indoorWorld?.alarm?.active&&indoorBeginAlarmSweep(h))return;
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
// Four visible cues combine nonlinearly; reuse sampled geometry instead of adding rays.
function indoorVisualSuspicionRate(illumination,speed,distance,angle){
 const light=clamp((illumination-.24)/.72,0,1),motion=clamp(speed/120,0,1);
 const close=clamp((260-distance)/225,0,1),front=clamp(1-Math.abs(angle)/(DETECT_OUTER_HALF*1.4),0,1);
 const risk=.30*light+.25*motion+.25*close+.20*front;
 return .08+2.72*risk*risk;
}
function indoorAdvanceVisualNotice(h,dt,interval=.12,hearSteps=false){
 const n=h.indoorNotice||(h.indoorNotice={checkT:0,exposure:0,visible:false,sampleX:null,sampleY:null,sampleAge:0});
 n.checkT-=dt;n.sampleAge+=dt;n.sampled=false;
 if(n.checkT<=0){
  const elapsed=Math.max(.001,n.sampleAge),previouslyVisible=n.visible;
  n.visible=indoorGuardSeesPlayer(h,n);n.checkT=interval;n.sampleAge=0;n.sampled=true;
  // Searchers cannot sample hidden coordinates, including guards on another floor.
  const hear=hearSteps&&h.indoorFloor===indoorWorld?.currentFloor+1;
  if(n.visible||hear){
   const moved=n.sampleX===null?0:Math.hypot(p.x-n.sampleX,p.y-n.sampleY);
   n.sampleX=p.x;n.sampleY=p.y;n.stepDistance=moved;n.speed=moved<50?moved/elapsed:0;
  }else{n.sampleX=null;n.sampleY=null;n.stepDistance=0;n.speed=0;}
  if(n.visible){
   const light=Number.isFinite(n.light)?n.light:indoorLightLevel(p.x,p.y),d=Number.isFinite(n.distance)?n.distance:D(h,p);
   const angle=Number.isFinite(n.angle)?n.angle:Math.abs(angD(Math.atan2(p.y-h.y,p.x-h.x),h.face));
   n.rate=indoorVisualSuspicionRate(light,n.speed,d,angle);
   if(previouslyVisible&&n.spot){
    const step=D(n.spot,p);
    if(step>=6)n.lastDir={x:(p.x-n.spot.x)/step,y:(p.y-n.spot.y)/step};
   }else n.lastDir=null;
   n.spot={x:p.x,y:p.y};
  }else n.rate=0;
 }
 n.exposure=n.visible?Math.min(1,n.exposure+dt*n.rate):Math.max(0,n.exposure-dt*1.6);
 return n;
}
function indoorUpdateGuardNotice(h,dt){
 const n=indoorAdvanceVisualNotice(h,dt,.12,true),sameFloor=h.indoorFloor===indoorWorld?.currentFloor+1;
 if(n.sampled&&!n.visible&&sameFloor&&!indoorStairProtected()&&debugMode<2&&!(p.dig>0)&&n.speed>80&&n.stepDistance<50&&D(h,p)<72&&
   Math.abs(angD(Math.atan2(p.y-h.y,p.x-h.x),h.face))<Math.PI*7/8&&cachedLos(h,p)){
  // Footsteps keep the rear 45-degree silent sector and investigate a snapshot only.
  indoorStartGuardPursuit(h);
  const a=h.indoorAlert;a.phase='lastSeen';a.lastSeen={x:p.x,y:p.y};
  a.travelLeft=3;a.visible=false;a.sightCheckT=.12;
  h.st=0;h.target=null;h.sus=3;h.susMax=3;return true;
 }
 if(n.visible&&n.exposure>=.9){
  if(!indoorGuardSeesPlayer(h)||!los(h,p)){n.visible=false;n.checkT=0;return true;}
  enterHumanFound(h,'p');
  if(h.indoorAlert&&n.lastDir)h.indoorAlert.lastDir={...n.lastDir};
  h.indoorNotice=null;indoorRecordGuardDiscovery(h);return true;
 }
 // A weak glimpse can pass unnoticed. React only after enough evidence builds.
 if(n.exposure>.14){
  h.sus=n.exposure-.14;h.susMax=.86;
  if(n.spot){const angle=Math.atan2(n.spot.y-h.y,n.spot.x-h.x);h.face+=Math.max(-dt*2,Math.min(dt*2,angD(angle,h.face)));}
  return true;
 }
 h.sus=0;h.susMax=0;
 // Other skill targets retain their existing combat handling.
 const other=findDetectedTarget(h,h.face);
 if(other&&other.key!=='p'&&!other.key.startsWith('ally:')){enterHumanFound(h,other.key);return false;}
 if(h.chatResumeT>0)return true;
 if(h.indoorReturn){
  const back=h.indoorReturn;
  if(D(h,back.goal)<=12){h.indoorReturn=null;h.wi=back.index;h.turnPause=0;}
  else indoorMoveGuardTo(h,back.goal,dt,30,back.nav);
  return true;
 }
 if(h.indoorPost)return true;
 const stairFace=indoorPatrolAroundStairs(h,dt);
 h.face=stairFace===null?patrol(h,dt,30*(h.indoorWhite?1.2:1),8):stairFace;return true;
}
// Visual alert relay is separate from the limited nearby voice report.
function indoorObserveFoundGuard(h,dt){
 if(!h.indoorGuard||!h.alive||h.stun>0||h.stunRecover>0||h.houndPinned||h.blastAirT>0||
    h.indoorFloor!==indoorWorld?.currentFloor+1||debugMode>=2||
    h.indoorAlert?.phase==='found'||(h.st&&h.target!=='p'))return false;
 h.indoorRelayCheckT=(h.indoorRelayCheckT||0)-dt;
 if(h.indoorRelayCheckT>0)return false;h.indoorRelayCheckT=.2;
 const guards=indoorWorld?.floors[h.indoorFloor-1]?.guards||[];
 for(const other of guards){
  const alert=other.indoorAlert;
  if(other===h||!other.indoorGuard||!other.alive||other.indoorFloor!==h.indoorFloor||
     !other.st||other.target!=='p'||alert?.phase!=='found'||!(alert.remaining>.05)||
     other.stun>0||other.stunRecover>0||other.houndPinned||other.blastAirT>0)continue;
  const d=D(h,other),angle=Math.abs(angD(Math.atan2(other.y-h.y,other.x-h.x),h.face));
  const range=detectRange('p')*1.2*(.36+.64*indoorLightLevel(other.x,other.y))*(h.indoorChatT>0?.5:1);
  if(!((angle<=DETECT_CENTER_HALF*1.2&&d<range)||
     (angle<=DETECT_OUTER_HALF*1.2&&d<range*DETECT_OUTER_SCALE))||!los(h,other))continue;
  indoorGuardAlertAt(h,alert.lastSeen);
  const state=h.indoorAlert;
  // Inherit the remaining memory rather than renewing it through cyclic relays.
  state.remaining=Math.min(state.duration,alert.remaining);state.reported=true;
  state.lastDir=alert.lastDir?{...alert.lastDir}:null;
  h.st=1;h.target='p';h.sus=0;h.susMax=0;h.indoorNotice=null;
  h.burstLeft=0;h.foundPause=Math.max(h.foundPause||0,.35);
  h.face=Math.atan2(state.lastSeen.y-h.y,state.lastSeen.x-h.x);
  // Relay alone is not another firsthand discovery for the red-eye counter.
  return true;
 }
 return false;
}
function indoorGuardSeesAlly(h,ally,tracking=false){
 if(!ally?.alive||ally.chute>0||h.indoorFloor!==indoorWorld?.currentFloor+1)return false;
 const nav=indoorWorld.floors[h.indoorFloor-1]?.navigation;
 if(!nav||indoorGuardCell(nav,ally)<0)return false;
 const angle=Math.abs(angD(Math.atan2(ally.y-h.y,ally.x-h.x),h.face)),d=D(h,ally);
 const light=indoorLightLevel(ally.x,ally.y),factor=tracking?Math.max(.78,.5+.5*light):(.36+.64*light);
 const range=detectRange('ally:'+ally.id)*1.2*factor*(h.indoorChatT>0?.5:1);
 return ((angle<=DETECT_CENTER_HALF*1.2&&d<range)||
  (angle<=DETECT_OUTER_HALF*1.2&&d<range*DETECT_OUTER_SCALE))&&los(h,ally);
}
function indoorEndAllyCombat(h){
 const fight=h.indoorAllyCombat;if(!fight)return;
 h.indoorAllyCombat=null;h.indoorRocketCharge=0;h.burstLeft=0;
 const searching=h.indoorAlert&&h.indoorAlert.phase!=='found';
 h.st=searching?0:fight.previousSt;h.target=searching?null:fight.previousTarget;h.foundPause=0;
 if(h.indoorAlert){h.indoorAlert.visible=false;h.indoorAlert.sightCheckT=0;}
}
// A separate combat overlay keeps the existing indoor search route and its memory.
function indoorUpdateAllyCombat(h,dt){
 if(!h.alive||h.stun>0||h.stunRecover>0||h.houndPinned||h.blastAirT>0){indoorEndAllyCombat(h);return false;}
 // Keep a confirmed, currently visible player as the priority target.
 if(!h.indoorAllyCombat&&h.indoorAlert?.phase==='found'&&h.indoorAlert.visible)return false;
 let fight=h.indoorAllyCombat;
 if(fight&&!fight.ally.alive){indoorEndAllyCombat(h);return false;}
 h.indoorAllyCheckT=(h.indoorAllyCheckT||0)-dt;
 if(h.indoorAllyCheckT<=0){
  h.indoorAllyCheckT=.15;
  if(!fight){
   let nearest=null,best=Infinity;
   for(const ally of typeof allies==='undefined'?[]:allies){
    const distance=D(h,ally);
    if(distance<best&&indoorGuardSeesAlly(h,ally)){nearest=ally;best=distance;}
   }
   if(nearest){
    fight=h.indoorAllyCombat={ally:nearest,previousSt:h.st||0,previousTarget:h.target||null,
     visible:true,lastSeen:{x:nearest.x,y:nearest.y},remaining:1.35,travelLeft:3,phase:'found'};
    if(h.indoorChatT>0)indoorCancelAlarmChat(h);
    h.st=1;h.target='ally:'+nearest.id;h.sus=0;h.burstLeft=0;
    h.foundPause=Math.max(h.foundPause||0,.35);h.indoorRocketCharge=0;
   }
  }else{
   fight.visible=indoorGuardSeesAlly(h,fight.ally,true);
   if(fight.visible){fight.lastSeen={x:fight.ally.x,y:fight.ally.y};fight.remaining=1.35;fight.phase='found';fight.travelLeft=3;}
  }
 }
 if(!fight)return false;
 h.st=1;h.target='ally:'+fight.ally.id;h.sus=0;
 if(!fight.visible)fight.remaining=Math.max(0,fight.remaining-dt);
 if(!fight.visible&&fight.remaining<=0){
  fight.phase='lastSeen';fight.travelLeft-=dt;
  if(D(h,fight.lastSeen)<24||fight.travelLeft<=0){indoorEndAllyCombat(h);return false;}
 }
 const paused=(h.foundPause||0)>0||(h.modePause||0)>0||(h.sharePause||0)>0;
 h.foundPause=Math.max(0,(h.foundPause||0)-dt);h.modePause=Math.max(0,(h.modePause||0)-dt);
 h.sharePause=Math.max(0,(h.sharePause||0)-dt);h.cd=(h.cd||0)-dt;
 const point=fight.lastSeen;
 h.face+=Math.max(-dt*4,Math.min(dt*4,angD(Math.atan2(point.y-h.y,point.x-h.x),h.face)));
 const aiming=h.indoorCommander&&indoorUpdateCommanderWeapon(h,point,fight.visible,paused,dt,fight.ally);
 if(!paused&&!aiming&&D(h,point)>70)indoorMoveGuardTo(h,point,dt,fight.visible?95:78,fight);
 if(!h.indoorCommander&&!paused&&fight.visible&&D(h,point)<150&&los(h,fight.ally)){
  if(h.cd<=0){
   if(!(h.burstLeft>0))h.burstLeft=3;
   h.characterShotAt=performance.now();
   fire(h.x,h.y,Math.atan2(point.y-h.y,point.x-h.x)+(R()-.5)*.15,'e','r',330,150);
   h.burstLeft--;h.cd=h.burstLeft>0?.14:2;
  }
 }
 return true;
}
function updateInfiltrationGuardAI(h,dt){
 if(!h.indoorGuard)return false;
 if(indoorStairProtected()&&h.indoorFloor===indoorWorld.currentFloor+1&&h.target==='p'){
   h.st=0;h.target=null;h.indoorAlert=null;h.indoorNotice=null;h.burstLeft=0;h.lost=0;
   h.indoorRocketCharge=0;h.indoorRocketAim=null;
 }
 if(indoorUpdateAllyCombat(h,dt))return true;
 if(!indoorStairProtected())indoorObserveFoundGuard(h,dt);
 if(!h.indoorAlert){
  if(h.st&&h.target==='p')indoorStartGuardPursuit(h);
  else if(h.st)return false;
  else if(!(indoorWorld?.alarm?.active&&indoorBeginAlarmSweep(h)))return indoorUpdateGuardNotice(h,dt);
 }
 const state=h.indoorAlert;
 if((h.stun>0)||(h.stunRecover>0)||h.houndPinned||h.blastAirT>0||
    (state.phase==='found'&&(!h.st||h.target!=='p'))){
  h.indoorAlert=null;h.indoorNotice=null;return false;
 }
 // Unconfirmed glimpses during search/sweep use the same combined cues.
 // Confirmed pursuit retains its original sight-loss timer and last-seen snapshots.
 if(state.phase!=='found'){
  const n=indoorAdvanceVisualNotice(h,dt,.12+((h.indoorFloor||1)%3)*.01);
  if(n.visible&&n.exposure>=.7){
   if(indoorGuardSeesPlayer(h)&&los(h,p)){
    enterHumanFound(h,'p');indoorStartGuardPursuit(h);indoorRecordGuardDiscovery(h);h.indoorNotice=null;return true;
   }
   n.visible=false;n.checkT=0;
  }
  state.visible=false;
 }else{
  state.sightCheckT=(state.sightCheckT||0)-dt;
  if(state.sightCheckT<=0){
   state.sightCheckT=.12+((h.indoorFloor||1)%3)*.01;
   state.visible=indoorGuardSeesPlayer(h);
   if(state.visible){
    const previous=state.lastSeen,distanceSeen=D(previous,p);
    if(distanceSeen>18)state.lastDir={x:(p.x-previous.x)/distanceSeen,y:(p.y-previous.y)/distanceSeen};
    state.lastSeen={x:p.x,y:p.y};state.approachGoal=null;state.estimate=null;state.trail.length=0;
    indoorRecordGuardDiscovery(h);indoorShareGuardSighting(h,state);
   }
  }
 }
 const visible=!!state.visible;
 if(visible)state.remaining=2.7;
 else state.remaining=Math.max(0,state.remaining-dt);
 const pause=(h.modePause||0)>0||(h.foundPause||0)>0||
   (h.sharePause||0)>0||(h.chatResumeT||0)>0;
 h.modePause=Math.max(0,(h.modePause||0)-dt);
 h.foundPause=Math.max(0,(h.foundPause||0)-dt);h.sharePause=Math.max(0,(h.sharePause||0)-dt);
 if(state.phase==='sweep'){
  if(h.indoorChatT>0)return true;
  if(!pause)indoorUpdateAlarmSweep(h,state,dt);
  return true;
 }
 if(state.phase==='search'){
  // Total search time includes movement, so blocked furniture cannot prolong it.
  state.searchLeft=Math.max(0,state.searchLeft-dt);h.sus=state.searchLeft;h.susMax=8;
  if(state.searchLeft<=0){indoorFinishGuardSearch(h);return true;}
  if(pause||h.indoorChatT>0)return true;
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
 const commanderAiming=h.indoorCommander&&indoorUpdateCommanderWeapon(h,next,visible,pause,dt);
 if(!pause&&!commanderAiming){
  if(D(h,next)>20)indoorMoveGuardTo(h,next,dt,state.phase==='found'?95:78);
  else if(visible)h.face+=Math.max(-dt*4,Math.min(dt*4,angD(Math.atan2(next.y-h.y,next.x-h.x),h.face)));
 }
 // Recheck the actual wall ray before shooting; a cached sample may be stale.
 if(!h.indoorCommander&&!pause&&visible&&D(h,next)<150&&h.cd<=0&&los(h,p)){
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
    for(const h of floor.guards||[])if(!h.alive||h.stun>0||h.stunRecover>0||h.houndPinned||h.blastAirT>0){
      indoorEndAllyCombat(h);h.indoorAlert=null;h.indoorNotice=null;
    }
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
function indoorPartnerAssistsDocument(q){
 return !!(partner&&skill==='partner'&&!partner.down&&!(partner.stunT>0)&&
  !partner.vehicle&&!partner.passengerVehicle&&q.floor===indoorWorld?.currentFloor+1&&
  D(partner,q)<INDOOR_ACQUIRE_RADIUS);
}
function updateInfiltrationMission(dt){
  if(!indoorWorld||!mission||state!=='play')return;
  const w=indoorWorld,m=mission;
  indoorTickStairSanctuary(dt);
  if(w.alarm?.active)w.alarm.elapsed+=dt;
  const detected=playerDetectedNow();
  m.detected=detected;
  indoorReplenishGuards(dt);
  indoorUpdateEntranceGuards(dt);
  updateInfiltrationDoors(dt);
  indoorUpdatePostChats(dt);
  indoorUpdateAlarmChats(dt);
  indoorScanStunnedGuards(dt);
  // 発見だけでは終了させず、潜入専用AIの追跡・最終目撃地点確認・捜索を継続する。
  w.stairMoveLock=Math.max(0,(w.stairMoveLock||0)-dt);
  w.stairsCooldown=Math.max(0,w.stairsCooldown-dt);
  const floor=w.floors[w.currentFloor];
  if(indoorStairTravelReady(floor)&&w.stairsCooldown<=0){
    w.currentFloor=1-w.currentFloor;
    const target=w.floors[w.currentFloor];
    Object.assign(p,indoorStairLanding(target));
    indoorBeginStairSanctuary(target);
    w.stairsCooldown=2;w.stairEntryFloor=null;w.stairMoveLock=.5;
    m.progress=0;m.current=null;
    cam=Math.max(0,Math.min(WH-H,p.y-H*.6));
    say((w.currentFloor+1)+'階へ移動');sfx('skill');
  }
  for(const q of m.points)if(q.collectedT>0)q.collectedT=Math.max(0,q.collectedT-dt);
  const near=m.points.find(q=>!q.done&&q.floor===w.currentFloor+1&&D(p,q)<INDOOR_ACQUIRE_RADIUS);
  if(near&&!p.tank){
    m.current=near;
    m.progress=Math.min(INDOOR_ACQUIRE_SECONDS,(near.progress||0)+dt*(indoorPartnerAssistsDocument(near)?2:1));
    near.progress=m.progress;
    if(m.progress>=INDOOR_ACQUIRE_SECONDS){
      near.done=true;near.collectedT=.9;m.index++;m.progress=0;m.current=null;sfx('pickup');
      say('重要資料回収 '+m.index+'/'+m.points.length);
      if(m.index===m.points.length)say(w.emergency?'全資料回収！ 1階の玄関か非常口で5秒待機せよ':'全資料回収！ 1階の玄関で5秒待機せよ');
    }
  }else{
    m.progress=0;m.current=null;
  }
  // 外周にある玄関と非常口の両方を脱出地点として扱う。
  const ground=w.floors[0].footprint;
  const outside=p.y<ground.y-12||p.y>ground.y+ground.h+12;
  const escape=m.index===INDOOR_FILES_TOTAL&&w.currentFloor===0&&!p.tank&&outside
    ?(w.exits||[w.exit,w.emergency]).find(exit=>exit&&D(p,exit)<INDOOR_EXIT_RADIUS):null;
  if(escape){
    if(m.escapeExit!==escape)m.escapeProgress=0;
    m.escapeExit=escape;m.escapeProgress=Math.min(INDOOR_EXIT_SECONDS,(m.escapeProgress||0)+dt);
    if(m.escapeProgress>=INDOOR_EXIT_SECONDS-1e-9&&!m.escapeComplete){m.escapeComplete=true;completeMission();beginInfiltrationExtraction(escape);}
  }else{m.escapeExit=null;m.escapeProgress=0;}

}
// 各階の屋外を含む独立した行動範囲。1Fから座標上の2Fへ歩いて行かせない。
function infiltrationFloorBounds(){
  const floor=indoorWorld?.floors[indoorWorld.currentFloor];if(!floor)return null;
  const fp=floor.footprint,pad=floor.number===1?INDOOR_FORECOURT_DEPTH:24;
  return{top:fp.y-pad,bottom:fp.y+fp.h+pad};
}
function enforceInfiltrationBoundary(){
  if(stageMode!=='indoor'||!indoorWorld)return;
  const bounds=infiltrationFloorBounds();if(!bounds)return;
  const radius=p.tank?24:8;
  p.y=Math.max(bounds.top+radius,Math.min(bounds.bottom-radius,p.y));
  // 移動後の兵士同士の押し出しでも階段に重ならないようにする。
  for(const floor of indoorWorld.floors)for(const h of floor.guards){
    if(!h.alive||!indoorGuardStairBlocked(h,h.x,h.y,8))continue;
    const b=floor.stairObstacle;h.x=h.x<=b.x+b.w/2?b.x-10:b.x+b.w+10;
  }
}
function infiltrationCamera(){
  if(!indoorWorld)return null;
  const extraction=typeof mission!=='undefined'&&mission?.extraction;
  if(extraction)return{x:extraction.camX,y:extraction.camY};
  const bounds=infiltrationFloorBounds();if(!bounds)return null;
  return{x:Math.max(0,Math.min(WW-W,p.x-W/2)),
    y:Math.max(bounds.top,Math.min(Math.max(bounds.top,bounds.bottom-H),p.y-H*.6))};
}
function beginInfiltrationExtraction(exit){
  if(stageMode!=='indoor'||!mission||mission.extraction)return;
  const view=infiltrationCamera();
  mission.extraction={elapsed:0,duration:5.2,camX:view.x,camY:view.y,
    startX:view.x-100,stopX:exit.x,endX:view.x+W+100,y:exit.y+(p.y>=exit.y?-68:68),
    carX:view.x-100,fromX:p.x,fromY:p.y,boarded:false,phase:'approach'};
  // 成否とスコアは5秒の待機完了時に確定。評価画面は回収演出の後に開く。
  state='indoorEscape';
  if(typeof keys!=='undefined')for(const key of Object.keys(keys))keys[key]=false;
  bombReq=false;cannonReq=false;interact=false;skillReq=false;
  p.dig=0;p.digPrep=0;p.drill=0;p.grappleT=0;p.flameActive=false;
  p.sniperMode=false;p.sniperEnterT=0;p.sniperReadyT=0;
}
function updateInfiltrationExtraction(dt){
  const v=stageMode==='indoor'&&mission?.extraction;
  if(state!=='indoorEscape'||!v)return;
  v.elapsed=Math.min(v.duration,v.elapsed+Math.max(0,dt));const t=v.elapsed;
  if(t<1.8){const u=t/1.8;v.carX=v.startX+(v.stopX-v.startX)*(1-(1-u)**3);}
  else v.carX=v.stopX;
  if(t>=2.05&&!v.boarded){
    v.phase='boarding';const u=Math.min(1,(t-2.05)/.75),x=v.stopX-8,y=v.y+10;
    p.body=Math.atan2(y-v.fromY,x-v.fromX);p.ang=p.body;
    p.x=v.fromX+(x-v.fromX)*u;p.y=v.fromY+(y-v.fromY)*u;
    if(u>=1){v.boarded=true;v.phase='aboard';}
  }
  if(t>=3.1){const u=Math.min(1,(t-3.1)/(v.duration-3.1));
    v.phase='depart';v.carX=v.stopX+(v.endX-v.stopX)*u*u;
  }
  if(v.boarded){p.x=v.carX-8;p.y=v.y+10;}
  if(t>=v.duration){state='win';resultAnimT=0;}
}
let indoorJeepCanvas=null;
function infiltrationJeepSprite(){
  if(indoorJeepCanvas)return indoorJeepCanvas;
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=76;
  const q=gameCanvasContext(canvas);q.clearRect(0,0,128,76);
  q.fillStyle='rgba(0,0,0,.28)';q.fillRect(12,15,106,53);
  q.fillStyle='#151b18';for(const x of [27,91]){q.fillRect(x,4,17,13);q.fillRect(x,59,17,13);}
  q.fillStyle='#334330';q.fillRect(15,14,101,48);
  q.fillStyle='#758259';q.fillRect(19,17,92,42);
  q.fillStyle='#48573b';q.fillRect(22,20,46,36);
  q.strokeStyle='#a0aa7a';q.lineWidth=2;q.strokeRect(21,18,88,40);
  // 車体右が進行方向。開放座席・フロントガラス・ボンネット・スペアタイヤ。
  q.fillStyle='#25342c';q.fillRect(34,23,30,30);
  q.fillStyle='#7a8055';q.fillRect(35,24,10,12);q.fillRect(35,41,10,11);
  q.fillStyle='#8facaa';q.fillRect(65,20,7,36);
  q.fillStyle='#56653f';q.fillRect(75,21,31,34);
  q.strokeStyle='#a3ac7a';q.lineWidth=1;q.strokeRect(77,23,26,30);
  q.fillStyle='#202a24';q.fillRect(111,18,7,40);
  q.fillStyle='#c8c69a';q.fillRect(113,20,5,7);q.fillRect(113,48,5,7);
  q.fillStyle='#19221b';q.beginPath();q.ellipse(20,38,9,16,0,0,Math.PI*2);q.fill();
  q.fillStyle='#53623e';q.beginPath();q.arc(54,29,6,0,Math.PI*2);q.fill();
  q.fillStyle='#d0b58a';q.fillRect(58,27,3,4);
  indoorJeepCanvas=canvas;return canvas;
}
function drawInfiltrationExtraction(cx,cy){
  const v=stageMode==='indoor'&&state==='indoorEscape'&&mission?.extraction;if(!v)return;
  gm.save();gm.translate(v.carX-cx,v.y-cy);gm.imageSmoothingEnabled=true;
  gm.drawImage(infiltrationJeepSprite(),-64,-38,128,76);
  if(v.boarded){
    gm.fillStyle='#d0b58a';gm.beginPath();gm.arc(-8,10,6,0,Math.PI*2);gm.fill();
    gm.fillStyle='#67734d';gm.beginPath();gm.arc(-9,9,6,0,Math.PI*2);gm.fill();
    gm.fillStyle='#b5372e';gm.fillRect(-10,3,3,12);
  }
  gm.restore();
}
// 潜入専用。画像は初回のみ読み込み、CanvasPatternは描画コンテキストごとに再利用。
let indoorConcreteImage=null;
const indoorConcretePatterns=new WeakMap();
function indoorConcretePattern(){
  if(!indoorConcreteImage){
    indoorConcreteImage=new Image();indoorConcreteImage.decoding='async';
    indoorConcreteImage.src='assets/terrain/indoor_concrete.webp';
  }
  if(!assetOK(indoorConcreteImage))return null;
  const old=indoorConcretePatterns.get(g);if(old)return old;
  const pattern=g.createPattern(indoorConcreteImage,'repeat');
  if(pattern)indoorConcretePatterns.set(g,pattern);
  return pattern;
}
const indoorOutdoorTerrain={n:'丘陵',g:'#6b7a3a'};
function drawInfiltrationStairSprite(floor){
  const image=indoorPropImage(floor.number===1?'stairs_up':'stairs_down');if(!image)return false;
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const w=INDOOR_STAIR_WIDTH,h=w*ih/iw;
  g.save();g.imageSmoothingEnabled=true;
  g.drawImage(image,floor.stair.x-w/2,floor.stair.y-h/2,w,h);
  if(floor.number===1){
    g.fillStyle='rgba(0,0,0,.14)';
    g.fillRect(floor.stair.x-w*.4,floor.stair.y-h/2+h*.035,w*.8,h*.16);
  }
  g.restore();return true;
}
function drawInfiltrationFloors(cx,cy){
  if(!indoorWorld)return;
  const left=Math.max(0,cx-24),top=cy-24,right=Math.min(WW,cx+W+24),bottom=cy+H+24;
  // 丘陵と同一の画像・倍率・合成済みパターンを使い、屋外を一度だけ塗る。
  g.fillStyle=terrainSurfacePattern(indoorOutdoorTerrain)||indoorOutdoorTerrain.g;
  g.fillRect(left,top,right-left,bottom-top);
  const concrete=indoorConcretePattern()||'#777975';
  for(const f of indoorWorld.floors){
    const minY=f.footprint.y-INDOOR_FORECOURT_DEPTH,maxY=f.footprint.y+f.footprint.h+INDOOR_FORECOURT_DEPTH;
    if(maxY<cy-100||minY>cy+H+100)continue;
    // Corridor tiles are generated in H/L/T/ring/U patterns instead of a vertical stripe.
    const fp=f.footprint,x=Math.max(left,fp.x),y=Math.max(top,fp.y);
    const r=Math.min(right,fp.x+fp.w),b=Math.min(bottom,fp.y+fp.h);
    g.fillStyle=concrete;if(r>x&&b>y)g.fillRect(x,y,r-x,b-y);
    // 玄関前と非常口前は丘陵地面のまま。帯状の舗装は描かない。
    g.fillStyle='rgba(145,153,142,.07)';
    for(const tile of f.corridors){
      if(tile.y+tile.h<cy-30||tile.y>cy+H+30)continue;
      g.fillRect(tile.x,tile.y,tile.w,tile.h);
    }
    // Open lobby and corridors share one continuous floor. No decorative border,
    // inset rectangle or mat may imply a wall along their walkable boundary.
    for(const room of f.rooms){
      if(room.y+room.h<cy-40||room.y>cy+H+40)continue;
      g.fillStyle=room.id%2===0?'rgba(34,41,33,.08)':'rgba(34,41,33,.12)';
      for(const tile of room.tiles){
        if(tile.y+tile.h<cy-30||tile.y>cy+H+30)continue;
        // Adjacent same-room tiles share an open interior, never draw an internal wall.
        g.fillRect(tile.x,tile.y,tile.w,tile.h);
        g.strokeStyle='rgba(215,205,174,.05)';g.lineWidth=1;
        g.beginPath();g.moveTo(tile.x+14,tile.y+24);g.lineTo(tile.x+tile.w-14,tile.y+24);g.stroke();
      }
    }
    // 俯瞰の階段。段板・影・手すりを軽量Canvas図形だけで描く。
    if(f.stair.y>cy-130&&f.stair.y<cy+H+130){
      const x=f.stair.x,y=f.stair.y;
      if(!drawInfiltrationStairSprite(f)){
      g.save();g.translate(x,y);g.scale(60/88,1);
      g.fillStyle='#283c37';g.fillRect(-44,-58,88,116);
      g.fillStyle='#8a9684';g.fillRect(-36,-52,72,103);
      g.fillStyle=f.number===1?'#2e3e37':'#354740';g.fillRect(-36,-52,72,10);
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
      g.restore();
      }
    }
    // 前線制圧のような円形の脱出範囲。描画と待機判定は同じ半径を使う。
    for(const q of [f.entrance||f.entrances?.[0],f.emergency].filter(Boolean)){
      const radius=INDOOR_EXIT_RADIUS;
      if(q.x+radius<cx||q.x-radius>cx+W||q.y+radius<cy||q.y-radius>cy+H)continue;
      const active=typeof mission!=='undefined'&&mission?.escapeExit===q;
      const progress=active?(mission.escapeProgress||0)/INDOOR_EXIT_SECONDS:0;
      g.save();g.lineWidth=3;g.strokeStyle='#9de7ae';g.fillStyle='rgba(75,170,100,.15)';
      g.beginPath();g.arc(q.x,q.y,radius,0,Math.PI*2);g.fill();g.stroke();
      if(progress>0){
        g.strokeStyle='#6eff8e';g.lineWidth=7;g.lineCap='round';g.beginPath();
        g.arc(q.x,q.y,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);g.stroke();
      }
      g.font='bold 22px system-ui';g.fillStyle='#e9ffec';g.textAlign='center';g.fillText('EXIT',q.x,q.y+7);
      if(active){g.font='bold 15px system-ui';g.fillText(Math.max(0,INDOOR_EXIT_SECONDS-(mission.escapeProgress||0)).toFixed(1)+'s',q.x,q.y+32);}
      g.restore();
    }
  }
}

const indoorPropImages=Object.create(null);
function indoorPropImage(kind){
  if(!kind)return null;
  if(!Object.prototype.hasOwnProperty.call(indoorPropImages,kind)){
    const image=new Image();image.decoding='async';
    image.src='assets/indoor/'+kind+'.webp'+(INDOOR_PROP_ASPECT[kind]?'?v=20261020-r2':'');indoorPropImages[kind]=image;
  }
  const image=indoorPropImages[kind];return assetOK(image)?image:null;
}
function drawInfiltrationShellPallet(o){
  const image=indoorPropImage('shell_pallet_hd');if(!image)return false;
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const scale=Math.min(o.w*1.12/iw,o.h*1.12/ih),w=iw*scale,h=ih*scale;
  g.save();g.imageSmoothingEnabled=true;
  g.drawImage(image,o.x+(o.w-w)/2,o.y+(o.h-h)/2,w,h);g.restore();return true;
}
function drawInfiltrationPropSprite(o){
  const image=indoorPropImage(o.propArt);if(!image)return false;
  // 拡縮は常に等倍率。万一旧サイズの家具があっても画像を引き伸ばさない。
  const horizontal=o.propArt!=='generator'&&o.w>o.h,iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const scale=Math.min((horizontal?o.h:o.w)/iw,(horizontal?o.w:o.h)/ih),w=iw*scale,h=ih*scale;
  g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  if(horizontal){
    g.translate(o.x+o.w/2,o.y+o.h/2);g.rotate(Math.PI/2);
    g.drawImage(image,-w/2,-h/2,w,h);
  }else g.drawImage(image,o.x+(o.w-w)/2,o.y+(o.h-h)/2,w,h);
  g.restore();return true;
}
function drawInfiltrationProps(cx,cy){
  // 背景の上・兵士の下に描画する軽量な俯瞰家具。コリジョンと視線遮蔽は同じcover。
  if(!indoorWorld)return;
  for(const floor of indoorWorld.floors){
    if(floor.footprint.y>cy+H+90||floor.footprint.y+floor.footprint.h<cy-90)continue;
    for(const o of floor.props){
      const {x,y,w,h}=o;
      if(x>cx+W+50||x+w<cx-50||y>cy+H+50||y+h<cy-50)continue;
      if(o.indoorDamageGroup){
        if(!indoorPropImage(o.propArt))continue;
        const fragment=o.indoorDamageGroup.primaryFragment;
        if(fragment)drawCoverFragmentGroup(fragment);
        continue;
      }
      if(!indoorPropImage(o.propArt))continue;
      g.save();g.fillStyle='rgba(0,0,0,.26)';g.fillRect(x+4,y+5,w,h);
      drawInfiltrationPropSprite(o);
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
      const panel='#59b9d0';
      const border='#c5f5ff';
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

function drawInfiltrationAlarmEyes(){
 const count=indoorAlarmLevel(),y=48;
 gm.save();gm.lineWidth=2;
 for(let i=0;i<3;i++){
  const x=W-82+i*28,color=i<count?'#ff4b45':'rgba(255,100,90,.23)';
  gm.beginPath();gm.moveTo(x-10,y);gm.quadraticCurveTo(x,y-10,x+10,y);
  gm.quadraticCurveTo(x,y+10,x-10,y);gm.closePath();
  gm.fillStyle='rgba(26,8,8,.65)';gm.fill();gm.strokeStyle=color;gm.stroke();
  gm.beginPath();gm.arc(x,y,3,0,Math.PI*2);gm.fillStyle=color;gm.fill();
 }
 gm.restore();
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
    const alarmText=indoorWorld.alarm?.active?'館内アラート発令中：全館捜索 ／ ':'';
    const desc=alarmText+(mission.index===INDOOR_FILES_TOTAL?(indoorWorld.emergency?'1階の玄関または非常口のEXITで5秒待機':'1階の玄関のEXITで5秒待機'):mission.detected?'発見中：追跡・攻撃に注意':next?'円内で回収：通常8秒／相棒と一緒なら4秒':'1階の出口へ');
    const progress='<progress max="8" value="'+mission.progress+'"></progress>';
    const nextText='<b>'+text+'</b>'+progress+'<small>'+desc+'</small>';
    if(nextText!==indoorHudSnapshot){indoorHudSnapshot=nextText;el.innerHTML=nextText;}
  }
  gm.save();gm.setTransform(1,0,0,1,0,0);
  drawInfiltrationPostChats();
  drawInfiltrationAlarmChats();
  if(indoorWorld.alarm?.active){
    const height=Math.min(150,H*.2);
    if(!indoorAlarmGradient){
      indoorAlarmGradient=gm.createLinearGradient(0,0,0,height);
      indoorAlarmGradient.addColorStop(0,'rgba(190,22,18,.48)');
      indoorAlarmGradient.addColorStop(1,'rgba(190,22,18,0)');
    }
    gm.fillStyle=indoorAlarmGradient;gm.fillRect(0,0,W,height);
    gm.fillStyle='#ffc6bd';gm.font='bold 14px system-ui';gm.textAlign='center';
    gm.fillText('館内アラート',W/2,25);
  }
  drawInfiltrationAlarmEyes();
  if(indoorStairProtected()){
    const area=indoorWorld.stairSanctuary,x=area.x-camX,y=area.y-cam;
    gm.save();gm.fillStyle='rgba(110,220,240,.08)';gm.strokeStyle='rgba(150,235,255,.6)';gm.lineWidth=2;
    gm.fillRect(x,y,area.w,area.h);gm.strokeRect(x,y,area.w,area.h);
    gm.font='bold 12px system-ui';gm.textAlign='center';gm.fillStyle='#c5f5ff';
    gm.fillText('SAFE',x+area.w/2,y+area.h/2+4);gm.restore();
  }
  for(const q of mission.points){
    if(q.floor!==indoorWorld.currentFloor+1||(q.done&&!(q.collectedT>0)))continue;
    const x=q.x-camX,y=q.y-cam,r=INDOOR_ACQUIRE_RADIUS;
    if(x<-r-15||x>W+r+15||y<-r-15||y>H+r+15)continue;
    gm.save();
    if(q.done)gm.globalAlpha=Math.min(1,q.collectedT/.55);
    gm.fillStyle=q.done?'rgba(80,220,130,.25)':'rgba(241,208,112,.12)';
    gm.strokeStyle=q.done?'#79e8a2':'rgba(250,220,130,.65)';
    gm.lineWidth=3;gm.beginPath();gm.arc(x,y,r,0,Math.PI*2);gm.fill();gm.stroke();
    const ratio=Math.min(1,(q.progress||0)/INDOOR_ACQUIRE_SECONDS);
    gm.strokeStyle=q.done?'#79e8a2':'#ffdf83';gm.lineWidth=8;gm.lineCap='round';gm.beginPath();
    gm.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);if(ratio>0)gm.stroke();
    gm.lineCap='butt';gm.font='bold 18px system-ui';gm.textAlign='center';
    // 紙と折り返しの図形で、端末の絵文字フォントに依存しない資料アイコン。
    gm.fillStyle=q.done?'#baffce':'#fff0ad';gm.strokeStyle=q.done?'#79e8a2':'#806d3e';gm.lineWidth=1.5;
    gm.beginPath();gm.moveTo(x-10,y-17);gm.lineTo(x+4,y-17);gm.lineTo(x+11,y-10);
    gm.lineTo(x+11,y+9);gm.lineTo(x-10,y+9);gm.closePath();gm.fill();gm.stroke();
    gm.beginPath();gm.moveTo(x+4,y-17);gm.lineTo(x+4,y-10);gm.lineTo(x+11,y-10);gm.stroke();
    for(const dy of [-5,0,5]){gm.beginPath();gm.moveTo(x-6,y+dy);gm.lineTo(x+6,y+dy);gm.stroke();}
    if(q.done){gm.fillStyle='#baffce';gm.font='bold 14px system-ui';gm.fillText('回収完了',x,y+28);}
    if(!q.done){
      gm.font='bold 13px system-ui';gm.fillText((q.progress||0).toFixed(1)+' / 8秒',x,y+22);
      if(indoorPartnerAssistsDocument(q)){
        gm.fillStyle='#a8e4ff';gm.font='bold 12px system-ui';gm.fillText('相棒協力 ×2',x,y+40);
      }
    }
    gm.restore();
  }
  // 同じ階の未回収資料だけを距離で比較。階段や出口への矢印には切り替えない。
  let target=null,nearest=Infinity;
  const remainingFloors=new Set();
  for(const q of mission.points){
    if(q.done)continue;
    remainingFloors.add(q.floor);
    if(q.floor!==indoorWorld.currentFloor+1)continue;
    const distance=D(q,p);
    if(distance<nearest){nearest=distance;target=q;}
  }
  const guideFloor=target?indoorWorld.currentFloor+1:[...remainingFloors][0];
  gm.textAlign='right';gm.font='bold 14px system-ui';gm.fillStyle=guideFloor?'#ffe1a0':'#a9f3c0';
  gm.fillText(guideFloor?'→'+guideFloor+'F':'→EXIT',W-12,22);
  if(target){
    const angle=Math.atan2(target.y-p.y,target.x-p.x);
    // 黒背景・ラベルを使わない、右上のシンプルな方向矢印のみ。
    gm.save();gm.translate(W-37,85);gm.rotate(angle);
    gm.fillStyle='#ffe1a0';gm.strokeStyle='rgba(51,45,26,.65)';gm.lineWidth=2;
    gm.beginPath();gm.moveTo(20,0);gm.lineTo(-12,-11);gm.lineTo(-5,0);gm.lineTo(-12,11);gm.closePath();
    gm.fill();gm.stroke();gm.restore();
  }
  gm.restore();
}
if(typeof module!=='undefined'&&module.exports)module.exports={indoorGenerateExterior,indoorGenerateFloor,indoorAt,indoorRect,indoorGuardCell,indoorGuardCellRoute,indoorMakeGuardGrid,indoorGridDetour,indoorGridPoint,indoorGridSafePoint};

