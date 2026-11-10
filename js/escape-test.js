// Developer-only escape mission. Terrain, foliage, combat and EXIT art reuse existing systems.
const ESCAPE_TEST_AREAS=5,ESCAPE_TEST_AREA_HEIGHT=2400;
function setupEscapeTestZones(){
 const makeZone=(n,y0,y1)=>({n,y0,y1,g:ZONE_STYLE[n].g,p:ZONE_STYLE[n].p.slice()});
 const jungleStart=ESCAPE_TEST_AREAS*ESCAPE_TEST_AREA_HEIGHT+400;
 ZONES=[makeZone('草原',WH,jungleStart),
  ...Array.from({length:ESCAPE_TEST_AREAS},(_,i)=>{
   const y0=jungleStart-i*ESCAPE_TEST_AREA_HEIGHT;
   return {...makeZone('密林',y0,y0-ESCAPE_TEST_AREA_HEIGHT),escapeArea:i};
  }),makeZone('草原',400,0)];
}
function setupEscapeTestWorld(){
 loadJungleAssets();document.body.classList.remove('front-battle');
 p.x=WW/2;p.y=ZONES[0].y0-170;p.body=p.ang=-Math.PI/2;p.tank=null;
 scoreStats.startY=p.y;scoreStats.escapeTest=true;scoreStats.debugUsed=true;
 base={x:WW/2,y:-60000,w:COMMAND_BASE_W,h:COMMAND_BASE_H,hp:30,maxHp:30,deadAt:0};
 covers=[];objects=[];bushes=[];water=[];bridges=[];mud=[];cars=[];humans=[];etanks=[];items=[];bullets=[];parts=[];waves=[];fx=[];bombs=[];roadBands=[];areaDebugLabels=[];
 const jungles=ZONES.slice(1,-1);
 planJungleBuildings(jungles);
 for(const z of jungles){
  z.escapeRiver=rollRiverCrossing(z.y1+(z.y0-z.y1)*(.45+R()*.1),{jungle:true});
  z.oasis=rollWildernessLake(z);if(z.oasis){separateJungleLake(z,z.escapeRiver,z.oasis);water.push(z.oasis);}
 }
 // Keep non-vegetation scenery out of the river and lake.
 const wet=r=>jungles.some(z=>z.escapeRiver&&ov2(r,z.escapeRiver,40)||z.oasis&&oasisContains(z.oasis,r.x+r.w/2,r.y+r.h/2,Math.max(r.w,r.h)/2+8));
 const totals={covers:[],objects:[],bushes:[]};
 for(const z of jungles){
  covers=[];objects=[];bushes=[];
  // The ordinary jungle seed includes five shared small native trees, not small jungle variants.
  for(let i=0;i<5;i++)covers.push({kd:6,x:i%2?WW-210+R()*120:26+R()*120,y:z.y1+120+(i+.2+R()*.5)/5*1700,w:TREE_BOX,h:TREE_BOX});
  setupJungleScenery(z);totals.covers.push(...covers);totals.objects.push(...objects);totals.bushes.push(...bushes);
 }
 covers=totals.covers;objects=totals.objects;bushes=totals.bushes;
 covers=covers.filter(c=>c.kd===6||!wet(coverSpriteRect(c)||c));
 objects=objects.filter(o=>!wet(objectAABB(o)));
 const start=ZONES[0],last=ZONES[ZONES.length-1];
 const [kd,w,h]=JUNGLE_ASSETS.palm;
 for(const [x,dy] of [[54,44],[WW-190,64],[202,208],[WW-335,226]]){
  covers.push({kd,x,y:start.y1+dy,w,h,jungleAsset:'palm',areaDebug:1});
 }
 last.escapeExit={x:WW/2,y:200};
 setupJungleMud(jungles);setupJungleTrails(jungles);
 for(const z of jungles){
  const inside=o=>o.y+o.h/2>z.y1&&o.y+o.h/2<=z.y0;
  z.jungleDensity.trees=covers.filter(c=>c.kd===6&&inside(c)).length;z.jungleDensity.grass=bushes.filter(b=>!b.spinifex&&inside(b)).length;z.jungleDensity.plants=bushes.filter(b=>b.spinifex&&inside(b)).length;
 }
 // One ordinary starting vehicle; test selection does not force invincibility or infinite ammo.
 const t=TYPES[0];cars.push({x:WW/2+130,y:p.y-100,t,kind:'tank',hp:t.hp,c:t.cmax,v:t.vmax,f:t.fmax,ch:0,mgHits:0,body:-Math.PI/2});
 debugMode=0;debugInvincible=false;baseSpawnT=99999;weather='clear';weatherNext=5+R()*10;weatherT=0;rainIntensity=0;
 commanderPrevX=p.x;commanderPrevY=p.y;commanderVelocity={x:0,y:0};commanderRallying=false;commanderSignals=[];
 captureBuildingGroundMarks();rebuildSpatialGrid();
 for(const z of jungles)spawnAreaDebugEnemies(z,{blueCommander:true});
 setupRoadTruckEvents();
 roadBands.push({x:0,y:last.escapeExit.y-160,w:WW,h:320,kind:'asphalt',lanes:4});
 say('脱出：要人女性を護衛し、最後の草原のEXITへ');
}
// Keep both independent rolls and original lake size. Reserve both feathered banks,
// relocate the lake first, and move the river only if neither side has enough space.
function separateJungleLake(z,river,pond){
 const top=z.y1+220,bottom=z.y0-350,gap=80;
 pond.y=Math.max(top,Math.min(bottom-pond.h,pond.y));
 if(!river||pond.y+pond.h+gap<=river.y||pond.y>=river.y+river.h+gap)return;
 const ranges=()=>[[top,river.y-gap-pond.h],[river.y+river.h+gap,bottom-pond.h]].filter(([lo,hi])=>hi>=lo);
 let choices=ranges();
 if(!choices.length){
  const oldY=river.y,newY=R()<.5?top:bottom-river.h,dy=newY-oldY;
  for(const w of water)if(!w.oasis&&w.y===oldY&&w.h===river.h)w.y+=dy;
  if(river.bridge)river.bridge.y+=dy;river.y=newY;choices=ranges();
 }
 const [lo,hi]=choices[Math.floor(R()*choices.length)];pond.y=lo+R()*(hi-lo);
}
function setupEscapeTestMission(){
 mission={escapeTest:true,vip:{x:p.x-30,y:p.y+40,face:p.body,hp:3,moving:false},exit:ZONES[ZONES.length-1].escapeExit,escapeProgress:0,escapeExit:null,escapeComplete:false,points:[],index:0,enemyDrop:{next:0,plane:null,parachutes:[],retry:0}};missionHudNextAt=0;
}
// The two passes are keyed to progress, so backtracking cannot repeat them.
const ESCAPE_ENEMY_DROP_AREAS=[1,3];
function escapeEnemyLanding(target,reserved=[]){
 return parachuteLandingSpot({x:target.x,landY:target.y},(x,y)=>{
  const point={x,y};
  return D(point,p)>=80&&D(point,mission.exit)>=120&&
   !reserved.some(other=>D(point,other)<60)&&
   !humans.some(h=>h.alive&&D(point,h)<28)&&
   !etanks.some(e=>e.alive&&D(point,e)<TANK_HIT+14)&&
   !cars.some(c=>c.kind!=='fighter'&&D(point,c)<38);
 });
}
function updateEscapeEnemyDrop(m,dt){
 const event=m.enemyDrop;
 let plane=event.plane;
 if(!plane&&!event.parachutes.length&&zoneAt(p.y).escapeArea>=ESCAPE_ENEMY_DROP_AREAS[event.next]){
  event.retry=Math.max(0,event.retry-dt);
  if(event.retry>0)return;
  const view=frontlineView(),x=Math.max(view.x+70,Math.min(view.x+view.w-70,p.x));
  const dropY=Math.max(view.y+70,p.y-220);
  const targets=[];
  for(let i=0;i<3;i++){
   const point=escapeEnemyLanding({x:x+(i-1)*82,y:dropY+90+i*60},targets);
   if(!point){event.retry=1;return;}
   targets.push(point);
  }
  plane=event.plane={x,y:view.y-180,endY:view.y+view.h+180,dropY:dropY-120,targets,drops:0};
  event.next++;
  sfx('airWarning');say('敵爆撃機が接近！');
 }
 if(plane){
  plane.y+=380*dt;
  while(plane.drops<3&&plane.y>=plane.dropY+plane.drops*60){
   const target=plane.targets[plane.drops++];
   const startY=Math.min(target.y,plane.y-25);
   event.parachutes.push({x:target.x,y:startY,startY,landY:target.y,
    alive:true,chute:3,face:Math.PI/2,retry:0,elite:true});
  }
  if(plane.y>=plane.endY&&plane.drops===3)event.plane=null;
 }
 for(let i=event.parachutes.length-1;i>=0;i--){
  const unit=event.parachutes[i];
  unit.chute=Math.max(.001,unit.chute-dt);
  const t=1-unit.chute/3;
  unit.y=unit.startY+(unit.landY-unit.startY)*t*t*(3-2*t);
  if(unit.chute>.001)continue;
  unit.retry=Math.max(0,unit.retry-dt);
  if(unit.retry>0)continue;
  const q=escapeEnemyLanding({x:unit.x,y:unit.landY});
  if(!q){unit.retry=.25;continue;}
  const path=[q];
  for(const [dx,dy] of [[70,0],[-70,0],[0,70],[0,-70]]){
   const end={x:q.x+dx,y:q.y+dy};
   if(patrolLineClear(q,end,8)&&pOK([q,end],8,false)){path.push(end);break;}
  }
  humans.push({...q,path,loop:false,wi:path.length-1,dir:1,stk:0,alive:true,st:0,
   sus:0,lost:0,target:null,cd:.7,burstLeft:0,face:Math.atan2(p.y-q.y,p.x-q.x),
   patrolMode:'axis',elite:unit.elite,escapeParatrooper:true});
  event.parachutes.splice(i,1);
 }
}
function drawEscapeEnemyDrop(cx,cy){
 const event=mission?.enemyDrop;
 if(!event||state!=='play')return;
 for(const unit of event.parachutes){
  if(drawPointInView(unit.x,unit.y,cx,cy,100))drawAllyParachute(unit,true);
 }
 const plane=event.plane;
 if(plane&&drawPointInView(plane.x,plane.y,cx,cy,180))drawSupportBomber(plane.x,plane.y,true);
}
function escapeVipTarget(){
 const vip=mission?.vip;
 return vip?.hp>0?vip:null;
}
function damageEscapeVip(vip){
 if(!vip||vip.hp<=0||state!=='play')return;
 vip.hp--;
 burst(vip.x,vip.y,7,'#f28b9f',75);
 if(vip.hp>0){say('要人女性が被弾！ 残りライフ '+vip.hp);return;}
 vip.moving=false;state='failed';failureFrameDrawn=false;
 finalizeScore(false);sfx('lose');
}
function recallEscapeVip(vip){
 const view=frontlineView();
 if(vip.x>=view.x-12&&vip.x<=view.x+view.w+12&&vip.y>=view.y-12&&vip.y<=view.y+view.h+12)return;
 const bottom=Math.min(WH-12,view.y+view.h-12);
 for(let row=0;row<8;row++){
  const y=bottom-row*18;
  for(const dx of [0,-36,36,-76,76,-120,120,-175,175]){
   const x=Math.max(view.x+12,Math.min(view.x+view.w-12,p.x+dx));
   if(hitsC(x,y,10)||Math.hypot(x-p.x,y-p.y)<24)continue;
   Object.assign(vip,{x,y,wallFollow:null,sideStep:null,moving:false});
   return;
  }
 }
}
function updateEscapeVip(dt){
 const vip=escapeVipTarget();if(!vip)return;
 recallEscapeVip(vip);
 const exit=mission.exit,waiting=!p.tank&&D(p,exit)<INDOOR_EXIT_RADIUS;
 const goal=waiting?exit:p,distance=D(vip,goal);
 vip.moving=false;
 if(distance>(waiting?INDOOR_EXIT_RADIUS-12:42)){
  const x=vip.x,y=vip.y;
  moveAllySmart(vip,goal,Math.min(212,Math.max(0,distance-24)/dt),dt);
  vip.moving=Math.hypot(vip.x-x,vip.y-y)>.1;
 }
}
function drawEscapeVipSprite(ctx,x,y,face,moving){
 const stride=moving?Math.sin(performance.now()*.018)*3:0;
 ctx.save();ctx.translate(x,y);ctx.rotate(face);
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(-1,2,10,11,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#37303f';ctx.fillRect(-10+stride,-6,9,4);ctx.fillRect(-10-stride,2,9,4);
 ctx.fillStyle='#a73d6b';ctx.beginPath();ctx.ellipse(-1,0,7,10,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#44302d';ctx.beginPath();ctx.ellipse(2,0,8,6.7,0,0,Math.PI*2);ctx.fill();
 ctx.fillRect(-9,-2.5,10,5);
 ctx.fillStyle='#e9b58f';ctx.beginPath();ctx.ellipse(6,0,4.6,4.8,0,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
function drawEscapeVip(cx,cy){
 const vip=mission?.vip;
 if(!vip||mission.extraction?.vip?.boarded||!drawPointInView(vip.x,vip.y,cx,cy,45))return;
 drawEscapeVipSprite(g,vip.x,vip.y,vip.face,vip.moving);
 g.save();g.textAlign='center';g.font='bold 12px sans-serif';
 const label='要人 '+('♥'.repeat(vip.hp))+'♡'.repeat(3-vip.hp);
 g.strokeStyle='#241525';g.lineWidth=3;g.strokeText(label,vip.x,vip.y-18);
 g.fillStyle='#ffd0df';g.fillText(label,vip.x,vip.y-18);g.restore();
}
function updateEscapeVipBoarding(v,t){
 const ride=v.vip,vip=ride.actor;
 const u=Math.max(0,Math.min(1,(t-2.05)/.75)),x=v.stopX-30,y=v.y+10;
 if(u>=1){ride.boarded=true;vip.moving=false;return;}
 vip.x=ride.x+(x-ride.x)*u;vip.y=ride.y+(y-ride.y)*u;
 vip.face=Math.atan2(y-ride.y,x-ride.x);vip.moving=u>0;
}
function updateEscapeTestMission(dt){
 if(state!=='play'||!mission?.escapeTest||mission.escapeComplete)return;
 const m=mission;m.index=Math.max(0,ZONES.indexOf(zoneAt(p.y)));
 updateEscapeEnemyDrop(m,dt);
 const playerInside=p.hp>0&&!p.tank&&D(p,m.exit)<INDOOR_EXIT_RADIUS;
 const inside=playerInside&&m.vip.hp>0&&D(m.vip,m.exit)<INDOOR_EXIT_RADIUS;
 m.escapeExit=inside?m.exit:null;m.escapeProgress=inside?Math.min(INDOOR_EXIT_SECONDS,m.escapeProgress+dt):0;
 scoreStats.objectiveProgress=(m.index+Math.min(1,m.escapeProgress/INDOOR_EXIT_SECONDS))/ZONES.length;
 if(m.escapeProgress>=INDOOR_EXIT_SECONDS-1e-9){m.escapeComplete=true;scoreStats.objectiveProgress=1;completeMission();
  beginInfiltrationExtraction(m.exit,{x:Math.max(0,Math.min(WW-W,p.x-W/2)),y:0});
  m.extraction.vip={actor:m.vip,x:m.vip.x,y:m.vip.y,boarded:false};}
}
function drawEscapeTestMission(){
 const hud=document.getElementById('missionHud'),active=state==='play'&&mission?.escapeTest;
 if(hud.style.display!==(active?'block':'none'))hud.style.display=active?'block':'none';if(!active)return;
 const m=mission;
 if(performance.now()>=missionHudNextAt){
  missionHudNextAt=performance.now()+100;
  const zone=ZONES[m.index],area=zone.escapeArea===undefined?(m.index===0?'開始草原':'脱出地点の草原'):'密林 '+(zone.escapeArea+1)+'/'+ESCAPE_TEST_AREAS;
  const text='脱出（テスト）　'+area+' ／ 要人 '+('♥'.repeat(m.vip.hp))+'♡'.repeat(3-m.vip.hp)+'\n'+(m.escapeExit?'EXIT：あと '+Math.max(0,INDOOR_EXIT_SECONDS-m.escapeProgress).toFixed(1)+'秒':'EXITまで '+distanceMeters(D(p,m.exit))+'m ／ 要人と円内で5秒待機');
  if(hud.textContent!==text)hud.textContent=text;
 }
 const q=m.exit;if(q.x+INDOOR_EXIT_RADIUS<camX||q.x-INDOOR_EXIT_RADIUS>camX+W||q.y+INDOOR_EXIT_RADIUS<cam||q.y-INDOOR_EXIT_RADIUS>cam+H)return;
 const previous=g;gm.save();gm.setTransform(1,0,0,1,0,0);gm.translate(-camX,-cam);g=gm;
 try{drawExitCircle(q,INDOOR_EXIT_RADIUS,m.escapeProgress/INDOOR_EXIT_SECONDS,!!m.escapeExit);}finally{g=previous;gm.restore();}
}
