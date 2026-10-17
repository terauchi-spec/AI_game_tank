// Frontline-only presentation and infantry waves. Reuse existing combat and obstacle AI.
const FRONTLINE_ENEMY_LIMIT=16,FRONTLINE_CAPTURE_SECONDS=48,FRONTLINE_CAPTURE_RADIUS=360;
function isFrontlineBeginner(){return stageMode==='front'&&typeof frontlineBeginner!=='undefined'&&frontlineBeginner&&!areaDebugEnabled;}
function frontlineCaptureRadius(point){return point?.captureRadius||FRONTLINE_CAPTURE_RADIUS;}
function frontlineTankSightScale(unit){return stageMode==='front'&&(etanks||[]).includes(unit)?2:1;}
// North of the last capture circle is outside this operation. Keep reserve
// spawn space off camera while stopping the player and friendly ground units.
function frontlineNorthEdge(){return stageMode==='front'&&!areaDebugEnabled&&Number.isFinite(mission?.northEdge)?mission.northEdge:0;}
function setupFrontlineBoundary(){
 if(stageMode!=='front'||areaDebugEnabled||!mission?.points.length)return;
 const last=mission.points[mission.points.length-1];
 mission.northEdge=Math.max(0,last.y-frontlineCaptureRadius(last)-180);
}
function frontlineMovementTop(unit,r){
 const friendly=unit===p||unit.frontline||(typeof partner!=='undefined'&&unit===partner);
 return friendly?frontlineNorthEdge()+r:r;
}
function enforceFrontlineBoundary(){
 const edge=frontlineNorthEdge();if(!edge||!p)return;
 const radius=p.tank?TANK_HIT:10;
 p.y=Math.max(edge+radius,p.y);
 if(p.partnerDriver&&typeof partner!=='undefined'&&partner?.vehicle)partner.y=p.y;
}
function frontlineView(){
 return{x:Math.max(0,Math.min(WW-W,p.x-W/2)),y:Math.max(frontlineNorthEdge(),Math.min(WH-H,p.y-H*.6)),w:W,h:H};
}
function frontlineSpawnSpot(hasDog=false){
 const view=frontlineView(),columns=12,phase=R()*columns|0;
 // Search only ABOVE the current camera. Never fall back to an on-screen point.
 for(let row=0;row<8;row++){
  const y=view.y-(hasDog?180:90)-row*48;if(y<24)continue;
  for(let n=0;n<columns;n++){
   const x=view.x+24+(((n+phase)%columns)+.5)*(Math.min(W,WW)-48)/columns,q={x,y};
   if(hitsM(x,y,24)||inWaterAt(x,y,10)||inBase(x,y)||humans.some(h=>h.alive&&D(h,q)<38)||enemyDogs.some(d=>D(d,q)<30)||etanks.some(e=>e.alive&&D(e,q)<TANK_HIT+18)||cars.some(v=>D(v,q)<TANK_HIT+18))continue;
   if(hasDog){const dog={x,y:y+75};if(hitsM(dog.x,dog.y,8)||inWaterAt(dog.x,dog.y,8)||inBase(dog.x,dog.y)||humans.some(h=>h.alive&&D(h,dog)<38)||enemyDogs.some(d=>D(d,dog)<30)||!patrolLineClear(q,dog,8))continue;}
   if(!frontlineSpawnExitClear(q,hasDog))continue;
   return q;
  }
 }
 return null;
}
function spawnFrontlineWave(count=3,counterPoint=null){
 if(stageMode!=='front'||!mission||areaDebugEnabled||mission.enemyWavesStarted===false)return 0;
 const m=mission,active=humans.reduce((n,h)=>n+Number(!!h.alive),0),available=Math.min(count,(isFrontlineBeginner()?10:FRONTLINE_ENEMY_LIMIT)-active);
 let spawned=0;
 for(let i=0;i<available;i++){
  const roster=m.enemyRoster||[],index=m.enemyRosterIndex||0;
  const wantBlue=(counterPoint?.counterBluePending||0)>0||(isFrontlineBeginner()?(!counterPoint&&((m.enemySpawned||0)+1)%8===0):(m.enemySpawned||0)%4===0);
  let candidate=roster[index];
  if(wantBlue){
   const blueIndex=roster.findIndex((h,i)=>i>=index&&h.commander==='blue');
   if(blueIndex>=0){[roster[index],roster[blueIndex]]=[roster[blueIndex],roster[index]];candidate=roster[index];}
   else candidate={alive:true,elite:false,commander:'blue',commanderScan:0,commanderTactics:0,commanderMode:'intercept',commanderCharge:0,commanderCooldown:2,whistleT:0,whistleCooldown:0};
  }
  const spot=frontlineSpawnSpot(!!candidate?.dog);if(!spot)break;
  const h=candidate||{alive:true,elite:false};if(candidate===roster[index]&&candidate)m.enemyRosterIndex=index+1;
  m.enemySpawned=(m.enemySpawned||0)+1;
  if(counterPoint&&h.commander==='blue')counterPoint.counterBluePending=Math.max(0,(counterPoint.counterBluePending||0)-1);
  Object.assign(h,spot,{alive:true,st:0,sus:0,lost:0,target:null,cd:1,burstLeft:0,face:Math.PI/2,
   frontMarch:true,frontLaneX:spot.x,frontObjective:counterPoint?{x:counterPoint.x,y:counterPoint.y}:null,frontRetired:false,frontStuck:0,scoreCounted:false,
   path:[],wi:0,dir:1,loop:false,stk:0,turnPause:0,modePause:0,modeFrozen:false,
   buildingPatrol:false,patrolCover:null,edgePatrol:null,returnRoute:null,patrolSearch:null,
   chatT:0,chatMate:null,chatResumeT:0,chatCooldown:0,foundPause:0,sharePause:0,
   wallFollow:null,dogWall:null,dogEscape:null,_detectCache:null,_nextDetectAt:0});
  humans.push(h);
  if(h.dog){const dog=h.dog;Object.assign(dog,{x:h.x,y:h.y+75,handler:h,face:Math.PI/2,state:'patrol',targetKey:null,dogWall:null,dogEscape:null,southX:h.x,southY:h.y+75});enemyDogs.push(dog);}
  spawned++;
 }
 return spawned;
}
function setupFrontlineArmy(){
 if(stageMode!=='front'||!mission||areaDebugEnabled)return;
 // Keep the generated infantry classes in reserve, rather than updating an entire map of patrols.
 if(isFrontlineBeginner()){
  for(const h of humans){h.commander=null;h.elite=false;h.dog=null;h.dogHandler=false;}
  etanks=etanks.filter(e=>e.alive&&e.y<10800);
  for(let i=etanks.length-1;i>0;i--){const j=R()*(i+1)|0;[etanks[i],etanks[j]]=[etanks[j],etanks[i]];}
  etanks.length=Math.min(2,etanks.length);
 }
 mission.enemyRoster=humans.slice();mission.enemyRosterIndex=0;
 for(const h of mission.enemyRoster){h.path=[];h.chatT=0;h.chatMate=null;}
 for(let i=mission.enemyRoster.length-1;i>0;i--){const j=R()*(i+1)|0;[mission.enemyRoster[i],mission.enemyRoster[j]]=[mission.enemyRoster[j],mission.enemyRoster[i]];}
 humans=[];enemyDogs=[];mission.cleanupT=1;mission.enemyEntryY=p.y-800;mission.enemyWavesStarted=false;
}
function frontlineFirstObjectiveSpot(){
 // 初期配置時だけ探索する。橋と水際を避け、南部の陸上に前後・左右の変化をつける。
 const clear=(x,y)=>!hitsM(x,y,75)&&!inWaterAt(x,y,90)&&!inBase(x,y)&&
  !bridges.some(b=>x+120>b.x&&x-120<b.x+b.w&&y+120>b.y&&y-120<b.y+b.h)&&
  !cars.some(v=>D(v,{x,y})<100)&&!etanks.some(e=>e.alive&&D(e,{x,y})<100);
 for(let i=0;i<48;i++){
  const x=180+R()*(WW-360),y=9300+R()*1400;
  if(clear(x,y))return{x,y};
 }
 // 候補が障害物に重なり続けても、探索回数を制限した陸上走査で補う。
 for(let offset=0;offset<=900;offset+=100)for(const sign of offset?[1,-1]:[1])for(let x=180;x<=WW-180;x+=100){
  const y=10000+offset*sign;if(clear(x,y))return{x,y};
 }
 return missionSpot(WW/2,10000,75);
}
function frontlineAntennaGeometry(point,index){
 const large=index===2||!!point.largeAntenna,height=large?480:280,width=height/2;
 return{large,width,height,x:point.x-width/2,y:point.y-height*(large?.92:.89),cutY:point.y-(large?30:20),
  base:{x:point.x-(large?52:17),y:point.y-(large?22:10),w:large?104:34,h:large?44:20}};
}
function frontlineCargoLayout(point,index){
 const large=index===1,width=large?220:280,height=large?147:140,offsets=large?[-120,120]:[0];
 return offsets.map(offset=>{
  const x=point.x+offset-width/2,y=point.y-height*.6;
  const cargo={x,y,width,height,asset:large?'frontline_cargo_large':'frontline_cargo_small',damage:[]};
  cargo.collider={x:x+width*.14,y:y+height*.08,w:width*.72,h:height*.84,kd:1,frontAntenna:true,frontCargo:cargo};return cargo;
 });
}
function setupFrontlineCargo(){
 for(let index=0;index<mission.points.length;index++){
  const point=mission.points[index];if(point.cargo)continue;
  const clearance=spot=>{
   const layout=frontlineCargoLayout(spot,index);
   for(const cargo of layout){
    const c=cargo.collider;if(cargo.x<12||cargo.x+cargo.width>WW-12)return false;
    if(cars.some(v=>v.x+48>c.x&&v.x-48<c.x+c.w&&v.y+48>c.y&&v.y-48<c.y+c.h)||etanks.some(e=>e.alive&&e.x+48>c.x&&e.x-48<c.x+c.w&&e.y+48>c.y&&e.y-48<c.y+c.h))return false;
    for(let row=0;row<=4;row++)for(let col=0;col<=6;col++){
     const x=c.x+c.w*col/6,y=c.y+c.h*row/4;
     if(hitsM(x,y,18)||inWaterAt(x,y,18)||inBase(x,y))return false;
    }
   }
   return true;
  };
  let chosen=null;
  // 配置時のみ探索し、人物の通路とコンテナ本体に余白を確保する。
  for(let ring=0;ring<=16&&!chosen;ring++)for(let n=0;n<(ring?12:1);n++){
   const angle=n*Math.PI/6,spot={x:Math.max(index?272:160,Math.min(WW-(index?272:160),point.x+Math.cos(angle)*ring*60)),y:Math.max(500,Math.min(WH-900,point.y+Math.sin(angle)*ring*60))};
   if(clearance(spot)){chosen=spot;break;}
  }
  if(!chosen){
   for(let y=point.y-1400;y<=point.y+1400&&!chosen;y+=80)for(let x=index?272:160;x<=WW-(index?272:160);x+=80){const spot={x,y};if(y>500&&y<WH-900&&clearance(spot)){chosen=spot;break;}}
  }
  if(chosen){point.x=chosen.x;point.y=chosen.y;}
  point.cargo=frontlineCargoLayout(point,index);for(const cargo of point.cargo)covers.push(cargo.collider);
 }
 rebuildSpatialGrid();
}
function damageFrontlineCargo(c,x,y,r=0){
 const cargo=c?.frontCargo;if(!cargo||cargo.damage.length>=6||x+r<c.x||x-r>c.x+c.w||y+r<c.y||y-r>c.y+c.h)return false;
 let px=Math.max(c.x,Math.min(c.x+c.w,x)),py=Math.max(c.y,Math.min(c.y+c.h,y));
 const edge=Math.min(px-c.x,c.x+c.w-px,py-c.y,c.y+c.h-py);
 if(edge===px-c.x)px=c.x;else if(edge===c.x+c.w-px)px=c.x+c.w;else if(edge===py-c.y)py=c.y;else py=c.y+c.h;
 px-=cargo.x;py-=cargo.y;if(cargo.damage.some(d=>Math.hypot(d.x-px,d.y-py)<10))return false;
 cargo.damage.push({x:px,y:py});return true;
}
function drawFrontlineCargo(cargo){
 const im=COVER_IMG[cargo.asset];if(!assetOK(im))return;
 let sprite=im;
 if(cargo.damage.length){
  if(cargo.rasterVersion!==cargo.damage.length){
   const canvas=cargo.raster||(cargo.raster=document.createElement('canvas'));canvas.width=cargo.width*2;canvas.height=cargo.height*2;
   const ctx=gameCanvasContext(canvas);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.scale(2,2);ctx.drawImage(im,0,0,cargo.width,cargo.height);
   // 小さな欠けは最大6か所。コリジョンと大部分の外形は壊さない。
   ctx.globalCompositeOperation='destination-out';for(const d of cargo.damage){ctx.beginPath();ctx.arc(d.x,d.y,4.5,0,Math.PI*2);ctx.fill();}
   ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(27,25,19,.85)';ctx.lineWidth=2;
   for(const d of cargo.damage){ctx.beginPath();ctx.moveTo(d.x-5,d.y+6);ctx.lineTo(d.x+6,d.y+2);ctx.stroke();}
   cargo.rasterVersion=cargo.damage.length;
  }
  sprite=cargo.raster;
 }
 const smooth=g.imageSmoothingEnabled,quality=g.imageSmoothingQuality;
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 g.drawImage(sprite,cargo.x,cargo.y,cargo.width,cargo.height);
 g.imageSmoothingEnabled=smooth;g.imageSmoothingQuality=quality;
}
function drawFrontlineCargoNative(cx,cy){
 if(MOBILE_VIEW||!isFrontlineBeginner()||!mission)return;
 // PCの低解像度転写を避け、画面内の最大3枚だけ表示Canvasへ直接描く。
 const previous=g;g=gm;gm.save();gm.setTransform(1,0,0,1,-cx,-cy);
 for(const point of mission.points)for(const cargo of point.cargo||[]){
  if(cargo.x+cargo.width<cx||cargo.x>cx+W||cargo.y+cargo.height<cy||cargo.y>cy+H)continue;
  drawFrontlineCargo(cargo);
 }
 gm.restore();g=previous;
}
function drawFrontlineCargoVictory(v){
 const cx=Math.round(camX/2)*2,cy=Math.round(cam/2)*2,t=v.elapsed-.5;
 gm.save();gm.setTransform(1,0,0,1,0,0);
 for(const cargo of v.point.cargo)for(let i=0;i<12;i++){
  const phase=t*2.8+i*.83,alpha=Math.pow(Math.max(0,Math.sin(phase)),3);if(alpha<.04)continue;
  const x=cargo.x+cargo.width*(.16+((i*.618)%1)*.68)-cx,y=cargo.y+cargo.height*(.12+((i*.382)%1)*.72)-cy,r=3+alpha*7;
  gm.globalAlpha=alpha;gm.fillStyle=i%2?'#fff9d6':'#ffe08b';gm.beginPath();gm.moveTo(x,y-r);gm.lineTo(x+r*.23,y-r*.23);gm.lineTo(x+r,y);gm.lineTo(x+r*.23,y+r*.23);gm.lineTo(x,y+r);gm.lineTo(x-r*.23,y+r*.23);gm.lineTo(x-r,y);gm.lineTo(x-r*.23,y-r*.23);gm.closePath();gm.fill();
 }
 gm.restore();
}
function setupFrontlineAntennas(){
 if(stageMode!=='front'||!mission||areaDebugEnabled)return;
 if(isFrontlineBeginner()){setupFrontlineCargo();return;}
 for(let i=0;i<mission.points.length;i++){
  const point=mission.points[i];if(point.antenna)continue;
  const radius=i===2||point.largeAntenna?75:35,clear=spot=>!cars.some(v=>D(v,spot)<radius+50)&&!etanks.some(e=>e.alive&&D(e,spot)<radius+45);
  if(!clear(point)){
   let free=null;
   for(let ring=1;ring<=8&&!free;ring++)for(let n=0;n<12;n++){
    const angle=n*Math.PI/6,spot=missionSpot(point.x+Math.cos(angle)*ring*60,point.y+Math.sin(angle)*ring*60,radius);
    if(clear(spot)){free=spot;break;}
   }
   if(free){point.x=free.x;point.y=free.y;}
  }
  const shape=frontlineAntennaGeometry(point,i);
  const collider={...shape.base,kd:1,frontAntenna:true};
  point.antenna={...shape,collider,asset:shape.large?'frontline_antenna_large':'frontline_antenna_small'};covers.push(collider);
 }
 rebuildSpatialGrid();
}
function drawFrontlineAntennas(cx,cy,upper=false){
 if(stageMode!=='front'||!mission)return;
 for(const point of mission.points){
  if(point.cargo){if(upper&&(typeof MOBILE_VIEW==='undefined'||MOBILE_VIEW))for(const cargo of point.cargo)if(cargo.x+cargo.width>=cx&&cargo.x<=cx+W&&cargo.y+cargo.height>=cy&&cargo.y<=cy+H)drawFrontlineCargo(cargo);continue;}
  const a=point.antenna;if(!a||a.x+a.width<cx||a.x>cx+W||a.y+a.height<cy||a.y>cy+H)continue;
  const im=COVER_IMG[a.asset];if(!assetOK(im))continue;
  if(upper){
   const fraction=Math.max(0,Math.min(1,(a.cutY-a.y)/a.height));
   g.drawImage(im,0,0,im.naturalWidth,im.naturalHeight*fraction,a.x,a.y,a.width,a.height*fraction);
  }else g.drawImage(im,a.x,a.y,a.width,a.height);
 }
}
function setupFrontlineVehicles(){
 if(stageMode!=='front'||!mission||areaDebugEnabled||mission.startVehiclesAdded)return 0;
 const rear=allies.reduce((y,a)=>a.alive&&a.frontline?Math.max(y,a.y):y,p.y)+90;
 const specs=[{t:TRUCK_TYPE,dx:-80,dy:0},{t:TRUCK_TYPE,dx:80,dy:0},{t:ARMORED_TYPE,dx:-80,dy:120},{t:ARMORED_TYPE,dx:80,dy:120}];
 const clear=(x,y)=>{
  const q={x,y};
  return x>=52&&x<=WW-52&&y>=rear&&y<=WH-52&&!hitsM(x,y,44)&&!inWaterAt(x,y,44)&&!inBase(x,y)&&D(q,p)>=80
   &&!cars.some(v=>D(v,q)<108)&&!etanks.some(e=>e.alive&&D(e,q)<90)&&!allies.some(a=>a.alive&&D(a,q)<68)
   &&patrolLineClear(q,{x,y:y-100},24);
 };
 let added=0;
 for(let i=0;i<specs.length;i++){
  if(cars.some(v=>v.frontStartSlot===i))continue;
  const spec=specs[i];let spot=null;
  const x=p.x+spec.dx,y=rear+spec.dy;
  if(clear(x,y))spot={x,y};
  // Startup-only bounded search: stay behind the formation and leave room to board and drive.
  for(let yy=rear;!spot&&yy<=WH-52;yy+=32)for(let xx=52;xx<=WW-52;xx+=32)if(clear(xx,yy)){spot={x:xx,y:yy};break;}
  if(!spot)continue;
  const t=spec.t;cars.push({...spot,t,kind:t.id==='truck'?'truck':'tank',hp:t.hp,c:t.cmax||0,v:t.vmax||0,f:t.fmax,ch:0,mgHits:0,body:-Math.PI/2,frontStartSlot:i});added++;
 }
 mission.startVehiclesAdded=cars.filter(v=>Number.isInteger(v.frontStartSlot)).length===4;
 return added;
}
function cleanupFrontlineArmy(dt){
 if(!mission)return;
 mission.cleanupT=(mission.cleanupT||0)-dt;if(mission.cleanupT>0)return;mission.cleanupT=1;
 const view=frontlineView(),bottom=view.y+H+200;
 for(const h of humans)if(h.frontMarch&&h.alive&&(h.y>bottom||h.y>WH-28||h.y<view.y-700||h.x<view.x-160||h.x>view.x+view.w+160)){
  // Walking out is not a kill. Never award score or a title for despawning infantry.
  h.frontRetired=true;h.alive=false;h.scoreCounted=true;
 }
 humans=humans.filter(h=>h.alive||!h.scoreCounted);
 enemyDogs=enemyDogs.filter(d=>!d.handler?.frontRetired);
}
function moveFrontlineEnemy(h,dt,speed){
 if(h.frontAreaAlert)speed=Math.max(speed,h.commander==='white'?142.5:h.elite?114:95);
 if(!Number.isFinite(h.frontMarchGoalY)||h.y>h.frontMarchGoalY-30)h.frontMarchGoalY=Math.min(WH-16,h.y+240);
 const ox=h.x,oy=h.y,goal=h.frontObjective||{x:h.frontLaneX??h.x,y:h.frontMarchGoalY};
 moveFrontlineInfantry(h,goal,speed,dt);
 const moved=Math.hypot(h.x-ox,h.y-oy);h.frontStuck=moved<.02?(h.frontStuck||0)+dt:0;
 // Change lanes when blocked by another soldier; never turn back along a patrol route.
 if(h.frontStuck>4.5&&!h.patrolSearch&&!h.frontNav?.route){h.frontLaneX=Math.max(24,Math.min(WW-24,h.x+(R()<.5?-1:1)*90));h.dogWall=null;h.frontStuck=0;}
 if(moved>.02)h.frontMoveFace=Math.atan2(h.y-oy,h.x-ox);
 return h.frontMoveFace??Math.PI/2;
}
const FRONTLINE_CAPTURE_COLORS={
 ready:{stroke:'#8dd3ff',fill:'rgba(95,185,210,.13)',track:'rgba(141,211,255,.24)',text:'#d5f0ff'},
 contested:{stroke:'#ffac52',fill:'rgba(255,153,55,.17)',track:'rgba(255,172,82,.28)',text:'#ffe0b6'},
 done:{stroke:'#9de7ae',fill:'rgba(75,170,100,.15)',track:'rgba(157,231,174,.24)',text:'#d5f0ff'}
};
function frontlineCaptureColors(point,m){
 if(point.done)return FRONTLINE_CAPTURE_COLORS.done;
 const active=m.points[m.index]===point;
 return active&&(point.captureStarted||m.progress>0)&&(m.enemiesInside??m.contested)?FRONTLINE_CAPTURE_COLORS.contested:FRONTLINE_CAPTURE_COLORS.ready;
}
function beginFrontlineVictory(){
 if(stageMode!=='front'||!mission||!mission.points.length||mission.index!==mission.points.length||!mission.points.every(q=>q.done))return false;
 mission.victory={elapsed:0,duration:3,point:mission.points[mission.points.length-1],fromX:camX,fromY:cam};
 state='frontVictory';return true;
}
function updateFrontlineVictory(dt){
 if(state!=='frontVictory'||!mission?.victory)return;
 const v=mission.victory;v.elapsed=Math.min(v.duration,v.elapsed+dt);
 if(v.elapsed>=v.duration){state='succeeded';successFrameDrawn=false;}
}
function frontlineVictoryCamera(){
 const v=stageMode==='front'&&mission?.victory;
 if(!v||!['frontVictory','succeeded','win'].includes(state))return null;
 const a=v.point.cargo?{height:180}:v.point.antenna||frontlineAntennaGeometry(v.point,2),t=Math.min(1,v.elapsed/.7),ease=t*t*(3-2*t);
 const x=Math.max(0,Math.min(WW-W,v.point.x-W/2)),y=Math.max(frontlineNorthEdge(),Math.min(WH-H,v.point.y-a.height*.43-H/2));
 return{x:v.fromX+(x-v.fromX)*ease,y:v.fromY+(y-v.fromY)*ease};
}
function drawFrontlineVictorySignal(){
 const v=state==='frontVictory'&&stageMode==='front'&&mission?.victory;if(!v||v.elapsed<.5)return;
 if(v.point.cargo){drawFrontlineCargoVictory(v);return;}
 const a=v.point.antenna||frontlineAntennaGeometry(v.point,2),x=v.point.x-Math.round(camX/2)*2,y=a.y+12-Math.round(cam/2)*2;
 gm.save();gm.setTransform(1,0,0,1,0,0);gm.strokeStyle='#a2eaff';gm.lineWidth=4;
 // Three simple rings; no extra images, particles or ongoing work after the transition.
 for(let i=0;i<3;i++){
  const phase=(v.elapsed-.5-i*.5)/1.5;if(phase<0||phase>1)continue;
  gm.globalAlpha=Math.sin(Math.PI*phase)*.9;gm.beginPath();gm.arc(x,y,18+phase*300,0,Math.PI*2);gm.stroke();
 }
 gm.restore();
}
function frontlineCaptureVisual(m){
 const fraction=Math.max(0,Math.min(1,(m.progress||0)/FRONTLINE_CAPTURE_SECONDS));
 const remaining=Math.max(0,FRONTLINE_CAPTURE_SECONDS-(m.progress||0))/Math.max(1,m.captureRate||1);
 return{fraction,remaining,label:m.captureReady===false&&!m.contested?'プレイヤーの進入待ち':m.captureCount===0&&!m.contested?'味方兵の合流待ち':(m.contested?'敵が範囲内 ／ ':m.capturing?'制圧まで ':'制圧一時停止 ／ 残り ')+remaining.toFixed(1)+'秒'+(m.capturing&&m.captureCount>1?'（'+m.captureCount+'人）':'')};
}
function drawFrontlineCaptureRing(point,x,y,m){
 const active=m.points[m.index]===point,waiting=m.captureCount===0&&D(p,point)<frontlineCaptureRadius(point);if(!active||(!(m.progress>0)&&!m.capturing&&!waiting))return;
 const status=frontlineCaptureVisual(m),radius=frontlineCaptureRadius(point),colors=frontlineCaptureColors(point,m);
 gm.save();gm.lineWidth=7;gm.strokeStyle=colors.track;gm.beginPath();gm.arc(x,y,radius,0,Math.PI*2);gm.stroke();
 if(status.fraction>0){gm.strokeStyle=colors.stroke;gm.lineCap='round';gm.beginPath();gm.arc(x,y,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*status.fraction);gm.stroke();}
 gm.textAlign='center';gm.font='bold 16px system-ui';gm.lineWidth=4;gm.strokeStyle='rgba(0,0,0,.8)';const labelY=y+(point.cargo?136:point.antenna?86:-35);gm.strokeText(status.label,x,labelY);gm.fillStyle=colors.text;gm.fillText(status.label,x,labelY);gm.restore();
}
function frontlineArrowPosition(){return{x:W-26,y:68};}
function drawFrontlineArrow(point){
 if(!point)return;
 const {x,y}=frontlineArrowPosition(),angle=Math.atan2(point.y-p.y,point.x-p.x);
 gm.save();gm.translate(x,y);gm.rotate(angle);gm.fillStyle='#ffe1a0';gm.strokeStyle='rgba(0,0,0,.85)';gm.lineWidth=3;gm.beginPath();gm.moveTo(13,0);gm.lineTo(-8,-8);gm.lineTo(-5,0);gm.lineTo(-8,8);gm.closePath();gm.stroke();gm.fill();gm.restore();
}

// Spawn-only checks: leave clearance around the unit AND a dry southbound exit.
function frontlineSpawnExitClear(q,hasDog=false){
 const end={x:q.x,y:q.y+(hasDog?150:110)};
 if(!patrolLineClear(q,end,14))return false;
 for(let y=q.y+16;y<=end.y;y+=16){
  if(hitsM(q.x,y,14)||inBase(q.x,y)||humans.some(h=>h.alive&&Math.hypot(h.x-q.x,h.y-y)<30)||enemyDogs.some(d=>Math.hypot(d.x-q.x,d.y-y)<26)||etanks.some(e=>e.alive&&Math.hypot(e.x-q.x,e.y-y)<TANK_HIT+22)||cars.some(v=>Math.hypot(v.x-q.x,v.y-y)<TANK_HIT+22))return false;
 }
 return true;
}
function frontlineAllyLimit(){return Math.max(24,frontlineView().y-80);}
function frontlineAllyStyle(a){
 if(!a.frontStyle){
  const base=a.speedScale??1;
  a.frontStyle={lane:((a.id??a.slot??0)%3-1)*120+(R()-.5)*80,offsetY:(R()-.5)*220,
   depth:R()*100,hold:2+R()*2.5,stop:24+R()*24,pace:base,paceTarget:base,paceT:1+R()*4,marchT:4+R()*6,rest:0};
 }
 return a.frontStyle;
}
function frontlineAllyObjective(a,point){
 const style=frontlineAllyStyle(a);
 if(style.objective!==point){
  style.objective=point;style.goal={x:point.x,y:point.y};
  // Choose once per objective. Stable destinations keep the existing detour cache useful.
  for(const scale of [1,.75,.5,.25]){
   const x=Math.max(24,Math.min(WW-24,point.x+style.lane*scale)),y=point.y+style.offsetY*scale;
   if(y>24&&y<WH-24&&!hitsM(x,y,14)){style.goal={x,y};break;}
  }
 }
 return style.goal;
}
function frontlineAllyWaiting(a,dt){
 if(mission?.advanceReleased===false)return true;
 const style=frontlineAllyStyle(a),limit=frontlineAllyLimit();
 if(a.y<=limit+24+style.depth){a.frontHolding=true;a.frontWaitT=Math.max(a.frontWaitT||0,style.hold);}
 if(a.frontHolding){
  a.frontWaitT=Math.max(0,(a.frontWaitT||0)-dt);
  if(a.frontWaitT>0||a.y<limit+48+style.depth)return true;
  a.frontHolding=false;
 }
 return false;
}
function moveFrontlineAlly(a,target,sp,dt){
 a.frontAllyNav=true;
 const limit=frontlineAllyLimit(),goal={x:target.x,y:Math.max(limit+12+(a.frontStyle?.depth||0),target.y)},ox=a.x,oy=a.y;
 if(oy<=limit+8)return;
 const speed=sp*(a.frontStyle?.pace??a.speedScale??1);
 moveFrontlineInfantry(a,goal,speed,dt,target);
 // A detour must obey the advance limit as well; never teleport a unit out of cover.
 if(a.y<limit){a.x=ox;a.y=oy;a.dogWall=null;a.dogEscape=null;}
 a.frontMoving=Math.hypot(a.x-ox,a.y-oy)>.02;
}
// Stage troops keep one commander per five; skill drops roll independently.
function assignFrontlineAllyRole(a,skillDrop=false){
 if(skillDrop){a.frontCommander=R()<.2;return a;}
 if(stageMode!=='front'||!mission)return a;
 mission.allySpawnCount=(mission.allySpawnCount||0)+1;
 a.frontCommander=mission.allySpawnCount%5===0;
 return a;
}
function frontlineCommanderRadio(a,target){
 if((a.frontRadioCooldown||0)>0)return;
 a.frontRadioCooldown=8;a.whistleT=2.5;
 commanderSignals.push({source:a,x:a.x,y:a.y,remaining:1,visualRemaining:2.5,notified:false,team:'ally',target,seen:{x:target.x,y:target.y}});
}
function notifyFrontlineAllies(signal){
 for(const a of allies)if(a.alive&&!(a.chute>0)&&!(a.stun>0)&&!(a.stunRecover>0)&&D(a,signal)<=2000){
  a.frontMode='found';a.frontLostT=6;a.frontRadioT=6;
  a.frontLastSeen={...signal.seen};a.frontTrackedEnemy=signal.target;
  if(stageMode!=='front'&&signal.target?.alive)a._combatTarget=signal.target;
  if(a.frontStyle)a.frontStyle.rest=0;
 }
}
function updateFrontlineCommander(a,target,dt){
 if(!a.frontCommander)return false;
 a.frontRadioCooldown=Math.max(0,(a.frontRadioCooldown||0)-dt);
 const visible=target&&a.frontTargetVisible!==false&&los(a,target);
 if(visible)frontlineCommanderRadio(a,target);
 // Like blue commanders, stop to transmit before aiming the launcher.
 if(a.whistleT>0){a.frontAimT=0;a.frontAimTarget=null;return true;}
 if(!visible||D(a,target)>480){a.frontAimT=0;a.frontAimTarget=null;return false;}
 a.face=Math.atan2(target.y-a.y,target.x-a.x);
 if(a.frontAimTarget!==target){a.frontAimTarget=target;a.frontAimT=0;}
 if(a.shotCd>0){a.frontAimT=0;return true;}
 a.frontAimT=(a.frontAimT||0)+dt;
 if(a.frontAimT>=.5){
  const muzzle=Math.min(12,D(a,target)*.5);
  fire(a.x+Math.cos(a.face)*muzzle,a.y+Math.sin(a.face)*muzzle,a.face,'ally','c',enemyCannonSpeed(),480);
  const bullet=bullets[bullets.length-1];bullet.commanderRocket=true;bullet.commanderShooter=a;
  a.characterShotAt=performance.now();a.shotCd=4;a.frontAimT=0;
 }
 return true;
}
function frontlineCommanderRocketBlast(x,y){
 cannonImpactFx(x,y);sfx('explosion');
 damageObjectsInRadius(x,y,110,'cannonBlast');damageObjectsInRadius(x,y,28,'cannonDirect');carve(x,y,48,false,'cannonBlast');
 // Use the existing support damage path: tanks die in one blast, kills belong to allies.
 explode(x,y,110,false,'ally');
}
function updateFrontlineCommanderRocket(b,ox,oy,expired){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-ox,b.y-oy)/8));
 for(let i=1;i<=steps;i++){
  const q={x:ox+(b.x-ox)*i/steps,y:oy+(b.y-oy)*i/steps};
  if(hitsC(q.x,q.y,3)||humans.some(h=>h.alive&&D(h,q)<11)||etanks.some(e=>e.alive&&D(e,q)<TANK_HIT)){
   frontlineCommanderRocketBlast(q.x,q.y);return true;
  }
 }
 if(expired){frontlineCommanderRocketBlast(b.x,b.y);return true;}
 return false;
}
function updateFrontlineAlly(a,target,dt){
 if(stageMode!=='front')return false;
 const style=frontlineAllyStyle(a);style.paceT-=dt;
 if(style.paceT<=0){style.paceT=3+R()*5;style.paceTarget=Math.max(.5,Math.min(1,(a.speedScale??1)+(R()-.5)*.4));}
 const paceStep=dt*.1;style.pace+=Math.max(-paceStep,Math.min(paceStep,style.paceTarget-style.pace));
 a.frontMoving=false;
 if(target){a.frontMode='found';a.frontLostT=2;if(!a.frontLastSeen)a.frontLastSeen={x:target.x,y:target.y};else{a.frontLastSeen.x=target.x;a.frontLastSeen.y=target.y;}a.frontTrackedEnemy=target;}
 else{
  if(a.frontTrackedEnemy?.alive===false){a.frontLostT=0;a.frontLastSeen=null;}
  a.frontLostT=Math.max(0,(a.frontLostT||0)-dt);
  a.frontMode=a.frontLostT>0&&a.frontLastSeen?'found':'patrol';
  if(a.frontMode==='patrol'){a.frontLastSeen=null;a.frontTrackedEnemy=null;}
 }
 a.frontRadioT=Math.max(0,(a.frontRadioT||0)-dt);
 if(frontlineCombatPoint(a)||a.frontRadioT>0)a.frontMode='found';
 if(updateFrontlineCommander(a,target,dt))return true;
 const waiting=frontlineAllyWaiting(a,dt),distance=target?D(a,target):Infinity;
 if(target||a.frontLastSeen||a.frontMode==='found')style.rest=0;
 else if(!waiting){
  if(style.rest>0)style.rest=Math.max(0,style.rest-dt);
  else{style.marchT-=dt;if(style.marchT<=0){style.marchT=4+R()*6;style.rest=.3+R()*.6;}}
 }
 if(!a.frontCommander&&target&&distance<176&&a.frontTargetVisible!==false){
  a.face=Math.atan2(target.y-a.y,target.x-a.x);
  if(a.frontAimTarget!==target){a.frontAimTarget=target;a.frontAimT=0;}
  a.frontAimT=(a.frontAimT||0)+dt;
  if(a.frontAimT>=.5&&a.shotCd<=0&&los(a,target)){
   fire(a.x+Math.cos(a.face)*12,a.y+Math.sin(a.face)*12,a.face+(R()-.5)*.08,'ally','v',480,205);
   a.burstLeft--;if(a.burstLeft<=0){a.burstLeft=3;a.shotCd=3;a.frontAimT=0;}else a.shotCd=.16;
  }
 }else{
  a.frontAimTarget=null;a.frontAimT=0;
  if(!waiting&&!(style.rest>0)){
   const rank=(a.slot||0)-2,q=a.frontline&&mission?mission.points[mission.index]:null;
   const pursuit=target||a.frontLastSeen;let goal;
   if(pursuit){goal=style.combatGoal||(style.combatGoal={x:0,y:0});goal.x=Math.max(24,Math.min(WW-24,pursuit.x+style.lane*.45));goal.y=pursuit.y+style.offsetY*.3;}
   else goal=q?frontlineAllyObjective(a,q):{x:p.x+rank*30+style.lane*.4,y:p.y+36+Math.abs(rank)*14+style.depth*.4};
   if(D(a,goal)>(pursuit?18:style.stop))moveFrontlineAlly(a,goal,a.frontMode==='found'?202.5:135,dt);
  }
 }
 return true;
}

function rescueFrontlineAlly(a){
 if(stageMode!=='front'||!a.alive||!(a.stun>0)||p.tank||p.dig>0||D(a,p)>=22||!los(p,a))return false;
 a.stun=0;a.stunRecover=0;a.frontAimT=0;a.frontAimTarget=null;a._combatTarget=null;
 a.burstLeft=3;a.shotCd=.2;a.dogWall=null;a.dogEscape=null;
 sfx('ally');say('味方兵を救助！');return true;
}
function updateFrontlineCounterattack(point,dt){
 if(!point||point.done)return;
 if(!point.counterTriggered&&D(p,point)<frontlineCaptureRadius(point)){
  point.counterTriggered=true;point.counterPending=isFrontlineBeginner()?4:6;point.counterBluePending=isFrontlineBeginner()?1:2;point.counterRetry=0;
  mission.waveT=Math.max(mission.waveT||0,6);say('敵の反撃部隊が接近！');
 }
 if(!(point.counterPending>0))return;
 point.counterRetry=(point.counterRetry||0)-dt;
 if(point.counterRetry<=0){
  point.counterPending-=spawnFrontlineWave(point.counterPending,point);point.counterRetry=1;
 }
}

function updateFrontlineAllyStun(a,dt){
 if(rescueFrontlineAlly(a))return;
 a.stun=Math.max(0,(a.stun||0)-dt);
 if(a.stun<=0)a.stunRecover=0;
}

function frontlineAllySightRange(known=false){
 return(known?420:300)*(weather==='sandstorm'?.55:weather==='rain'?.75:1);
}
function frontlineAllyCanSee(a,h,known=false,area=frontlineCombatPoint(a)){
 if(!h.alive)return false;
 if(area&&D(h,area)<frontlineCaptureRadius(area))return true;
 const dx=h.x-a.x,dy=h.y-a.y,range=frontlineAllySightRange(known);
 if(dx*dx+dy*dy>range*range)return false;
 const angle=Math.atan2(dy,dx)-(a.face??-Math.PI/2);
 if(Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))>Math.PI/3)return false;
 return los(a,h);
}
function refreshFrontlineAllyTargets(ready){
 const assigned=new Map();
 for(const a of ready){
  const area=frontlineCombatPoint(a);
  let best=a._combatTarget,bestScore=Infinity;
  if(!best||!frontlineAllyCanSee(a,best,true,area)){
   best=null;
   for(const h of humans){
    if(!frontlineAllyCanSee(a,h,false,area))continue;
    const score=(assigned.get(h)||0)*10000+D(a,h);
    if(score<bestScore){bestScore=score;best=h;}
   }
  }
  if(a.frontCommander){
   let tank=null,tankDistance=Infinity;
   for(const e of etanks)if(frontlineAllyCanSee(a,e,e===a._combatTarget,area)&&D(a,e)<tankDistance){tank=e;tankDistance=D(a,e);}
   if(tank)best=tank;
  }
  a._combatTarget=best;a.frontTargetVisible=best?(!(area&&D(best,area)<frontlineCaptureRadius(area))||los(a,best)):false;
  if(best)assigned.set(best,(assigned.get(best)||0)+1);
 }
}
function drawFrontlineAllyVision(a){
 if(stageMode!=='front'||a.chute>0||a.stun>0||a.stunRecover>0||a.blastAirT>0)return;
 const face=a.face??-Math.PI/2,found=a.frontMode==='found';
 g.save();g.fillStyle=found?'rgba(105,215,255,.045)':'rgba(105,215,255,.025)';
 g.beginPath();g.moveTo(a.x,a.y);g.arc(a.x,a.y,frontlineAllySightRange(!!a._combatTarget),face-Math.PI/3,face+Math.PI/3);g.closePath();g.fill();g.restore();
 if(found)lab('!',a.x,a.y-30,'bold 18px system-ui','#8ddfff');
}

// Generation-only simplification: preserve cover islands and three clear north/south lanes.
function openFrontlineMaze(V,Hh,zone,mx0,csx,wt){
 if(stageMode!=='front')return;
 const walls=[];
 for(const grid of [V,Hh])for(const column of grid)for(let j=0;j<column.length;j++)if(column[j])walls.push([column,j]);
 for(let i=walls.length-1;i>0;i--){const j=R()*(i+1)|0;[walls[i],walls[j]]=[walls[j],walls[i]];}
 for(let i=Math.floor(walls.length*.55);i<walls.length;i++){const [column,j]=walls[i];column[j]=0;}
 const C=Hh.length;zone.frontlineMazeLanes=[];
 for(const start of [1,Math.floor(C/2)-1,C-4]){
  for(let i=start;i<start+3;i++)Hh[i].fill(0);
  for(let i=start+1;i<start+3;i++)V[i].fill(0);
  zone.frontlineMazeLanes.push({x:mx0+start*csx+wt,y:zone.y1,w:csx*3-wt*2,h:zone.y0-zone.y1});
 }
}
function frontlineMazeLaneBlocked(rect){
 if(stageMode!=='front')return false;
 return ZONES.some(z=>(z.frontlineMazeLanes||[]).some(lane=>rect.x<lane.x+lane.w&&rect.x+rect.w>lane.x&&rect.y<lane.y+lane.h&&rect.y+rect.h>lane.y));
}

function updateFrontlineAdvance(){
 if(stageMode!=='front'||!mission||mission.advanceReleased!==false)return;
 if(p.y<=mission.advanceStartY-240){
  mission.advanceReleased=true;say('味方部隊、一斉に進軍！');
 }
}

function updateFrontlineEnemyEntry(){
 if(stageMode!=='front'||!mission||mission.enemyWavesStarted!==false||p.y>mission.enemyEntryY)return;
 mission.enemyWavesStarted=true;spawnFrontlineWave(isFrontlineBeginner()?4:6);mission.waveT=6;mission.waveCheckT=1;
}
function updateFrontlineWaves(dt){
 const m=mission;if(stageMode!=='front'||!m||m.enemyWavesStarted!==true||areaDebugEnabled)return;
 m.waveT-=dt;m.waveCheckT=(m.waveCheckT||0)-dt;
 if(m.waveCheckT<=0){
  m.waveCheckT=1;const view=frontlineView();let nearby=0;
  for(const h of humans)if(h.alive&&h.x>=view.x-80&&h.x<=view.x+view.w+80&&h.y>=view.y-160&&h.y<=view.y+view.h+80)nearby++;
  m.nearbyEnemies=nearby;if(nearby<4)m.waveT=Math.min(m.waveT,3);
 }
 if(m.waveT<=0)m.waveT=spawnFrontlineWave(2)>0?((m.nearbyEnemies??4)<4?3:6):1;
}
function frontlineCombatPoint(unit){
 if(stageMode!=='front'||!mission)return null;
 return mission.points.find(q=>D(unit,q)<frontlineCaptureRadius(q))||null;
}
function frontlineAllyCanCapture(a,point){
 return a.alive&&!(a.stun>0)&&!(a.stunRecover>0)&&!(a.chute>0)&&!(a.blastAirT>0)&&D(a,point)<frontlineCaptureRadius(point);
}
function frontlineCaptureCount(point){
 let count=0;
 if(point.y>=frontlineAllyLimit())for(const a of allies)if(frontlineAllyCanCapture(a,point))count++;
 // A player can help the squad, but cannot capture a frontline alone.
 if(!count)return 0;
 return count+(D(p,point)<frontlineCaptureRadius(point)&&!(p.tank&&p.tank.kind==='fighter')&&!(p.dig>0)?1:0);
}
function frontlineTankAreaTarget(e){
 if(stageMode!=='front'||!mission||areaDebugEnabled)return null;
 const point=mission.points[mission.index];
 if(!point||point.done||D(e,point)>Math.max(600,frontlineCaptureRadius(point)+240)||point.y<frontlineAllyLimit())return null;
 // The capture alarm reveals participating soldiers, not a hidden lone player.
 let best=null;
 for(const a of allies)if(frontlineAllyCanCapture(a,point)){
  const d=D(e,a);if(!best||d<best.d)best={key:'ally:'+a.id,obj:a,d};
 }
 return best;
}
function frontlineEnemyAreaTarget(o){
 const area=frontlineCombatPoint(o);if(!area)return null;
 let best=null;
 const consider=(unit,key)=>{if(D(unit,area)>=frontlineCaptureRadius(area))return;const d=D(o,unit);if(!best||d<best.d)best={key,obj:unit,d};};
 if(debugMode<2&&!(p.dig>0)&&!(p.tank&&p.tank.kind==='fighter'))consider(p,'p');
 for(const a of allies)if(a.alive&&!(a.chute>0))consider(a,'ally:'+a.id);
 return best;
}

// Use the existing shared, incremental search only after local avoidance stops making progress.
function moveFrontlineInfantryDetour(a,goal,speed,dt,target=goal){
 let nav=a.frontNav;
 if(!nav||Math.hypot(target.x-nav.tx,target.y-nav.ty)>90||nav.covers!==covers||nav.coverLen!==covers.length){
  a.patrolSearch=null;nav=a.frontNav={gx:goal.x,gy:goal.y,tx:target.x,ty:target.y,best:D(a,target),still:0,retry:0,covers,coverLen:covers.length,route:null,index:0};
 }
 nav.retry=Math.max(0,nav.retry-dt);
 const distance=D(a,target);
 if(distance<nav.best-10){nav.best=distance;nav.still=0;}else nav.still+=dt;
 if(nav.arrived){if(D(a,nav.arrived)<18&&Math.hypot(goal.x-nav.gx,goal.y-nav.gy)<=64&&hitsC(goal.x,goal.y,12))return true;nav.arrived=null;nav.still=3;nav.retry=0;}
 if(!nav.route&&(a.patrolSearch||nav.still>=3&&nav.retry<=0&&performance.now()>=patrolRoutePlanAt)){
  if(!a.patrolSearch){
   patrolRoutePlanAt=performance.now()+100;nav.retry=1.5;nav.gx=goal.x;nav.gy=goal.y;
   nav.safeGoal=frontlineInfantryDetourGoal(a,{x:nav.gx,y:nav.gy});
   a.dogWall=null;a.dogEscape=null;
  }
  if(nav.safeGoal){
   const route=findPatrolReturnPath(a,nav.safeGoal,10,a);
   if(route===PATROL_SEARCH_PENDING)return true;
   nav.route=route;nav.index=0;nav.blocked=0;
  }
 }
 if(!nav.route)return false;
 while(nav.index<nav.route.length&&D(a,nav.route[nav.index])<5)nav.index++;
 if(nav.index===nav.route.length){
  nav.route=null;nav.still=0;nav.best=distance;
  if(D(nav.safeGoal,goal)>8){nav.arrived=nav.safeGoal;return true;}
  return false;
 }
 const q=nav.route[nav.index],angle=Math.atan2(q.y-a.y,q.x-a.x),step=Math.min(speed*dt,D(a,q)),x=a.x,y=a.y;
 mv(a,Math.cos(angle)*step,Math.sin(angle)*step,8);a.face=angle;
 nav.blocked=Math.hypot(a.x-x,a.y-y)<step*.1?(nav.blocked||0)+dt:0;
 if(nav.blocked>.5){nav.route=null;nav.still=3;nav.retry=0;}
 return true;
}
function frontlineInfantryDetourGoal(a,goal){
 if(!hitsC(goal.x,goal.y,12))return goal;
 const limit=a.frontMarch?14:frontlineAllyLimit()+12;
 for(const radius of [32,64,128,192]){
  let best=null,score=Infinity;
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6,q={x:goal.x+Math.cos(angle)*radius,y:goal.y+Math.sin(angle)*radius};
   if(q.x<14||q.x>WW-14||q.y<limit||q.y>WH-14||hitsC(q.x,q.y,12))continue;
   const d=D(a,q);if(d<score){best=q;score=d;}
  }
  if(best)return best;
 }
 return null;
}

function moveFrontlineInfantry(unit,goal,speed,dt,target=goal){
 if(!moveFrontlineInfantryDetour(unit,goal,speed,dt,target))dogMoveAround(unit,goal,speed,dt,8,false);
}

function allyWeaponVisible(a){
 return !(a.stun>0||a.stunRecover>0||a.whistleT>0)&&
  (stageMode==='front'?a.frontMode==='found':!!a._combatTarget||a.frontRadioT>0);
}
