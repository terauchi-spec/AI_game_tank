/* 拠点潜入・独立サンプル。既存の野外ステージとスコア保存には介入しない。 */
(function(root){
'use strict';
const WIDTH=1040,HEIGHT=1400,OBJECTIVES_PER_FLOOR=3;
const rand=(rng,a,b)=>a+(b-a)*rng();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const shuffle=(arr,rng)=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
function generateFloor(number,rng=Math.random){
  const leftWall=438+rand(rng,-35,35),rightWall=leftWall+150;
  const rooms=[],walls=[],furniture=[],doorLeft=[],doorRight=[];
  const names=shuffle(['資料室','通信室','作戦室','兵員室','書庫','会議室','倉庫','解析室','記録室','機材室'],rng);
  const put=(x,y,w,h)=>walls.push({x,y,w,h});
  for(let row=0;row<5;row++){
    const cy=145+row*235+rand(rng,-7,14),h=181+rand(rng,0,26);
    for(let side=0;side<2;side++){
      const x=side?rightWall:75+rand(rng,0,35);
      const w=side?970-rand(rng,0,35)-rightWall:leftWall-x;
      const doorY=cy+h/2+rand(rng,-30,30);
      const room={id:row*2+side,name:names[row*2+side],x,y:cy,w,h,side,doorY};
      rooms.push(room);
      const gap=[doorY-37,doorY+37];(side?doorRight:doorLeft).push(gap);
      put(x,cy,w,10);put(x,cy+h-10,w,10);
      put(side?x+w-10:x,cy,10,h);
      // 家具は部屋の左右の壁際のみ。中央・出入口・重要情報への動線を確保する。
      const fx=side?x+w-81:x+22;
      const fy=cy+25+rand(rng,0,16);
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
  const order=shuffle([...rooms.keys()],rng);
  const intel=order.slice(0,OBJECTIVES_PER_FLOOR).map((i,index)=>{
    const q=rooms[i];
    return {x:q.side?q.x+q.w*.67:q.x+q.w*.33,y:q.y+q.h*.52,room:q.name,id:number+'-'+index,taken:false};
  });
  const center=(leftWall+rightWall)/2;
  const roomGuards=order.slice(3,5).map((i,index)=>{
    const q=rooms[i],x=q.x+q.w*.52;
    return {x,y:q.y+q.h*.37,waypoints:[{x,y:q.y+q.h*.37},{x,y:q.y+q.h*.67}],index:1,face:1.57,wait:index*.5,speed:55+rand(rng,0,11),sight:215};
  });
  const guards=[
    {x:center-15,y:335,waypoints:[{x:center-15,y:335},{x:center-15,y:755}],index:1,face:1.57,wait:.5,speed:67,sight:245},
    {x:center+19,y:1090,waypoints:[{x:center+19,y:1090},{x:center+19,y:650}],index:1,face:-1.57,wait:1.2,speed:64,sight:235},
    ...roomGuards
  ];
  return {number,rooms,walls,furniture,guards,intel,stair:{x:center,y:105},exit:{x:center,y:1308},center};
}
function circleHit(rect,x,y,r){
  const nearX=clamp(x,rect.x,rect.x+rect.w),nearY=clamp(y,rect.y,rect.y+rect.h);
  return (x-nearX)**2+(y-nearY)**2<r*r;
}
function blocked(floor,x,y,r=13){
  if(x<35||x>1005||y<70||y>1354)return true;
  for(const wall of floor.walls)if(circleHit(wall,x,y,r))return true;
  for(const f of floor.furniture)if(circleHit(f,x,y,r))return true;
  return false;
}
// 線分と矩形の交差：部屋の壁・家具が視線を遮る。
function segmentRect(ax,ay,bx,by,r){
  const dx=bx-ax,dy=by-ay;let t0=0,t1=1;
  for(const [p,q] of [[-dx,ax-r.x],[dx,r.x+r.w-ax],[-dy,ay-r.y],[dy,r.y+r.h-ay]]){
    if(Math.abs(p)<1e-8){if(q<0)return false;continue;}
    const v=q/p;
    if(p<0){if(v>t1)return false;t0=Math.max(t0,v);}
    else{if(v<t0)return false;t1=Math.min(t1,v);}
  }
  return t0<=t1;
}
function canGuardSee(floor,guard,player,sneaking=false){
  const dx=player.x-guard.x,dy=player.y-guard.y,d=Math.hypot(dx,dy);
  if(d>(sneaking?guard.sight*.65:guard.sight)||d<1)return false;
  let da=Math.atan2(dy,dx)-guard.face;
  da=Math.atan2(Math.sin(da),Math.cos(da));
  if(Math.abs(da)>(sneaking?.59:.83))return false;
  for(const w of floor.walls)if(segmentRect(guard.x,guard.y,player.x,player.y,w))return false;
  for(const f of floor.furniture)if(segmentRect(guard.x,guard.y,player.x,player.y,f))return false;
  return true;
}
const exportsForTests={generateFloor,blocked,canGuardSee,segmentRect,WIDTH,HEIGHT,OBJECTIVES_PER_FLOOR};
if(typeof module!=='undefined'&&module.exports)module.exports=exportsForTests;
if(typeof document==='undefined')return;
const screen=document.getElementById('infiltrationSample'),launch=document.getElementById('stageInfiltrationSample');
if(!screen||!launch)return;
const canvas=document.getElementById('infiltrationCanvas'),ctx=canvas.getContext('2d',{alpha:false});
const hud=document.getElementById('infiltrationHud'),hint=document.getElementById('infiltrationHint');
const action=document.getElementById('infiltrationAction'),status=document.getElementById('infiltrationStatus');
const overlay=document.getElementById('infiltrationEnd'),endTitle=document.getElementById('infiltrationEndTitle'),endBody=document.getElementById('infiltrationEndBody');
const arrows=new Set(),keys=new Set();let session=null,animation=0,lastTime=0,lastDraw=0,lastUI=0,dpr=1;
const isTouch=!!(root.matchMedia&&root.matchMedia('(pointer:coarse)').matches);
const announce=(t,seconds=2.8)=>{if(!session)return;session.message=t;session.messageUntil=performance.now()+seconds*1000;};
function newSession(){
  const floors=[generateFloor(1),generateFloor(2)];
  session={floors,floorIndex:0,x:floors[0].center,y:1268,found:0,total:2*OBJECTIVES_PER_FLOOR,exposure:0,sneak:false,active:true,over:false,elapsed:0,aiAcc:0,message:'',messageUntil:0};
  arrows.clear();keys.clear();overlay.hidden=true;status.textContent='';
  announce('青兵の視線を避け、各階の重要情報を集めよう',4);
}
function resize(){
  const rect=canvas.getBoundingClientRect();
  dpr=Math.min(root.devicePixelRatio||1,1.5);
  canvas.width=Math.max(1,Math.round(rect.width*dpr));
  canvas.height=Math.max(1,Math.round(rect.height*dpr));
}
function begin(){
  if(session&&session.active)return;
  newSession();
  document.body.classList.add('infiltration-open');screen.setAttribute('aria-hidden','false');
  resize();screen.focus({preventScroll:true});
  lastTime=performance.now();lastDraw=0;lastUI=0;
  if(animation)cancelAnimationFrame(animation);
  animation=requestAnimationFrame(tick);
}
function close(){
  if(session)session.active=false;
  if(animation)cancelAnimationFrame(animation);animation=0;
  arrows.clear();keys.clear();
  document.body.classList.remove('infiltration-open');screen.setAttribute('aria-hidden','true');
  // 親のステージ選択をそのまま復帰。攻略・セーブデータには触れない。
  launch.focus({preventScroll:true});
}
function finish(won){
  session.over=true;arrows.clear();keys.clear();overlay.hidden=false;
  endTitle.textContent=won?'潜入成功！':'発見された！';
  endBody.textContent=won?'重要情報をすべて奪取し、発見されずに帰還した。':'青兵に発見され、作戦は失敗。部屋の壁や家具で視線を切ろう。';
  status.textContent=won?'MISSION COMPLETE':'MISSION FAILED';
}
function climb(){
  if(!session||session.over)return;
  const f=session.floors[session.floorIndex];
  if(distance(session,f.stair)>69){announce('階段に近づいてから操作しよう');return;}
  session.floorIndex=1-session.floorIndex;
  const to=session.floors[session.floorIndex];
  session.x=to.center;session.y=145;session.exposure=0;
  announce((session.floorIndex+1)+'階に移動した',2.2);
}
function moveGuards(f,dt){
  for(const guard of f.guards){
    if(guard.wait>0){guard.wait-=dt;continue;}
    const dest=guard.waypoints[guard.index],dx=dest.x-guard.x,dy=dest.y-guard.y;
    const d=Math.hypot(dx,dy);
    if(d<3){guard.index=(guard.index+1)%guard.waypoints.length;guard.wait=.55;continue;}
    guard.face=Math.atan2(dy,dx);
    const step=Math.min(d,guard.speed*dt);
    guard.x+=dx/d*step;guard.y+=dy/d*step;
  }
}
function update(dt){
  const s=session;if(!s||s.over)return;
  const f=s.floors[s.floorIndex];s.elapsed+=dt;
  let x=Number(keys.has('ArrowRight')||keys.has('KeyD')||arrows.has('right'))-Number(keys.has('ArrowLeft')||keys.has('KeyA')||arrows.has('left'));
  let y=Number(keys.has('ArrowDown')||keys.has('KeyS')||arrows.has('down'))-Number(keys.has('ArrowUp')||keys.has('KeyW')||arrows.has('up'));
  if(x||y){
    const len=Math.hypot(x,y),speed=s.sneak?93:154;
    x=x/len*speed*dt;y=y/len*speed*dt;
    if(!blocked(f,s.x+x,s.y,13))s.x+=x;
    if(!blocked(f,s.x,s.y+y,13))s.y+=y;
  }
  s.aiAcc+=dt;
  // AIと視線判定は20Hz。描画負荷と独立させてモバイルでも軽量にする。
  while(s.aiAcc>=.05){
    s.aiAcc-=.05;
    moveGuards(f,.05);
    const seen=f.guards.some(g=>canGuardSee(f,g,s,s.sneak));
    s.exposure=clamp(s.exposure+(seen?.09:-.16),0,1);
    if(s.exposure>=1){finish(false);return;}
  }
  for(const intel of f.intel){
    if(!intel.taken&&distance(s,intel)<30){
      intel.taken=true;s.found++;
      announce('機密情報を回収！ '+s.found+'/'+s.total,3);
      if(s.found===s.total)announce('情報をすべて回収。1階の脱出地点へ！',5);
    }
  }
  if(s.floorIndex===0&&s.found===s.total&&distance(s,f.exit)<62){finish(true);}
}
function roundRect(x,y,w,h,r,fill,stroke){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
}
function drawPerson(x,y,face,color,player=false){
  ctx.save();ctx.translate(x,y);ctx.rotate(face);
  ctx.fillStyle='rgba(0,0,0,.36)';ctx.beginPath();ctx.ellipse(3,5,17,13,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=player?'#eb5550':'#90aed2';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-4,-11);ctx.lineTo(-4,11);ctx.stroke();
  ctx.fillStyle='#f1d9bd';ctx.fillRect(5,-5,9,10);
  ctx.strokeStyle='#0b1517';ctx.lineWidth=3;ctx.strokeRect(-10,-10,20,20);
  ctx.restore();
}
function draw(){
  if(!session)return;
  const s=session,f=s.floors[s.floorIndex];
  const cw=canvas.width/dpr,ch=canvas.height/dpr,zoom=clamp(cw/710,.51,.95),vw=cw/zoom,vh=ch/zoom;
  const camX=clamp(s.x-vw/2,0,Math.max(0,WIDTH-vw)),camY=clamp(s.y-vh/2,0,Math.max(0,HEIGHT-vh));
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0b100e';ctx.fillRect(0,0,cw,ch);
  ctx.save();ctx.scale(zoom,zoom);ctx.translate(-camX,-camY);
  // 無人の床は暗く、廊下と各室の内部のみを照らす。
  roundRect(f.center-75,65,150,1294,5,'#555746','#292c25');
  for(const r of f.rooms){
    roundRect(r.x+3,r.y+3,r.w-6,r.h-6,2,'#48483d','#5e5c4b');
    ctx.fillStyle='#666252';ctx.font='600 16px system-ui';ctx.fillText(r.name,r.x+22,r.y+28);
    ctx.strokeStyle='#56574a';ctx.lineWidth=1;ctx.setLineDash([4,16]);
    for(let xx=r.x+44;xx<r.x+r.w;xx+=60){ctx.beginPath();ctx.moveTo(xx,r.y+40);ctx.lineTo(xx,r.y+r.h-18);ctx.stroke();}
    ctx.setLineDash([]);
    ctx.fillStyle='#b7a77d';ctx.fillRect(r.side?r.x-2:r.x+r.w-3,r.doorY-37,5,74);
  }
  ctx.strokeStyle='rgba(220,204,163,.12)';ctx.lineWidth=1;
  for(let y=100;y<1360;y+=55){ctx.beginPath();ctx.moveTo(f.center-70,y);ctx.lineTo(f.center+70,y);ctx.stroke();}
  for(const q of f.furniture){roundRect(q.x+2,q.y+3,q.w,q.h,3,'#242d28','#7d6a50');ctx.fillStyle='#77644b';ctx.fillRect(q.x+7,q.y+9,q.w-10,4);}
  for(const w of f.walls){ctx.fillStyle='#161d1b';ctx.fillRect(w.x-2,w.y-2,w.w+4,w.h+4);ctx.fillStyle='#838778';ctx.fillRect(w.x,w.y,w.w,w.h);}
  // 射界は薄い赤。壁で遮られた実際の判定はcanGuardSeeが担当。
  for(const guard of f.guards){
    ctx.beginPath();ctx.moveTo(guard.x,guard.y);
    for(let i=0;i<=12;i++){
      const a=guard.face-.83+1.66*i/12;
      ctx.lineTo(guard.x+Math.cos(a)*guard.sight,guard.y+Math.sin(a)*guard.sight);
    }
    ctx.closePath();ctx.fillStyle='rgba(210,52,42,.10)';ctx.fill();
    drawPerson(guard.x,guard.y,guard.face,'#284c76');
  }
  for(const item of f.intel){
    if(item.taken)continue;
    ctx.fillStyle='rgba(245,211,112,.13)';ctx.beginPath();ctx.arc(item.x,item.y,29,0,Math.PI*2);ctx.fill();
    roundRect(item.x-15,item.y-16,30,32,3,'#d7bd6d','#fff0ab');
    ctx.fillStyle='#292c22';ctx.font='bold 19px system-ui';ctx.textAlign='center';ctx.fillText('秘',item.x,item.y+7);ctx.textAlign='start';
  }
  roundRect(f.stair.x-39,f.stair.y-29,78,58,4,'#334f50','#83a7a2');
  ctx.fillStyle='#d4e8de';ctx.textAlign='center';ctx.font='bold 17px system-ui';ctx.fillText('階段',f.stair.x,f.stair.y+6);
  if(s.floorIndex===0){
    roundRect(f.exit.x-46,f.exit.y-26,92,52,5,'#4a4830','#c2b06a');
    ctx.fillStyle='#fff0ac';ctx.font='bold 17px system-ui';ctx.fillText('脱出',f.exit.x,f.exit.y+6);
  }
  ctx.textAlign='start';
  if(s.exposure>0){
    ctx.strokeStyle='#ff654c';ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.x,s.y,21,-Math.PI/2,-Math.PI/2+Math.PI*2*s.exposure);ctx.stroke();
  }
  drawPerson(s.x,s.y,-Math.PI/2,'#707a56',true);
  ctx.restore();
  const shade=ctx.createRadialGradient(cw/2,ch/2,Math.min(cw,ch)*.13,cw/2,ch/2,Math.max(cw,ch)*.75);
  shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.58)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,cw,ch);
}
function updateUI(now){
  const s=session;if(!s)return;const f=s.floors[s.floorIndex];
  hud.textContent=(s.floorIndex+1)+'F  ｜ 情報 '+s.found+'/'+s.total+' ｜ 発見危険 '+Math.round(s.exposure*100)+'%';
  const near=distance(s,f.stair)<69;action.disabled=s.over||!near;
  action.textContent=near?'階段で '+(s.floorIndex===0?'2F':'1F')+' へ':'階段に近づく';
  hint.textContent=now<s.messageUntil?s.message:s.over?'作戦終了':s.found===s.total?'1Fの脱出地点に帰還しよう':s.exposure>.25?'警戒！ 部屋や家具の陰に隠れよう':'部屋を探索して情報を集めよう';
  screen.classList.toggle('infiltration-danger',s.exposure>.35);
  const sneak=document.getElementById('infiltrationSneak');sneak.setAttribute('aria-pressed',String(s.sneak));sneak.textContent=s.sneak?'忍び足 ON':'忍び足 OFF';
}
function tick(now){
  if(!session||!session.active)return;
  const dt=clamp((now-lastTime)/1000,0,.04);lastTime=now;
  if(!document.hidden){update(dt);if(!isTouch||now-lastDraw>32){draw();lastDraw=now;}if(now-lastUI>115){updateUI(now);lastUI=now;}}
  animation=requestAnimationFrame(tick);
}
function keyHandler(event,pressed){
  if(!session||!session.active)return;
  const code=event.code;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyE','Enter','Space','ShiftLeft','ShiftRight','Escape'].includes(code)){
    event.preventDefault();event.stopImmediatePropagation();
    if(pressed&&event.repeat&&['KeyE','Enter','Space','Escape'].includes(code))return;
    if(pressed)keys.add(code);else keys.delete(code);
    if(pressed&&(code==='KeyE'||code==='Enter'||code==='Space'))climb();
    if(pressed&&code==='Escape')close();
    if(code==='ShiftLeft'||code==='ShiftRight')session.sneak=pressed;
  }
}
root.addEventListener('keydown',e=>keyHandler(e,true),true);
root.addEventListener('keyup',e=>keyHandler(e,false),true);
root.addEventListener('blur',()=>{keys.clear();arrows.clear();});
document.addEventListener('visibilitychange',()=>{keys.clear();arrows.clear();lastTime=performance.now();});
launch.addEventListener('click',begin);
document.getElementById('infiltrationBack').addEventListener('click',close);
document.getElementById('infiltrationRetry').addEventListener('click',()=>{if(session)session.active=false;begin();});
document.getElementById('infiltrationEndBack').addEventListener('click',close);
action.addEventListener('click',climb);
document.getElementById('infiltrationSneak').addEventListener('click',()=>{if(session&&!session.over)session.sneak=!session.sneak;});
for(const button of screen.querySelectorAll('[data-inf-dir]')){
  const dir=button.dataset.infDir;
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);arrows.add(dir);},{passive:false});
  const end=e=>{e.preventDefault();arrows.delete(dir);};
  button.addEventListener('pointerup',end,{passive:false});
  button.addEventListener('pointercancel',end,{passive:false});
  button.addEventListener('lostpointercapture',()=>arrows.delete(dir));
}
root.addEventListener('resize',()=>{if(session&&session.active)resize();});
root.tankInfiltrationSample={open:begin,close,generateFloor,canGuardSee,blocked};
})(typeof window!=='undefined'?window:globalThis);
