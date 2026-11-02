// Advanced capture: <=2 passes. Developer area testing: one pass every 60 seconds.
let areaDebugAirRaid=null;
function areaDebugBomberEnabled(){
 return areaDebugEnabled&&typeof areaDebugEnemyBomber!=='undefined'&&areaDebugEnemyBomber&&typeof isDeveloperMode==='function'&&isDeveloperMode();
}
function enemyBomberRaid(){return areaDebugEnabled?(areaDebugBomberEnabled()?areaDebugAirRaid:null):mission?.enemyAirRaid;}
function setupAreaDebugEnemyBomber(){
 areaDebugAirRaid=areaDebugBomberEnabled()?{debug:true,nextPassT:60,remaining:1,passes:0,phase:'idle',timer:0,route:null,plane:null,bombs:[],gradient:null,gradientHeight:0,fighter:null,wrecks:[]}:null;
}
function enemyBomberEnabled(){
 return areaDebugBomberEnabled()||stageMode==='front'&&!areaDebugEnabled&&!isFrontlineBeginner()&&!isFrontlineOni();
}
// Only the shuffled middle areas qualify; a later grassland is still eligible.
function enemyBomberInRandomArea(){
 return ZONES.length>2&&p.y<ZONES[1].y0&&p.y>ZONES[ZONES.length-2].y1;
}
function setupEnemyBomber(){
 if(!enemyBomberEnabled()||!mission)return;
 mission.enemyAirRaid={remaining:R()<.5?1:2,passes:0,phase:'idle',timer:0,route:null,plane:null,bombs:[],gradient:null,gradientHeight:0,fighter:null,wrecks:[]};
}
function updateEnemyBomber(dt){
 if(!enemyBomberEnabled()||state!=='play'||!enemyBomberRaid())return;
 const raid=enemyBomberRaid();
 if(raid.debug)raid.nextPassT=Math.max(0,raid.nextPassT-dt);
 updateEnemyBomberInterception(raid,dt);
 for(let i=raid.bombs.length-1;i>=0;i--){
  const bomb=raid.bombs[i];bomb.t-=dt;
  if(bomb.t<=0){raid.bombs.splice(i,1);enemyBomberBlast(bomb.x,bomb.y);if(state!=='play')return;}
 }
 if(raid.phase==='idle'){
  if(raid.debug){if(raid.nextPassT>5+1e-9)return;}
  else if(!mission.enemyWavesStarted||!raid.remaining||raid.passes>0&&mission.index<1||!enemyBomberInRandomArea())return;
  const view=frontlineView();
  // Lock the world-space route when warning starts; camera movement never retargets it.
  raid.route=raid.debug?{x:Math.max(30,Math.min(WW-30,view.x+view.w*(.2+R()*.6))),y:view.y-180,endY:view.y+view.h+180}:{x:R()*WW,y:Math.max(ZONES[ZONES.length-2].y1+1,Math.min(ZONES[1].y0-1,view.y-180)),endY:view.y+view.h+180};
  raid.phase='warning';raid.timer=raid.debug?raid.nextPassT:5;sfx('airWarning');return;
 }
 if(raid.phase==='cooldown'){
  raid.timer=Math.max(0,raid.timer-dt);if(raid.timer===0)raid.phase='idle';return;
 }
 if(raid.phase==='warning'){
  raid.timer=Math.max(0,raid.timer-dt);
  if(raid.timer>1e-9)return;
  raid.plane={...raid.route,drop:.05,drops:0,maxDrops:25,age:0,intercept:(raid.debug||typeof isFrontlineAdvanced==='function'&&isFrontlineAdvanced())&&R()<.5};
  if(raid.debug)raid.nextPassT=60;else raid.remaining--;raid.passes++;raid.phase='flight';return;
 }
 if(raid.phase!=='flight')return;
 const plane=raid.plane;plane.age+=dt;
 if(plane.falling){
  plane.fallT+=dt;plane.y+=110*dt;plane.x=Math.max(28,Math.min(WW-28,plane.x+45*dt));
  if(plane.fallT>=.9){crashEnemyBomber(raid,plane);return;}
  return;
 }
 plane.y+=380*dt;plane.drop-=dt;
 if(plane.intercept&&plane.age>=.6&&!raid.fighter){
  const view=frontlineView(),dir=plane.x<view.x+view.w/2?-1:1;
  const x=dir>0?Math.min(view.x,plane.x)-100:Math.max(view.x+view.w,plane.x)+100;
  raid.fighter={x,y:plane.y,dir,speed:Math.max(1200,Math.abs(plane.x-x)/.65),shot:0,exitT:0};
  sfx('aircraft',{x:plane.x,y:plane.y});
 }
 if(plane.drop<=0&&plane.drops<plane.maxDrops){
  const column=plane.drops%3-1;
  raid.bombs.push({x:Math.max(30,Math.min(WW-30,plane.x+column*78+(R()-.5)*28)),y:plane.y-35,t:.48});
  plane.drops++;plane.drop=.14;
 }
 // Keep the warning until both the complete aircraft and its drop run have passed.
 if(plane.y>plane.endY&&plane.drops===plane.maxDrops){
  raid.plane=null;raid.phase=raid.debug?'idle':raid.remaining?'cooldown':'done';raid.timer=22+R()*16;
 }
}
// One fighter and at most two permanent ground wrecks; no per-frame projectile allocation.
function updateEnemyBomberInterception(raid,dt){
 const fighter=raid.fighter;if(!fighter)return;
 const plane=raid.plane;
 fighter.x+=fighter.dir*fighter.speed*dt;
 if(plane&&!plane.falling){
  fighter.y=plane.y;
  fighter.shot-=dt;
  if(fighter.shot<=0){fighter.shot=.075;sfx('mg',{x:fighter.x,y:fighter.y});}
  if((plane.x-fighter.x)*fighter.dir<=100){
   plane.falling=true;plane.fallT=0;fighter.exitT=1.6;
   sfx('airExplosion');burst(plane.x,plane.y,30,'#ff9a42',200);
  }
 }else{
  fighter.exitT-=dt;if(fighter.exitT<=0)raid.fighter=null;
 }
}
function crashEnemyBomber(raid,plane){
 const x=plane.x,y=plane.y,r=125;
 raid.wrecks.push({x,y,angle:.35});
 if(raid.debug&&raid.wrecks.length>6)raid.wrecks.shift();
 sfx('airExplosion');fb(x,y,60);burst(x,y,55,'#ff8a3a',300);burst(x,y,24,'#363636',160);
 shake=Math.max(shake,12);flash=Math.max(flash,.35);
 // Use flame-skill ignition so rain, spread, fire damage and bridge collapse stay consistent.
 const touches=o=>{const w=o.w||100,h=o.h||100;return Math.hypot(Math.max(o.x-x,0,x-o.x-w),Math.max(o.y-y,0,y-o.y-h))<=r;};
 for(const o of nearbyCovers(x,y,r+160))if(!o.fr&&o.kd===6&&touches(o))igniteNature(o);
 for(const o of nearbyBushes(x,y,r+160))if(touches(o))igniteNature(o);
 for(const br of bridges)if(touches(br))igniteBridge(br);
 raid.plane=null;raid.phase=raid.debug?'idle':raid.remaining?'cooldown':'done';raid.timer=22+R()*16;
}
function drawEnemyBomberWrecks(cx,cy){
 const raid=enemyBomberRaid();if(!raid)return;
 for(const w of raid.wrecks){
  if(w.x<cx-180||w.x>cx+W+180||w.y<cy-180||w.y>cy+H+180)continue;
  g.save();g.translate(w.x,w.y);g.rotate(w.angle);
  g.fillStyle='rgba(12,10,8,.42)';g.beginPath();g.ellipse(0,0,125,65,0,0,Math.PI*2);g.fill();
  g.fillStyle='#252a30';g.strokeStyle='#101319';g.lineWidth=3;
  // Broken blue wings, split fuselage and detached tail remain on the ground.
  for(const points of [[[-15,-32],[-126,-14],[-108,12],[-12,3]],[[14,-28],[118,4],[105,28],[18,5]],[[-12,-78],[7,-66],[18,40],[0,58],[-14,25]],[[13,62],[49,84],[12,99],[-23,80]]]){
   g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();g.stroke();
  }
  g.strokeStyle='#45536b';g.lineWidth=6;g.beginPath();g.moveTo(-97,-5);g.lineTo(-33,-17);g.moveTo(36,2);g.lineTo(91,15);g.stroke();
  g.fillStyle='#111315';g.fillRect(-9,-47,17,65);g.restore();
 }
}
function drawInterceptionFighter(fighter,plane){
 const {x,y,dir}=fighter;
 g.save();g.translate(x,y);g.scale(dir,1);
 g.fillStyle='#263d26';g.strokeStyle='#a8ca85';g.lineWidth=2;
 g.beginPath();g.moveTo(65,0);g.lineTo(10,-9);g.lineTo(-16,-49);g.lineTo(-30,-48);g.lineTo(-18,-8);g.lineTo(-48,-5);g.lineTo(-60,-22);g.lineTo(-69,-20);g.lineTo(-61,0);g.lineTo(-69,20);g.lineTo(-60,22);g.lineTo(-48,5);g.lineTo(-18,8);g.lineTo(-30,48);g.lineTo(-16,49);g.lineTo(10,9);g.closePath();g.fill();g.stroke();
 g.fillStyle='#648c49';g.fillRect(-35,-4,70,8);g.fillStyle='#b2dfce';g.beginPath();g.ellipse(20,0,13,5,0,0,Math.PI*2);g.fill();
 if(plane&&!plane.falling){
  g.strokeStyle='#ffed96';g.lineWidth=3;g.beginPath();
  const d=Math.max(70,(plane.x-x)*dir),phase=(performance.now()%75)/75;
  for(const side of [-1,1])for(let i=0;i<4;i++){const a=65+(d-65)*((phase+i)/4);g.moveTo(a,side*8);g.lineTo(Math.min(d,a+24),side*3);}g.stroke();
  g.fillStyle='#ffe79a';g.fillRect(54,-11,18,4);g.fillRect(54,7,18,4);
 }
 g.restore();
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
  else{partner.hp=Math.max(0,partner.hp-1);partner.down=partner.hp<=0;partner.stunT=partner.down||partner.stunImmuneT>0?0:2;partner.stunContactDelay=.3;}
 }
 if(!hit(p)||p.dig>0||debugInvincible)return;
 if(playerVehicle)enemyBomberVehicleDamage(playerVehicle,true,()=>wreck());
 else{recordPlayerDamage(Math.min(p.hp,1)/3);p.hp=Math.max(0,p.hp-1);beginBlastFlight(p,x,y,radius,58,8,0);if(p.hp<=0)triggerPlayerDeath();}
}
function drawEnemyBomberAircraft(){
 if(!enemyBomberEnabled()||state!=='play'||!enemyBomberRaid())return;
 const raid=enemyBomberRaid();
 g.save();
 for(const bomb of raid.bombs){
  const progress=Math.max(0,Math.min(1,1-bomb.t/.48));
  g.fillStyle='#17243b';g.beginPath();g.ellipse(bomb.x,bomb.y,5,10,0,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(145,185,245,.65)';g.lineWidth=1;g.beginPath();g.arc(bomb.x,bomb.y,14*progress,0,Math.PI*2);g.stroke();
 }
 if(raid.plane){
  const plane=raid.plane;g.save();
  if(plane.falling){g.translate(plane.x,plane.y);g.rotate(plane.fallT*1.3);g.scale(1-plane.fallT*.35,1-plane.fallT*.35);drawSupportBomber(0,0,true);
   for(let i=0;i<3;i++){g.fillStyle=i%2?'#ffe28b':'#ed712f';g.beginPath();g.ellipse((i-1)*22,-35-i*17,12+Math.sin(performance.now()*.02+i)*3,24,0,0,Math.PI*2);g.fill();}
  }
  else drawSupportBomber(plane.x,plane.y,true);
  g.restore();
 }
 if(raid.fighter)drawInterceptionFighter(raid.fighter,raid.plane);
 g.restore();
}
function drawEnemyBomberWarning(){
 if(!enemyBomberEnabled()||state!=='play'||!enemyBomberRaid())return;
 const raid=enemyBomberRaid();if(raid.phase!=='warning'&&raid.phase!=='flight')return;
 const width=WW/3,view=frontlineView(),left=(raid.plane||raid.route).x-view.x-width/2;
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
 }else{const text=raid.plane?.falling?'味方戦闘機が敵爆撃機を撃墜！':raid.fighter?'味方戦闘機が迎撃中！':'敵爆撃機 通過中';gm.strokeText(text,W/2,25,W-16);gm.fillText(text,W/2,25,W-16);}
 gm.restore();
}
