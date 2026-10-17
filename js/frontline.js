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
 const m=mission,active=humans.reduce((n,h)=>n+Number(!!h.alive),0),available=Math.min(count,FRONTLINE_ENEMY_LIMIT-active);
 let spawned=0;
 for(let i=0;i<available;i++){
  const roster=m.enemyRoster||[],index=m.enemyRosterIndex||0;
  const wantBlue=(counterPoint?.counterBluePending||0)>0||(m.enemySpawned||0)%4===0;
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
 mission.enemyRoster=humans.slice();mission.enemyRosterIndex=0;
 for(const h of mission.enemyRoster){h.path=[];h.chatT=0;h.chatMate=null;}
 for(let i=mission.enemyRoster.length-1;i>0;i--){const j=R()*(i+1)|0;[mission.enemyRoster[i],mission.enemyRoster[j]]=[mission.enemyRoster[j],mission.enemyRoster[i]];}
 humans=[];enemyDogs=[];mission.cleanupT=1;mission.enemyEntryY=p.y-800;mission.enemyWavesStarted=false;
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
function frontlineCaptureVisual(m){
 const fraction=Math.max(0,Math.min(1,(m.progress||0)/FRONTLINE_CAPTURE_SECONDS));
 const remaining=Math.max(0,FRONTLINE_CAPTURE_SECONDS-(m.progress||0))/Math.max(1,m.captureRate||1);
 return{fraction,remaining,label:(m.contested?'敵が範囲内 ／ ':m.capturing?'制圧まで ':'制圧一時停止 ／ 残り ')+remaining.toFixed(1)+'秒'+(m.capturing&&m.captureCount>1?'（'+m.captureCount+'人）':'')};
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
function frontlineAllyWaiting(a,dt){
 if(mission?.advanceReleased===false)return true;
 const limit=frontlineAllyLimit();
 if(a.y<=limit+24){a.frontHolding=true;a.frontWaitT=Math.max(a.frontWaitT||0,2);}
 if(a.frontHolding){
  a.frontWaitT=Math.max(0,(a.frontWaitT||0)-dt);
  if(a.frontWaitT>0||a.y<limit+48)return true;
  a.frontHolding=false;
 }
 return false;
}
function moveFrontlineAlly(a,target,sp,dt){
 a.frontAllyNav=true;
 const limit=frontlineAllyLimit(),goal={x:target.x,y:Math.max(limit+12,target.y)},ox=a.x,oy=a.y;
 if(oy<=limit+8)return;
 const speed=sp*(a.speedScale??1);
 moveFrontlineInfantry(a,goal,speed,dt,target);
 // A detour must obey the advance limit as well; never teleport a unit out of cover.
 if(a.y<limit){a.x=ox;a.y=oy;a.dogWall=null;a.dogEscape=null;}
 a.frontMoving=Math.hypot(a.x-ox,a.y-oy)>.02;
}
function updateFrontlineAlly(a,target,dt){
 if(stageMode!=='front')return false;
 a.frontMoving=false;
 if(target){a.frontMode='found';a.frontLostT=2;if(!a.frontLastSeen)a.frontLastSeen={x:target.x,y:target.y};else{a.frontLastSeen.x=target.x;a.frontLastSeen.y=target.y;}a.frontTrackedEnemy=target;}
 else{
  if(a.frontTrackedEnemy?.alive===false){a.frontLostT=0;a.frontLastSeen=null;}
  a.frontLostT=Math.max(0,(a.frontLostT||0)-dt);
  a.frontMode=a.frontLostT>0&&a.frontLastSeen?'found':'patrol';
  if(a.frontMode==='patrol'){a.frontLastSeen=null;a.frontTrackedEnemy=null;}
 }
 if(frontlineCombatPoint(a))a.frontMode='found';
 const waiting=frontlineAllyWaiting(a,dt),distance=target?D(a,target):Infinity;
 if(target&&distance<176&&a.frontTargetVisible!==false){
  a.face=Math.atan2(target.y-a.y,target.x-a.x);
  if(a.frontAimTarget!==target){a.frontAimTarget=target;a.frontAimT=0;}
  a.frontAimT=(a.frontAimT||0)+dt;
  if(a.frontAimT>=.5&&a.shotCd<=0&&los(a,target)){
   fire(a.x+Math.cos(a.face)*12,a.y+Math.sin(a.face)*12,a.face+(R()-.5)*.08,'ally','v',480,205);
   a.burstLeft--;if(a.burstLeft<=0){a.burstLeft=3;a.shotCd=3;a.frontAimT=0;}else a.shotCd=.16;
  }
 }else{
  a.frontAimTarget=null;a.frontAimT=0;
  if(!waiting){
   const rank=(a.slot||0)-2,q=a.frontline&&mission?mission.points[mission.index]:null;
   const pursuit=target||a.frontLastSeen,goal=pursuit||q||{x:p.x+rank*30,y:p.y+36+Math.abs(rank)*14};
   if(D(a,goal)>(pursuit?18:62))moveFrontlineAlly(a,goal,a.frontMode==='found'?202.5:135,dt);
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
 if(!point.counterTriggered&&D(p,point)<180){
  point.counterTriggered=true;point.counterPending=6;point.counterBluePending=2;point.counterRetry=0;
  mission.waveT=Math.max(mission.waveT||0,12);say('敵の反撃部隊が接近！');
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
 if(area&&D(h,area)<180)return true;
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
  a._combatTarget=best;a.frontTargetVisible=best?(!(area&&D(best,area)<180)||los(a,best)):false;
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
 for(let i=Math.floor(walls.length*.15);i<walls.length;i++){const [column,j]=walls[i];column[j]=0;}
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
 mission.enemyWavesStarted=true;spawnFrontlineWave(6);mission.waveT=24;
}
function frontlineCombatPoint(unit){
 if(stageMode!=='front'||!mission)return null;
 return mission.points.find(q=>D(unit,q)<180)||null;
}
function frontlineCaptureCount(point){
 let count=D(p,point)<180&&!(p.tank&&p.tank.kind==='fighter')&&!(p.dig>0)?1:0;
 if(point.y>=frontlineAllyLimit())for(const a of allies)if(a.alive&&!(a.stun>0)&&!(a.stunRecover>0)&&!(a.chute>0)&&!(a.blastAirT>0)&&D(a,point)<180)count++;
 return count;
}
function frontlineEnemyAreaTarget(o){
 const area=frontlineCombatPoint(o);if(!area)return null;
 let best=null;
 const consider=(unit,key)=>{if(D(unit,area)>=180)return;const d=D(o,unit);if(!best||d<best.d)best={key,obj:unit,d};};
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
