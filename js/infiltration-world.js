/* Indoor environment adapter: NO replacement game loop or controls. */
const INDOOR_FILES_PER_FLOOR=3;
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
  add(2,1);add(1,1);
  const stair=center(index(2,1));
  // H/L/T/四角それぞれの廊下の末端側を入口・出口にする。
  const halls=Array.from(hall);
  const distToStair=new Map([[index(2,1),0]]),queue=[index(2,1)];
  for(let at=0;at<queue.length;at++){
    const i=queue[at],d=distToStair.get(i);
    for(const n of neighbors(i))if(hall.has(n)&&!distToStair.has(n)){distToStair.set(n,d+1);queue.push(n);}
  }
  if(distToStair.size!==hall.size)throw Error('屋内廊下が分断されています');
  const possibleExit=halls.filter(i=>coord(i).r>=4).sort((a,b)=>(distToStair.get(b)||0)-(distToStair.get(a)||0));
  const exit=center(possibleExit[0]??halls[halls.length-1]);
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
  const doors=new Map();
  for(const room of rooms){
    const edges=[];
    for(const cell of room.cellIds)for(const other of neighbors(cell))if(hall.has(other))edges.push([cell,other]);
    if(!edges.length)throw Error('廊下に面していない部屋');
    // 入口の数は1。大部屋も内部の区画を開放するので、入口から隅々まで進める。
    const chosen=edges[Math.floor(rng()*edges.length)];
    doors.set([Math.min(...chosen),Math.max(...chosen)].join(':'),room.id);
    room.door={inside:chosen[0],outside:chosen[1],point:center(chosen[0])};
  }
  const walls=[];
  const put=(x,y,w,h)=>{if(w>1&&h>1)walls.push({x,y,w,h});};
  const edgeWall=(i,other,side)=>{
    const {c,r}=coord(i),x=X0+c*SIZE,y=Y0+r*SIZE;
    const vertical=side==='left'||side==='right';
    const length=SIZE,wx=vertical?(side==='left'?x:x+SIZE):x;
    const wy=vertical?y:(side==='top'?y:y+SIZE);
    const key=other===null?'': [Math.min(i,other),Math.max(i,other)].join(':');
    if(doors.has(key)){
      const shift=SIZE/2-42;
      if(vertical){put(wx-6,wy,12,shift);put(wx-6,wy+shift+84,12,length-shift-84);}
      else{put(wx,wy-6,shift,12);put(wx+shift+84,wy-6,length-shift-84,12);}
    }else if(vertical)put(wx-6,wy,12,length);
    else put(wx,wy-6,length,12);
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
  const intel=order.slice(0,INDOOR_FILES_PER_FLOOR).map((id,i)=>{
    const room=rooms[id],tile=room.tiles[Math.floor(rng()*room.tiles.length)];
    return{x:tile.x+SIZE/2,y:tile.y+SIZE/2,room:room.name,id:number+'-'+i,taken:false};
  });
  const guards=[];
  const hallPairs=[];
  for(const i of halls)for(const n of neighbors(i))if(hall.has(n)&&n>i){
    const a=center(i),b=center(n),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    if(distance(mid,stair)>230&&distance(mid,exit)>185)hallPairs.push([a,b]);
  }
  indoorShuffle(hallPairs,rng);
  for(const [a,b] of hallPairs.slice(0,2)){
    const dx=b.x-a.x,dy=b.y-a.y;
    const first={x:a.x+dx*.20,y:a.y+dy*.20},last={x:a.x+dx*.80,y:a.y+dy*.80};
    guards.push({...first,waypoints:[first,last],index:1,face:Math.atan2(dy,dx),wait:indoorRand(rng,0,1),speed:65,sight:245});
  }
  for(const id of order.slice(3,3+(4-guards.length))){
    const room=rooms[id],tile=room.tiles[Math.floor(rng()*room.tiles.length)];
    const a={x:tile.x+SIZE*.38,y:tile.y+SIZE*.48},b={x:tile.x+SIZE*.65,y:tile.y+SIZE*.48};
    guards.push({...a,waypoints:[a,b],index:1,face:0,wait:indoorRand(rng,0,1),speed:60,sight:215});
  }
  return{number,pattern,rooms,walls,furniture,guards,intel,stair,exit,
    corridors:halls.map(i=>{const {c,r}=coord(i);return{x:X0+c*SIZE,y:Y0+r*SIZE,w:SIZE,h:SIZE};}),
    center:stair.x};
}
// A stage map adapter; uses the main game's player, enemies, all skills,
// collisions, rendering and scoring loops without duplicating their behavior.
const INDOOR_FLOOR_OFFSETS=[9300,5900],INDOOR_SCALE_X=.86,INDOOR_OFFSET_X=58;
let indoorWorld=null,indoorHudSnapshot='',indoorHudRefresh=0;
const indoorAt=(x,y,offset)=>({x:INDOOR_OFFSET_X+x*INDOOR_SCALE_X,y:y+offset});
const indoorRect=(rect,offset)=>({x:INDOOR_OFFSET_X+rect.x*INDOOR_SCALE_X,y:rect.y+offset,w:rect.w*INDOOR_SCALE_X,h:rect.h});
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
  indoorWorld={floors:[],intel:[],currentFloor:0,stairArmed:true,stairsCooldown:0,exit:null};
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
      const guard={...pos,path,loop:false,wi:1,dir:1,stk:0,
        alive:true,elite:false,commander:null,st:0,sus:0,lost:0,cd:R()*1.2,burstLeft:0,face:h.face,
        target:null,patrolMode:'axis',zoneHeavy:'indoor',indoorGuard:true};
      humans.push(guard);guards.push(guard);
    }
    const intel=raw.intel.map((q,i)=>({...to(q),id:q.id,name:'重要情報 '+n+'F-'+(i+1),done:false,floor:n}));
    indoorWorld.intel.push(...intel);
    const stair=to(raw.stair),exit=to(raw.exit);
    indoorWorld.floors.push({number:n,offset:off,pattern:raw.pattern,
      corridors:raw.corridors.map(tile=>indoorRect(tile,off)),rooms,stair,exit,guards});
  }
  const entrance=indoorWorld.floors[0];
  p.x=entrance.exit.x;p.y=entrance.exit.y-38;p.hp=3;p.tank=null;p.body=-Math.PI/2;p.ang=-Math.PI/2;
  scoreStats.startY=p.y;scoreStats.debugUsed=true; // Sample run never unlocks stages or overwrites records.
  indoorWorld.exit={...entrance.exit};
  indoorWorld.currentFloor=0;
  patrolRoutesVisible=false;
  rebuildSpatialGrid();
  say('拠点潜入：青兵を避けて各階の重要情報を入手せよ');
}
function setupInfiltrationMission(){
  mission={index:0,progress:0,points:indoorWorld.intel,exit:indoorWorld.exit,detected:false,
    current:null,alarm:0};
}
function updateInfiltrationMission(dt){
  if(!indoorWorld||!mission||state!=='play')return;
  const w=indoorWorld,m=mission;
  const detected=playerDetectedNow();
  m.detected=detected;
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
    m.progress=0;m.current=null;
    cam=Math.max(0,Math.min(WH-H,p.y-H*.6));
    say((w.currentFloor+1)+'階へ移動');sfx('skill');
  }
  const near=m.points.find(q=>!q.done&&D(p,q)<48);
  if(near&&!detected&&!p.tank){
    if(m.current!==near){m.current=near;m.progress=0;}
    m.progress+=dt;
    if(m.progress>=2){
      near.done=true;m.index++;m.progress=0;m.current=null;sfx('pickup');
      say('重要情報回収 '+m.index+'/'+m.points.length);
      if(m.index===m.points.length)say('全情報回収！ 1階の出口へ');
    }
  }else{m.progress=0;m.current=null;}
  if(m.index===m.points.length&&w.currentFloor===0&&!p.tank&&!detected&&D(p,w.exit)<80)completeMission();
}
function drawInfiltrationFloors(cx,cy){
  if(!indoorWorld)return;
  for(const f of indoorWorld.floors){
    const minY=f.offset+65,maxY=f.offset+1359;
    if(maxY<cy-100||minY>cy+H+100)continue;
    // Corridor tiles are generated in H/L/T/ring/U patterns instead of a vertical stripe.
    g.fillStyle='#171e1c';g.fillRect(0,minY-25,WW,maxY-minY+50);
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
    g.fillStyle='#52776c';g.fillRect(f.stair.x-30,f.stair.y-26,60,52);
    g.strokeStyle='#b1d8be';g.lineWidth=2;g.strokeRect(f.stair.x-30,f.stair.y-26,60,52);
    g.font='bold 12px system-ui';g.fillStyle='#e1fff1';g.textAlign='center';
    g.fillText('階段',f.stair.x,f.stair.y+5);
    if(f.number===1){g.fillStyle='#6b5b39';g.fillRect(f.exit.x-35,f.exit.y-20,70,40);
      g.fillStyle='#fff1b0';g.fillText('脱出',f.exit.x,f.exit.y+4);}
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
    const next=mission.points.find(q=>!q.done),floor=indoorWorld.floors[indoorWorld.currentFloor],text='拠点潜入 '+(indoorWorld.currentFloor+1)+'階（'+floor.pattern+'型）　重要情報 '+mission.index+'/'+mission.points.length;
    const desc=mission.detected?'発見中！ 敵の追跡に注意':next?'情報の近くで2秒間解析':'1階の脱出地点へ';
    const progress='<progress max="2" value="'+mission.progress+'"></progress>';
    const nextText='<b>'+text+'</b>'+progress+'<small>'+desc+'</small>';
    if(nextText!==indoorHudSnapshot){indoorHudSnapshot=nextText;el.innerHTML=nextText;}
  }
  gm.save();gm.setTransform(1,0,0,1,0,0);
  for(const q of mission.points){
    if(q.done)continue;
    const x=q.x-camX,y=q.y-cam;
    if(x<-60||x>W+60||y<-60||y>H+60)continue;
    gm.fillStyle='rgba(241,208,112,.15)';gm.strokeStyle='#f5d883';gm.lineWidth=2;gm.beginPath();gm.arc(x,y,30,0,Math.PI*2);gm.fill();gm.stroke();
    gm.font='bold 17px system-ui';gm.textAlign='center';gm.fillStyle='#fff0ad';gm.fillText('秘',x,y+6);
  }
  gm.restore();
}
if(typeof module!=='undefined'&&module.exports)module.exports={indoorGenerateFloor,indoorAt,indoorRect};
