// Two bounded enemy dog/blue-handler pairs per map. No per-frame enemy search:
// the 500px infantry scan happens once per bark, at most once every 3 seconds.
const DOG_LEASH_MIN=50,DOG_LEASH_MAX=150,DOG_DETECT=200,DOG_BARK=100,DOG_HANDLER_DROP=350;
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
  const dog={...pos,handler,enemyDog:true,col:'#222222',face:0,state:'patrol',stun:0,barkT:0,barkCooldown:0,orbit:i*Math.PI,orbitRadius:90+i*35,patrolMode:i===0?'orbit':'south',southX:spot.x,southY:spot.y,southTime:0,lostPhase:0,lostBase:0,avoidT:0,avoidSide:i?1:-1,dogWall:null,alertDisabled:false,chaseElapsed:0,walking:false};
  handler.dog=dog;humans.push(handler);enemyDogs.push(dog);
 }
}

function dogEndAlert(dog,permanent=false){
 if(permanent)dog.alertDisabled=true;
 dog.state=dog.handler?'patrol':'lost';dog.chaseElapsed=0;dog.barkT=0;dog.dogWall=null;dog.walking=false;
}
function dogSilence(dog){
 if(dog.alertDisabled)return;
 dogEndAlert(dog,true);
 const h=dog.handler;
 if(h&&h.target==='p'){h.st=0;h.target=null;h.lost=0;h.foundPause=0;}
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
function dogMoveAround(unit,goal,speed,dt,r=7,isDog=true){
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
function dogBark(dog){
 if(dog.alertDisabled||dog.stun>0||dog.barkCooldown>0)return;
 tone(190,.13,.025,'sawtooth',95);
 dog.barkT=.9;dog.barkCooldown=3;dog.signalX=dog.x;dog.signalY=dog.y;
 // Suppress commander whistle cascades: this bark alone has a 500px radius.
 const rallying=commanderRallying;commanderRallying=true;
 try{for(const h of humans)if(h.alive&&(h===dog.handler||D(h,dog)<=500))enterHumanFound(h,'p',null,true);}
 finally{commanderRallying=rallying;}
}
function stunEnemyDogsAtBlast(x,y,r){
 for(const dog of enemyDogs)if(Math.hypot(dog.x-x,dog.y-y)<=r){dogSilence(dog);dog.stun=Math.max(dog.stun,5);dog.barkT=0;dog.walking=false;}
}
function updateEnemyDogs(dt){
 if(hound?.warningBarkT>0)hound.warningBarkT=Math.max(0,hound.warningBarkT-dt);
 for(const dog of enemyDogs){
  const h=dog.handler;
  if(h&&!h.alive){dog.handler=null;dog.state='lost';dog.lostBase=dog.face;dog.lostPhase=0;dog.barkT=0;}
  dog.barkT=Math.max(0,dog.barkT-dt);dog.barkCooldown=Math.max(0,dog.barkCooldown-dt);dog.walking=false;
  if(dog.stun>0){dog.stun=Math.max(0,dog.stun-dt);continue;}
  // Chase age must advance even while the pair is outside the render/update window.
  if(dog.state==='chase')dog.chaseElapsed=(dog.chaseElapsed||0)+dt;
  // Far-off pairs remain stationary; timers and owner death still update.
  if(Math.abs(dog.y-p.y)>H+600||Math.abs(dog.x-p.x)>W+400)continue;
  const ox=dog.x,oy=dog.y;
  if(!dog.alertDisabled&&hound&&skill==='hound'&&!(hound.stun>0)&&D(hound,dog)<=100){dogSilence(dog);hound.warningBarkT=.9;tone(225,.18,.03,'sawtooth',110);say('猟犬が吠えて犬兵を追い払った！');}
  if(dog.handler&&!dog.alertDisabled&&dog.state==='chase'&&dog.chaseElapsed>=10&&(D(dog,p)>=DOG_DETECT||D(dog.handler,p)>=DOG_HANDLER_DROP)){
   const h=dog.handler;if(D(h,p)>DOG_HANDLER_DROP&&h.target==='p'){h.st=0;h.target=null;h.lost=0;h.foundPause=0;}
   dogEndAlert(dog);
  }
  if(!dog.handler){
   // Same half-speed S-shaped wandering as the skill hound; no new owner.
   dog.lostPhase+=dt*3.15;dog.lostBase+=Math.sin(dog.lostPhase*.37)*.1*dt;
   const a=dog.lostBase+Math.sin(dog.lostPhase)*.78;
   dogMoveAround(dog,{x:dog.x+Math.cos(a)*75,y:dog.y+Math.sin(a)*75},75,dt,7,true);
  }else{
   const distance=D(dog,p);
   // Smell deliberately ignores cover, stealth and debug detection suppression.
   if(!dog.alertDisabled&&dog.state!=='chase'&&distance<=DOG_DETECT&&D(h,p)<=DOG_HANDLER_DROP){dog.state='chase';dog.chaseElapsed=0;}
   if(dog.state==='chase'){
    if(distance<=DOG_BARK){if(dog.barkCooldown<=0)dogBark(dog);}
    else if(dog.barkT<=0){
     if(D(h,dog)>105&&!(h.stun>0)&&!(h.stunRecover>0)&&!h.houndPinned&&!(h.blastAirT>0)){
      dogMoveAround(h,dog,150,dt,8,false);h.modeFrozen=false;h.walking=true;
     }
     dogMoveAround(dog,p,150,dt,7,true);
    }
   }else if(dog.patrolMode==='south'){
    // The second dog leads its blue handler toward the bottom of the map.
    // The target advances from the spawn point, not from the player's camera.
    dog.southTime+=dt;
    dog.southY=Math.min(WH-45,dog.southY+75*dt);
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
function drawEnemyDogs(){
 for(const dog of enemyDogs){
  if(dog.y<cam-230||dog.y>cam+H+230||dog.x<camX-230||dog.x>camX+W+230)continue;
  const h=dog.handler;
  if(h&&h.alive){g.save();g.strokeStyle='#aa9270';g.lineWidth=1.5;g.beginPath();g.moveTo(h.x,h.y);g.lineTo(dog.x+Math.cos(dog.face)*8,dog.y+Math.sin(dog.face)*8);g.stroke();g.restore();}
  drawHound(dog);
  if(dog.barkT>0){
   const phase=((.9-dog.barkT)%.3)/.3;
   g.save();g.strokeStyle='#e44949';g.lineWidth=4.5;g.globalAlpha=Math.min(1,phase*10)*(1-phase);g.beginPath();g.arc(dog.signalX,dog.signalY,200*phase,0,Math.PI*2);g.stroke();g.restore();
  }
 }
 if(hound?.warningBarkT>0){
  g.save();g.fillStyle='#fff0ba';g.font='bold 13px system-ui';g.textAlign='center';
  g.fillText('ワン！',hound.x,hound.y-38);g.restore();
 }
}
