// Gatling hardware is drawn at 80% of its former size; people retain their ordinary size.
// Stationary single-seat vehicle. Ammunition belongs to the emplacement, not its operator.
const GUN_TOWER_TYPE=Object.freeze({id:'gunTower',n:'機関銃塔',hp:8,armor:1.5,cmax:0,vmax:500,fmax:0,sp:0,ccd:.065,vcd:.065,range:400,speed:1000,antiTankHits:30,playerTankHits:200,spinUpSeconds:.5,coverRadius:20,drawScale:1.6,seatOffset:22.4,muzzleOffset:59.2,clearance:67.2,boardRadius:96,col:'#66705a'});
function gunTowerAvailable(v){
 if(v?.kind!=='tower')return true;
 if(v.destroyed)return false;
 if(v.gunner&&(!v.gunner.alive||v.gunner.stun>0||v.gunner.blastAirT>0))releaseGunTower(v);
 return !v.gunner;
}
function releaseGunTower(v){
 const h=v?.gunner;if(!h)return;
 h.gunTower=null;h.st=0;h.target=null;h.frontMarch=stageMode==='front';h.path=[{x:h.x,y:h.y},{x:h.x+30,y:h.y+30}];h.wi=1;
 v.gunner=null;v.reboardT=10;v.scanTarget=null;v.lostTargetT=0;v.spinActive=false;v.spinTime=0;
}
function boardEnemyGunTower(v,h){
 if(!gunTowerAvailable(v)||v.v<=0||!h.alive||h.elite||h.commander==='white'||h.stun>0||h.stunRecover>0||h.blastAirT>0||h.dog||h.houndPinned)return false;
 h.gunTower=v;v.gunner=h;v.scanCenter=v.body??v.aim??0;v.scanOffset=0;v.scanDirection=1;v.lostTargetT=0;h.face=v.aim=v.scanCenter;h.x=v.x-Math.cos(h.face)*GUN_TOWER_TYPE.seatOffset;h.y=v.y-Math.sin(h.face)*GUN_TOWER_TYPE.seatOffset;h.walking=false;h.frontMarch=false;h.chatT=0;h.chatMate=null;return true;
}
function setupGunTowers(){
 if(areaDebugEnabled||!['base','front'].includes(currentStageId()))return 0;
 const anchors=stageMode==='front'?mission.points.map(q=>({x:q.x+(q.x<WW/2?160:-160),y:q.y-150})):[{x:220,y:9000},{x:740,y:6100},{x:230,y:2600},{x:735,y:10200},{x:225,y:4600},{x:735,y:1350}];
 let count=0;
 const clear=(x,y)=>x>=96&&x<=WW-96&&y>=100&&y<=WH-100&&(stageMode!=='front'||y>=frontlineNorthEdge()+96)&&D({x,y},p)>=650&&!hitsC(x,y,GUN_TOWER_TYPE.clearance)&&!inWaterAt(x,y,GUN_TOWER_TYPE.clearance)&&!(cars||[]).some(v=>D(v,{x,y})<164)&&!(etanks||[]).some(e=>e.alive&&D(e,{x,y})<132);
 for(const anchor of anchors){
  let spot=null;
  for(let k=0;k<320&&!spot;k++){
   const a=k*2.4,rad=k?32+Math.floor(k/12)*24:0,x=anchor.x+Math.cos(a)*rad,y=anchor.y+Math.sin(a)*rad;
   if(!clear(x,y))continue;
   spot={x,y};
  }
  // A broad platform may not fit the original zone (for example a wide river).
  // Startup-only fallback finds open ground inside the playable area.
  for(let dy=0;dy<=2400&&!spot;dy+=64)for(const sign of (dy?[1,-1]:[1])){
   if(spot)break;const y=anchor.y+dy*sign;
   for(let x=96;x<=WW-96;x+=64)if(clear(x,y)){spot={x,y};break;}
  }
  if(!spot)continue;
  const v={...spot,t:GUN_TOWER_TYPE,kind:'tower',hp:8,c:0,v:500,f:0,ch:0,mgHits:0,body:Math.PI/2,aim:Math.PI/2,reboardT:2,gunT:0,scanT:0};cars.push(v);count++;
  if(R()<.5){
   const h={...spot,alive:true,elite:false,st:0,sus:0,lost:0,cd:1,burstLeft:0,face:Math.PI/2,target:null,path:[],wi:0,dir:1,loop:false,stk:0,scoreCounted:false};humans.push(h);boardEnemyGunTower(v,h);
  }
 }
 return count;
}
function gunTowerBlast(x,y,r){
 for(const v of cars||[])if(v.kind==='tower'&&v.gunner&&Math.hypot(v.x-x,v.y-y)<r){const h=v.gunner;releaseGunTower(v);stunHumanBlast(h,5);}
}

function destroyGunTower(v,impactX=v?.x,impactY=v?.y){
 if(!v||v.kind!=='tower'||v.destroyed)return false;
 updateGunTowerSpin(v,0,false);
 if(p?.tank===v&&(debugInvincible||areaDebugEnabled)){shake=Math.max(shake,4);return true;}
 v.destroyed=true;
 if(v.gunner){
  const h=v.gunner;releaseGunTower(v);
  if(h.alive){if(typeof noteEnemyFallHit==='function')noteEnemyFallHit(h,h.x-impactX,h.y-impactY);h.alive=false;burst(h.x,h.y,12,'#ad6e48',120);}
 }
 if(p?.tank===v)wreck();
 else{
  spawnVehicleWreck(v,v.x,v.y,v.body??v.aim,v.aim,impactX,impactY);
  if(partner?.vehicle===v)partnerVehicleDestroyed(partner);
  else sfx('vehicleDestroyed',v);
 }
 cars=cars.filter(c=>c!==v);
 cannonImpact(impactX,impactY,'e');
 burst(v.x,v.y,26,'#e48b47',200);shake=Math.max(shake,9);
 return true;
}
function hitGunTowerByEnemyCannon(b,ox,oy){
 if(b.from!=='e'||b.k!=='c')return false;
 const start={x:ox,y:oy},radius=GUN_TOWER_TYPE.drawScale*33;
 let target=null,nearest=Infinity;
 const check=v=>{
  if(!v||v.kind!=='tower'||v.destroyed)return;
  const t=gunTowerSegmentT(start,b,v,radius);
  if(t!==null&&t<nearest){target=v;nearest=t;}
 };
 for(const v of cars||[])check(v);
 check(p?.tank);check(partner?.vehicle);
 if(!target)return false;
 const x=ox+(b.x-ox)*nearest,y=oy+(b.y-oy)*nearest;
 b.x=x;b.y=y;
 return destroyGunTower(target,x,y);
}
// Warm up once per trigger hold. The barrel continues spinning during sustained fire.
function updateGunTowerSpin(v,dt,active){
 if(!v||v.kind!=='tower')return false;
 if(!active||v.destroyed||v.v<=0){
  v.spinActive=false;v.spinTime=0;return false;
 }
 if(!v.spinActive){
  v.spinActive=true;v.spinTime=0;
  sfx('gatlingSpin',{x:v.x,y:v.y});
 }
 v.spinTime=Math.min(GUN_TOWER_TYPE.spinUpSeconds,(v.spinTime||0)+Math.max(0,dt));
 // Phase is updated in gameplay, never by drawing.
 const t=v.spinTime/GUN_TOWER_TYPE.spinUpSeconds;
 v.spinPhase=((v.spinPhase||0)+Math.max(0,dt)*(12+34*t))%(Math.PI*2);
 return v.spinTime>=GUN_TOWER_TYPE.spinUpSeconds-1e-9;
}
function updateGunTowerBurst(v,dt){
 if(v.aiRestT>0){v.aiRestT=Math.max(0,v.aiRestT-dt);return;}
 if(v.aiBurstT>0){
  const remaining=v.aiBurstT-dt;v.aiBurstT=Math.max(0,remaining);
  if(remaining<=1e-9){v.aiBurstT=0;v.aiRestT=Math.max(0,3+Math.min(0,remaining));}
 }
}
function updateGunTowers(dt){
 if(p?.tank?.kind==='tower')updateGunTowerBurst(p.tank,dt);
 if(partner?.vehicle?.kind==='tower'&&partner.vehicle!==p?.tank)updateGunTowerBurst(partner.vehicle,dt);
 for(const v of cars||[])if(v.kind==='tower'){
  updateGunTowerBurst(v,dt);v.f=0;v.reboardT=Math.max(0,(v.reboardT||0)-dt);gunTowerAvailable(v);
  if(!v.gunner&&p?.tank!==v&&partner?.vehicle!==v)updateGunTowerSpin(v,dt,false);
  if(!v.gunner&&v.v>0&&v.reboardT<=0){
   v.reboardT=.5;
   const h=(humans||[]).find(h=>h.alive&&!h.gunTower&&!h.elite&&!h.dog&&!h.commander&&!(h.stun>0)&&!(h.stunRecover>0)&&!(h.blastAirT>0)&&!h.houndPinned&&D(h,v)<90&&los(h,v));
   if(h)boardEnemyGunTower(v,h);
  }
 }
}
function updateGunTowerEnemy(h,dt){
 const v=h.gunTower;if(!v)return false;
 if(v.destroyed||!h.alive||h.stun>0||h.blastAirT>0||!cars.includes(v)){updateGunTowerSpin(v,dt,false);releaseGunTower(v);return false;}
 h.walking=false;h.sus=Math.max(0,(h.sus||0)-dt);h.burnSuspicionHold=Math.max(0,(h.burnSuspicionHold||0)-dt);v.gunT=Math.max(0,(v.gunT||0)-dt);v.scanT=(v.scanT||0)-dt;
 // Slowly patrol the fixed 180-degree forward arc (+/-90 degrees).
 // Sweep only while idle; avoid adding per-frame allocations or extra sight queries.
 if(!v.scanTarget){
  const limit=Math.PI/2,speed=.26*.8;
  let offset=(v.scanOffset||0)+speed*(v.scanDirection||1)*dt;
  if(offset>limit){offset=limit-(offset-limit);v.scanDirection=-1;}
  else if(offset< -limit){offset=-limit+(-limit-offset);v.scanDirection=1;}
  v.scanOffset=Math.max(-limit,Math.min(limit,offset));
  h.face=v.aim=(v.scanCenter??v.body??0)+v.scanOffset;
 }
 h.x=v.x-Math.cos(h.face)*GUN_TOWER_TYPE.seatOffset;h.y=v.y-Math.sin(h.face)*GUN_TOWER_TYPE.seatOffset;
 if(v.scanT<=0){
  v.scanT=.15;
  // Use ordinary blue-soldier perception at the current sweeping heading.
  const detected=findDetectedTarget(h,h.face);
  if(detected){v.scanTarget={actor:detected.obj,key:detected.key};v.lastSeenX=detected.obj.x;v.lastSeenY=detected.obj.y;v.lostTargetT=0;}
  else if(v.scanTarget)v.lostTargetT=(v.lostTargetT||0)+.15;
 }
 const target=v.scanTarget,actor=target?.actor;
 const lostSight=!!actor&&(D(v,actor)>GUN_TOWER_TYPE.range||!los(v,actor)||(v.lostTargetT||0)>0);
 if(!actor||target.key==='decoy'&&actor!==decoy||actor.alive===false||actor.down||actor.stun>0||actor===p&&(p.dig>0||debugMode>=2)||(v.lostTargetT||0)>=2){
  h.st=0;h.target=null;v.scanTarget=null;updateGunTowerSpin(v,dt,false);return true;
 }
 h.st=1;h.target=target.key;h.face=v.aim=Math.atan2((lostSight?v.lastSeenY:actor.y)-v.y,(lostSight?v.lastSeenX:actor.x)-v.x);
 h.x=v.x-Math.cos(h.face)*GUN_TOWER_TYPE.seatOffset;h.y=v.y-Math.sin(h.face)*GUN_TOWER_TYPE.seatOffset;
 const ready=updateGunTowerSpin(v,dt,!lostSight&&v.v>0&&!(v.aiRestT>0));
 if(ready&&v.gunT<=0){v.gunT=GUN_TOWER_TYPE.vcd;fireGunTower(v,h.face,'e',h);}
 return true;
}
function fireGunTower(v,angle,from,operator=null){
 if(v?.kind!=='tower'||v.destroyed||!(v.v>0)||from!=='p'&&v.aiRestT>0)return false;
 if(from!=='p'&&!(v.aiBurstT>0))v.aiBurstT=1.5;
 v.v--;v.aim=angle;v.f=0;
 const a=angle+(R()-.5)*.045;
 fire(v.x+Math.cos(a)*GUN_TOWER_TYPE.muzzleOffset,v.y+Math.sin(a)*GUN_TOWER_TYPE.muzzleOffset,a,from,'v',GUN_TOWER_TYPE.speed,GUN_TOWER_TYPE.range,0,from==='e'?'enemyGun':'mg');
 const b=bullets[bullets.length-1];b.gatling=true;b.operator=operator;b.sourceTower=v;
 return true;
}
function gunTowerSegmentT(a,b,o,r){
 const dx=b.x-a.x,dy=b.y-a.y,fx=a.x-o.x,fy=a.y-o.y,A=dx*dx+dy*dy,C=fx*fx+fy*fy-r*r;
 if(C<=0)return 0;if(A<=1e-9)return null;
 const B=2*(fx*dx+fy*dy),disc=B*B-4*A*C;if(disc<0)return null;
 const t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:null;
}
function damageGunTowerCover(c,x,y,from){
 if(c.frontAntenna&&!c.frontCargo||c.trainingWall||c.indoorDoor)return;
 c.gatlingHits=(c.gatlingHits||0)+1.5;if(c.gatlingHits<8)return;c.gatlingHits-=8;
 if(c.frontCargo)damageFrontlineCargo(c,x,y,12);else carve(x,y,GUN_TOWER_TYPE.coverRadius,from==='p',null);
}
function updateGatlingBullet(b,ox,oy,expired){
 const a={x:ox,y:oy},end={x:b.x,y:b.y},hits=[];
 const add=(o,r,type)=>{if(o.x<Math.min(ox,b.x)-r||o.x>Math.max(ox,b.x)+r||o.y<Math.min(oy,b.y)-r||o.y>Math.max(oy,b.y)+r)return;const t=gunTowerSegmentT(a,end,o,r);if(t!=null)hits.push({t,o,type});};
 const bp=segmentBaseImpact(a,end,1);if(bp)hits.push({t:Math.min(1,Math.hypot(bp.x-ox,bp.y-oy)/(Math.hypot(end.x-ox,end.y-oy)||1)),o:bp,type:'base'});
 const box=[Math.min(ox,b.x)-2,Math.min(oy,b.y)-2,Math.max(ox,b.x)+2,Math.max(oy,b.y)+2];
 // Geometry uses the same segment helpers as other weapons; find the first impact by bisection.
 for(const [list,test,type] of [[objectsInBox(...box),segmentHitsObject,'object'],[coversInBox(...box),segmentHitsCover,'cover']])for(const o of list){
  if(!test(a,end,o,0))continue;let lo=0,hi=1;
  for(let i=0;i<9;i++){const mid=(lo+hi)/2;if(test(a,{x:ox+(end.x-ox)*mid,y:oy+(end.y-oy)*mid},o,0))hi=mid;else lo=mid;}
  hits.push({t:hi,o,type});
 }
 for(const h of humans||[])if(h.alive&&h!==b.operator)add(h,12,'human');
 if(b.from!=='e'){for(const e of etanks||[])if(e.alive)add(e,TANK_HIT,'tank');}
 else{
  if(p&&!(p.dig>0)&&!debugInvincible)add(p,p.tank?TANK_HIT:10,'player');
  if(partner&&!partner.down&&!(p.tank&&(partner.vehicle===p.tank||partner.passengerVehicle===p.tank)))add(partner,partner.vehicle?28:12,'partner');
  for(const q of allies||[])if(q.alive&&!(q.chute>0))add(q,10,'ally');
  if(hound)add(hound,9,'hound');if(decoy)add(decoy,10,'decoy');
 }
 if(!hits.length)return expired;
 hits.sort((x,y)=>x.t-y.t);const hit=hits[0],o=hit.o;b.x=ox+(end.x-ox)*hit.t;b.y=oy+(end.y-oy)*hit.t;
 if(hit.type==='human'){
  if(typeof noteEnemyFallHit==='function')noteEnemyFallHit(o,b.vx,b.vy);o.alive=false;if(o.gunTower)releaseGunTower(o.gunTower);
  if(b.from==='p')recordPlayerKill(0,'mg',o);else if(b.from==='ally')recordSupportResult('kill','partner',o);burst(o.x,o.y,7,'#c05a3a',100);
 }else if(hit.type==='cover')damageGunTowerCover(o,b.x,b.y,b.from);
 else if(hit.type==='object')damageObject(o,'mg');
 else if(hit.type==='base'){if(b.from!=='e')damageBase(.035,b.x,b.y,5,1,b.from==='p'?'player':'support');}
 else if(hit.type==='tank'){
  enterTankFound(o,'p',.5);sfx('vehicleHit',o);
  if(b.from==='p'){
   o.gatlingHits=(o.gatlingHits||0)+1;
   if(o.gatlingHits>=GUN_TOWER_TYPE.antiTankHits&&destroyEnemyTank(o,b.x,b.y)){
    recordPlayerKill(0,'mg',o);fb(o.x,o.y,38);burst(o.x,o.y,28,'#ff8a3a',230);
   }
  }
 }
 else if(hit.type==='player'){
  if(p.tank){const v=p.tank;if(v.kind==='tank'&&v.t.id!=='armored'){const armor=v.t.armor||1.5,amount=armor/GUN_TOWER_TYPE.playerTankHits;v.ch=(v.ch||0)+amount;recordPlayerDamage(1/GUN_TOWER_TYPE.playerTankHits,true);if(v.ch>=armor-1e-9)wreck();sfx('vehicleHit');burst(b.x,b.y,2,'#ffe1a0',60);return true;}if(v.kind==='truck'){recordPlayerDamage(.2,true);v.mgHits=(v.mgHits||0)+1;if(v.mgHits>=5)wreck();}else if(v.kind==='fighter'){recordPlayerDamage(Math.min(v.hp,1)/v.t.hp,true);v.hp--;if(v.hp<=0)wreck();}else{const armor=v.t.armor||1.5,amount=v.t.id==='armored'?armor/7.5:.066;v.ch=(v.ch||0)+amount;recordPlayerDamage(amount/armor,true);if(v.ch>=armor)wreck();}sfx('vehicleHit');}
  else{recordPlayerDamage(Math.min(p.hp,.5)/3);p.hp-=.5;if(p.hp<=0)triggerPlayerDeath();}
 }else if(hit.type==='partner'){
  if(o.vehicle){o.vehicle.hp=Math.max(0,o.vehicle.hp-1);if(o.vehicle.hp<=0)partnerVehicleDestroyed(o);}
  else{o.hp=Math.max(0,o.hp-1);if(!o.hp){o.down=true;say('相棒が倒れた！触れて救助しよう');}}
 }else if(hit.type==='ally'){o.alive=false;if(typeof rememberFallenAlly==='function')rememberFallenAlly(o,b.vx,b.vy);}
 else if(hit.type==='hound')stunHound(5);
 burst(b.x,b.y,2,'#ffe1a0',60);return true;
}
// Source PNG sprites are kept alongside WebP runtime assets.
const gunTowerSprites={base:null,body:null};
if(typeof Image!=='undefined')for(const part of ['base','body']){const im=new Image();im.src='assets/vehicles/gatling_'+part+'.webp?v='+GAME_VERSION;gunTowerSprites[part]=im;}
function drawGunTower(v,x,y,angle){
 const s=GUN_TOWER_TYPE.drawScale;
 const baseSprite=gunTowerSprites.base;
 const bodySprite=gunTowerSprites.body;
 const baseReady=!!(baseSprite?.complete&&baseSprite.naturalWidth);
 const bodyReady=!!(bodySprite?.complete&&bodySprite.naturalWidth);
 // Fixed transparent pedestal. Only the gun body and its operator rotate.
 g.save();g.translate(x,y);g.scale(s,s);
 if(baseReady)g.drawImage(baseSprite,-36,-36,72,72);
 else{
  g.fillStyle='#313c32';g.strokeStyle='#1b2823';g.lineWidth=2;
  g.beginPath();g.arc(0,0,32,0,Math.PI*2);g.fill();g.stroke();
  g.fillStyle='#667360';g.beginPath();g.arc(0,0,25,0,Math.PI*2);g.fill();
 }
 g.restore();
 g.save();g.translate(x,y);g.rotate(angle);g.scale(s,s);
 if(bodyReady){
  // Pivot on the central mounting ring, not on the bounding-box center.
  // The larger barrel assembly extends farther to the right than the mounting ring.
  g.drawImage(bodySprite,-24,-36,72,72);
 }else{
  g.fillStyle='#566758';g.strokeStyle='#1b2823';g.lineWidth=2;
  g.fillRect(-21,-13,41,26);g.strokeRect(-21,-13,41,26);
  g.fillStyle='#303c34';g.fillRect(10,-7,32,14);
  g.strokeStyle='#b0b9b1';g.lineWidth=2;g.beginPath();
  for(let i=-2;i<=2;i++){g.moveTo(12,i*2.7);g.lineTo(40,i*2.7);}g.stroke();
 }
 // Thin highlights shift along the multi-barrel bundle while it spins.
 // Keep the rotation inside the barrel region and outside the seat and receiver.
 if(v.spinActive){
  g.save();g.beginPath();g.rect(22,-7.5,21,15);g.clip();
  for(let k=0;k<6;k++){
   const z=Math.sin((v.spinPhase||0)+k*Math.PI/3);
   g.strokeStyle=z>0?'rgba(224,231,220,.52)':'rgba(10,17,13,.35)';
   g.lineWidth=1.4;g.beginPath();g.moveTo(23,z*5.3);g.lineTo(42,z*5.3);g.stroke();
  }
  g.restore();
 }
 g.restore();
 const enemy=!!v.gunner,occupied=enemy||p?.tank===v||partner?.vehicle===v;
 const enemyAlpha=enemy?digEnemyAlpha()*(1-sandIntensity):1;
 // Draw the gunner after the sprite so they are visible sitting in the cockpit.
 if(occupied){
  g.save();g.globalAlpha*=enemyAlpha;
  soldier(x-Math.cos(angle)*GUN_TOWER_TYPE.seatOffset,y-Math.sin(angle)*GUN_TOWER_TYPE.seatOffset,angle,!enemy,enemy&&!!v.gunner.st,false,false,'',false,!enemy&&p?.tank===v,enemy?v.gunner:partner?.vehicle===v?partner:p);
  g.restore();
 }
 if(enemy&&v.gunner.st&&enemyAlpha>.18)lab('!',x,y-68,'bold 17px system-ui','#ff5a5a');
}
function drawGunTowerWreck(w,q){
 // Permanent, view-culled steel wreck: no ongoing animation or particle update.
 const s=GUN_TOWER_TYPE.drawScale;
 g.save();g.translate(q.bx,q.by);g.rotate(q.ba);g.scale(s,s);
 g.fillStyle='rgba(0,0,0,.24)';g.beginPath();g.ellipse(3,5,35,30,0,0,Math.PI*2);g.fill();
 g.fillStyle='#272824';g.strokeStyle='#151a16';g.lineWidth=2;g.beginPath();g.arc(0,0,30,0,Math.PI*2);g.fill();g.stroke();
 g.fillStyle='#45463b';g.beginPath();g.arc(0,-2,24,0,Math.PI*2);g.fill();
 g.strokeStyle='#171f1b';g.lineWidth=5;g.beginPath();g.moveTo(-19,-18);g.lineTo(17,17);g.moveTo(-17,18);g.lineTo(16,-18);g.stroke();
 g.fillStyle='#77452f';g.beginPath();g.ellipse(-10,4,8,6,.5,0,Math.PI*2);g.fill();
 g.fillStyle='#232822';g.beginPath();g.arc(0,-2,12,0,Math.PI*2);g.fill();g.restore();
 g.save();g.translate(q.tx,q.ty);g.rotate(q.ta);g.scale(s,s);
 g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(6,4,24,11,0,0,Math.PI*2);g.fill();
 g.fillStyle='#353932';g.strokeStyle='#161c18';g.lineWidth=2;g.beginPath();g.moveTo(-12,-11);g.lineTo(12,-9);g.lineTo(15,8);g.lineTo(-13,12);g.closePath();g.fill();g.stroke();
 g.fillStyle='#282d28';g.fillRect(9,-5,25,10);
 g.strokeStyle='#74796f';g.lineWidth=1;g.beginPath();for(let i=-1;i<=1;i++){g.moveTo(12,i*3);g.lineTo(35,i*3);}g.stroke();
 g.fillStyle='#70452f';g.fillRect(-9,-5,9,7);g.restore();
}
function partnerGunTowerAttack(q,dt){
 const v=q.vehicle;q.vehicleGunT=Math.max(0,(q.vehicleGunT||0)-dt);q.towerScanT=(q.towerScanT||0)-dt;
 if(q.towerScanT<=0){q.towerScanT=.15;q.towerTarget=null;let best=GUN_TOWER_TYPE.range;for(const h of humans||[])if(h.alive&&!(h.stun>0)){const d=D(q,h);if(d<best&&los(q,h)){best=d;q.towerTarget=h;}}}
 const h=q.towerTarget;if(!h||!h.alive||h.stun>0||D(q,h)>GUN_TOWER_TYPE.range||!los(q,h)){updateGunTowerSpin(v,dt,false);return;}
 q.vehicleAim=q.face=Math.atan2(h.y-q.y,h.x-q.x);v.aim=q.vehicleAim;
 const ready=updateGunTowerSpin(v,dt,v.v>0&&!(v.aiRestT>0));
 if(ready&&q.vehicleGunT<=0){q.vehicleGunT=GUN_TOWER_TYPE.vcd;fireGunTower(v,q.vehicleAim,'ally',q);}
}
