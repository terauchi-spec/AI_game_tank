// Two bounded enemy dog/blue-handler pairs per map. No per-frame enemy search:
// the 500px infantry scan happens once per bark, at most once every 3 seconds.
let enemyDogs=[];
function dogHandlerStepAllowed(h,x,y){
 if(!h.dogHandler||!h.dog||h.dog.handler!==h)return true;
 const next=Math.hypot(x-h.dog.x,y-h.dog.y),current=D(h,h.dog);
 return (next>=50&&next<=200)||(current>200&&next<current)||(current<50&&next>current);
}
function spawnEnemyDogs(){
 enemyDogs=[];
 for(let i=0;i<2;i++){
  const spot=missionSpot(i?WW*.72:WW*.28,i?5400:9400,18);
  const handler={...spot,path:[{...spot}],wi:0,dir:1,loop:true,stk:0,alive:true,elite:false,commander:null,dogHandler:true,st:0,sus:0,lost:0,cd:1,burstLeft:0,face:Math.PI/2,commanderScan:0,commanderTactics:0,commanderCooldown:2,whistleT:0,whistleCooldown:0};
  let pos=null;
  for(let radius=75;radius<=175&&!pos;radius+=25)for(let n=0;n<16;n++){
   const a=n*Math.PI/8,q={x:spot.x+Math.cos(a)*radius,y:spot.y+Math.sin(a)*radius};
   if(q.x>8&&q.x<WW-8&&q.y>8&&q.y<WH-8&&!hitsC(q.x,q.y,7)&&patrolLineClear(spot,q,7)){pos=q;break;}
  }
  // missionSpot searches open terrain; if its immediate ring is blocked, search
  // another verified location rather than creating a dog inside an obstacle.
  if(!pos){pos=missionSpot(spot.x+100,spot.y,7);Object.assign(handler,missionSpot(pos.x-80,pos.y,18));handler.path=[{x:handler.x,y:handler.y}];}
  const dog={...pos,handler,enemyDog:true,col:'#222222',face:0,state:'patrol',stun:0,barkT:0,barkCooldown:0,orbit:i*Math.PI,orbitRadius:90+i*35,lostPhase:0,lostBase:0,avoidT:0,avoidSide:0,walking:false};
  handler.dog=dog;humans.push(handler);enemyDogs.push(dog);
 }
}
function dogBark(dog){
 dog.barkT=.9;dog.barkCooldown=3;dog.signalX=dog.x;dog.signalY=dog.y;
 // Suppress commander whistle cascades: this bark alone has a 500px radius.
 const rallying=commanderRallying;commanderRallying=true;
 try{for(const h of humans)if(h.alive&&(h===dog.handler||D(h,dog)<=500))enterHumanFound(h,'p',null,true);}
 finally{commanderRallying=rallying;}
}
function stunEnemyDogsAtBlast(x,y,r){
 for(const dog of enemyDogs)if(Math.hypot(dog.x-x,dog.y-y)<=r){dog.stun=5;dog.barkT=0;dog.walking=false;}
}
function updateEnemyDogs(dt){
 for(const dog of enemyDogs){
  const h=dog.handler;
  if(h&&!h.alive){dog.handler=null;dog.state='lost';dog.lostBase=dog.face;dog.lostPhase=0;dog.barkT=0;}
  dog.barkT=Math.max(0,dog.barkT-dt);dog.barkCooldown=Math.max(0,dog.barkCooldown-dt);dog.walking=false;
  if(dog.stun>0){dog.stun=Math.max(0,dog.stun-dt);continue;}
  // Far-off pairs remain stationary; timers and owner death still update.
  if(Math.abs(dog.y-p.y)>H+600||Math.abs(dog.x-p.x)>W+400)continue;
  const ox=dog.x,oy=dog.y;
  if(!dog.handler){
   // Same half-speed S-shaped wandering as the skill hound; no new owner.
   dog.lostPhase+=dt*3.15;dog.lostBase+=Math.sin(dog.lostPhase*.37)*.1*dt;
   houndTryStep(dog.lostBase+Math.sin(dog.lostPhase)*.78,75,dt,true,dog);
  }else{
   const distance=D(dog,p);
   // Smell deliberately ignores cover, stealth and debug detection suppression.
   if(distance<=300)dog.state='chase';
   if(dog.state==='chase'){
    dog.face=Math.atan2(p.y-dog.y,p.x-dog.x);
    if(distance<=50){if(dog.barkCooldown<=0)dogBark(dog);}
    else if(dog.barkT<=0){
     if(D(h,dog)>120&&!(h.stun>0)&&!(h.stunRecover>0)&&!h.houndPinned&&!(h.blastAirT>0)){
      const a=Math.atan2(dog.y-h.y,dog.x-h.x),step=Math.min(150*dt,D(h,dog)-90);
      mv(h,Math.cos(a)*step,Math.sin(a)*step,8);h.face=a;h.modeFrozen=false;h.walking=true;
     }
     houndTryStep(dog.face,150,dt,true,dog);
    }
   }else{
    dog.orbit+=dt*.35;
    const target={x:h.x+Math.cos(dog.orbit)*dog.orbitRadius,y:h.y+Math.sin(dog.orbit)*dog.orbitRadius};
    if(D(dog,target)>5)houndTryStep(Math.atan2(target.y-dog.y,target.x-dog.x),75,dt,true,dog);
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
}
