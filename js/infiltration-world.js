/* Indoor environment adapter: NO replacement game loop or controls. */
const INDOOR_FILES_PER_FLOOR=3;
const indoorRand=(rng,a,b)=>a+(b-a)*rng();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const indoorShuffle=(arr,rng)=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
function indoorGenerateFloor(number,rng=Math.random){
  const leftWall=438+indoorRand(rng,-35,35),rightWall=leftWall+150;
  const rooms=[],walls=[],furniture=[],doorLeft=[],doorRight=[];
  const names=indoorShuffle(['資料室','通信室','作戦室','兵員室','書庫','会議室','倉庫','解析室','記録室','機材室'],rng);
  const put=(x,y,w,h)=>walls.push({x,y,w,h});
  for(let row=0;row<5;row++){
    const cy=145+row*235+indoorRand(rng,-7,14),h=181+indoorRand(rng,0,26);
    for(let side=0;side<2;side++){
      const x=side?rightWall:75+indoorRand(rng,0,35);
      const w=side?970-indoorRand(rng,0,35)-rightWall:leftWall-x;
      const doorY=cy+h/2+indoorRand(rng,-30,30);
      const room={id:row*2+side,name:names[row*2+side],x,y:cy,w,h,side,doorY};
      rooms.push(room);
      const gap=[doorY-37,doorY+37];(side?doorRight:doorLeft).push(gap);
      put(x,cy,w,10);put(x,cy+h-10,w,10);
      put(side?x+w-10:x,cy,10,h);
      // 家具は部屋の左右の壁際のみ。中央・出入口・重要情報への動線を確保する。
      const fx=side?x+w-81:x+22;
      const fy=cy+25+indoorRand(rng,0,16);
      furniture.push({x:fx,y:fy,w:59,h:32});
      furniture.push({x:fx,y:cy+h-62,w:59,h:36});
    }
  }
  // 廊下の左右の壁。部屋の扉の位置だけ切り欠き、すべての部屋へ入れる。
  function corridorSide(x,gaps){
    let y=69;
    for(const [start,end] of gaps.sort((a,b)=>a[0]-b[0])){
      if(start>y)put(x-5,y,10,start-y);
      y=Math.max(y,end);
    }
    if(y<1359)put(x-5,y,10,1359-y);
  }
  corridorSide(leftWall,doorLeft);corridorSide(rightWall,doorRight);
  put(leftWall,65,rightWall-leftWall,10);
  put(leftWall,1359,rightWall-leftWall,10);
  const order=indoorShuffle([...rooms.keys()],rng);
  const intel=order.slice(0,INDOOR_FILES_PER_FLOOR).map((i,index)=>{
    const q=rooms[i];
    return {x:q.side?q.x+q.w*.67:q.x+q.w*.33,y:q.y+q.h*.52,room:q.name,id:number+'-'+index,taken:false};
  });
  const center=(leftWall+rightWall)/2;
  const roomGuards=order.slice(3,5).map((i,index)=>{
    const q=rooms[i],x=q.x+q.w*.52;
    return {x,y:q.y+q.h*.37,waypoints:[{x,y:q.y+q.h*.37},{x,y:q.y+q.h*.67}],index:1,face:1.57,wait:index*.5,speed:55+indoorRand(rng,0,11),sight:215};
  });
  const guards=[
    {x:center-15,y:335,waypoints:[{x:center-15,y:335},{x:center-15,y:755}],index:1,face:1.57,wait:.5,speed:67,sight:245},
    {x:center+19,y:1090,waypoints:[{x:center+19,y:1090},{x:center+19,y:650}],index:1,face:-1.57,wait:1.2,speed:64,sight:235},
    ...roomGuards
  ];
  return {number,rooms,walls,furniture,guards,intel,stair:{x:center,y:105},exit:{x:center,y:1308},center};
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
    const roomNames=[];
    const rooms=raw.rooms.map(r=>{const rect=indoorRect(r,off);const room={...rect,id:r.id,name:r.name,doorY:r.doorY+off};roomNames.push(room);return room;});
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
    indoorWorld.floors.push({number:n,offset:off,centerX:INDOOR_OFFSET_X+raw.center*INDOOR_SCALE_X,rooms,stair,exit,guards});
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
    // Indoor surface under existing wall / crate / soldier sprites.
    g.fillStyle='#171e1c';g.fillRect(0,minY-25,WW,maxY-minY+50);
    g.fillStyle='#575d51';g.fillRect(f.centerX-64,minY,128,maxY-minY);
    for(const room of f.rooms){
      if(room.y+room.h<cy-40||room.y>cy+H+40)continue;
      g.fillStyle=(room.id%2===0?'#57594d':'#51584c');g.fillRect(room.x+3,room.y+3,room.w-6,room.h-6);
      g.strokeStyle='rgba(215,205,174,.08)';g.lineWidth=1;
      for(let ty=room.y+40;ty<room.y+room.h-8;ty+=38){g.beginPath();g.moveTo(room.x+9,ty);g.lineTo(room.x+room.w-9,ty);g.stroke();}
      g.font='bold 13px system-ui';g.textAlign='left';g.fillStyle='rgba(221,221,191,.75)';g.fillText(room.name,room.x+15,room.y+28);
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
    const next=mission.points.find(q=>!q.done),text='拠点潜入 '+(indoorWorld.currentFloor+1)+'階　重要情報 '+mission.index+'/'+mission.points.length;
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
