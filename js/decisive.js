// Stage 07 orchestrates existing destruction combat and bounded frontline armies.
// stageMode changes to 'front' only after the relay falls; the persistent stage ID stays decisive.
let decisiveBattle=null;
function isDecisiveStage(){return stageMode==='decisive'||stageMode==='front'&&!!decisiveBattle;}
function loadDecisiveAssets(){
 for(const key of ['fortress','bunker','sandbags'])if(!COVER_IMG['decisive_'+key])COVER_IMG['decisive_'+key]=makeAssetImage('assets/decisive/'+key+'.webp');
 if(!TERRAIN_IMG['砂漠'])TERRAIN_IMG['砂漠']=makeAssetImage('assets/decisive/desert.webp',()=>{for(const z of ZONES)if(z.n==='砂漠')z.pat=null;});
}
function setupDecisiveZones(){
 const pool=['草原','森林','村','丘陵','敵前線基地','街','湿地','荒野'];
 for(let i=pool.length-1;i>0;i--){const j=R()*(i+1)|0;[pool[i],pool[j]]=[pool[j],pool[i]];}
 const names=['草原',...pool.slice(0,3),'砂漠','砂漠','砂漠'];
 const edges=[13200,10800,9040,7280,5520,3680,1840,-400];
 ZONES=names.map((n,i)=>({n,y0:edges[i],y1:edges[i+1],g:ZONE_STYLE[n].g,p:ZONE_STYLE[n].p.slice(),edgeRisk:R()<.5?'left':'right',decisiveArea:i}));
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
  if(m.capturing){m.progress=Math.min(FRONTLINE_CAPTURE_SECONDS,m.progress+dt);scoreStats.captureSeconds+=dt;}
  else if(foes)m.progress=Math.max(0,m.progress-dt*.35);
  scoreStats.objectiveProgress=.5*m.progress/FRONTLINE_CAPTURE_SECONDS;
  if(m.progress>=FRONTLINE_CAPTURE_SECONDS){scoreStats.capturePoints=1;beginDecisiveAssault();}
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
function updateDecisiveBunkers(dt){
 const d=decisiveBattle;d.gunScan-=dt;if(d.gunScan>0)return;d.gunScan=.2;
 for(const bunker of d.bunkers){
  if(Math.abs(bunker.y-p.y)>900||!covers.includes(bunker))continue;
  bunker.gunCd-=.2;if(bunker.gunCd>0)continue;
  const x=bunker.x+bunker.w/2,y=bunker.y+bunker.h+8,target=decisiveGunTarget(x,y,560);
  if(!target)continue;
  fire(x,y,Math.atan2(target.y-y,target.x-x),'e','v',480,620,.3);bunker.gunCd=1.1;
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
  if(y>-r&&y<H+r){gm.strokeStyle=colors.stroke;gm.fillStyle=colors.fill;gm.lineWidth=3;gm.beginPath();gm.arc(x,y,r,0,Math.PI*2);gm.fill();gm.stroke();drawFrontlineCaptureRing(q,x,y,mission);}
 }
 drawFrontlineArrow(q);
 gm.font='bold 16px system-ui';gm.fillStyle='#fff1c0';gm.textAlign='center';gm.strokeStyle='#302a20';gm.lineWidth=4;
 const text=d.phase==='infiltration'?'中継拠点を制圧 '+Math.floor(mission.progress/FRONTLINE_CAPTURE_SECONDS*100)+'%':'決戦：移動要塞を破壊せよ';
 gm.strokeText(text,W/2,32);gm.fillText(text,W/2,32);gm.restore();
}
