/* Indoor environment adapter: NO replacement game loop or controls. */
const INDOOR_FILES_TOTAL=3,INDOOR_ACQUIRE_SECONDS=8,INDOOR_ACQUIRE_RADIUS=68;
const indoorRand=(rng,a,b)=>a+(b-a)*rng();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const indoorShuffle=(arr,rng)=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
function indoorGenerateFloor(number,rng=Math.random){
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
  // 全パターン共通の階段位置。廊下と連結するよう短い上側の枝を延ばす。
  add(2,1);add(1,1);add(2,0); // 北側の非常口から階段へ通じる
  // 南端に正面玄関を作る。必ず既存廊下から分岐し、建物外周で開口する。
  const south=[1,2,3].filter(c=>hall.has(index(c,5)));
  const entranceCol=south.length?south[Math.floor(rng()*south.length)]:1;
  if(!south.length)add(entranceCol,5);
  add(entranceCol,6);
  const mainDoor={x:center(index(entranceCol,6)).x,y:Y0+ROWS*SIZE,side:'bottom'};
  const entrance={x:mainDoor.x,y:mainDoor.y+54};
  const emergencyDoor={x:center(index(2,0)).x,y:Y0,side:'top'};
  const emergency={x:emergencyDoor.x,y:emergencyDoor.y-54};
  const stair=center(index(2,1));
  // H/L/T/四角それぞれの廊下の末端側を入口・出口にする。
  const halls=Array.from(hall);
  const distToStair=new Map([[index(2,1),0]]),queue=[index(2,1)];
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
  // 区画境界の壁を共通のカバー物として作る。選ばれた扉には80pxの開口を設ける。
  const doors=new Map(),doorMarks=[],windows=[];
  for(const room of rooms){
    const edges=[];
    for(const cell of room.cellIds)for(const other of neighbors(cell))if(hall.has(other))edges.push([cell,other]);
    if(!edges.length)throw Error('廊下に面していない部屋');
    // 入口の数は1。大部屋も内部の区画を開放するので、入口から隅々まで進める。
    const chosen=edges[Math.floor(rng()*edges.length)];
    doors.set([Math.min(...chosen),Math.max(...chosen)].join(':'),room.id);
    const a=coord(chosen[0]),b=coord(chosen[1]);
    const vertical=a.c!==b.c;
    const doorPoint={x:vertical?X0+Math.max(a.c,b.c)*SIZE:X0+(a.c+.5)*SIZE,
      y:vertical?Y0+(a.r+.5)*SIZE:Y0+Math.max(a.r,b.r)*SIZE};
    room.door={inside:chosen[0],outside:chosen[1],point:doorPoint};
    doorMarks.push({...doorPoint,vertical,outer:false});
    // 窓は通路または屋外に面した別の壁に置く（見た目だけ。壁のコリジョンは維持）。
    const windowEdges=[];
    for(const i of room.cellIds){
      const cell=coord(i);
      for(const n of neighbors(i))if((hall.has(n)||owner[n]!==room.id)&&
        [Math.min(i,n),Math.max(i,n)].join(':')!==[Math.min(...chosen),Math.max(...chosen)].join(':')){
        const nb=coord(n),vert=nb.c!==cell.c;
        windowEdges.push({x:vert?X0+Math.max(nb.c,cell.c)*SIZE:X0+(cell.c+.5)*SIZE,
          y:vert?Y0+(cell.r+.5)*SIZE:Y0+Math.max(nb.r,cell.r)*SIZE,vertical:vert});
      }
    }
    // 外壁も窓の候補。ドアしか廊下に面さない小部屋にも採光窓を配置できる。
    for(const i of room.cellIds){
      const {c,r}=coord(i);
      if(c===0)windowEdges.push({x:X0,y:Y0+(r+.5)*SIZE,vertical:true});
      if(c===COLS-1)windowEdges.push({x:X0+COLS*SIZE,y:Y0+(r+.5)*SIZE,vertical:true});
      if(r===0)windowEdges.push({x:X0+(c+.5)*SIZE,y:Y0,vertical:false});
      if(r===ROWS-1)windowEdges.push({x:X0+(c+.5)*SIZE,y:Y0+ROWS*SIZE,vertical:false});
    }
    if(windowEdges.length)windows.push(windowEdges[Math.floor(rng()*windowEdges.length)]);
  }
  const walls=[];
  const put=(x,y,w,h)=>{if(w>1&&h>1)walls.push({x,y,w,h});};
  const edgeWall=(i,other,side)=>{
    const {c,r}=coord(i),x=X0+c*SIZE,y=Y0+r*SIZE;
    const vertical=side==='left'||side==='right';
    const length=SIZE,wx=vertical?(side==='left'?x:x+SIZE):x;
    const wy=vertical?y:(side==='top'?y:y+SIZE);
    const key=other===null?'':[Math.min(i,other),Math.max(i,other)].join(':');
    const externalEntry=other===null&&(
      (side==='bottom'&&c===entranceCol&&r===ROWS-1)||
      (side==='top'&&c===2&&r===0)
    );
    if(doors.has(key)||externalEntry){
      const gap=110,shift=(SIZE-gap)/2,thick=22;
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
  // 家具は各区画の隅だけに置き、80pxの扉と部屋の中央動線を確保する。
  const furniture=[];
  for(const room of rooms){
    const cells=indoorShuffle(room.tiles.slice(),rng);
    const count=Math.min(room.size>=3?2:1,cells.length);
    for(let k=0;k<count;k++){
      const tile=cells[k],left=rng()<.5;
      furniture.push({x:tile.x+(left?22:SIZE-72),y:tile.y+(rng()<.5?23:SIZE-56),w:50,h:33});
    }
  }
  const order=indoorShuffle([...rooms.keys()],rng);
  const intel=order.slice(0,INDOOR_FILES_TOTAL).map((id,i)=>{
    const room=rooms[id],tile=room.tiles[Math.floor(rng()*room.tiles.length)];
    return{x:tile.x+SIZE/2,y:tile.y+SIZE/2,room:room.name,id:number+'-'+i,taken:false};
  });
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
  const guards=[],roomCenters=indoorShuffle(rooms.map(r=>r.cellIds[0]),rng);
  const hallStarts=indoorShuffle(halls.filter(i=>distance(center(i),stair)>SIZE),rng);
  for(let guardIndex=0;guardIndex<4;guardIndex++){
    const start=hallStarts[guardIndex%hallStarts.length]??halls[0];
    const visitRooms=[],goals=[];
    // 施設の上端・中央・下端を必ず経由。大部屋は対象の区画へ入る位置を選ぶ。
    for(const band of [[0,1],[2,3,4],[5,6]]){
      const options=rooms.filter(room=>room.cellIds.some(i=>band.includes(coord(i).r)));
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
  doorMarks.push({...mainDoor,vertical:false,outer:true,kind:'main'});
  doorMarks.push({...emergencyDoor,vertical:false,outer:true,kind:'emergency'});
  return{number,pattern,rooms,walls,furniture,guards,intel,stair,exit,entrance,emergency,
    doors:doorMarks,windows,
    footprint:{x:X0,y:Y0,w:COLS*SIZE,h:ROWS*SIZE},
    corridors:halls.map(i=>{const {c,r}=coord(i);return{x:X0+c*SIZE,y:Y0+r*SIZE,w:SIZE,h:SIZE};}),
    center:stair.x};
}
// A stage map adapter; uses the main game's player, enemies, all skills,
// collisions, rendering and scoring loops without duplicating their behavior.
// 屋内専用の縦長座標変換。幅は画面内に収め、奥行きを広げて総床面積を約2倍にする。
const INDOOR_FLOOR_OFFSETS=[9300,5500],INDOOR_SCALE_X=1,INDOOR_SCALE_Y=1.75,INDOOR_OFFSET_X=-40;
let indoorWorld=null,indoorHudSnapshot='',indoorHudRefresh=0;
const INDOOR_DOOR_NEAR=140,INDOOR_DOOR_SPEED=4.8;
function indoorDoorCollisionRect(q){
  // 厚い壁の隙間（開口幅110px）にぴったり入れる。通常壁の判定方式を流用。
  return q.vertical
    ?{x:q.x-10,y:q.y-55*INDOOR_SCALE_Y,w:20,h:110*INDOOR_SCALE_Y}
    :{x:q.x-55*INDOOR_SCALE_X,y:q.y-11*INDOOR_SCALE_Y,
      w:110*INDOOR_SCALE_X,h:22*INDOOR_SCALE_Y};
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
  const shuffled=[1,2];
  for(const n of shuffled){
    const raw=indoorGenerateFloor(n),off=INDOOR_FLOOR_OFFSETS[n-1];
    const to=pt=>indoorAt(pt.x,pt.y,off);
    const rooms=raw.rooms.map(r=>{const rect=indoorRect(r,off);
      return{...rect,id:r.id,name:r.name,size:r.size,tiles:r.tiles.map(tile=>indoorRect(tile,off))};
    });
    // Walls use the existing concrete wall cover kind. Doors remain actual gaps in the core collision grid.
    for(const wall of raw.walls){
      const q=indoorRect(wall,off);
      covers.push({...q,kd:1,indoorWall:true,hp:999999});
    }
    // Same dynamic crate object format as existing outdoor stages.
    for(const piece of raw.furniture){
      const q=indoorRect(piece,off);
      objects.push({...q,kind:'crate',indoorFurniture:true});
    }
    const guards=[];
    for(const h of raw.guards){
      const pos=to(h),path=h.waypoints.map(to);
      const guard={...pos,path,loop:!!h.loop,wi:1,dir:1,stk:0,
        alive:true,elite:false,commander:null,st:0,sus:0,lost:0,cd:R()*1.2,burstLeft:0,face:h.face,
        target:null,patrolMode:'axis',zoneHeavy:'indoor',indoorGuard:true};
      humans.push(guard);guards.push(guard);
    }
    // 施設全体で3箇所。1階1箇所・2階2箇所に分ける。
    const count=n===1?1:2;
    const intel=raw.intel.slice(0,count).map((q,i)=>({...to(q),id:q.id,name:'重要資料 '+n+'F-'+(i+1),done:false,floor:n,progress:0}));
    indoorWorld.intel.push(...intel);
    const stair=to(raw.stair),entrance=to(raw.entrance),emergency=to(raw.emergency);
    const openingPoint=q=>({...to(q),vertical:q.vertical,kind:q.kind,outer:!!q.outer});
    const doors=raw.doors.map(q=>{
      const door={...openingPoint(q),open:0};
      // 動的ドアは既存の壁コリジョン配列へ追加。開いた時はnoHitを切り替えるだけ。
      // 配列や空間グリッドを毎フレーム作り直さないため処理負荷を抑える。
      door.cover={...indoorDoorCollisionRect(door),kd:1,indoorDoor:true,noHit:false,hp:999999};
      covers.push(door.cover);return door;
    });
    indoorWorld.floors.push({number:n,offset:off,pattern:raw.pattern,
      corridors:raw.corridors.map(tile=>indoorRect(tile,off)),rooms,stair,
      entrance,exit:entrance,emergency,
      footprint:indoorRect(raw.footprint,off),
      doors,windows:raw.windows.map(openingPoint),guards});
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
  say('拠点潜入：青兵を避けて各階の重要情報を入手せよ');
}
function setupInfiltrationMission(){
  mission={index:0,progress:0,points:indoorWorld.intel,exit:indoorWorld.exit,detected:false,
    current:null,alarm:0};
}
function updateInfiltrationDoors(dt){
  if(!indoorWorld)return;
  // PC、味方、敵兵の誰でも近づけば自動で開く。離れたら自然に閉じる。
  // AIの移動・発見・戦闘ルールには介入しない。
  for(const floor of indoorWorld.floors){
    const players=[p,...floor.guards,...(allies||[])];
    if(partner)players.push(partner);
    if(hound)players.push(hound);
    for(const door of floor.doors){
      let near=false;
      for(const a of players){
        if(!a||a.alive===false||a.down||a.stun>0)continue;
        const dx=Math.abs(a.x-door.x),dy=Math.abs(a.y-door.y);
        if(dx>INDOOR_DOOR_NEAR||dy>INDOOR_DOOR_NEAR)continue;
        if(dx*dx+dy*dy<INDOOR_DOOR_NEAR*INDOOR_DOOR_NEAR){near=true;break;}
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
  // Stealth is the objective. The game's existing AI determines when detection occurs.
  // 発見だけでは終了させず、本編の青兵AIによる追跡と攻撃を継続する。
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
    g.fillRect(f.entrance.x-45,f.footprint.y+f.footprint.h,90,Math.max(0,f.entrance.y-f.footprint.y-f.footprint.h+30));
    g.fillRect(f.emergency.x-45,f.emergency.y-30,90,Math.max(0,f.footprint.y-f.emergency.y+30));
    g.fillStyle='#626658';
    for(const tile of f.corridors){
      if(tile.y+tile.h<cy-30||tile.y>cy+H+30)continue;
      g.fillRect(tile.x,tile.y,tile.w,tile.h);
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
      if(q.y<cy-90||q.y>cy+H+90)continue;
      g.fillStyle=gateway.color;g.fillRect(q.x-43,q.y-24,86,40);
      g.strokeStyle='#292b26';g.lineWidth=2;g.strokeRect(q.x-43,q.y-24,86,40);
      g.font='bold 13px system-ui';g.fillStyle='#1b211c';g.textAlign='center';
      g.fillText(gateway.label,q.x,q.y+1);
    }
  }
}

function drawInfiltrationOpenings(cx,cy){
  if(!indoorWorld)return;
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
    // 室内扉・正面玄関・非常口は近接すると二枚のパネルが左右にスライドして開く。
    for(const q of f.doors){
      if(q.x<cx-130||q.x>cx+W+130||q.y<cy-150||q.y>cy+H+150)continue;
      g.save();
      const panel=q.kind==='emergency'?'#6eac8c':q.kind==='main'?'#aa8452':'#968572';
      const border=q.kind==='emergency'?'#b0f5d1':'#d5c0a0';
      g.fillStyle=panel;g.strokeStyle=border;g.lineWidth=2;
      const open=Math.max(0,Math.min(1,q.open||0)),half=55*(q.vertical?INDOOR_SCALE_Y:INDOOR_SCALE_X);
      const part=half*(1-open);
      if(q.vertical){
        const top=q.y-half,bottom=q.y+half;
        if(part>1){
          g.fillRect(q.x-10,top,20,part);
          g.fillRect(q.x-10,bottom-part,20,part);
        }
        g.beginPath();g.moveTo(q.x-15,top);g.lineTo(q.x-15,bottom);
        g.moveTo(q.x+15,top);g.lineTo(q.x+15,bottom);g.stroke();
      }else{
        if(part>1){
          g.fillRect(q.x-half,q.y-11*INDOOR_SCALE_Y,part,22*INDOOR_SCALE_Y);
          g.fillRect(q.x+half-part,q.y-11*INDOOR_SCALE_Y,part,22*INDOOR_SCALE_Y);
        }
        g.beginPath();g.moveTo(q.x-half,q.y-15*INDOOR_SCALE_Y);g.lineTo(q.x+half,q.y-15*INDOOR_SCALE_Y);
        g.moveTo(q.x-half,q.y+15*INDOOR_SCALE_Y);g.lineTo(q.x+half,q.y+15*INDOOR_SCALE_Y);g.stroke();
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
if(typeof module!=='undefined'&&module.exports)module.exports={indoorGenerateFloor,indoorAt,indoorRect};
