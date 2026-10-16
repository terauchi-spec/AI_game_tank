// Frontline-only presentation and infantry waves. Reuse existing combat and obstacle AI.
const FRONTLINE_ENEMY_LIMIT=16,FRONTLINE_CAPTURE_SECONDS=12;
function frontlineView(){
 return{x:Math.max(0,Math.min(WW-W,p.x-W/2)),y:Math.max(0,Math.min(WH-H,p.y-H*.6)),w:W,h:H};
}
function frontlineSpawnSpot(hasDog=false){
 const view=frontlineView(),columns=12,phase=R()*columns|0;
 // Search only ABOVE the current camera. Never fall back to an on-screen point.
 for(let row=0;row<8;row++){
  const y=view.y-(hasDog?180:90)-row*48;if(y<24)continue;
  for(let n=0;n<columns;n++){
   const x=view.x+24+(((n+phase)%columns)+.5)*(Math.min(W,WW)-48)/columns,q={x,y};
   if(hitsM(x,y,10)||inWaterAt(x,y,10)||inBase(x,y)||humans.some(h=>h.alive&&D(h,q)<38)||enemyDogs.some(d=>D(d,q)<30)||etanks.some(e=>e.alive&&D(e,q)<TANK_HIT+18)||cars.some(v=>D(v,q)<TANK_HIT+18))continue;
   if(hasDog){const dog={x,y:y+75};if(hitsM(dog.x,dog.y,8)||inWaterAt(dog.x,dog.y,8)||inBase(dog.x,dog.y)||humans.some(h=>h.alive&&D(h,dog)<38)||enemyDogs.some(d=>D(d,dog)<30)||!patrolLineClear(q,dog,8))continue;}
   return q;
  }
 }
 return null;
}
function spawnFrontlineWave(count=3){
 if(stageMode!=='front'||!mission||areaDebugEnabled)return 0;
 const m=mission,active=humans.reduce((n,h)=>n+Number(!!h.alive),0),available=Math.min(count,FRONTLINE_ENEMY_LIMIT-active);
 let spawned=0;
 for(let i=0;i<available;i++){
  const candidate=m.enemyRoster?.[m.enemyRosterIndex||0],spot=frontlineSpawnSpot(!!candidate?.dog);if(!spot)break;
  const h=candidate||{alive:true,elite:false};if(candidate)m.enemyRosterIndex++;
  Object.assign(h,spot,{alive:true,st:0,sus:0,lost:0,target:null,cd:1,burstLeft:0,face:Math.PI/2,
   frontMarch:true,frontLaneX:spot.x,frontRetired:false,frontStuck:0,scoreCounted:false,
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
 mission.enemyRoster=humans.slice();mission.enemyRosterIndex=0;
 for(const h of mission.enemyRoster){h.path=[];h.chatT=0;h.chatMate=null;}
 for(let i=mission.enemyRoster.length-1;i>0;i--){const j=R()*(i+1)|0;[mission.enemyRoster[i],mission.enemyRoster[j]]=[mission.enemyRoster[j],mission.enemyRoster[i]];}
 humans=[];enemyDogs=[];mission.cleanupT=1;spawnFrontlineWave(6);
}
function cleanupFrontlineArmy(dt){
 if(!mission)return;
 mission.cleanupT=(mission.cleanupT||0)-dt;if(mission.cleanupT>0)return;mission.cleanupT=1;
 const bottom=frontlineView().y+H+200;
 for(const h of humans)if(h.frontMarch&&h.alive&&(h.y>bottom||h.y>WH-28)){
  // Walking out is not a kill. Never award score or a title for despawning infantry.
  h.frontRetired=true;h.alive=false;h.scoreCounted=true;
 }
 humans=humans.filter(h=>h.alive||!h.scoreCounted);
 enemyDogs=enemyDogs.filter(d=>!d.handler?.frontRetired);
}
function moveFrontlineEnemy(h,dt,speed){
 const ox=h.x,oy=h.y,goal={x:h.frontLaneX??h.x,y:Math.min(WH-16,h.y+180)};
 dogMoveAround(h,goal,speed,dt,8,false);
 const moved=Math.hypot(h.x-ox,h.y-oy);h.frontStuck=moved<.02?(h.frontStuck||0)+dt:0;
 // Change lanes when blocked by another soldier; never turn back along a patrol route.
 if(h.frontStuck>1.5){h.frontLaneX=Math.max(24,Math.min(WW-24,h.x+(R()<.5?-1:1)*90));h.dogWall=null;h.frontStuck=0;}
 return moved>.02?Math.atan2(h.y-oy,h.x-ox):Math.PI/2;
}
function frontlineCaptureVisual(m){
 const fraction=Math.max(0,Math.min(1,(m.progress||0)/FRONTLINE_CAPTURE_SECONDS));
 const remaining=Math.max(0,FRONTLINE_CAPTURE_SECONDS-(m.progress||0));
 return{fraction,remaining,label:(m.contested?'敵が範囲内 ／ ':m.capturing?'制圧まで ':'制圧一時停止 ／ 残り ')+remaining.toFixed(1)+'秒'};
}
function drawFrontlineCaptureRing(point,x,y,m){
 const active=m.points[m.index]===point;if(!active||(!(m.progress>0)&&!m.capturing))return;
 const status=frontlineCaptureVisual(m);
 gm.save();gm.lineWidth=7;gm.strokeStyle='rgba(141,211,255,.24)';gm.beginPath();gm.arc(x,y,180,0,Math.PI*2);gm.stroke();
 if(status.fraction>0){gm.strokeStyle='#8dd3ff';gm.lineCap='round';gm.beginPath();gm.arc(x,y,180,-Math.PI/2,-Math.PI/2+Math.PI*2*status.fraction);gm.stroke();}
 gm.textAlign='center';gm.font='bold 16px system-ui';gm.lineWidth=4;gm.strokeStyle='rgba(0,0,0,.8)';gm.strokeText(status.label,x,y-35);gm.fillStyle='#d5f0ff';gm.fillText(status.label,x,y-35);gm.restore();
}
function frontlineArrowPosition(){return{x:W-26,y:68};}
function drawFrontlineArrow(point){
 if(!point)return;
 const {x,y}=frontlineArrowPosition(),angle=Math.atan2(point.y-p.y,point.x-p.x);
 gm.save();gm.translate(x,y);gm.rotate(angle);gm.fillStyle='#ffe1a0';gm.strokeStyle='rgba(0,0,0,.85)';gm.lineWidth=3;gm.beginPath();gm.moveTo(13,0);gm.lineTo(-8,-8);gm.lineTo(-5,0);gm.lineTo(-8,8);gm.closePath();gm.stroke();gm.fill();gm.restore();
}
