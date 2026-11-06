// Advanced capture: <=2 passes. Developer area testing: one pass every 30 seconds.
let areaDebugAirRaid=null;
function areaDebugBomberEnabled(){
 return areaDebugEnabled&&typeof areaDebugEnemyBomber!=='undefined'&&areaDebugEnemyBomber&&typeof isDeveloperMode==='function'&&isDeveloperMode();
}
function enemyBomberRaid(){return areaDebugEnabled?(areaDebugBomberEnabled()?areaDebugAirRaid:null):mission?.enemyAirRaid;}
function setupAreaDebugEnemyBomber(){
 areaDebugAirRaid=areaDebugBomberEnabled()?{debug:true,nextPassT:30,remaining:1,passes:0,phase:'idle',timer:0,route:null,plane:null,bombs:[],gradient:null,gradientHeight:0,fighter:null,fighterUsed:false,wrecks:[]}:null;
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
 mission.enemyAirRaid={remaining:R()<.5?1:2,passes:0,phase:'idle',timer:0,route:null,plane:null,bombs:[],gradient:null,gradientHeight:0,fighter:null,fighterUsed:false,wrecks:[]};
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
  // Keep the warning aligned with the announced horizontal flight lane.
  if(raid.debug){
   const view=frontlineView();
   raid.route={x:Math.max(30,Math.min(WW-30,view.x+view.w*(.2+R()*.6)))};
  }else raid.route={x:R()*WW};
  raid.phase='warning';raid.timer=raid.debug?raid.nextPassT:5;sfx('airWarning');return;
 }
 if(raid.phase==='cooldown'){
  raid.timer=Math.max(0,raid.timer-dt);if(raid.timer===0)raid.phase='idle';return;
 }
 if(raid.phase==='warning'){
  raid.timer=Math.max(0,raid.timer-dt);
  if(raid.timer>1e-9)return;
  // Use the current camera, including any movement during the warning.
  // The margin keeps the entire aircraft above the first visible frame.
  const view=frontlineView(),entryMargin=180;
  raid.plane={x:raid.route.x,y:view.y-entryMargin,endY:view.y+view.h+entryMargin,drop:.05,drops:0,maxDrops:25,age:0,intercept:(raid.debug||!raid.fighterUsed&&typeof isFrontlineAdvanced==='function'&&isFrontlineAdvanced())&&R()<.5};
  if(raid.debug)raid.nextPassT=30;else raid.remaining--;raid.passes++;raid.phase='flight';return;
 }
 if(raid.phase!=='flight')return;
 const plane=raid.plane;plane.age+=dt;
 if(plane.falling){
  plane.fallT=Math.min(.9,plane.fallT+dt);plane.fallAngle=plane.fallT*1.3;plane.fallScale=1-plane.fallT*.35;plane.y+=110*dt;plane.x=Math.max(28,Math.min(WW-28,plane.x+45*dt));
  if(plane.fallT>=.9){crashEnemyBomber(raid,plane);return;}
  plane.fallFxT=(plane.fallFxT||0)-dt;
  if(plane.fallFxT<=0){plane.fallFxT=.22;enemyBomberExplosionFx(plane.x,plane.y,.35,false);}
  return;
 }
 plane.y+=380*dt;plane.drop-=dt;
 if(plane.intercept&&plane.age>=.6&&!raid.fighter){
  const view=frontlineView(),dir=R()<.5?1:-1;
  const x=dir>0?Math.min(view.x,plane.x)-100:Math.max(view.x+view.w,plane.x)+100;
  raid.fighterUsed=true;
  raid.fighter={x,y:plane.y,dir,speed:Math.max(1200,Math.abs(plane.x-x)/.65),shot:0,exitT:0,jetSeDelay:.5};
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
// Twelve reusable paired tracers cover the doubled 556px flight range without per-frame allocation.
const INTERCEPTOR_TRACER_SPEED=64/.075,INTERCEPTOR_TRACER_RANGE=2*(4*64+22);
function updateInterceptorTracers(fighter,dt){
 if(!fighter.tracers)fighter.tracers=Array.from({length:12},()=>({active:false,x:0,y:0,dir:1,speed:0,travel:0}));
 for(const t of fighter.tracers)if(t.active){
  t.x+=t.dir*t.speed*dt;t.travel+=INTERCEPTOR_TRACER_SPEED*dt;
  if(t.travel>=INTERCEPTOR_TRACER_RANGE)t.active=false;
 }
}
// One fighter; at most two mission wrecks or six area-debug wrecks.
function updateEnemyBomberInterception(raid,dt){
 const fighter=raid.fighter;if(!fighter)return;
 if(fighter.jetSeDelay>0){fighter.jetSeDelay=Math.max(0,fighter.jetSeDelay-dt);if(fighter.jetSeDelay<1e-9){fighter.jetSeDelay=0;sfx('jetFlying');}}
 updateInterceptorTracers(fighter,dt);
 const plane=raid.plane;
 fighter.x+=fighter.dir*fighter.speed*dt;
 if(plane&&!plane.falling){
  fighter.y=plane.y;
  fighter.shot-=dt;
  if(fighter.shot<=0){
   fighter.shot+=.075;sfx('mg',{x:fighter.x,y:fighter.y});
   const t=fighter.tracers.find(t=>!t.active);
   if(t){t.active=true;t.x=fighter.x+fighter.dir*78;t.y=fighter.y;t.dir=fighter.dir;t.speed=fighter.speed+INTERCEPTOR_TRACER_SPEED;t.travel=0;}
  }
  if((plane.x-fighter.x)*fighter.dir<=100){
   plane.falling=true;plane.fallT=0;plane.fallAngle=0;plane.fallScale=1;plane.fallFxT=.22;fighter.exitT=1.6;
   enemyBomberExplosionFx(plane.x,plane.y,.55);
  }
 }else{
  fighter.exitT-=dt;if(fighter.exitT<=0)raid.fighter=null;
 }
}
function crashEnemyBomber(raid,plane){
 const x=plane.x,y=plane.y,r=150;
 raid.wrecks.push({x,y,angle:plane.fallAngle??(plane.fallT||0)*1.3,scale:plane.fallScale??1-(plane.fallT||0)*.35,missingWing:R()<.5?-1:1});
 if(raid.debug&&raid.wrecks.length>6)raid.wrecks.shift();
 enemyBomberExplosionFx(x,y,1.25);
 // The wreck clears hard cover, while trees and grass retain their flame-skill burning.
 carve(x,y,r,false,null,true);
 damageObjectsInRadius(x,y,r,'enemyBomb');
 // Use flame-skill ignition so rain, spread, fire damage and bridge collapse stay consistent.
 const touches=o=>{const w=o.w||100,h=o.h||100;return Math.hypot(Math.max(o.x-x,0,x-o.x-w),Math.max(o.y-y,0,y-o.y-h))<=r;};
 for(const o of nearbyCovers(x,y,r+160))if(!o.fr&&o.kd===6&&touches(o))igniteNature(o);
 for(const o of nearbyBushes(x,y,r+160))if(touches(o))igniteNature(o);
 for(const br of bridges)if(touches(br))igniteBridge(br);
 raid.plane=null;raid.phase=raid.debug?'idle':raid.remaining?'cooldown':'done';raid.timer=22+R()*16;
}
// Static detail is rasterized once, keeping recurring debug wrecks cheap to draw.
const enemyAircraftSpriteCache={};
function drawCachedEnemyAircraft(key,draw,variant=0,width=400,height=400){
 let sprite=enemyAircraftSpriteCache[key];
 if(!sprite&&typeof document!=='undefined'){
  sprite=document.createElement('canvas');sprite.width=width;sprite.height=height;
  const previous=g;g=sprite.getContext('2d');
  try{g.translate(width/2,height/2);draw(variant);}finally{g=previous;}
  enemyAircraftSpriteCache[key]=sprite;
 }
 if(sprite)g.drawImage(sprite,-width/2,-height/2);else draw(variant);
}
function drawEnemyBomberWreckShape(side){
 const w={missingWing:side};
  g.fillStyle='rgba(12,10,8,.30)';g.beginPath();g.ellipse(0,0,122,82,0,0,Math.PI*2);g.fill();
  // Reuse the original six-engine aircraft: about 70% stays attached, including the fuselage, tail and wing root.
  drawSupportBomber(0,0,true,w);
  g.save();g.rotate(Math.PI/2);g.scale(2.5,2.5);
  g.translate(-13,side*19);g.rotate(side*.27);
  drawSupportBomberWing(side,true,true,'tip');g.restore();
}
function drawEnemyBomberWrecks(cx,cy){
 const raid=enemyBomberRaid();if(!raid)return;
 for(const w of raid.wrecks){
  if(w.x<cx-180||w.x>cx+W+180||w.y<cy-180||w.y>cy+H+180)continue;
  g.save();g.translate(w.x,w.y);g.rotate(w.angle);g.scale(w.scale??1,w.scale??1);
  drawCachedEnemyAircraft('wreck:'+w.missingWing,drawEnemyBomberWreckShape,w.missingWing);
  g.restore();
 }
}
function drawInterceptionFighter(fighter,plane){
 const {x,y,dir}=fighter;
 g.save();g.translate(x,y);g.scale(dir,1);
 drawCachedEnemyAircraft('fighter',drawInterceptionFighterShape,0,192,160);
 if(plane&&!plane.falling){
  g.fillStyle='#ffe79a';g.fillRect(68,-10,14,4);g.fillRect(68,6,14,4);
 }
 g.restore();
 // Already-fired rounds keep their world-space course after firing stops.
 g.strokeStyle='#ffed96';g.lineWidth=3;g.beginPath();
 for(const t of fighter.tracers||[])if(t.active)for(const side of [-1,1]){
  g.moveTo(t.x,t.y+side*8);g.lineTo(t.x+t.dir*22,t.y+side*8);
 }
 g.stroke();
}
function drawInterceptionFighterShape(){
 // Olive twin-engine interceptor: swept wings, intakes, canopy and twin fins.
 g.lineJoin='round';g.lineCap='round';g.lineWidth=1.2;
 g.save();g.translate(-3,7);g.fillStyle='rgba(0,0,0,.22)';
 g.beginPath();g.moveTo(72,0);g.lineTo(6,-11);g.lineTo(-30,-53);g.lineTo(-43,-50);g.lineTo(-26,-10);g.lineTo(-60,-22);g.lineTo(-64,22);g.lineTo(-26,10);g.lineTo(-43,50);g.lineTo(-30,53);g.lineTo(6,11);g.closePath();g.fill();g.restore();
 // Main wings retain a broad metal leading edge and inset control surfaces.
 for(const side of [-1,1]){
  g.save();g.scale(1,side);
  g.fillStyle='#465441';g.strokeStyle='#1b241d';g.beginPath();g.moveTo(16,7);g.lineTo(-21,53);g.lineTo(-38,49);g.lineTo(-28,13);g.lineTo(-45,8);g.closePath();g.fill();g.stroke();
  g.fillStyle='#63715a';g.beginPath();g.moveTo(14,8);g.lineTo(-22,50);g.lineTo(-29,48);g.lineTo(-15,20);g.closePath();g.fill();
  g.fillStyle='#303d32';g.beginPath();g.moveTo(-5,24);g.lineTo(-23,43);g.lineTo(-31,43);g.lineTo(-24,26);g.closePath();g.fill();
  g.strokeStyle='#9a9f84';g.lineWidth=.7;g.beginPath();g.moveTo(10,12);g.lineTo(-22,49);g.stroke();
  g.strokeStyle='#222b22';g.beginPath();g.moveTo(-17,32);g.lineTo(-33,46);g.moveTo(-10,24);g.lineTo(-30,24);g.stroke();
  // Nacelle and intake run beside the central fuselage.
  g.fillStyle='#26322b';g.strokeStyle='#17201c';g.beginPath();g.moveTo(16,8);g.lineTo(10,17);g.lineTo(-49,14);g.lineTo(-56,8);g.lineTo(-42,5);g.closePath();g.fill();g.stroke();
  g.fillStyle='#0f1919';g.fillRect(6,8,8,6);g.strokeStyle='#9b9d85';g.beginPath();g.moveTo(15,8);g.lineTo(10,16);g.stroke();
  // Rear stabilizer, canted fin and ribbed exhaust nozzle.
  g.fillStyle='#4b5945';g.beginPath();g.moveTo(-35,9);g.lineTo(-53,32);g.lineTo(-65,29);g.lineTo(-55,8);g.closePath();g.fill();g.strokeStyle='#222b22';g.stroke();
  g.fillStyle='#758069';g.beginPath();g.moveTo(-29,9);g.lineTo(-48,22);g.lineTo(-58,19);g.lineTo(-47,8);g.closePath();g.fill();g.stroke();
  g.fillStyle='#252b2a';g.fillRect(-60,7,12,8);g.strokeStyle='#76786d';g.lineWidth=.7;
  for(let i=0;i<4;i++){g.beginPath();g.moveTo(-58+i*2,7);g.lineTo(-58+i*2,15);g.stroke();}
  g.fillStyle='#ba8650';g.fillRect(-61,9,2,4);g.restore();
 }
 // Narrow pointed nose, blended spine, dark blue glass with a restrained glint.
 g.fillStyle='#53634d';g.strokeStyle='#202a21';g.lineWidth=1.2;g.beginPath();g.moveTo(74,0);g.bezierCurveTo(55,-5,33,-10,13,-8);g.lineTo(-51,-5);g.lineTo(-61,0);g.lineTo(-51,5);g.lineTo(13,8);g.bezierCurveTo(33,10,55,5,74,0);g.closePath();g.fill();g.stroke();
 g.fillStyle='#7d886c';g.beginPath();g.moveTo(72,0);g.lineTo(12,-6);g.lineTo(-46,-3);g.lineTo(0,-1);g.lineTo(36,2);g.closePath();g.fill();
 g.fillStyle='#2b3b30';g.beginPath();g.moveTo(2,-5);g.lineTo(-31,-4);g.lineTo(-43,3);g.lineTo(-7,5);g.closePath();g.fill();
 g.fillStyle='#203b42';g.strokeStyle='#b1b6a0';g.lineWidth=1;g.beginPath();g.moveTo(43,0);g.bezierCurveTo(36,-7,19,-8,11,-3);g.lineTo(11,3);g.bezierCurveTo(19,8,36,7,43,0);g.fill();g.stroke();
 g.strokeStyle='#90b5b7';g.lineWidth=1.2;g.beginPath();g.moveTo(36,-1);g.quadraticCurveTo(25,-5,17,-2);g.stroke();
 g.strokeStyle='#3b4839';g.lineWidth=.8;g.beginPath();g.moveTo(51,-3);g.lineTo(51,3);g.moveTo(0,-4);g.lineTo(-28,-4);g.moveTo(-4,4);g.lineTo(-24,4);g.stroke();
 g.fillStyle='#bfc2a5';g.fillRect(-8,-2,5,1);g.fillStyle='#151c19';g.fillRect(50,-7,9,2);
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
function enemyBomberExplosionFx(x,y,scale=1,impact=true){
 if(impact)sfx('airExplosion');
 fb(x,y,46*scale);burst(x,y,Math.round(60*scale),'#ff8a3a',400*scale);burst(x,y,Math.round(25*scale),'#fff3b0',500*scale);
 if(impact){shake=Math.max(shake,15);flash=Math.max(flash,.5);}
}
function enemyBomberBlast(x,y,radius=88){
 if(!enemyBomberEnabled()||state!=='play')return;
 // Separate damage ownership: neither direct bombs nor their object chains hurt enemies.
 enemyBomberExplosionFx(x,y);
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
  if(plane.falling){g.translate(plane.x,plane.y);g.rotate(plane.fallAngle??plane.fallT*1.3);const scale=plane.fallScale??1-plane.fallT*.35;g.scale(scale,scale);drawSupportBomber(0,0,true);}
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
