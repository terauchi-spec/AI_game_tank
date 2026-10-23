// Advanced capture only. One aircraft, <=25 drops per pass and <=2 passes per run.
function enemyBomberEnabled(){
 return stageMode==='front'&&!areaDebugEnabled&&!isFrontlineBeginner()&&!isFrontlineOni();
}
// Only the shuffled middle areas qualify; a later grassland is still eligible.
function enemyBomberInRandomArea(){
 return ZONES.length>2&&p.y<ZONES[1].y0&&p.y>ZONES[ZONES.length-2].y1;
}
function setupEnemyBomber(){
 if(!enemyBomberEnabled()||!mission)return;
 mission.enemyAirRaid={remaining:R()<.5?1:2,passes:0,phase:'idle',timer:0,position:.5,plane:null,bombs:[],gradient:null,gradientHeight:0};
}
function updateEnemyBomber(dt){
 if(!enemyBomberEnabled()||state!=='play'||!mission?.enemyAirRaid)return;
 const raid=mission.enemyAirRaid;
 for(let i=raid.bombs.length-1;i>=0;i--){
  const bomb=raid.bombs[i];bomb.t-=dt;
  if(bomb.t<=0){raid.bombs.splice(i,1);enemyBomberBlast(bomb.x,bomb.y);if(state!=='play')return;}
 }
 if(raid.phase==='idle'){
  if(!mission.enemyWavesStarted||!raid.remaining||raid.passes>0&&mission.index<1||!enemyBomberInRandomArea())return;
  raid.position=1/6+R()*2/3;raid.phase='warning';raid.timer=8;sfx('radio');return;
 }
 if(raid.phase==='cooldown'){
  raid.timer=Math.max(0,raid.timer-dt);if(raid.timer===0)raid.phase='idle';return;
 }
 if(raid.phase==='warning'){
  if(!enemyBomberInRandomArea()){raid.phase='idle';raid.timer=0;return;}
  raid.timer=Math.max(0,raid.timer-dt);
  if(raid.timer>1e-9)return;
  const view=frontlineView();
  raid.plane={x:view.x+raid.position*view.w,y:Math.max(ZONES[ZONES.length-2].y1+1,Math.min(ZONES[1].y0-1,view.y-180)),endY:view.y+view.h+180,drop:.05,drops:0,maxDrops:25};
  raid.remaining--;raid.passes++;raid.phase='flight';return;
 }
 if(raid.phase!=='flight')return;
 const plane=raid.plane;plane.y+=380*dt;plane.drop-=dt;
 if(plane.drop<=0&&plane.drops<plane.maxDrops){
  const column=plane.drops%3-1;
  raid.bombs.push({x:Math.max(30,Math.min(WW-30,plane.x+column*78+(R()-.5)*28)),y:plane.y-35,t:.48});
  plane.drops++;plane.drop=.14;
 }
 // Keep the warning until both the complete aircraft and its drop run have passed.
 if(plane.y>Math.max(plane.endY,frontlineView().y+H+180)&&plane.drops===plane.maxDrops){
  raid.plane=null;raid.phase=raid.remaining?'cooldown':'done';raid.timer=22+R()*16;
 }
}
function enemyBomberVehicleDamage(vehicle,recordDamage,onDestroyed){
 if(vehicle.kind==='truck'){onDestroyed();return;}
 if(vehicle.kind==='fighter'){
  if(recordDamage)recordPlayerDamage(Math.min(vehicle.hp,3)/FIGHTER_TYPE.hp,true);
  vehicle.hp=Math.max(0,vehicle.hp-3);if(vehicle.hp<=0)onDestroyed();
 }else{
  const armor=vehicle.t?.armor||3;
  if(recordDamage)recordPlayerDamage(1.1/armor,true);
  vehicle.ch=(vehicle.ch||0)+1.1;if(vehicle.ch>=armor-1e-9)onDestroyed();
 }
}
function enemyBomberBlast(x,y,radius=88){
 if(!enemyBomberEnabled()||state!=='play')return;
 // Separate damage ownership: neither direct bombs nor their object chains hurt enemies.
 sfx('airExplosion');fb(x,y,46);burst(x,y,60,'#ff8a3a',400);burst(x,y,25,'#fff3b0',500);
 shake=Math.max(shake,15);flash=Math.max(flash,.5);
 damageBridgeByBomb(x,y,Math.min(42,radius));
 scatterSpinifexAt(x,y,radius);damageObjectsInRadius(x,y,100,'enemyBomb');carve(x,y,100,false,null);
 const hit=actor=>Math.hypot(actor.x-x,actor.y-y)<radius;
 for(const ally of allies||[])if(ally.alive&&!(ally.chute>0)&&hit(ally)){ally.alive=false;burst(ally.x,ally.y,10,'#8fd7ff',160);}
 if(hound&&hit(hound))stunHound(5); // Do not use the shared helper, which also stuns enemy dogs.
 const playerVehicle=p.tank;
 if(partner&&!partner.down&&hit(partner)&&(!playerVehicle||partner.vehicle!==playerVehicle&&partner.passengerVehicle!==playerVehicle)){
  if(partner.vehicle)enemyBomberVehicleDamage(partner.vehicle,false,()=>partnerVehicleDestroyed(partner));
  else{partner.hp=Math.max(0,partner.hp-1);partner.down=partner.hp<=0;partner.stunT=partner.down?0:2;partner.stunContactDelay=.3;}
 }
 if(!hit(p)||p.dig>0||debugInvincible)return;
 if(playerVehicle)enemyBomberVehicleDamage(playerVehicle,true,()=>wreck());
 else{recordPlayerDamage(Math.min(p.hp,1)/3);p.hp=Math.max(0,p.hp-1);beginBlastFlight(p,x,y,radius,58,8,0);if(p.hp<=0)triggerPlayerDeath();}
}
function drawEnemyBomberAircraft(){
 if(!enemyBomberEnabled()||state!=='play'||!mission?.enemyAirRaid)return;
 const raid=mission.enemyAirRaid;
 g.save();
 for(const bomb of raid.bombs){
  const progress=Math.max(0,Math.min(1,1-bomb.t/.48));
  g.fillStyle='#17243b';g.beginPath();g.ellipse(bomb.x,bomb.y,5,10,0,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(145,185,245,.65)';g.lineWidth=1;g.beginPath();g.arc(bomb.x,bomb.y,14*progress,0,Math.PI*2);g.stroke();
 }
 if(raid.plane)drawSupportBomber(raid.plane.x,raid.plane.y,true);
 g.restore();
}
function drawEnemyBomberWarning(){
 if(!enemyBomberEnabled()||state!=='play'||!mission?.enemyAirRaid)return;
 const raid=mission.enemyAirRaid;if(raid.phase!=='warning'&&raid.phase!=='flight')return;
 const width=W/3,view=frontlineView(),left=raid.plane?raid.plane.x-view.x-width/2:raid.position*W-width/2;
 const x=Math.max(0,left),right=Math.min(W,left+width),height=Math.min(150,H*.2);
 gm.save();gm.setTransform(1,0,0,1,0,0);
 if(right>x){
  // Same red top-to-transparent gradient as the indoor alarm, cached between frames.
  if(!raid.gradient||raid.gradientHeight!==height){
   raid.gradient=gm.createLinearGradient(0,0,0,height);raid.gradient.addColorStop(0,'rgba(190,22,18,.48)');raid.gradient.addColorStop(1,'rgba(190,22,18,0)');raid.gradientHeight=height;
  }
  gm.fillStyle=raid.gradient;gm.fillRect(x,0,right-x,height);
 }
 gm.textAlign='center';gm.font='bold 14px system-ui';gm.lineJoin='round';gm.lineWidth=4;gm.strokeStyle='rgba(10,12,15,.9)';gm.fillStyle='#ffc6bd';
 if(raid.phase==='warning'){
  for(const [text,y] of [['敵の通信を傍受！',25],['敵の爆撃機がそちらに向かっている',47]]){gm.strokeText(text,W/2,y,W-16);gm.fillText(text,W/2,y,W-16);}
 }else{gm.strokeText('敵爆撃機 通過中',W/2,25,W-16);gm.fillText('敵爆撃機 通過中',W/2,25,W-16);}
 gm.restore();
}
