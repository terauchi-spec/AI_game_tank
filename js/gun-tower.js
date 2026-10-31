// Range: 4 × the ordinary enemy single-shot rifle (150px).
// Stationary single-seat vehicle. Ammunition belongs to the emplacement, not its operator.
const GUN_TOWER_TYPE=Object.freeze({id:'gunTower',n:'機関銃塔',hp:8,armor:1.5,cmax:0,vmax:500,fmax:0,sp:0,ccd:.065,vcd:.065,range:600,speed:1000,col:'#66705a'});
function gunTowerAvailable(v){
 if(v?.kind!=='tower')return true;
 if(v.gunner&&(!v.gunner.alive||v.gunner.stun>0||v.gunner.blastAirT>0))releaseGunTower(v);
 return !v.gunner;
}
function releaseGunTower(v){
 const h=v?.gunner;if(!h)return;
 h.gunTower=null;h.st=0;h.target=null;h.frontMarch=stageMode==='front';h.path=[{x:h.x,y:h.y},{x:h.x+30,y:h.y+30}];h.wi=1;
 v.gunner=null;v.reboardT=10;v.scanTarget=null;
}
function boardEnemyGunTower(v,h){
 if(!gunTowerAvailable(v)||v.v<=0||!h.alive||h.elite||h.commander==='white'||h.stun>0||h.stunRecover>0||h.blastAirT>0||h.dog||h.houndPinned)return false;
 h.gunTower=v;v.gunner=h;h.face=v.aim??v.body;h.x=v.x-Math.cos(h.face)*22;h.y=v.y-Math.sin(h.face)*22;h.walking=false;h.frontMarch=false;h.chatT=0;h.chatMate=null;return true;
}
function setupGunTowers(){
 if(areaDebugEnabled||!['base','front'].includes(currentStageId()))return 0;
 const anchors=stageMode==='front'?mission.points.map(q=>({x:q.x+(q.x<WW/2?160:-160),y:q.y-150})):[{x:220,y:9000},{x:740,y:6100},{x:230,y:2600}];
 let count=0;
 for(const anchor of anchors){
  let spot=null;
  for(let k=0;k<160&&!spot;k++){
   const a=k*2.4,rad=k?32+Math.floor(k/12)*24:0,x=anchor.x+Math.cos(a)*rad,y=anchor.y+Math.sin(a)*rad;
   if(x<60||x>WW-60||y<100||y>WH-100||D({x,y},p)<650||hitsC(x,y,38)||inWaterAt(x,y,38)||(cars||[]).some(v=>D(v,{x,y})<100)||(etanks||[]).some(e=>e.alive&&D(e,{x,y})<80))continue;
   spot={x,y};
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
function updateGunTowers(dt){
 for(const v of cars||[])if(v.kind==='tower'){
  v.f=0;v.reboardT=Math.max(0,(v.reboardT||0)-dt);gunTowerAvailable(v);
  if(!v.gunner&&v.v>0&&v.reboardT<=0){
   v.reboardT=.5;
   const h=(humans||[]).find(h=>h.alive&&!h.gunTower&&!h.elite&&!h.dog&&!h.commander&&!(h.stun>0)&&!(h.stunRecover>0)&&!(h.blastAirT>0)&&!h.houndPinned&&D(h,v)<40&&los(h,v));
   if(h)boardEnemyGunTower(v,h);
  }
 }
}
function updateGunTowerEnemy(h,dt){
 const v=h.gunTower;if(!v)return false;
 if(!h.alive||h.stun>0||h.blastAirT>0||!cars.includes(v)){releaseGunTower(v);return false;}
 h.x=v.x-Math.cos(v.aim??v.body)*22;h.y=v.y-Math.sin(v.aim??v.body)*22;h.walking=false;v.gunT=Math.max(0,(v.gunT||0)-dt);v.scanT=(v.scanT||0)-dt;
 if(v.scanT<=0){
  v.scanT=.15;v.scanTarget=null;let best=GUN_TOWER_TYPE.range;
  const targets=[];
  if(debugMode<2&&p&&!(p.dig>0)&&!(p.digPrep>0)&&!(!p.tank&&inBush(p)))targets.push({actor:p,key:'p'});
  if(partner&&!partner.down&&!(partner.stunT>0))targets.push({actor:partner,key:'partner'});
  for(const a of allies||[])if(a.alive&&!(a.chute>0)&&!(a.stun>0))targets.push({actor:a,key:'ally:'+a.id});
  if(decoy)targets.unshift({actor:decoy,key:'decoy'});
  for(const t of targets){const d=D(v,t.actor);if(d<best&&los(v,t.actor)){best=d;v.scanTarget=t;}if(v.scanTarget?.key==='decoy')break;}
 }
 const target=v.scanTarget,actor=target?.actor;
 if(!actor||target.key==='decoy'&&actor!==decoy||actor.alive===false||actor.down||actor.stun>0||actor===p&&(p.dig>0||debugMode>=2)||D(v,actor)>GUN_TOWER_TYPE.range||!los(v,actor)){h.st=0;h.target=null;return true;}
 h.st=1;h.target=target.key;h.face=v.aim=Math.atan2(actor.y-v.y,actor.x-v.x);h.x=v.x-Math.cos(h.face)*22;h.y=v.y-Math.sin(h.face)*22;
 if(v.gunT<=0&&v.v>0){v.gunT=GUN_TOWER_TYPE.vcd;fireGunTower(v,h.face,'e',h);}
 return true;
}
function fireGunTower(v,angle,from,operator=null){
 if(v?.kind!=='tower'||!(v.v>0))return false;
 v.v--;v.aim=angle;v.f=0;
 const a=angle+(R()-.5)*.045;
 fire(v.x+Math.cos(a)*37,v.y+Math.sin(a)*37,a,from,'v',GUN_TOWER_TYPE.speed,GUN_TOWER_TYPE.range,0,from==='e'?'enemyGun':'mg');
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
 c.gatlingHits=(c.gatlingHits||0)+1;if(c.gatlingHits<8)return;c.gatlingHits=0;
 if(c.frontCargo)damageFrontlineCargo(c,x,y,6);else carve(x,y,10,from==='p',null);
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
 else if(hit.type==='tank'){enterTankFound(o,'p',.5);sfx('vehicleHit',o);}
 else if(hit.type==='player'){
  if(p.tank){const v=p.tank;if(v.kind==='truck'){recordPlayerDamage(.2,true);v.mgHits=(v.mgHits||0)+1;if(v.mgHits>=5)wreck();}else if(v.kind==='fighter'){recordPlayerDamage(Math.min(v.hp,1)/v.t.hp,true);v.hp--;if(v.hp<=0)wreck();}else{const armor=v.t.armor||1.5,amount=v.t.id==='armored'?armor/7.5:.066;v.ch=(v.ch||0)+amount;recordPlayerDamage(amount/armor,true);if(v.ch>=armor)wreck();}sfx('vehicleHit');}
  else{recordPlayerDamage(Math.min(p.hp,.5)/3);p.hp-=.5;if(p.hp<=0)triggerPlayerDeath();}
 }else if(hit.type==='partner'){
  if(o.vehicle){o.vehicle.hp=Math.max(0,o.vehicle.hp-1);if(o.vehicle.hp<=0)partnerVehicleDestroyed(o);}
  else{o.hp=Math.max(0,o.hp-1);if(!o.hp){o.down=true;say('相棒が倒れた！触れて救助しよう');}}
 }else if(hit.type==='ally'){o.alive=false;if(typeof rememberFallenAlly==='function')rememberFallenAlly(o,b.vx,b.vy);}
 else if(hit.type==='hound')stunHound(5);
 burst(b.x,b.y,2,'#ffe1a0',60);return true;
}
function drawGunTower(v,x,y,angle){
 g.save();g.translate(x,y);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(2,5,31,25,0,0,Math.PI*2);g.fill();
 g.strokeStyle='#343b32';g.lineWidth=7;for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.5;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*26,Math.sin(a)*26);g.stroke();}
 g.save();g.rotate(angle);g.fillStyle='#384535';g.fillRect(-33,-10,17,20);g.strokeStyle='#202a24';g.lineWidth=3;g.strokeRect(-34,-10,17,20);g.restore();
 g.fillStyle='#626b50';g.strokeStyle='#27352a';g.lineWidth=2;g.beginPath();g.arc(0,0,19,0,Math.PI*2);g.fill();g.stroke();g.restore();
 const enemy=!!v.gunner,occupied=enemy||p?.tank===v||partner?.vehicle===v;
 const enemyAlpha=enemy?digEnemyAlpha()*(1-sandIntensity):1;
 if(occupied){g.save();g.globalAlpha*=enemyAlpha;soldier(x-Math.cos(angle)*22,y-Math.sin(angle)*22,angle,!enemy,enemy&&!!v.gunner.st,false,false,'',false,!enemy&&p?.tank===v,enemy?v.gunner:partner?.vehicle===v?partner:p);g.restore();}
 g.save();g.translate(x,y);g.rotate(angle);g.fillStyle='#3b4a3c';g.strokeStyle='#202a24';g.lineWidth=2;
 g.beginPath();g.roundRect(-2,-15,11,30,3);g.fill();g.stroke();g.fillStyle='#718067';g.fillRect(-5,-19,11,9);g.fillRect(-5,10,11,9);
 g.fillStyle='#262f30';g.fillRect(3,-6,30,12);g.strokeStyle='#9aa5a0';g.lineWidth=1.8;
 for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(5,i*3.5);g.lineTo(36,i*3.5);g.stroke();}
 g.fillStyle='#454e49';g.fillRect(16,-7,4,14);g.fillRect(31,-7,5,14);g.fillStyle='#242c24';g.fillRect(-16,-9,12,18);g.fillStyle='#d2b965';for(let i=0;i<4;i++)g.fillRect(-14+i*3,-8,2,6);
 g.restore();if(enemy&&v.gunner.st&&enemyAlpha>.18)lab('!',x,y-43,'bold 17px system-ui','#ff5a5a');
}
function partnerGunTowerAttack(q,dt){
 const v=q.vehicle;q.vehicleGunT=Math.max(0,(q.vehicleGunT||0)-dt);q.towerScanT=(q.towerScanT||0)-dt;
 if(q.towerScanT<=0){q.towerScanT=.15;q.towerTarget=null;let best=GUN_TOWER_TYPE.range;for(const h of humans||[])if(h.alive&&!(h.stun>0)){const d=D(q,h);if(d<best&&los(q,h)){best=d;q.towerTarget=h;}}}
 const h=q.towerTarget;if(!h||!h.alive||h.stun>0||D(q,h)>GUN_TOWER_TYPE.range||!los(q,h))return;
 q.vehicleAim=q.face=Math.atan2(h.y-q.y,h.x-q.x);v.aim=q.vehicleAim;
 if(v.v>0&&q.vehicleGunT<=0){q.vehicleGunT=GUN_TOWER_TYPE.vcd;fireGunTower(v,q.vehicleAim,'ally',q);}
}
