// Stage 07 orchestrates existing destruction combat and bounded frontline armies.
// stageMode changes to 'front' only after the relay falls; the persistent stage ID stays decisive.
const DECISIVE_RELAY_CAPTURE_SECONDS=15;
const DECISIVE_BUNKER_SCAN_SECONDS=.2;
let decisiveBattle=null;
function isDecisiveStage(){return stageMode==='decisive'||stageMode==='front'&&!!decisiveBattle;}
function loadDecisiveAssets(){
 for(const key of ['fortress','bunker','bunker-barrel'])if(!COVER_IMG['decisive_'+key])COVER_IMG['decisive_'+key]=makeAssetImage('assets/decisive/'+key+'.webp?v='+GAME_VERSION);
 loadDesertTerrain();loadDesertSandbags();
}
function loadDesertSandbags(){
 if(!COVER_IMG.decisive_sandbags)COVER_IMG.decisive_sandbags=makeAssetImage('assets/decisive/sandbags.webp?v='+GAME_VERSION);
}
function loadDesertTerrain(){
 if(!TERRAIN_IMG['砂漠'])TERRAIN_IMG['砂漠']=makeAssetImage('assets/decisive/desert.webp?v='+GAME_VERSION,()=>{
  for(const z of ZONES)if(z.n==='砂漠'||z.n==='砂漠街')z.pat=null;
 });
 TERRAIN_IMG['砂漠街']=TERRAIN_IMG['砂漠'];
}
function setupDecisiveZones(){
 const names=['草原','砂漠街','砂漠街','砂漠街','砂漠','砂漠','砂漠'];
 const edges=[13200,10800,9040,7280,5520,3680,1840,-400];
 ZONES=names.map((n,i)=>({n,y0:edges[i],y1:edges[i+1],g:ZONE_STYLE[n].g,p:ZONE_STYLE[n].p.slice(),edgeRisk:R()<.5?'left':'right',decisiveArea:i}));
}
const DESERT_TOWN_SCALE=1.5;
const DESERT_TOWN_SANDBAG_ROW_GAP=168;
const DESERT_TOWN_BUILDINGS=[
 ['adobe-house',4,180,120],
 ['adobe-building',4,240,120],
 ['desert-watchtower',3,160,180],
 ['citadel-ruins',3,210,212.8],
 ['citadel-rubble',7,150,77]
];
function addDesertTownBuildings(z){
 loadDesertTerrain();
 for(const [key] of DESERT_TOWN_BUILDINGS){
  if(!COVER_IMG['decisive_'+key])COVER_IMG['decisive_'+key]=makeAssetImage(ASSET_DIR+'desert-town/'+key+'.webp?v='+GAME_VERSION);
 }
 // Two columns leave a continuous 200px lane. The relay section has fewer lots.
 const top=z.y1+(z.decisiveArea===3?800:70),bottom=z.y0-(z.areaDebug?650:70);
 const first=Math.floor(R()*DESERT_TOWN_BUILDINGS.length);
 const rows=Array.from({length:z.decisiveArea===3?2:3},(_,row)=>[0,1].map(side=>{
  const [key,kd,w,h]=DESERT_TOWN_BUILDINGS[(first+row*2+side)%DESERT_TOWN_BUILDINGS.length];
  return {key,kd,w:w*DESERT_TOWN_SCALE,h:h*DESERT_TOWN_SCALE};
 }));
 const heights=rows.map(row=>Math.max(...row.map(building=>building.h)));
 const spare=(bottom-top-heights.reduce((sum,h)=>sum+h,0))/rows.length;
 let rowTop=top;
 for(const [i,row] of rows.entries()){
  const lot=heights[i]+spare;
  for(const [side,{key,kd,w,h}] of row.entries()){
   const left=side?WW/2+100:16,right=side?WW-16:WW/2-100;
   const x=left+R()*(right-left-w),y=rowTop+R()*(lot-h);
   // The normal generator scales Y later; sprite dimensions are already in world pixels.
   covers.push({kd,x,y:y/MAP_SCALE,w,h,decisiveKind:key});
  }
  rowTop+=lot;
 }
}
function addDesertTownScenery(z){
 loadDesertSandbags();
 const top=z.y1+(z.decisiveArea===3?800:70),bottom=z.y0-70;
 // Position in world pixels, then store the same pre-scaling Y as ordinary scenery.
 const occupied=covers.concat(objects,bushes).map(o=>({...o,y:o.y*MAP_SCALE}));
 const place=(list,props,w,h,count)=>{
  for(let tries=0,placed=0;tries<count*30&&placed<count;tries++){
   const side=R()<.5,left=side?WW/2+100:24,right=side?WW-24:WW/2-100;
   const x=left+R()*(right-left-w),y=top+R()*(bottom-top-h);
   const rect={x,y,w,h};
   const footprint=props.kind==='barrel'?barrelVisualRect(rect):rect;
   if(footprint.x<left||footprint.x+footprint.w>right||footprint.y<top||
      occupied.some(other=>decisiveRectsOverlap(footprint,other,16)))continue;
   occupied.push(footprint);
   list.push({...props,...rect,y:y/MAP_SCALE});placed++;
  }
 };
 place(objects,{kind:'crate'},CRATE_W,CRATE_H,3);
 place(objects,{kind:'barrel'},BARREL_SIZE,BARREL_SIZE,3);
 const sandbagW=210*DESERT_TOWN_SCALE,sandbagH=52*DESERT_TOWN_SCALE;
 const gridBottom=z.y0-(z.areaDebug?650:70);
 const inset=(WW/2-100-sandbagW)/2,columns=[inset,WW-inset-sandbagW];
 const gridOptions=Array.from({length:6},(_,i)=>{
  const cells=[];
  for(let y=top+i*28;y+sandbagH<=gridBottom;y+=DESERT_TOWN_SANDBAG_ROW_GAP)
   for(const x of columns){
    const rect={x,y,w:sandbagW,h:sandbagH};
    if(!occupied.some(other=>decisiveRectsOverlap(rect,other,16)))cells.push(rect);
   }
  return cells;
 });
 const cells=gridOptions.reduce((best,row)=>row.length>best.length?row:best);
 for(const rect of cells){
  occupied.push(rect);
  covers.push({...rect,y:rect.y/MAP_SCALE,kd:1,decisiveKind:'sandbags'});
 }
 place(bushes,{},85,55,8);
}
function decisiveRectsOverlap(a,b,pad=0){return a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;}
function setupDecisiveWorld(){
 loadDecisiveAssets();
 const border=ZONES[4].y0,gate={x:WW/2,y:border+420,captureRadius:300,name:'中継拠点',done:false};
 decisiveBattle={phase:'infiltration',border,gate,reserve:[],bunkers:[],fortressDir:1,fortressCd:2,gunScan:0};
 // Reserve a dry, open relay circle. The desert has an uninterrupted central route.
 const clearing={x:gate.x-350,y:gate.y-350,w:700,h:700};
 covers=covers.filter(c=>c.y>=border&&!decisiveRectsOverlap(c,clearing));
 objects=objects.filter(o=>o.y>=border&&!decisiveRectsOverlap(o,clearing));
 bushes=bushes.filter(b=>b.y>=border&&!decisiveRectsOverlap(b,clearing));
 water=water.filter(w=>w.y>=border&&!decisiveRectsOverlap(w,clearing));
 bridges=bridges.filter(b=>b.y>=border&&!decisiveRectsOverlap(b,clearing));
 roadBands=roadBands.filter(r=>r.y>=border);
 base={x:WW/2-300,y:140,w:600,h:400,hp:90,maxHp:90,deadAt:0,decisiveFortress:true,decisiveLocked:true};
 for(const zone of ZONES.slice(4)){
  for(let i=0;i<3;i++){
   const side=i%2===0?'left':'right',x=side==='left'?82:WW-262,y=zone.y0-300-i*460;
   const bunker={kd:3,x,y,w:180,h:140,decisiveKind:'bunker',gunCd:1+i*.4};
   covers.push(bunker);decisiveBattle.bunkers.push(bunker);
   for(const dy of [210,340])covers.push({kd:1,x:side==='left'?45:WW-255,y:y+dy,w:210,h:52,decisiveKind:'sandbags'});
  }
  const t=TYPES[(zone.decisiveArea-2)%TYPES.length],spot={x:WW/2,y:(zone.y0+Math.max(40,zone.y1))/2};
  // The wide centre lane remains open for tanks, trucks and the shared infantry detour AI.
  cars=cars.filter(v=>!decisiveRectsOverlap({x:v.x-50,y:v.y-50,w:100,h:100},{x:spot.x-55,y:spot.y-55,w:110,h:110}));
  cars.push({...spot,t,kind:'tank',hp:t.hp,c:t.cmax,v:t.vmax,f:t.fmax,ch:0,mgHits:0,body:-Math.PI/2});
  for(const dx of [-70,70])items.push({x:spot.x+dx,y:spot.y+100,got:false});
 }
 // No desert patrol is updated before the phase change. Keep its classes as wave reserves.
 decisiveBattle.reserve=humans.filter(h=>h.y<border);
 humans=humans.filter(h=>h.y>=border);
 enemyDogs=enemyDogs.filter(d=>d.handler&&humans.includes(d.handler));
 etanks=etanks.filter(e=>e.y>1100&&!covers.some(c=>decisiveRectsOverlap(c,{x:e.x-32,y:e.y-32,w:64,h:64})));
 humans=humans.filter(h=>!covers.some(c=>decisiveRectsOverlap(c,{x:h.x-12,y:h.y-12,w:24,h:24})));
 mission={index:0,progress:0,points:[gate],waveT:6,reinforceT:18,captureReady:false,capturing:false,contested:false};
 scoreStats.objectiveTotal=2;scoreStats.objectiveProgress=0;
 rebuildSpatialGrid();captureBuildingGroundMarks();ensurePlayerVehicleSpawns();ensureEnemyTankSpawns();
 say('決戦：中継拠点を制圧し、砂漠の移動要塞を破壊せよ');
}
function beginDecisiveAssault(){
 if(!decisiveBattle||decisiveBattle.phase!=='infiltration')return false;
 const d=decisiveBattle;d.phase='assault';d.gate.done=true;base.decisiveLocked=false;
 // Switching here reuses all existing frontline target acquisition, movement, ally roles and stun rules.
 stageMode='front';frontlineBeginner=false;frontlineOni=false;
 humans=humans.filter(h=>h.alive&&!(h.stun>0));humans.push(...d.reserve.filter(h=>h.alive));d.reserve=[];
 mission={index:0,progress:0,points:[{x:base.x+base.w/2,y:base.y+base.h+220,captureRadius:540,name:'移動要塞',done:false}],waveT:6,reinforceT:18,advanceReleased:true,northEdge:0};
 setupFrontlineArmy();mission.enemyWavesStarted=true;mission.advanceReleased=true;
 for(const ally of allies)if(ally.alive){ally.frontline=true;assignFrontlineAllyRole(ally);}
 missionAllies(d.gate.y);setupFrontlineVehicles();spawnFrontlineWave(6);
 p.hp=3;sfx('capture');say('中継拠点を制圧！ 味方部隊と砂漠の移動要塞へ進軍！');
 return true;
}
function updateDecisiveMission(dt){
 const d=decisiveBattle;if(!d||state!=='play')return;
 if(d.phase==='infiltration'){
  // The relay is the only passage into the desert, including when a plane is boarded.
  p.y=Math.max(d.border+32,p.y);
  if(p.tank){p.tank.x=p.x;p.tank.y=p.y;}
  const q=d.gate,m=mission,r=frontlineCaptureRadius(q);
  let foes=0;for(const h of humans)if(h.alive&&!(h.stun>0)&&D(h,q)<r+30)foes++;
  for(const e of etanks)if(e.alive&&D(e,q)<r+30)foes++;
  m.contested=foes>0;m.enemiesInside=m.contested;
  m.captureReady=D(p,q)<r&&!(p.dig>0)&&p.tank?.kind!=='fighter';
  m.captureCount=m.captureReady?1:0;m.captureRate=m.captureCount;m.capturing=m.captureReady&&!foes;
  if(m.capturing){m.progress=Math.min(DECISIVE_RELAY_CAPTURE_SECONDS,m.progress+dt);scoreStats.captureSeconds+=dt;}
  else if(foes)m.progress=Math.max(0,m.progress-dt*.35);
  scoreStats.objectiveProgress=.5*m.progress/DECISIVE_RELAY_CAPTURE_SECONDS;
  if(m.progress>=DECISIVE_RELAY_CAPTURE_SECONDS){scoreStats.capturePoints=1;beginDecisiveAssault();}
  return;
 }
 updateDecisiveFortress(dt);
 cleanupFrontlineArmy(dt);updateFrontlineWaves(dt);
 mission.reinforceT-=dt;
 if(mission.reinforceT<=0){mission.reinforceT=18;if(allies.filter(a=>a.alive&&a.frontline).length<4)missionAllies(Math.min(d.gate.y,p.y+120));}
 scoreStats.objectiveProgress=.5+.5*(1-base.hp/base.maxHp);
 // The frontline objective guides the squad to a safe firing position, never to another capture finish.
 const point=mission.points[0];point.x=base.x+base.w/2;point.y=base.y+base.h+220;
 updateDecisiveBunkers(dt);
}
function decisiveGunTarget(x,y,range){
 let target=null,best=range;
 for(const unit of [p,...allies]){
  if(unit!==p&&(!unit.alive||unit.chute>0||unit.stun>0)||unit===p&&(p.dig>0||debugMode>=2))continue;
  const distance=Math.hypot(unit.x-x,unit.y-y);
  if(distance<best&&los({x,y},unit)){best=distance;target=unit;}
 }
 return target;
}
function decisiveBunkerAngle(bunker,now){
 const aim=bunker.gunAim??Math.PI/2,from=bunker.gunFrom??aim;
 const blend=Math.min(1,(now-(bunker.gunAimAt??now))/(1000*DECISIVE_BUNKER_SCAN_SECONDS));
 const delta=aim-from;
 return from+Math.atan2(Math.sin(delta),Math.cos(delta))*blend;
}
function updateDecisiveBunkers(dt){
 const d=decisiveBattle;d.gunScan-=dt;if(d.gunScan>0)return;d.gunScan=DECISIVE_BUNKER_SCAN_SECONDS;
 const now=performance.now();
 for(const bunker of d.bunkers){
  if(Math.abs(bunker.y-p.y)>900||!covers.includes(bunker))continue;
  bunker.gunCd-=DECISIVE_BUNKER_SCAN_SECONDS;
  const x=bunker.x+bunker.w/2,y=bunker.y+bunker.h+8,target=decisiveGunTarget(x,y,560);
  if(!target)continue;
  const aim=Math.atan2(target.y-y,target.x-x);
  if(aim!==bunker.gunAim){
   bunker.gunFrom=decisiveBunkerAngle(bunker,now);bunker.gunAim=aim;bunker.gunAimAt=now;
  }
  if(bunker.gunCd>0)continue;
  bunker.gunFrom=aim;bunker.gunShotAt=now;
  fire(x,y,aim,'e','v',480,620,.3);bunker.gunCd=1.1;
 }
}
function updateDecisiveFortress(dt){
 if(!base||base.hp<=0)return;
 const d=decisiveBattle,minX=WW/2-base.w/2-75,maxX=WW/2-base.w/2+75;
 const nx=base.x+d.fortressDir*18*dt;
 if(nx<minX||nx>maxX)d.fortressDir*=-1;
 else{
  const box={x:nx-42,y:base.y-42,w:base.w+84,h:base.h+84};
  // Do not sweep the moving collider through soldiers, player vehicles or abandoned vehicles.
  const blocked=[p,...humans,...etanks,...allies,...cars].some(u=>u.alive!==false&&u.x>box.x&&u.x<box.x+box.w&&u.y>box.y&&u.y<box.y+box.h);
  if(!blocked)base.x=nx;
 }
 d.fortressCd-=dt;if(d.fortressCd>0)return;
 const sx=base.x+base.w/2,sy=base.y+base.h+18,target=decisiveGunTarget(sx,sy,900);
 if(target){fire(sx,sy,Math.atan2(target.y-sy,target.x-sx),'e','c',420,1000,1.4,'enemyCannon');d.fortressCd=3;}
 else d.fortressCd=.25;
}
function drawDecisiveCover(c){
 const im=COVER_IMG['decisive_'+c.decisiveKind];
 if(assetOK(im))g.drawImage(im,c.x,c.y,c.w,c.h);
 else{g.fillStyle=c.decisiveKind==='bunker'?'#81795e':'#b69c68';g.fillRect(c.x,c.y,c.w,c.h);}
 // Fragment renders only carry the body art. A broken bunker has no working gun.
 const barrel=COVER_IMG['decisive_bunker-barrel'];
 if(c.decisiveKind==='bunker'&&c.gunCd!==undefined&&assetOK(barrel)){
  const now=performance.now(),recoil=4*Math.max(0,1-(now-(c.gunShotAt??-Infinity))/130);
  g.save();g.translate(c.x+c.w/2,c.y+c.h-6);g.rotate(decisiveBunkerAngle(c,now));
  g.drawImage(barrel,-6-recoil,-5,36,10);g.restore();
 }
 return true;
}
function drawDecisiveMission(){
 document.body.classList.toggle('front-battle',decisiveBattle?.phase==='assault');
 document.getElementById('missionHud').style.display='none';
 if(state!=='play'||!decisiveBattle)return;
 const d=decisiveBattle,q=d.phase==='infiltration'?d.gate:mission.points[0];
 gm.save();gm.setTransform(1,0,0,1,0,0);
 if(d.phase==='infiltration'){
  const x=q.x-camX,y=q.y-cam,r=frontlineCaptureRadius(q),colors=frontlineCaptureColors(q,mission);
  if(y>-r&&y<H+r){gm.strokeStyle=colors.stroke;gm.fillStyle=colors.fill;gm.lineWidth=3;gm.beginPath();gm.arc(x,y,r,0,Math.PI*2);gm.fill();gm.stroke();drawFrontlineCaptureRing(q,x,y,mission,DECISIVE_RELAY_CAPTURE_SECONDS);}
 }
 drawFrontlineArrow(q);
 gm.font='bold 16px system-ui';gm.fillStyle='#fff1c0';gm.textAlign='center';gm.strokeStyle='#302a20';gm.lineWidth=4;
 const text=d.phase==='infiltration'?'中継拠点を制圧 '+Math.floor(mission.progress/DECISIVE_RELAY_CAPTURE_SECONDS*100)+'%':'決戦：移動要塞を破壊せよ';
 gm.strokeText(text,W/2,32);gm.fillText(text,W/2,32);gm.restore();
}
