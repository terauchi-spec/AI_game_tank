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
 const totals={covers:[],objects:[],bushes:[]};
 for(const z of ZONES){
  covers=[];objects=[];bushes=[];
  // The ordinary jungle seed includes five shared small native trees, not small jungle variants.
  for(let i=0;i<5;i++)covers.push({kd:6,x:i%2?WW-210+R()*120:26+R()*120,y:z.y1+120+(i+.2+R()*.5)/5*1700,w:TREE_BOX,h:TREE_BOX});
  setupJungleScenery(z);totals.covers.push(...covers);totals.objects.push(...objects);totals.bushes.push(...bushes);
 }
 covers=totals.covers;objects=totals.objects;bushes=totals.bushes;
 for(const z of ZONES){
  z.escapeRiver=rollRiverCrossing(z.y1+(z.y0-z.y1)*(.45+R()*.1),{jungle:true});
  z.oasis=rollWildernessLake(z);if(z.oasis){separateJungleLake(z,z.escapeRiver,z.oasis);water.push(z.oasis);}
 }
 // Remove scenery from water and bridge approaches, using the same pond shape as wilderness.
 const wet=r=>ZONES.some(z=>z.escapeRiver&&ov2(r,z.escapeRiver,40)||z.oasis&&oasisContains(z.oasis,r.x+r.w/2,r.y+r.h/2,Math.max(r.w,r.h)/2+8));
 covers=covers.filter(c=>!wet(coverSpriteRect(c)||c));objects=objects.filter(o=>!wet(objectAABB(o)));bushes=bushes.filter(b=>!wet(b));
 const last=ZONES[ZONES.length-1],exit={x:WW/2,y:last.y1+110};
 covers=covers.filter(c=>!circleHitsRect(exit.x,exit.y,125,coverSpriteRect(c)||c));
 objects=objects.filter(o=>!circleHitsRect(exit.x,exit.y,125,objectAABB(o)));bushes=bushes.filter(b=>!circleHitsRect(exit.x,exit.y,110,b));
 last.escapeExit=exit;setupJungleMud(ZONES);setupJungleTrails(ZONES);
 for(const z of ZONES){
  const inside=o=>o.y+o.h/2>z.y1&&o.y+o.h/2<=z.y0;
  z.jungleDensity.trees=covers.filter(c=>c.kd===6&&inside(c)).length;z.jungleDensity.grass=bushes.filter(b=>!b.spinifex&&inside(b)).length;z.jungleDensity.plants=bushes.filter(b=>b.spinifex&&inside(b)).length;
 }
 // One ordinary starting vehicle; test selection does not force invincibility or infinite ammo.
 const t=TYPES[0];cars.push({x:WW/2+130,y:p.y-100,t,kind:'tank',hp:t.hp,c:t.cmax,v:t.vmax,f:t.fmax,ch:0,mgHits:0,body:-Math.PI/2});
 debugMode=0;debugInvincible=false;baseSpawnT=99999;weather='clear';weatherNext=99999;weatherT=0;rainIntensity=0;
 captureBuildingGroundMarks();rebuildSpatialGrid();for(const z of ZONES)spawnAreaDebugEnemies(z);
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
 mission={escapeTest:true,exit:ZONES[ZONES.length-1].escapeExit,escapeProgress:0,escapeExit:null,escapeComplete:false,points:[],index:0};missionHudNextAt=0;
}
function updateEscapeTestMission(dt){
 if(state!=='play'||!mission?.escapeTest||mission.escapeComplete)return;
 const m=mission;m.index=Math.max(0,ZONES.indexOf(zoneAt(p.y)));
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
