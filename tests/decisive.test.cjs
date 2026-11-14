const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function start(seed=7){
 const e=createGameEngine(root,{seed});
 e.run("localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify({version:2,cleared:STAGE_ORDER.slice(0,-1).map(s=>s.id)}));localStorage.setItem(INTRO_NAME_KEY,'テスト');stageMode='decisive';areaDebugEnabled=false;skillDebugAll=false;stageDebugAll=false;skill='throw';reset(false);recordStageSortie(scoreStats)");return e;
}
function enterFacility(run){
 run('p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y;interact=true;update(1/60)');
 assert.equal(run('decisiveBattle.phase'),'town');
 run('update(.24)');
 assert.equal(run('decisiveBattle.phase'),'town');
 run('update(.01)');
 assert.equal(run('decisiveBattle.phase'),'facility');
 assert.equal(run('decisiveBattle.facilityTransition.remaining'),.25);
 run('update(.25)');
 assert.equal(run('decisiveBattle.facilityTransition'),null);
}
function completeFacility(run){
 enterFacility(run);
 run('debugInvincible=true;indoorWorld.currentFloor=1');
 for(let hit=1;hit<=3;hit++){
  run('bombBlast(mission.computer.x,mission.computer.y,0,false,true)');
  assert.equal(run('scoreStats.decisiveTerminalHits'),hit);
  assert.equal(run('missionProgress(scoreStats)'),.25*hit/3);
 }
 assert.equal(run('mission.computer.done'),true);
 run('indoorWorld.currentFloor=0;p.x=indoorWorld.exit.x;p.y=indoorWorld.exit.y;p.blastAirT=0;for(let i=0;i<5;i++)updateMission(1);update(.25);update(.25);debugInvincible=false');
}
test('developer-only 13 preserves its identity through phase change and victory while public completion is already earned',()=>{
 const {run,storage}=start();assert.equal(run('currentStageId()'),'decisive');assert.equal(run('stageDisplayNumber(currentStageId())'),'13');
 assert.equal(run('allies.length'),0);assert.equal(run('p.tank'),null);assert.equal(run('zoneAt(p.y)===ZONES[0]'),true);assert.equal(run('scoreStats.stageRecordId'),'decisive');
 completeFacility(run);
 assert.equal(run('decisiveBattle.phase'),'assault');assert.equal(run('stageMode'),'front');assert.equal(run('currentStageId()'),'decisive');assert.equal(run('scoreStats.stage'),'decisive');
 assert.equal(run('allies.length'),6);assert.ok(run('allies.every(a=>a.frontline)'));assert.equal(run('humans.length'),0);assert.equal(run('state'),'play');
 run('draw();for(let i=0;i<90;i++)update(1/60);draw()');assert.equal(run('state'),'play');
 run("damageBase(1000,base.x+base.w/2,base.y+base.h/2,100,1,'player')");assert.equal(run('state'),'blast');
 run('blastUpdate(3)');assert.equal(run('state'),'succeeded');assert.equal(run('scoreStats.final.cleared'),true);assert.equal(run('scoreStats.objectiveProgress'),1);
 assert.equal(run('scoreStats.stageRecordId'),'decisive');assert.equal(run('readStageRecords().stages.decisive.successes'),1);assert.equal(run('readStageRecords().stages.front.successes'),0);assert.equal(run('leaderboardPending.decisive.stage'),'decisive');assert.equal(run('readStageProgress().cleared.length'),13);assert.ok(run("readTitleArchive().titles.v3_all_stages_clear"));assert.equal(run("scoreStats.awards.newTitles.includes('v3_all_stages_clear')"),false);
});
test('allied bombers arrive at 20m and enemies spawn at 50m after escape',()=>{
 const {run}=start();
 completeFacility(run);
 run('updateDecisiveMission(80);p.y=decisiveBattle.assaultStartY-199;updateDecisiveMission(.01)');
 assert.equal(run('reinforcementPass'),null);
 run('p.y-=1;updateDecisiveMission(.01)');
 assert.ok(run(`(()=>{
  const pass=reinforcementPass,view=frontlineView();
  return pass.offsets.length===2&&pass.offsets[1]-pass.offsets[0]>=260&&pass.y>view.y+view.h;
 })()`));
 assert.ok(run(`(()=>{
  const drawBomber=drawSupportBomber,calls=[];
  drawSupportBomber=(x,y)=>calls.push({x,y});
  try{draw();}finally{drawSupportBomber=drawBomber;}
  return calls.length===2&&calls[0].x!==calls[1].x&&calls[0].y===calls[1].y;
 })()`));
 run('updateReinforcementPass(4)');
 assert.equal(run('allies.filter(a=>a.chute>0).length'),6);
 assert.equal(run('allies.filter(a=>a.chute>0&&a.frontCommander).length'),2);
 assert.ok(run('allies.filter(a=>a.chute>0).every(a=>a.startY<p.y&&a.landY<p.y)'));
 assert.equal(run('reinforcementPass'),null);
 run('p.y=decisiveBattle.assaultStartY-499;updateDecisiveMission(80)');
 assert.ok(run('!mission.enemyWavesStarted&&!humans.length&&!etanks.length&&!enemyDogs.length&&!reinforcementPass'));
 run('p.y-=1;updateDecisiveMission(.01)');
 assert.ok(run('mission.enemyWavesStarted&&humans.length>0&&humans.every(h=>h.frontMarch&&!h.dogHandler&&!h.dog)&&mission.enemyRoster.every(h=>!h.dogHandler&&!h.dog)&&!enemyDogs.length&&!reinforcementPass'));
});
test('desert town replaces the random sections and shares the desert tile and uses its own buildings',()=>{
 for(const seed of [7,11,42]){
  const {run}=start(seed);
  assert.deepEqual(Array.from(run('ZONES.map(z=>z.n)')),['草原','砂漠街','砂漠街','砂漠街','砂漠街','砂漠街','砂漠','砂漠','砂漠','砂漠','砂漠']);
  assert.ok(run('ZONES.slice(1).every((z,i)=>z.y0===ZONES[i].y1)'));
  assert.equal(run('water.filter(w=>w.oasis).length'),1);
  assert.ok(run('bushes.some(b=>b.desertLakeBush)&&bushes.filter(b=>b.desertLakeBush).every(b=>zoneAt(b.y+b.h/2).oasis&&!hitsM(b.x+b.w/2,b.y+b.h/2,40))'));
  assert.ok(run('water.some(w=>w.oasis&&w.sizeScale>=.2&&w.sizeScale<=1.5)'));
  assert.ok(run("TERRAIN_IMG['砂漠街']===TERRAIN_IMG['砂漠']&&terrainSurfacePattern(ZONES[1])===terrainSurfacePattern(ZONES[DECISIVE_DESERT_START])"));
  assert.ok(run(`(ZONES.slice(1,DECISIVE_DESERT_START).every(z=>{
   const buildings=covers.filter(c=>c.y>=z.y1&&c.y+c.h<=z.y0&&DESERT_TOWN_BUILDINGS.some(([key])=>key===c.decisiveKind));
   return buildings.length>=1&&buildings.every((c,i)=>
    (c.x>=0&&c.x+c.w<=WW)&&
    DESERT_TOWN_BUILDINGS.some(([key,,w,h])=>c.decisiveKind===key&&c.w===w*1.5&&c.h===h*1.5)&&
    circleHitsCover(c.x+c.w/2,c.y+c.h/2,8,c)&&
    buildings.slice(i+1).every(other=>!decisiveRectsOverlap(c,other)));
  }))`));
  assert.ok(run(`DESERT_TOWN_BUILDINGS.every(([key])=>covers.some(c=>c.decisiveKind===key)&&assetOK(COVER_IMG['decisive_'+key]))&&
   !covers.some(c=>c.decisiveKind==='citadel-rubble'||JUNGLE_BUILDING_KEYS.includes(c.jungleAsset))&&
   !COVER_IMG['decisive_citadel-rubble']&&
   covers.filter(c=>c.decisiveKind==='adobe-house').every(c=>c.w===324&&c.h===216)&&
   covers.filter(c=>c.decisiveKind==='adobe-building').every(c=>c.w===432&&c.h===216)&&
   covers.every(c=>!DESERT_TOWN_BUILDINGS.some(([key])=>key===c.decisiveKind)||!decisiveRectsOverlap(decisiveBattle.building,c,20))`));
 }
 const {run}=createGameEngine(root,{seed:7});
 run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='砂漠街';reset(false)");
 assert.equal(run('ZONES[0].n'),'砂漠街');
 assert.equal(run('water.filter(w=>w.oasis).length'),1);
 assert.ok(run('DESERT_TOWN_BUILDINGS.every(([key])=>covers.some(c=>c.decisiveKind===key))'));
});
test('desert town scatters all four scenery types clear of buildings, the lane and facility',()=>{
 const layouts=new Set();
 for(const seed of [7,11,42]){
  const {run}=start(seed);
  assert.ok(run(`ZONES.slice(1,DECISIVE_DESERT_START).every(z=>{
   const inside=o=>o.y>=z.y1&&o.y+o.h<=z.y0;
   const sandbags=covers.filter(c=>c.decisiveKind==='sandbags'&&!c.desertTownGate&&inside(c)&&c.y>=decisiveBattle.border+800);
   const grass=bushes.filter(inside),props=objects.filter(inside),buildings=covers.filter(c=>inside(c)&&DESERT_TOWN_BUILDINGS.some(([key])=>key===c.decisiveKind));
   const scenery=[...sandbags,...grass,...props.map(o=>o.kind==='barrel'?barrelVisualRect(o):o)];
   const rows=sandbags.map(c=>c.y),columns=new Set(sandbags.map(c=>c.x));
   const gates=covers.filter(c=>c.desertTownGate&&inside(c)).sort((a,b)=>a.y-b.y);
   const relay=z.decisiveArea===DECISIVE_DESERT_START-1;
   return (relay?gates.length<=3:gates.length===3)&&gates.every((c,i)=>
    c.w===210&&c.h===52&&(i===0||Math.abs(c.x-gates[i-1].x)-c.w>=2*TANK_HIT))&&columns.size<=2&&
    sandbags.every(c=>c.w===210&&c.h===52&&(c.y-rows[0])%168===0)&&
    scenery.every((o,i)=>(o.x+o.w<=WW/2-100||o.x>=WW/2+100)&&
     !decisiveRectsOverlap(decisiveBattle.building,o,20)&&
     !buildings.some(b=>decisiveRectsOverlap(o,b))&&scenery.slice(i+1).every(q=>!decisiveRectsOverlap(o,q)));
  })`),'scenery layout for seed '+seed);
  assert.ok(run("bushes.some(b=>zoneAt(b.y).n==='砂漠街')&&['crate','barrel'].every(k=>objects.some(o=>o.kind===k&&zoneAt(o.y).n==='砂漠街'))"));
  layouts.add(run('JSON.stringify(covers.filter(c=>c.decisiveKind==="sandbags"&&c.y>decisiveBattle.border))'));
 }
 assert.equal(layouts.size,3);
 const {run}=createGameEngine(root);
 run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='砂漠街';reset(false)");
 assert.ok(run("covers.some(c=>c.decisiveKind==='sandbags')&&bushes.length>0&&objects.some(o=>o.kind==='barrel')&&objects.some(o=>o.kind==='crate')&&assetOK(COVER_IMG.decisive_sandbags)"));
});
test('decisive suppresses rain in every phase and normal stages still start rain',()=>{
 const {run}=start();
 run("p.y=ZONES[0].y1+1;weatherNext=0;updateWeather(120)");
 assert.equal(run('weather'),'clear');
 run("ZONES[1].desertTownStorm=false;p.y=ZONES[1].y0-1;weather='rain';weatherT=20;rainIntensity=1;updateWeather(1)");
 assert.deepEqual(Array.from(run('[weather,weatherT,rainIntensity]')),['clear',0,0]);
 enterFacility(run);
 run('weatherNext=0;updateWeather(120)');
 assert.equal(run('weather'),'clear');
 run("indoorWorld.currentFloor=1;for(let i=0;i<3;i++)bombBlast(mission.computer.x,mission.computer.y,0,false,true);indoorWorld.currentFloor=0;p.x=indoorWorld.exit.x;p.y=indoorWorld.exit.y;p.blastAirT=0;updateMission(5);update(.5)");
 assert.equal(run('decisiveBattle.phase'),'assault');
 run('weatherNext=0;updateWeather(120)');
 assert.deepEqual(Array.from(run('[weather,weatherT,rainIntensity]')),['clear',0,0]);
 run("stageMode='beginner';reset(false);weatherNext=0;updateWeather(1)");
 assert.equal(run('weather'),'rain');
});
test('a selected town section gets one sandstorm with the same detection penalty as rain',()=>{
 const {run}=start();
 run("p.y=ZONES[1].y0-50;ZONES[1].desertTownStorm=true;weather='rain';weatherT=20;");
 const rain=run('detectRange()');
 run('updateWeather(.2);updateWeather(.6)');
 assert.equal(run('weather'),'sandstorm');
 assert.equal(run('detectRange()'),rain);
 assert.ok(run('sandIntensity>0&&sandDuration>=8&&sandDuration<=10'));
 run('updateWeather(10);updateWeather(20)');
 assert.equal(run('weather'),'clear');
 run('p.y=ZONES[0].y1+20;updateWeather(1)');
 assert.ok(run('Number.isFinite(weatherNext)'));
 run('p.y=ZONES[1].y0-50;updateWeather(20)');
 assert.equal(run('weather'),'clear');
});
test('the facility replaces the capture circle and A opens it only on foot at the entrance',()=>{
 const {run}=start(11);
 assert.equal(run('covers.filter(c=>c.decisiveKind==="bunker").length'),14);
 assert.ok(run('ZONES.slice(DECISIVE_DESERT_START).every(z=>decisiveBattle.bunkers.some(b=>b.x+b.w/2===WW/2&&zoneAt(b.y)===z))'));
 assert.ok(run(`ZONES.slice(DECISIVE_DESERT_START).every(z=>
  z.decisiveRadios.length===2&&z.decisiveRadios.some(q=>q.white)&&z.decisiveRadios.some(q=>!q.white)&&
  z.decisiveRadios.every(q=>zoneAt(q.y)===z&&!hitsM(q.x,q.y,12))&&
  objects.filter(o=>o.kind==='barrel'&&zoneAt(o.y)===z).length===2)`));
 assert.ok(run(`covers.filter(c=>['bunker','sandbags'].includes(c.decisiveKind)).every(c=>
  !decisiveRectsOverlap(c,decisiveBattle.building,DECISIVE_FACILITY_DEFENSE_CLEARANCE))`));
 assert.ok(run('ZONES.slice(DECISIVE_DESERT_START).every(z=>cars.some(v=>v.y<z.y0&&v.y>z.y1))'));
 const hp=run('base.hp');
 run("damageBase(1000,base.x,base.y,60,1,'bomb');p.y=100;updateMission(.1)");
 assert.equal(run('base.hp'),hp);
 assert.equal(run('p.y'),run('decisiveBattle.border+32'));
 run('p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y+100;interact=true;update(1/60)');
 assert.equal(run('stageMode'),'decisive');
 run('p.y=decisiveBattle.gate.y;p.dig=1');
 assert.equal(run('enterDecisiveFacility()'),false);
 run('p.dig=0;p.tank={kind:"fighter"}');
 assert.equal(run('enterDecisiveFacility()'),false);
 run('p.tank=null;updateMission(20);draw();drawMission()');
 assert.ok(run('covers.includes(decisiveBattle.building)&&assetOK(COVER_IMG["decisive_command-facility"])'));
 assert.ok(run('vehicleMarkers.some(m=>m.x===decisiveBattle.gate.x&&m.y===decisiveBattle.gate.y&&m.mode==="ride")'));
 assert.equal(run('stageMode'),'decisive');
 enterFacility(run);
 assert.equal(run('stageMode'),'indoor');
 assert.equal(run('scoreStats.stage'),'decisive');
 assert.equal(run('currentStageId()'),'decisive');
});
test('the facility stairs, placed bomb and ground EXIT lead into the existing assault',()=>{
 const {run}=start();
 run('var originalScore=scoreStats,originalCovers=covers;scoreStats.playerKillPoints=400;p.hp=2');
 enterFacility(run);
 assert.equal(run('p.hp'),2);
 assert.equal(run('indoorWorld.floors.map(f=>f.stairs.map(s=>s.destination).join()).join(";")'),'1;0');
 run(`function useStair(destination){
  const f=indoorWorld.floors[indoorWorld.currentFloor],s=f.stairs.find(q=>q.destination===destination);
  const b=indoorStairBounds(s,f.number);
  indoorWorld.stairsCooldown=0;p.x=s.x;p.y=b.y+b.h-18;updateMission(.016);
  p.y=b.y+22;updateMission(.016);
  for(let i=0;i<32;i++)update(.016);
 }`);
 run('p.x=indoorWorld.exit.x;p.y=indoorWorld.exit.y;updateMission(10);bombBlast(mission.computer.x,mission.computer.y,0,false,true);');
 assert.equal(run('mission.computer.done'),false);
 assert.equal(run('mission.escapeProgress'),0);
 run('useStair(1)');
 assert.equal(run('indoorWorld.currentFloor'),1);
 run('draw();drawMission();p.x=mission.computer.x;p.y=mission.computer.object.y+mission.computer.object.h+35;bombBlast(p.x,p.y);');
 assert.equal(run('mission.computer.hits'),0);
 run('damageObject(mission.computer.object,"cannonDirect");damageObject(mission.computer.object,"objectBlast")');
 assert.equal(run('mission.computer.hits'),0);
 for(let hits=1;hits<=3;hits++){
  run('p.blastAirT=0;debugInvincible=true;bombReq=true;update(.016);bombReq=true;update(.016)');
  assert.equal(run('mission.computer.hits'),hits);
  assert.equal(run('mission.computer.done'),hits===3);
 }
 assert.ok(run('objects.includes(mission.computer.object)&&mission.computer.object.wrecked&&hitsM(mission.computer.x,mission.computer.y,8)'));
 run('p.blastAirT=0;useStair(0);Object.assign(p,indoorWorld.entrance);updateMission(5)');
 assert.equal(run('decisiveBattle.phase'),'facility');
 assert.equal(run('mission.escapeProgress'),0);
 run('Object.assign(p,indoorWorld.exit);updateMission(4.9)');
 assert.equal(run('stageMode'),'indoor');
 run('p.x+=200;updateMission(.2);p.x-=200;updateMission(4.9)');
 assert.equal(run('stageMode'),'indoor');
 run('updateMission(.1);draw();drawMission();update(.24)');
 assert.equal(run('stageMode'),'indoor');
 run('update(.01);draw();drawMission()');
 assert.equal(run('stageMode'),'front');
 assert.equal(run('decisiveBattle.facilityTransition.remaining'),.25);
 run('update(.25)');
 assert.equal(run('decisiveBattle.facilityTransition'),null);
 assert.ok(run(`(()=>{
  const b=decisiveBattle.building;
  drawDecisiveFacilitySmoke(b.x,b.y-100);
  return decisiveSmokeSprite?.width===96;
 })()`));
 assert.ok(run('scoreStats===originalScore&&covers===originalCovers&&scoreStats.playerKillPoints===400&&scoreStats.stageRecordId==="decisive"'));
 assert.equal(run('zoneAt(p.y).n'),'砂漠');
 assert.ok(run('!objects.some(o=>o.wrecked)'));
 assert.equal(run('beginDecisiveAssault()'),false);
 run('p.x=mission.points[0].x;p.y=mission.points[0].y;for(let i=0;i<200;i++)updateMission(.5)');
 assert.equal(run('state'),'play');
 assert.ok(run('base.hp>0&&humans.filter(h=>h.alive).length<=frontlineEnemyLimit()+3&&allies.filter(a=>a.alive&&a.frontline).length<=10'));
 assert.equal(run('scoreStats.final'),null);
});
test('command facility keeps both floor dimensions, a fixed central room and nine explosive terminals',()=>{
 const {run}=start(14);
 enterFacility(run);
 assert.ok(run(`indoorWorld.floors.every(f=>Math.abs(f.footprint.w-900*Math.sqrt(.8))<1e-6&&
  Math.abs(f.footprint.h-1260*1.75*Math.sqrt(.8)*.7)<1e-6)`));
 assert.ok(run(`(()=>{
  const f=indoorWorld.floors[1],room=f.rooms.find(r=>r.purpose==='command_computer');
  const small=objects.filter(o=>o.kind==='commandSmall'),main=mission.computer.object;
  return room.size===9&&Math.abs(room.x+room.w/2-f.footprint.x-f.footprint.w/2)<1e-6&&
   Math.abs(room.y+room.h/2-f.footprint.y-f.footprint.h/2)<1e-6&&main.y-room.y<20&&
   small.length===9&&new Set(small.map(o=>o.x)).size===3&&new Set(small.map(o=>o.y)).size===3&&
   small.every(o=>o.indoorExplosive&&Math.abs(o.w-96)<1e-6&&Math.abs(o.h-96*87/192)<1e-6&&
    o.y>main.y+main.h&&o.x>=room.x&&o.x+o.w<=room.x+room.w&&o.y+o.h<=room.y+room.h);
 })()`));
 assert.ok(run(`(()=>{
  const small=objects.find(o=>o.kind==='commandSmall');
  damageObject(small,'mg');damageObject(small,'mg');
  if(small.burnT!==3)return false;
  updateBurningObjects(3.1);
  return objects.includes(small)&&small.wrecked&&hitsM(small.x+small.w/2,small.y+small.h/2,8)&&
   !damageObject(small,'cannonDirect')&&mission.computer.hits===0;
 })()`));
 assert.match(run('COVER_IMG["decisive_computer-large"].src'),/computer-large\.webp/);
 assert.equal(run('decisiveFacilityOutdoorTerrain.n'),'砂漠');
 assert.ok(run(`(()=>{
  const w=indoorWorld,f=w.floors[0],north=f.openings.find(o=>o.side===-1);
  return north&&w.exits.length===1&&w.exit.x===north.x&&w.exit.y<f.footprint.y&&
   !hitsM(north.x,north.y,8)&&indoorStairAsset(1)==='stairs_down'&&indoorStairAsset(2)==='stairs_up';
 })()`));
 assert.deepEqual(Array.from(run(`(()=>{
  const originalArrow=drawFrontlineArrow,originalText=gm.fillText,calls=[],q=mission.computer;
  drawFrontlineArrow=point=>calls.push(point===q?'computer':point===indoorWorld.exit?'north exit':'other');
  gm.fillText=label=>calls.push(label);
  try{
   indoorWorld.currentFloor=0;drawDecisiveFacilityHud({});
   indoorWorld.currentFloor=1;drawDecisiveFacilityHud({});
   q.done=true;drawDecisiveFacilityHud({});
   indoorWorld.currentFloor=0;drawDecisiveFacilityHud({});
  }finally{drawFrontlineArrow=originalArrow;gm.fillText=originalText;q.done=false;}
  return calls;
 })()`)),['→B1F','computer','→EXIT','north exit']);
 assert.ok(run(`indoorWorld.exterior.length===0&&!covers.some(c=>c.indoorExterior)&&
  objects.filter(o=>o.kind==='barrel').every(o=>Math.abs(o.h-30*1.75*Math.sqrt(.8))<1e-6)&&
  objects.filter(o=>o.kind==='shellPallet').every(o=>Math.abs(o.h-120*1.75*Math.sqrt(.8))<1e-6)`));
 assert.deepEqual(Array.from(run(`(()=>{
  const original=drawAssetSprite,images=[];
  drawAssetSprite=image=>images.push(image.src.split('/').pop().split('?')[0]);
  const q=objects.find(o=>o.kind==='commandSmall'&&o.wrecked);
  try{drawObject(q);}finally{drawAssetSprite=original;}
  return images;
 })()`)),['computer-small-wreck.webp']);
 assert.ok(run(`(()=>{
  const f=indoorWorld.floors[0].footprint,clips=[];
  indoorWorld.currentFloor=0;
  const mask=gameCanvasContext(document.createElement('canvas'));
  mask.rect=(...bounds)=>clips.push(bounds);
  indoorPaintLightingMask(mask,f.x-50,f.y-50,f.w+100,f.h+100);
  return clips[0]?.join() === [50,50,f.w,f.h].join()&&
   decisiveFacilityOutdoorTerrain.g===ZONE_STYLE['砂漠'].g;
 })()`));
 assert.deepEqual(Array.from(run(`(()=>{
  const target=mission.computer,bar=drawObjectiveHealthBar,bomb=drawHudBomb,calls=[];
  drawObjectiveHealthBar=(ctx,x,y,w,fraction)=>calls.push(fraction);
  drawHudBomb=()=>calls.push('bomb');
  indoorWorld.currentFloor=1;camX=target.x-W/2;cam=target.y-H/2;
  try{
   drawDecisiveFacilityHud({});target.hits=1;
   drawDecisiveFacilityHud({});target.done=true;
   drawDecisiveFacilityHud({});
  }finally{drawObjectiveHealthBar=bar;drawHudBomb=bomb;target.hits=0;target.done=false;}
  return calls;
 })()`)),[1,1-1/3]);
 assert.deepEqual(Array.from(run(`(()=>{
  indoorWorld.currentFloor=0;
  const original=drawExitCircle,calls=[];
  drawExitCircle=()=>calls.push(true);
  const f=indoorWorld.floors[0],q=indoorWorld.exit;
  try{
   drawInfiltrationExitsForFloor(f,q.x-50,q.y-50);
   calls.push(false);mission.computer.done=true;
   drawInfiltrationExitsForFloor(f,q.x-50,q.y-50);
  }finally{drawExitCircle=original;mission.computer.done=false;}
  return calls;
 })()`)),[false,true]);
});
test('moving fortress yields to nearby units; bunker and fortress guns reuse existing enemy projectiles',()=>{
 const {run}=start();completeFacility(run);const x=run('base.x');run('updateDecisiveFortress(.1)');assert.notEqual(run('base.x'),x);
 run('p.x=base.x+base.w+5;p.y=base.y+100');const blocked=run('base.x');run('updateDecisiveFortress(.1)');assert.equal(run('base.x'),blocked);
 run('p.x=base.x+base.w/2;p.y=base.y+base.h+150;decisiveBattle.fortressCd=0;updateDecisiveFortress(.1)');assert.ok(run('bullets.some(b=>b.from==="e"&&b.k==="v")'));
 run('const bunker=decisiveBattle.bunkers[0];bullets=[];allies=[];p.x=bunker.x+bunker.w/2+44;p.y=bunker.y+bunker.h+52;bunker.gunCd=.8;decisiveBattle.gunScan=0;updateDecisiveBunkers(.2)');
 assert.equal(run('bunker.gunAim'),Math.PI/4);
 assert.equal(run('decisiveBunkerAngle(bunker,performance.now()+100)'),3*Math.PI/8);
 assert.equal(run('bullets.some(b=>b.from==="e"&&b.k==="v")'),false);
 run('bunker.gunCd=0;decisiveBattle.gunScan=0;updateDecisiveBunkers(.2)');
 assert.ok(run('bullets.some(b=>b.from==="e"&&b.k==="v"&&Math.abs(Math.atan2(b.vy,b.vx)-bunker.gunAim)<1e-10)'));
 run('for(let i=0;i<4;i++)updateDecisiveBunkers(.2)');
 assert.equal(run('bullets.filter(b=>b.from==="e"&&b.k==="v").length'),5);
 run('updateDecisiveBunkers(.2)');
 assert.equal(run('bullets.filter(b=>b.from==="e"&&b.k==="v").length'),5);
 assert.ok(run(`ZONES.slice(DECISIVE_DESERT_START+1).every(z=>{
  const bags=covers.filter(c=>c.decisiveKind==='sandbags'&&zoneAt(c.y)===z).sort((a,b)=>a.y-b.y);
  return bags.length===9&&bags.every((c,i)=>i%3===0||c.y-bags[i-1].y===16&&
   Math.abs(c.x-bags[i-1].x)-c.w>=2*TANK_HIT);
 })`));
 run('var bunkerLayers=[];g.drawImage=(im)=>bunkerLayers.push(im.src);drawDecisiveCover(bunker);drawDecisiveCover({decisiveKind:"bunker",x:bunker.x,y:bunker.y,w:bunker.w,h:bunker.h});');
 assert.deepEqual(Array.from(run('bunkerLayers.map(src=>src.split("/").pop().split("?")[0])')),['bunker.webp','bunker-barrel.webp','bunker.webp']);
});
test('decisive desert schedules both recurring air events',()=>{
 const {run}=start();
 completeFacility(run);
 run('p.y=decisiveBattle.assaultStartY-500;decisiveBattle.desertDrop.remaining=0;updateDecisiveMission(.01)');
 assert.ok(run('decisiveBattle.desertDrop.plane.targets.length===3&&decisiveBattle.desertDrop.remaining>=10&&decisiveBattle.desertDrop.remaining<=20'));
 run('mission.enemyAirRaid.nextPassT=5;updateDecisiveMission(.01)');
 assert.equal(run('mission.enemyAirRaid.phase'),'warning');
 assert.ok(run('mission.enemyAirRaid.timer>4.98&&mission.enemyAirRaid.timer<=5'));
 assert.equal(run('mission.enemyAirRaid.remaining'),Infinity);
 run(`const desertRadios=ZONES[DECISIVE_DESERT_START].decisiveRadios;
  for(const pickup of desertRadios){
   Object.assign(p,{x:pickup.x,y:pickup.y});
   reinforcementPass=null;airstrike=null;collectDecisiveDesertRadios();
   if(!(pickup.got&&(pickup.white?reinforcementPass:airstrike)))throw Error('radio not activated');
  }`);
 assert.ok(run('desertRadios.every(q=>q.got)'));

});
test('arriving at the fortress ends carpet bombing without stopping white paratrooper passes',()=>{
 const {run}=start();completeFacility(run);
 run(`mission.enemyWavesStarted=true;decisiveBattle.pendingReinforcement=false;
  const raid=mission.enemyAirRaid,drop=decisiveBattle.desertDrop;
  const near=base.y+base.h+DECISIVE_FORTRESS_APPROACH;
  p.x=WW/2;p.y=near+1;raid.nextPassT=0;updateDecisiveMission(.01)`);
 assert.equal(run('raid.phase'),'warning');
 run('updateDecisiveMission(.01);p.y=near;drop.remaining=1;updateDecisiveMission(.01)');
 assert.equal(run('raid.phase'),'done');
 assert.equal(run('raid.plane'),null);
 assert.ok(run('drop.remaining<1'));
 run('p.y=near+100;raid.nextPassT=0;updateDecisiveMission(.1)');
 assert.equal(run('raid.phase'),'done');
 assert.equal(run('raid.plane'),null);
});
test('desert bomber collisions stop both missions and preserve another aircraft in formation',()=>{
 const {run}=start();completeFacility(run);
 run(`p.y=decisiveBattle.assaultStartY-500;updateDecisiveMission(.01);
  const raid=mission.enemyAirRaid;
  raid.phase='flight';raid.plane={x:340,y:p.y-60,age:0,drops:0,drop:0};
  decisiveBattle.desertDrop.plane={x:620,y:p.y-60,drops:0};
  reinforcementPass={x:480,y:p.y+60,offsets:[-140,140],drops:0};
  updateDecisiveAircraftCollisions(.1);
 `);
 assert.ok(run('raid.plane.collision&&raid.plane.falling&&!reinforcementPass&&!decisiveBattle.desertDrop.plane'));
 run('updateDecisiveAircraftCollisions(.9);updateEnemyBomber(.9)');
 assert.equal(run('raid.wrecks.length'),4);
 assert.equal(run('raid.wrecks.filter(w=>w.friendly).length'),2);
 assert.equal(run('raid.bombs.length'),0);
 run(`raid.plane={x:340,y:p.y-35};reinforcementPass={x:480,y:p.y+35,offsets:[-140,140]};
  updateDecisiveAircraftCollisions(.016)`);
 assert.deepEqual(Array.from(run('reinforcementPass.offsets')),[140]);
});
test('desert truck probability is per sector and destroyed sandbags retain their ground mark',()=>{
 const {run,c}=start();completeFacility(run);
 c.desertRolls=[.249999,.5,.25,.99,.99,.99];
 run(`roadTruckEvents=[];const addTruck=addRoadTruckEvent;
  addRoadTruckEvent=(road,dir)=>addTruck(road,dir,()=>.99);
  try{(function(R){return ${run('setupDecisiveDesertRoadTrucks.toString()')}})(()=>desertRolls.shift()??.99)();}
  finally{addRoadTruckEvent=addTruck;}`);
 assert.equal(run('roadTruckEvents.length'),1);
 assert.ok(run(`(()=>{
  const t=roadTruckEvents[0];return t.decisiveZone===ZONES[DECISIVE_DESERT_START]&&roadBands.includes(t.road)&&
   !covers.some(c=>decisiveRectsOverlap(t.road,c));
 })()`));
 run(`const bag=covers.find(c=>c.decisiveKind==='sandbags'&&c.y<decisiveBattle.border);
  const mark=buildingGroundMarks.find(m=>Math.abs(m.x-bag.x)<4&&Math.abs(m.y-bag.y)<4);
  carve(bag.x+bag.w/2,bag.y+bag.h/2,230,false,null);`);
 assert.ok(run('mark&&buildingGroundMarks.includes(mark)&&!covers.includes(bag)'));
});
test('six fortress mounts traverse independently and the south mounts fire beyond the hull',()=>{
 const {run}=start();completeFacility(run);
 assert.equal(run('decisiveBattle.fortressGuns.length'),6);
 for(const [x,y,side] of [[.5,1.5,'south'],[-.24,.7,'west'],[1.24,.7,'east']]){
  assert.equal(run(`(()=>{
   for(const gun of decisiveBattle.fortressGuns){gun.gunShotAt=undefined;gun.gunAim=gun.neutral;}
   los=()=>true;allies=[];bullets=[];
   p.x=base.x+base.w*${x};p.y=base.y+base.h*${y};
   decisiveBattle.fortressCd=0;updateDecisiveFortress(.1);
   const gun=decisiveBattle.fortressGuns.find(q=>q.gunShotAt!==undefined),shot=bullets[0];
   return !!gun&&!!shot&&bullets.length===1&&!circleHitsBase(shot.x,shot.y,2)&&shot.k===(${JSON.stringify(side)}==='south'?'v':'c')&&
    (${JSON.stringify(side)}==='south'?gun.y>.85:${JSON.stringify(side)}==='west'?gun.x<.2:gun.x>.8);
  })()`),true,side);
 }
});
test('tank support starts below view only when a working tank is unavailable and lands one usable tank',()=>{
 const {run}=start();completeFacility(run);
 run(`p.x=WW/2;p.y=base.y+base.h+400;reinforcementPass=null;
  covers=[];objects=[];water=[];humans=[];allies=[];etanks=[];
  cars=[{x:p.x+120,y:p.y,t:TYPES[0],kind:'tank',f:25}];rebuildSpatialGrid();
  updateDecisiveTankDrop(decisiveBattle,1)`);
 assert.equal(run('reinforcementPass'),null);
 run('cars=[];updateDecisiveTankDrop(decisiveBattle,1)');
 assert.ok(run('reinforcementPass.cargoFlight&&reinforcementPass.y>frontlineView().y+H&&TYPES.includes(reinforcementPass.tankCargo.t)'));
 run('updateReinforcementPass(10)');
 assert.ok(run('decisiveBattle.tankCargo&&cars.length===0&&allies.length===0'));
 run('updateDecisiveTankDrop(decisiveBattle,2.6)');
 assert.ok(run('cars.length===1&&cars[0].c===cars[0].t.cmax&&cars[0].f===cars[0].t.fmax&&!decisiveBattle.tankCargo'));
 run('updateDecisiveTankDrop(decisiveBattle,5)');
 assert.equal(run('reinforcementPass'),null);
});
test('fortress drive follows signed movement and stops at a blocked step',()=>{
 const {run}=start();completeFacility(run);
 assert.ok(run('updateDecisiveFortress(.1);decisiveBattle.fortressTravel>0'));
 assert.ok(run(`(()=>{
  const travel=decisiveBattle.fortressTravel;
  p.x=base.x+base.w/2;p.y=base.y+100;updateDecisiveFortress(.1);
  if(decisiveBattle.fortressTravel!==travel)return false;
  p.y=base.y+base.h+500;decisiveBattle.fortressDir=-1;updateDecisiveFortress(.1);
  return decisiveBattle.fortressTravel<travel;
 })()`));
});
test('roof guns alternate and their marked arc lands at the original aim point',()=>{
 const {run}=start();completeFacility(run);
 run(`p.x=base.x+base.w*.6;p.y=base.y+base.h+500;p.dig=0;debugMode=0;debugInvincible=false;decisiveBattle.roofShell=null;decisiveBattle.roofNext=0;
  decisiveBattle.roofCd=0;updateDecisiveRoofGuns(base,decisiveBattle,0)`);
 assert.equal(run('decisiveBattle.roofNext'),1);
 assert.equal(run('decisiveBattle.roofShell.targetX'),run('p.x'));
 assert.equal(run('decisiveBattle.roofShell.x'),run('base.x+base.w*DECISIVE_ROOF_TURRETS[0][0]'));
 assert.notEqual(run('decisiveBattle.roofGuns[0].gunAim'),run('decisiveBattle.roofGuns[1].gunAim'));
 run('const originalHp=p.hp;p.x+=100;updateDecisiveRoofShell(decisiveBattle,DECISIVE_ARC_TIME/2)');
 assert.ok(run('decisiveBattle.roofShell'));
 run('updateDecisiveRoofShell(decisiveBattle,DECISIVE_ARC_TIME/2)');
 assert.equal(run('decisiveBattle.roofShell'),null);
 assert.equal(run('p.hp'),run('originalHp'));
 run('decisiveBattle.roofCd=0;updateDecisiveRoofGuns(base,decisiveBattle,2000);updateDecisiveRoofShell(decisiveBattle,DECISIVE_ARC_TIME)');
 assert.equal(run('decisiveBattle.roofNext'),0);
 assert.equal(run('p.hp'),run('originalHp-.5'));
});
test('fortress door opens, releases a single blue soldier and closes',()=>{
 const {run}=start();completeFacility(run);
 run(`p.x=base.x+base.w/2;p.y=base.y+base.h+300;humans=[];allies=[];etanks=[];cars=[];covers=[];objects=[];water=[];rebuildSpatialGrid();
  decisiveBattle.doorCd=0;updateDecisiveFortressDoor(base,decisiveBattle,.1)`);
 assert.equal(run('decisiveBattle.door.index'),0);
 run('updateDecisiveFortressDoor(base,decisiveBattle,.5)');
 assert.equal(run('humans.length'),0);
 run('updateDecisiveFortressDoor(base,decisiveBattle,.3)');
 assert.equal(run('humans.length'),1);
 assert.equal(run('humans[0].commander'),'blue');
 assert.equal(run('humans[0].y'),run('base.y+base.h+12'));
 run('updateDecisiveFortressDoor(base,decisiveBattle,.6)');
 assert.equal(run('humans.length'),1);
 assert.equal(run('decisiveBattle.door'),null);
});
test('starting an existing stage clears decisive state and preserves its normal map and mission rules',()=>{
 const {run}=start();run("stageMode='beginner';reset(false)");assert.equal(run('decisiveBattle'),null);assert.equal(run('isDecisiveStage()'),false);assert.equal(run('currentStageId()'),'beginner');assert.equal(run('ZONES.length'),5);assert.equal(run('ZONES.some(z=>z.n==="砂漠")'),false);assert.equal(run('base.maxHp'),30);assert.equal(run('mission'),null);
 run("stageMode='front';frontlineBeginner=false;reset(false)");assert.equal(run('decisiveBattle'),null);assert.equal(run('mission.points.length'),3);assert.equal(run('currentStageId()'),'front');assert.ok(run('allies.length>0'));
});
test('decisive sprites, stage preview and script exist without new per-frame image loading',()=>{
 const src=fs.readFileSync(path.join(root,'js/decisive.js'),'utf8');for(const name of ['fortress','bunker','sandbags','desert','bunker-barrel'])assert.ok(fs.statSync(path.join(root,'assets/decisive',name+'.webp')).size<16000);assert.ok(fs.statSync(path.join(root,'assets/ui/stages/decisive.webp')).size<16000);assert.doesNotMatch(src.slice(src.indexOf('function updateDecisiveMission')),/makeAssetImage\(/);
 for(const [name,limit] of [['fortress-hull',120000],['fortress-gear',10000]])assert.ok(fs.statSync(path.join(root,'assets/decisive',name+'.webp')).size<limit);
});
test('adobe doors deploy blue infantry and stay disabled after damage to their entrance',()=>{
 const {run}=start(11);
 run(`const town=ZONES[2],building=covers.find(c=>c.desertTownDoor&&zoneAt(c.y)===town);
  covers=[building];humans=[];etanks=[];cars=[];objects=[];water=[];rebuildSpatialGrid();
  p.x=WW/2;p.y=town.y0-10;
  setupDesertTownEvents();const door=building.desertTownDoor;`);
 assert.ok(run('door.remaining>=2.5&&door.remaining<=5'));
 run("carve(building.x+20,building.y+20,34,false,null);rebuildSpatialGrid();");
 assert.equal(run('door.broken'),false);
 run('door.remaining=.2;updateDesertTownEvents(.02);draw();updateDesertTownEvents(.3);');
 assert.equal(run('humans.length'),1);
 assert.ok(run("humans[0].loop&&humans[0].patrolCover===building&&pOK(humans[0].path,8,true)&&!humans[0].elite&&(!humans[0].commander||humans[0].commander==='blue')"));
 run("carve(door.x+door.w/2,door.y+door.h/2,32,false,null);rebuildSpatialGrid();");
 assert.equal(run('door.broken&&door.elapsed===0'),true);
 run('humans=[];door.remaining=0;updateDesertTownEvents(.5);updateDesertTownEvents(.5);');
 assert.equal(run('humans.length'),0);
});
test('desert town airdrops recur, deploy three white soldiers, and roll commanders individually',()=>{
 const {run}=start();
 run(`const town=ZONES[2],drop=desertTownEvents.drop,rolls=[.1,.4,.8];
  const tickDrop=(function(R){return ${run('updateEnemyParachutePass.toString()')}})(()=>rolls.shift()??.8);
  covers=[];objects=[];humans=[];etanks=[];cars=[];water=[];rebuildSpatialGrid();
  desertTownEvents.doorsByZone.clear();`);
 assert.ok(run('drop.remaining>=45&&drop.remaining<=60'));
 const before=run('drop.remaining');
 run('updateDesertTownEvents(10)');
 assert.equal(run('drop.remaining'),before);
 run('p.y=town.y0-250;drop.remaining=.01;updateDesertTownEvents(.02);');
 assert.ok(run('drop.plane&&drop.plane.targets.length===3&&drop.remaining>=45&&drop.remaining<=60'));
 run('for(let i=0;i<110;i++)tickDrop(drop,.1);draw();');
 assert.equal(run('humans.length'),3);
 assert.ok(run('humans.every(h=>h.elite&&zoneAt(h.y)===town)'));
 assert.equal(run("humans.filter(h=>h.commander==='white').length"),1);
 assert.equal(run('bombs.length+airbombs.length'),0);
 run('drop.remaining=.01;updateDesertTownEvents(.02);');
 assert.ok(run('drop.plane'));
});
test('town sandstorms preserve at least eighty percent enemy opacity',()=>{
 const {run}=start();
 run('sandIntensity=1;sandWeatherZone=ZONES[1];');
 assert.equal(run('sandstormEnemyOpacity()'),.8);
 run('sandWeatherZone={n:"荒野"};');
 assert.equal(run('sandstormEnemyOpacity()'),0);
});
test('an obstructed adobe exit stays closed and retries on its regular timer',()=>{
 const {run}=start(11);
 run(`const town=ZONES[2],building=covers.find(c=>c.desertTownDoor&&zoneAt(c.y)===town);
  const door=building.desertTownDoor,x=door.x+door.w/2;
  p.x=WW/2;p.y=town.y0-10;
  covers=[building,{kd:1,x:x-40,y:building.y+building.h+6,w:80,h:50,decisiveKind:'sandbags'}];
  humans=[];etanks=[];cars=[];objects=[];water=[];rebuildSpatialGrid();door.remaining=.2;
  for(let i=0;i<180;i++)updateDesertTownEvents(1/60);`);
 assert.equal(run('door.elapsed'),0);
 assert.equal(run('humans.length'),0);
 assert.ok(run('door.remaining>0&&door.remaining<=2.3'));
 run('covers=[building];rebuildSpatialGrid();door.remaining=.2;updateDesertTownEvents(.02);updateDesertTownEvents(.15);');
 assert.equal(run('humans.length'),0);
 run(`const crops=[];g.drawImage=(...args)=>crops.push(args);drawPointInView=()=>true;
  drawDesertTownDoors(0,0);`);
 assert.ok(run('crops.some(([im,,,,,,,w,h])=>im===COVER_IMG["decisive_"+door.kind]&&w>0&&w<door.w&&h===door.h)'));
 run('updateDesertTownEvents(.16);');
 assert.equal(run('humans.length'),1);
 run('humans=[];door.remaining=.2;door.elapsed=0;updateDesertTownEvents(.02);updateDesertTownEvents(.31);');
 assert.equal(run('door.departed'),2);
 assert.equal(run('humans.length'),1);
 run('humans=[];door.elapsed=0;door.remaining=0;updateDesertTownEvents(.5);updateDesertTownEvents(.5);');
 assert.equal(run('humans.length'),0);
});
test('every desert town section adds four ordinary blue guards on clear building loops',()=>{
 const check=(run,count)=>assert.ok(run(`(()=>{
  const guards=humans.filter(h=>h.desertTownPatrol);
  return guards.length===${count}&&ZONES.filter(z=>z.n==='砂漠街').every(z=>{
   const group=guards.filter(h=>zoneAt(h.y)===z);
   return group.length===4&&group.every((h,i)=>h.alive&&!h.elite&&!h.commander&&h.loop&&
    h.buildingPatrol&&covers.includes(h.patrolCover)&&pOK(h.path,8,true)&&
    !hitsM(h.x,h.y,10)&&h.path.every(q=>zoneAt(q.y)===z)&&
    group.slice(0,i).every(other=>D(h,other)>=32));
  });
 })()`));
 for(const seed of [3,5,9])check(start(seed).run,20);
 const {run}=createGameEngine(root);
 run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='砂漠街';reset(false)");
 check(run,4);
});

test('desert town lake can appear in any of the five sections while the facility and dry side stay clear',()=>{
 const {run}=createGameEngine(root);
 for(let index=0;index<5;index++){
  run(`{setupDecisiveZones();water=[];
   const zones=ZONES.slice(1,DECISIVE_DESERT_START),rolls=[.499,.5,.499,.5,.499,(${index}+.5)/5];
   (function(R){return ${run('setupDesertTownConditions.toString()')}})(()=>rolls.shift()??.99)(zones);}`);
  assert.equal(run('water.length'),1);
  assert.equal(run(`zoneAt(water[0].y*MAP_SCALE).decisiveArea`),index+1);
  assert.ok(run(`water[0].x+water[0].w<=WW-152&&
   ZONES.slice(1,DECISIVE_DESERT_START).every((z,i)=>z.desertTownStorm===(i%2===0))`));
  if(index===4)assert.ok(run('water[0].y*MAP_SCALE>=ZONES[5].y1+770'));
 }
});
