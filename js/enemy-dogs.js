// Two bounded enemy dog/blue-handler pairs per map. No per-frame enemy search:
// the 500px infantry scan happens once per bark, at most once every 3 seconds.
const DOG_LEASH_MIN=50,DOG_LEASH_MAX=150,DOG_DETECT=250,DOG_BARK=100,DOG_DROP=100,DOG_HANDLER_DROP=250,DOG_GRACE=8;
let enemyDogs=[];
function dogHandlerStepAllowed(h,x,y){
 if(!h.dogHandler||!h.dog||h.dog.handler!==h)return true;
 const next=Math.hypot(x-h.dog.x,y-h.dog.y),current=D(h,h.dog);
 return (next>=DOG_LEASH_MIN&&next<=DOG_LEASH_MAX)||(current>DOG_LEASH_MAX&&next<current)||(current<DOG_LEASH_MIN&&next>current);
}
function spawnEnemyDogs(){
 enemyDogs=[];
 for(let i=0;i<2;i++){
  const spot=missionSpot(i?WW*.72:WW*.28,i?5400:9400,18);
  const handler={...spot,path:[{...spot}],wi:0,dir:1,loop:true,stk:0,alive:true,elite:false,commander:null,dogHandler:true,st:0,sus:0,lost:0,cd:1,burstLeft:0,face:Math.PI/2,commanderScan:0,commanderTactics:0,commanderCooldown:2,whistleT:0,whistleCooldown:0};
  let pos=null;
  for(let radius=75;radius<=125&&!pos;radius+=25)for(let n=0;n<16;n++){
   const a=n*Math.PI/8,q={x:spot.x+Math.cos(a)*radius,y:spot.y+Math.sin(a)*radius};
   if(q.x>8&&q.x<WW-8&&q.y>8&&q.y<WH-8&&!hitsC(q.x,q.y,7)&&patrolLineClear(spot,q,7)){pos=q;break;}
  }
  // missionSpot searches open terrain; if its immediate ring is blocked, search
  // another verified location rather than creating a dog inside an obstacle.
  if(!pos){pos=missionSpot(spot.x+100,spot.y,7);Object.assign(handler,missionSpot(pos.x-80,pos.y,18));handler.path=[{x:handler.x,y:handler.y}];}
  const dog={...pos,handler,enemyDog:true,col:'#222222',face:0,state:'patrol',stun:0,barkT:0,barkCooldown:0,orbit:i*Math.PI,orbitRadius:90+i*35,patrolMode:i===0?'orbit':'south',southX:spot.x,southY:spot.y,southTime:0,lostPhase:0,lostBase:0,avoidT:0,avoidSide:i?1:-1,dogWall:null,alertDisabled:false,chaseElapsed:0,rearmRequired:false,rearmKey:null,targetKey:null,walking:false};
  handler.dog=dog;humans.push(handler);enemyDogs.push(dog);
 }
}

function dogEndAlert(dog,permanent=false){
 if(permanent)dog.alertDisabled=true;
 dog.state=dog.handler?'patrol':'lost';dog.targetKey=null;dog.chaseElapsed=0;dog.barkT=0;dog.dogWall=null;dog.dogEscape=null;dog.walking=false;
}
function dogSilence(dog){
 if(dog.alertDisabled)return;
 const key=dog.targetKey;dogEndAlert(dog,true);
 const h=dog.handler;
 if(h&&key&&h.target===key){h.st=0;h.target=null;h.lost=0;h.foundPause=0;}
}
// Smell works on the player and the on-foot Partner; neither is detectable in
// a vehicle or during the debug detection-off mode.
function dogTargetObject(key){
 if(debugMode>=2||p.tank)return null;
 if(key==='p')return p;
 if(key==='partner'&&skill==='partner'&&partner&&!partner.down&&!partner.vehicle&&!partner.passengerVehicle)return partner;
 return null;
}
function dogFindTarget(dog){
 let best=null,bestD=DOG_DETECT+1;
 for(const key of ['p','partner']){
  if(dog.rearmRequired&&dog.rearmKey===key)continue;
  const target=dogTargetObject(key);if(!target)continue;
  const d=D(dog,target);if(d<=DOG_DETECT&&d<bestD){best={key,target};bestD=d;}
 }
 return best;
}
// The white-soldier style perimeter navigation is shared by the dog and handler.
// Preserve obstacle/direction between frames to avoid shaking at wall corners.
function dogTakeStep(unit,a,speed,dt,r=7,isDog=true){
 if(isDog)return houndTryStep(a,speed,dt,false,unit);
 const ox=unit.x,oy=unit.y;
 mv(unit,Math.cos(a)*speed*dt,Math.sin(a)*speed*dt,r);
 const moved=Math.hypot(unit.x-ox,unit.y-oy)>.04;
 if(moved)unit.face=Math.atan2(unit.y-oy,unit.x-ox);
 return moved;
}
function dogMoveAroundCore(unit,goal,speed,dt,r=7,isDog=true){
 const dx=goal.x-unit.x,dy=goal.y-unit.y,d=Math.hypot(dx,dy);
 if(d<5){unit.dogWall=null;return false;}
 const a=Math.atan2(dy,dx),look=Math.min(50,d),probe={x:unit.x+Math.cos(a)*look,y:unit.y+Math.sin(a)*look};
 let w=unit.dogWall;
 if(w&&!covers.includes(w.block)&&!(objects||[]).includes(w.block))w=unit.dogWall=null;
 if(!w&&hitsC(probe.x,probe.y,r)){
  const block=firstBlockingCover(unit,probe,look+8);
  const rect=block&&((objects||[]).includes(block)?objectHitRect(block):coverHitRect(block));
  if(rect&&rect.w>0&&rect.h>0){
   const st=coverPerimeterState(rect,unit.x,unit.y,r+13);
   const left=coverPerimeterPoint(st,st.s+36),right=coverPerimeterPoint(st,st.s-36);
   const dir=D(left,goal)<=D(right,goal)?1:-1;
   w=unit.dogWall={block,st,s:st.s,dir,minT:.45,travel:0,blocked:0};
  }
 }
 if(w){
  w.minT=Math.max(0,w.minT-dt);
  const blocked=(objects||[]).includes(w.block)?segmentHitsObject(unit,goal,w.block,7):segmentHitsCover(unit,goal,w.block,7);
  if((w.minT<=0&&!blocked)||w.travel>w.st.per*1.2)unit.dogWall=null;
  else{
   const q=coverPerimeterPoint(w.st,w.s+w.dir*Math.max(18,Math.min(30,speed*.17)));
   const ang=Math.atan2(q.y-unit.y,q.x-unit.x),ox=unit.x,oy=unit.y;
   let moved=dogTakeStep(unit,ang,speed,dt,r,isDog);
   if(!moved)moved=dogTakeStep(unit,ang+w.dir*.42,speed,dt,r,isDog);
   if(moved){const d=Math.hypot(unit.x-ox,unit.y-oy);w.s+=w.dir*d;w.travel+=d;w.blocked=0;}
   else if((w.blocked+=dt)>.95){unit.dogWall=null;unit.avoidSide=w.dir;}
   return moved;
  }
 }
 if(dogTakeStep(unit,a,Math.min(speed,d/Math.max(dt,.001)),dt,r,isDog))return true;
 if(isDog&&unit.handler?.alive&&D(unit,unit.handler)>=DOG_LEASH_MAX-1)return false;
 const side=unit.avoidSide||1;
 for(const v of [side*.65,side*1.25,-side*.65,-side*1.25])
  if(dogTakeStep(unit,a+v,speed,dt,r,isDog)){unit.avoidSide=v>0?1:-1;return true;}
 return false;
}
// Stuck recovery is restricted to dog pairs, preserving the white commander's AI.
function dogPickEscape(unit,goal,r,isDog){
 const to=Math.atan2(goal.y-unit.y,goal.x-unit.x),side=unit.avoidSide||1;
 const anchor=isDog?unit.handler:unit.dogHandler?unit.dog:null;
 const dirs=[to+side*Math.PI/2,to-side*Math.PI/2,to+side*2.2,to-side*2.2,to+Math.PI,to+side*.75,to-side*.75];
 if(anchor&&anchor.alive){
  const towardAnchor=Math.atan2(anchor.y-unit.y,anchor.x-unit.x);
  dirs.unshift(towardAnchor+side*.65,towardAnchor-side*.65,towardAnchor);
 }
 let best=null,bestScore=Infinity;
 for(const dist of [48,78,110]){
  for(let i=0;i<dirs.length;i++){
   const a=dirs[i],q={x:unit.x+Math.cos(a)*dist,y:unit.y+Math.sin(a)*dist};
   if(q.x<r+4||q.x>WW-r-4||q.y<r+4||q.y>WH-r-4||hitsC(q.x,q.y,r+2))continue;
   if(anchor&&anchor.alive){const leash=D(q,anchor);if(leash<DOG_LEASH_MIN+3||leash>DOG_LEASH_MAX-3)continue;}
   if(!patrolLineClear(unit,q,r))continue;
   const score=D(q,goal)+dist*.15+i*3+((unit.dogEscapeAttempts||0)%2)*(i%2?6:-6);
   if(score<bestScore){bestScore=score;best=q;}
  }
  if(best)break;
 }
 return best?{x:best.x,y:best.y,t:2.2}:null;
}
function dogMoveAround(unit,goal,speed,dt,r=7,isDog=true){
 if(!unit.enemyDog&&!unit.dogHandler)return dogMoveAroundCore(unit,goal,speed,dt,r,isDog);
 let escape=unit.dogEscape;
 if(escape){escape.t-=dt;if(escape.t<=0||D(unit,escape)<12){escape=unit.dogEscape=null;unit.dogWall=null;}}
 const moved=dogMoveAroundCore(unit,escape||goal,speed,dt,r,isDog);
 if(D(unit,goal)<22){
  unit.dogStallT=0;unit.dogProgressT=0;unit.dogProgressX=unit.x;unit.dogProgressY=unit.y;unit.dogEscape=null;return moved;
 }
 unit.dogStallT=moved?0:(unit.dogStallT||0)+dt;
 if(!Number.isFinite(unit.dogProgressX)){unit.dogProgressX=unit.x;unit.dogProgressY=unit.y;unit.dogProgressT=0;}
 unit.dogProgressT=(unit.dogProgressT||0)+dt;
 const sample=unit.dogProgressT>=1.15;
 const net=sample?Math.hypot(unit.x-unit.dogProgressX,unit.y-unit.dogProgressY):0;
 if(unit.dogStallT>=.85||(sample&&net<9)){
  unit.dogEscapeAttempts=(unit.dogEscapeAttempts||0)+1;unit.avoidSide=-(unit.avoidSide||1);
  unit.dogEscape=dogPickEscape(unit,goal,r,isDog);unit.dogWall=null;
  unit.dogStallT=0;unit.dogProgressT=0;unit.dogProgressX=unit.x;unit.dogProgressY=unit.y;
 }else if(sample){
  unit.dogProgressT=0;unit.dogProgressX=unit.x;unit.dogProgressY=unit.y;
  if(net>20)unit.dogEscapeAttempts=0;
 }
 return moved;
}
function dogBark(dog){
 const key=dog.targetKey,target=dogTargetObject(key);
 if(!key||!target||dog.alertDisabled||dog.stun>0||dog.barkCooldown>0)return;
 tone(190,.13,.025,'sawtooth',95);
 dog.barkT=.9;dog.barkCooldown=3;dog.signalX=dog.x;dog.signalY=dog.y;
 // The bark identifies the actual target, including the Partner, to nearby infantry.
 const rallying=commanderRallying;commanderRallying=true;
 try{for(const h of humans)if(h.alive&&(h===dog.handler||D(h,dog)<=500))enterHumanFound(h,key,null,true);}
 finally{commanderRallying=rallying;}
}
function stunEnemyDog(dog){
 dogSilence(dog);dog.stun=Math.max(dog.stun,5);dog.barkT=0;dog.walking=false;
 dog.dogEscape=null;dog.dogStallT=0;dog.dogProgressT=0;
}
function stunEnemyDogsAtBlast(x,y,r){
 for(const dog of enemyDogs)if(Math.hypot(dog.x-x,dog.y-y)<=r)stunEnemyDog(dog);
}
function stunEnemyDogsAtFlame(path){
 if(!path||path.length<2||!enemyDogs.length)return;
 for(const dog of enemyDogs){
  if(dog.stun>0)continue;
  for(let i=1;i<path.length;i++){
   if(pointSegDistance(dog.x,dog.y,path[i-1],path[i])<18){stunEnemyDog(dog);break;}
  }
 }
}
function updateEnemyDogs(dt){
 if(hound?.warningBarkT>0)hound.warningBarkT=Math.max(0,hound.warningBarkT-dt);
 for(const dog of enemyDogs){
  const h=dog.handler;
  if(h&&!h.alive){dog.handler=null;dog.state='lost';dog.targetKey=null;dog.lostBase=dog.face;dog.lostPhase=0;dog.barkT=0;}
  dog.barkT=Math.max(0,dog.barkT-dt);dog.barkCooldown=Math.max(0,dog.barkCooldown-dt);dog.walking=false;
  if(debugMode>=2||p.tank){
   if(dog.state==='chase')dogEndAlert(dog);
   dog.barkT=0;dog.rearmRequired=false;dog.rearmKey=null;
  }
  if(dog.stun>0){dog.stun=Math.max(0,dog.stun-dt);continue;}
  if(dog.state==='chase')dog.chaseElapsed=(dog.chaseElapsed||0)+dt;
  if(dog.rearmRequired){
   const target=dogTargetObject(dog.rearmKey);
   if(!target||D(dog,target)>DOG_DETECT){dog.rearmRequired=false;dog.rearmKey=null;}
  }
  const partnerNear=dogTargetObject('partner');
  if(Math.abs(dog.y-p.y)>H+600||Math.abs(dog.x-p.x)>W+400){
   if(!partnerNear||Math.abs(dog.y-partnerNear.y)>H+600||Math.abs(dog.x-partnerNear.x)>W+400)continue;
  }
  const ox=dog.x,oy=dog.y;
  if(debugMode<2&&!dog.alertDisabled&&hound&&skill==='hound'&&!(hound.stun>0)&&D(hound,dog)<=100){
   dogSilence(dog);
   hound.warningBarkT=.9;hound.warningBarkX=hound.x;hound.warningBarkY=hound.y;
   tone(225,.18,.03,'sawtooth',110);say('猟犬が吠えて犬兵を追い払った！');
  }
  const chaseTarget=dog.state==='chase'?dogTargetObject(dog.targetKey):null;
  if(dog.state==='chase'&&!chaseTarget)dogEndAlert(dog);
  else if(dog.handler&&!dog.alertDisabled&&dog.state==='chase'&&dog.chaseElapsed>=DOG_GRACE
   &&(D(dog,chaseTarget)>=DOG_DROP||D(dog.handler,chaseTarget)>=DOG_HANDLER_DROP)){
   const key=dog.targetKey;
   if(h.target===key){h.st=0;h.target=null;h.lost=0;h.foundPause=0;}
   dogEndAlert(dog);dog.rearmRequired=true;dog.rearmKey=key;
  }
  if(!dog.handler){
   dog.lostPhase+=dt*3.15;dog.lostBase+=Math.sin(dog.lostPhase*.37)*.1*dt;
   const a=dog.lostBase+Math.sin(dog.lostPhase)*.78;
   dogMoveAround(dog,{x:dog.x+Math.cos(a)*75,y:dog.y+Math.sin(a)*75},75,dt,7,true);
  }else{
   if(!dog.alertDisabled&&dog.state!=='chase'){
    const found=dogFindTarget(dog);
    if(found){dog.state='chase';dog.targetKey=found.key;dog.chaseElapsed=0;dog.dogEscape=null;}
   }
   if(dog.state==='chase'){
    const target=dogTargetObject(dog.targetKey);
    if(target){
     const distance=D(dog,target);
     if(distance<=DOG_BARK){if(dog.barkCooldown<=0)dogBark(dog);}
     else if(dog.barkT<=0){
      if(D(h,dog)>105&&!(h.stun>0)&&!(h.stunRecover>0)&&!h.houndPinned&&!(h.blastAirT>0)){
       dogMoveAround(h,dog,150,dt,8,false);h.modeFrozen=false;h.walking=true;
      }
      dogMoveAround(dog,target,150,dt,7,true);
     }
    }
   }else if(dog.patrolMode==='south'){
    dog.southTime+=dt;dog.southY=Math.min(WH-45,dog.southY+75*dt);
    const target={x:dog.southX,y:dog.southY};
    if(D(dog,target)>5)dogMoveAround(dog,target,75,dt,7,true);
    if(D(h,dog)>105&&!(h.stun>0)&&!(h.stunRecover>0)&&!h.houndPinned&&!(h.blastAirT>0)){
     dogMoveAround(h,dog,75,dt,8,false);h.modeFrozen=false;h.walking=true;
    }
   }else{
    dog.orbit+=dt*.35;
    const target={x:h.x+Math.cos(dog.orbit)*dog.orbitRadius,y:h.y+Math.sin(dog.orbit)*dog.orbitRadius};
    if(D(dog,target)>5)dogMoveAround(dog,target,75,dt,7,true);
   }
  }
  dog.walking=Math.hypot(dog.x-ox,dog.y-oy)>.05;
 }
}
function drawDogBarkWaves(x,y,remaining){
 const phase=((.9-remaining)%.3)/.3;
 g.save();g.strokeStyle='#e44949';g.lineWidth=4.5;g.globalAlpha=Math.min(1,phase*10)*(1-phase);
 g.beginPath();g.arc(x,y,200*phase,0,Math.PI*2);g.stroke();g.restore();
}
function drawEnemyDogs(){
 for(const dog of enemyDogs){
  if(dog.y<cam-230||dog.y>cam+H+230||dog.x<camX-230||dog.x>camX+W+230)continue;
  const h=dog.handler;
  if(h&&h.alive){g.save();g.strokeStyle='#aa9270';g.lineWidth=1.5;g.beginPath();g.moveTo(h.x,h.y);g.lineTo(dog.x+Math.cos(dog.face)*8,dog.y+Math.sin(dog.face)*8);g.stroke();g.restore();}
  drawHound(dog);
  if(dog.barkT>0)drawDogBarkWaves(dog.signalX,dog.signalY,dog.barkT);
 }
 if(hound?.warningBarkT>0)drawDogBarkWaves(hound.warningBarkX??hound.x,hound.warningBarkY??hound.y,hound.warningBarkT);
}
