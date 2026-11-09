// Developer-only escape mission. Terrain, foliage, combat and EXIT art reuse existing systems.
const ESCAPE_TEST_AREAS=5,ESCAPE_TEST_AREA_HEIGHT=2400;
function setupEscapeTestZones(){
 ZONES=Array.from({length:ESCAPE_TEST_AREAS},(_,i)=>({n:'密林',y0:WH-40-i*ESCAPE_TEST_AREA_HEIGHT,y1:WH-40-(i+1)*ESCAPE_TEST_AREA_HEIGHT,g:ZONE_STYLE['密林'].g,p:ZONE_STYLE['密林'].p.slice(),escapeArea:i}));
}
function setupEscapeTestWorld(){
 loadJungleAssets();document.body.classList.remove('front-battle');
 p.x=WW/2;p.y=ZONES[0].y0-170;p.body=p.ang=-Math.PI/2;p.tank=null;
 scoreStats.startY=p.y;scoreStats.escapeTest=true;scoreStats.debugUsed=true;
 base={x:WW/2,y:-60000,w:COMMAND_BASE_W,h:COMMAND_BASE_H,hp:30,maxHp:30,deadAt:0};
 covers=[];objects=[];bushes=[];water=[];bridges=[];mud=[];cars=[];humans=[];etanks=[];items=[];bullets=[];parts=[];waves=[];fx=[];bombs=[];roadBands=[];areaDebugLabels=[];
 planJungleBuildings(ZONES);
 for(const z of ZONES){
  z.escapeRiver=rollRiverCrossing(z.y1+(z.y0-z.y1)*(.45+R()*.1),{jungle:true});
  z.oasis=rollWildernessLake(z);if(z.oasis){separateJungleLake(z,z.escapeRiver,z.oasis);water.push(z.oasis);}
 }
 // Keep non-vegetation scenery out of the river and lake.
 const wet=r=>ZONES.some(z=>z.escapeRiver&&ov2(r,z.escapeRiver,40)||z.oasis&&oasisContains(z.oasis,r.x+r.w/2,r.y+r.h/2,Math.max(r.w,r.h)/2+8));
 const last=ZONES[ZONES.length-1],exit={x:WW/2,y:last.y1+110};
 // Both water surfaces can carry vegetation. Keep the EXIT clear.
 const giantBlocked=r=>circleHitsRect(exit.x,exit.y,125,r);
 const totals={covers:[],objects:[],bushes:[]};
 for(const z of ZONES){
  covers=[];objects=[];bushes=[];
  // The ordinary jungle seed includes five shared small native trees, not small jungle variants.
  for(let i=0;i<5;i++)covers.push({kd:6,x:i%2?WW-210+R()*120:26+R()*120,y:z.y1+120+(i+.2+R()*.5)/5*1700,w:TREE_BOX,h:TREE_BOX});
  setupJungleScenery(z,giantBlocked);totals.covers.push(...covers);totals.objects.push(...objects);totals.bushes.push(...bushes);
 }
 covers=totals.covers;objects=totals.objects;bushes=totals.bushes;
 covers=covers.filter(c=>c.kd===6||!wet(coverSpriteRect(c)||c));
 objects=objects.filter(o=>!wet(objectAABB(o)));
 covers=covers.filter(c=>!circleHitsRect(exit.x,exit.y,125,coverSpriteRect(c)||c));
 objects=objects.filter(o=>!circleHitsRect(exit.x,exit.y,125,objectAABB(o)));bushes=bushes.filter(b=>!circleHitsRect(exit.x,exit.y,110,b));
 last.escapeExit=exit;
 setupJungleMud(ZONES);setupJungleTrails(ZONES);
 for(const z of ZONES){
  const inside=o=>o.y+o.h/2>z.y1&&o.y+o.h/2<=z.y0;
  z.jungleDensity.trees=covers.filter(c=>c.kd===6&&inside(c)).length;z.jungleDensity.grass=bushes.filter(b=>!b.spinifex&&inside(b)).length;z.jungleDensity.plants=bushes.filter(b=>b.spinifex&&inside(b)).length;
 }
 // One ordinary starting vehicle; test selection does not force invincibility or infinite ammo.
 const t=TYPES[0];cars.push({x:WW/2+130,y:p.y-100,t,kind:'tank',hp:t.hp,c:t.cmax,v:t.vmax,f:t.fmax,ch:0,mgHits:0,body:-Math.PI/2});
 debugMode=0;debugInvincible=false;baseSpawnT=99999;weather='clear';weatherNext=5+R()*10;weatherT=0;rainIntensity=0;
 commanderPrevX=p.x;commanderPrevY=p.y;commanderVelocity={x:0,y:0};commanderRallying=false;commanderSignals=[];
 captureBuildingGroundMarks();rebuildSpatialGrid();
 for(const z of ZONES)spawnAreaDebugEnemies(z,{blueCommander:true});
 setupRoadTruckEvents();
 say('脱出：密林5エリアを突破し、最後のEXITで5秒待機せよ');
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
 mission={escapeTest:true,exit:ZONES[ZONES.length-1].escapeExit,escapeProgress:0,escapeExit:null,escapeComplete:false,points:[],index:0,enemyDrop:{next:0,plane:null,parachutes:[],retry:0}};missionHudNextAt=0;
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
 if(!plane&&!event.parachutes.length&&m.index>=ESCAPE_ENEMY_DROP_AREAS[event.next]){
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
  plane=event.plane={x,y:view.y-180,endY:view.y+view.h+180,dropY,targets,drops:0};
  event.next++;
  sfx('airWarning');say('敵爆撃機が接近！');
 }
 if(plane){
  plane.y+=380*dt;
  while(plane.drops<3&&plane.y>=plane.dropY+plane.drops*90){
   const target=plane.targets[plane.drops++];
   const startY=Math.min(target.y,plane.y-25);
   event.parachutes.push({x:target.x,y:startY,startY,landY:target.y,
    alive:true,chute:3,face:Math.PI/2,retry:0});
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
   patrolMode:'axis',elite:false,escapeParatrooper:true});
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
function updateEscapeTestMission(dt){
 if(state!=='play'||!mission?.escapeTest||mission.escapeComplete)return;
 const m=mission;m.index=Math.max(0,ZONES.indexOf(zoneAt(p.y)));
 updateEscapeEnemyDrop(m,dt);
 const inside=p.hp>0&&!p.tank&&D(p,m.exit)<INDOOR_EXIT_RADIUS;
 m.escapeExit=inside?m.exit:null;m.escapeProgress=inside?Math.min(INDOOR_EXIT_SECONDS,m.escapeProgress+dt):0;
 scoreStats.objectiveProgress=(m.index+Math.min(1,m.escapeProgress/INDOOR_EXIT_SECONDS))/ESCAPE_TEST_AREAS;
 if(m.escapeProgress>=INDOOR_EXIT_SECONDS-1e-9){m.escapeComplete=true;scoreStats.objectiveProgress=1;completeMission();}
}
function drawEscapeTestMission(){
 const hud=document.getElementById('missionHud'),active=state==='play'&&mission?.escapeTest;
 if(hud.style.display!==(active?'block':'none'))hud.style.display=active?'block':'none';if(!active)return;
 const m=mission;
 if(performance.now()>=missionHudNextAt){
  missionHudNextAt=performance.now()+100;
  const text='脱出（テスト）　密林 '+(m.index+1)+'/5\n'+(m.escapeExit?'EXIT：あと '+Math.max(0,INDOOR_EXIT_SECONDS-m.escapeProgress).toFixed(1)+'秒':'EXITまで '+distanceMeters(D(p,m.exit))+'m ／ 円内で5秒待機');
  if(hud.textContent!==text)hud.textContent=text;
 }
 const q=m.exit;if(q.x+INDOOR_EXIT_RADIUS<camX||q.x-INDOOR_EXIT_RADIUS>camX+W||q.y+INDOOR_EXIT_RADIUS<cam||q.y-INDOOR_EXIT_RADIUS>cam+H)return;
 const previous=g;gm.save();gm.setTransform(1,0,0,1,0,0);gm.translate(-camX,-cam);g=gm;
 try{drawExitCircle(q,INDOOR_EXIT_RADIUS,m.escapeProgress/INDOOR_EXIT_SECONDS,!!m.escapeExit);}finally{g=previous;gm.restore();}
}
