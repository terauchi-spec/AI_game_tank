const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function start(seed=7){const h=createGameEngine(root,{seed});h.run("stageMode='escapeTest';areaDebugEnabled=false;skill='throw';reset(false)");return h;}
const previousStages=['beginner','indoorBeginner','frontBeginner','rescueBeginner','baseIntermediate','indoor','frontIntermediate'];
function unlockRescue(h,advanced=false){
 const cleared=advanced?[...previousStages,'escapeTest','base','indoorLab','front']:previousStages;
 h.storage.set('tankGameStageProgressV1',JSON.stringify({version:4,cleared,unlocked:[]}));
}
test('both rescue missions are selectable and deploy through the public stage menu after their prerequisites',()=>{
 const h=createGameEngine(root);
 const css=fs.readFileSync(path.join(root,'css/developer.css'),'utf8');
 assert.doesNotMatch(css,/\[data-stage=["']escapeTest["']\]/);
 assert.equal(h.run('STAGE_ORDER.length'),13);
 for(const [id,name,mode] of [['escapeTest','救出（中級）','escapeTest'],['rescueAdvancedTest','救出（上級）','indoor']]){
  assert.equal(h.run(`setSelectedStage('${id}')`),false);
  unlockRescue(h,id==='rescueAdvancedTest');
  assert.equal(h.run(`setSelectedStage('${id}')`),true);
  assert.equal(h.nodes.get('stageDeploy').textContent,name+'で出撃');
  h.run("state='stage';selectedSkillId='throw';gameBuildQueued=false");
  assert.equal(h.run('deploySelectedStage()'),true);
  assert.equal(h.run('stageMode'),mode);
  assert.equal(h.run('currentStageId()'),id);
 }
});
test('five contiguous jungle areas reuse normal combat and terrain, with safe start and EXIT',()=>{
 const variants=new Set();
 for(const seed of [1,7,13,31,91]){
  const h=start(seed);assert.equal(h.run('ZONES.length'),7);
  assert.equal(h.run("ZONES[0].n==='草原'&&ZONES[6].n==='草原'&&ZONES.every((z,i)=>i===0||ZONES[i-1].y1===z.y0)"),true);
  assert.equal(h.run("covers.filter(c=>c.jungleAsset==='palm'&&zoneAt(c.y+c.h/2)===ZONES[0]).length"),4);
  assert.equal(h.run("roadBands.some(r=>r.kind==='asphalt'&&r.lanes===4&&r.h===320&&r.y+r.h/2===mission.exit.y)"),true);
  assert.equal(h.run("ZONES.slice(1,-1).every(z=>z.n==='密林'&&z.y0-z.y1===2400)"),true);
  assert.equal(h.run('zoneAt(p.y)===ZONES[0]'),true);assert.equal(h.run('zoneAt(mission.exit.y)===ZONES[6]'),true);
  assert.equal(h.run('inWaterAt(mission.exit.x,mission.exit.y)||hitsC(mission.exit.x,mission.exit.y,90)||hitsM(p.x,p.y,8)'),false);
  assert.equal(h.run('areaDebugEnabled||debugInvincible||cars.some(v=>v.debugInfinite)'),false);
  assert.equal(h.run('cars.length'),1);assert.equal(h.run('humans.length'),45);assert.equal(h.run('etanks.length'),10);
  assert.equal(h.run('ZONES.slice(1,-1).every(z=>z.jungleDensity.trees>5&&z.jungleDensity.grass>20)'),true);
  assert.equal(h.run('ZONES.every(z=>!z.escapeRiver||z.escapeRiver.h>=150&&z.escapeRiver.h<=300&&z.escapeRiver.bridge===null)'),true);
  assert.equal(h.run('ZONES.every(z=>!z.oasis||z.oasis.sizeScale>=.2&&z.oasis.sizeScale<=1.5&&water.includes(z.oasis))'),true);
  assert.equal(h.run("ZONES.slice(1,-1).every(z=>covers.filter(c=>c.jungleAsset==='fern_tree'&&zoneAt(c.y+c.h/2)===z).length>=2)"),true);
  assert.equal(h.run("covers.some(c=>c.kd===6&&water.some(w=>!w.oasis&&circleHitsRect(c.x+c.w/2,c.y+c.h/2,0,w)))"),true);
  assert.equal(h.run("bushes.some(b=>water.some(w=>!w.oasis&&circleHitsRect(b.x+b.w/2,b.y+b.h/2,0,w)))"),true);
  assert.equal(h.run('bridges.length'),0);
  assert.equal(h.run("ZONES.slice(1,-1).every(z=>humans.filter(h=>h.commander==='blue'&&zoneAt(h.y)===z).length===1)"),true);
  variants.add(h.run('ZONES.map(z=>Number(!!z.escapeRiver)+2*Number(!!z.oasis)).join()'));
  assert.equal(h.run('ZONES.slice(1,-1).every(z=>z.jungleCoreLayout)&&covers.filter(c=>c.jungleCore).length>=3'),true);
  assert.equal(h.run('ZONES.slice(1,-1).every(z=>{for(let y=z.y1+32;y<Math.min(p.y,z.y0)-40;y+=8)if(hitsC(jungleRouteX(z,y),y,28))return false;return true;})'),true);
  h.run('draw();for(let i=0;i<120;i++)update(1/60);p.x=mission.exit.x;p.y=mission.exit.y;cam=p.y-300;draw()');
  assert.equal(h.run('state'),'play');
 }
 assert.ok(variants.size>1);
});
test('EXIT requires five uninterrupted seconds on foot, resets outside, and finalizes exactly once and records a public clear',()=>{
 const h=start();unlockRescue(h);h.run('recordStageSortie(scoreStats);p.x=mission.exit.x;p.y=mission.exit.y;updateMission(5)');
 assert.equal(h.run('state'),'play');assert.equal(h.run('mission.escapeProgress'),0);
 h.run('Object.assign(mission.vip,mission.exit);updateMission(4.9)');
 assert.equal(h.run('mission.escapeProgress'),4.9);
 h.run('mission.vip.x+=INDOOR_EXIT_RADIUS+1;updateMission(.2)');
 assert.equal(h.run('mission.escapeProgress'),0);
 h.run('Object.assign(mission.vip,mission.exit);updateMission(4.9)');
 h.run('p.x+=INDOOR_EXIT_RADIUS+1;updateMission(.2)');assert.equal(h.run('mission.escapeProgress'),0);
 h.run('p.x=mission.exit.x;p.tank=cars[0];updateMission(5)');assert.equal(h.run('mission.escapeProgress'),0);
 h.run("p.tank=null;state='briefing';updateMission(5)");assert.equal(h.run('mission.escapeProgress'),0);
 h.run("p.y=0;state='play';updateMission(.1)");assert.equal(h.run('mission.index'),6);h.run('p.y=mission.exit.y;updateMission(5);draw()');
 assert.equal(h.run('state'),'indoorEscape');assert.equal(h.run('mission.extraction.carX<mission.extraction.stopX'),true);
 h.run('updateInfiltrationExtraction(2.8);draw()');assert.equal(h.run('state'),'succeeded');assert.equal(h.run('mission.extraction.vip.boarded'),true);
 h.run('updateInfiltrationExtraction(1.8)');assert.equal(h.run('mission.extraction.phase'),'departed');assert.equal(h.run('scoreStats.final.cleared'),true);
 assert.equal(h.run('scoreStats.awards.disabled||scoreStats.debugUsed'),false);assert.equal(h.run('scoreStats.objectiveProgress'),1);
 const final=h.run('scoreStats.final');h.run('updateMission(5);finalizeScore(true);draw()');assert.equal(h.run('scoreStats.final'),final);
 assert.equal(h.run('readStageRecords().stages.escapeTest.successes'),1);
 assert.equal(h.run("stageSelectable('base')"),true);
});
test('VIP follows unarmed, rejoins from below without healing, and takes enemy fire',()=>{
 const h=start();
 assert.equal(h.run('mission.vip.hp'),3);
 h.run('p.y-=100;globalThis.before=D(p,mission.vip);for(let i=0;i<55;i++)updateEscapeVip(1/60)');
 assert.ok(h.run('D(p,mission.vip)<before'));
 assert.equal(h.run('bullets.length'),0);
 h.run("mission.vip.hp=2;mission.vip.y=0;recallEscapeVip(mission.vip)");
 assert.equal(h.run('mission.vip.hp'),2);
 assert.ok(h.run('mission.vip.y>=frontlineView().y+H-48'));
 h.run("p.x=400;p.y=12600;Object.assign(mission.vip,{x:520,y:12600,hp:3});p.dig=2;globalThis.enemy={x:545,y:12600};humans=[enemy];etanks=[];covers=[];objects=[];rebuildSpatialGrid()");
 assert.equal(h.run("findDetectedTarget(enemy,Math.PI).key"),'escapeVip');
 assert.equal(h.run("targetObj('escapeVip')===mission.vip"),true);
 h.run('humans=[]');
 for(let remaining=2;remaining>=0;remaining--){
  h.run("fire(mission.vip.x+16,mission.vip.y,Math.PI,'e','r',600,240);update(.033)");
  assert.equal(h.run('mission.vip.hp'),remaining);
 }
 assert.equal(h.run('state'),'failed');
 assert.equal(h.run('scoreStats.final.cleared'),false);
 assert.equal(h.run("targetObj('escapeVip')"),null);
});
test('VIP waits 0.6 seconds before following at 70 percent speed',()=>{
 const h=start();
 h.run('p.y-=100;globalThis.from={x:mission.vip.x,y:mission.vip.y};for(let i=0;i<36;i++)updateEscapeVip(1/60)');
 assert.equal(h.run('D(from,mission.vip)'),0);
 h.run('updateEscapeVip(.1)');
 assert.ok(h.run('Math.abs(D(from,mission.vip)-212*.7*.1)<1e-7'));
 h.run('Object.assign(mission.vip,partnerFollowGoal(36));updateEscapeVip(.1);p.y-=50;Object.assign(from,mission.vip);updateEscapeVip(.59)');
 assert.equal(h.run('D(from,mission.vip)'),0);
 h.run('updateEscapeVip(.02)');
 assert.ok(h.run('Math.abs(D(from,mission.vip)-212*.7*.01)<1e-7'));
});
test('VIP waits again when the player restarts before the VIP catches up',()=>{
 const h=start();
 h.run('p.y-=150;updateEscapeVip(.61);updateEscapeVip(.1)');
 assert.equal(h.run('mission.vip.moving'),true);
 h.run('p.y-=50;globalThis.restart={x:mission.vip.x,y:mission.vip.y};updateEscapeVip(.59)');
 assert.equal(h.run('D(restart,mission.vip)'),0);
 h.run('updateEscapeVip(.02)');
 assert.ok(h.run('Math.abs(D(restart,mission.vip)-212*.7*.01)<1e-7'));
});
test('grass hides the VIP from fresh searches and clears existing pursuit after one second',()=>{
 const h=start();
 h.run(`p.dig=2;Object.assign(mission.vip,{x:520,y:12600});
  globalThis.guard={x:545,y:12600,alive:true,st:1,target:'escapeVip'};
  globalThis.tank={...guard};globalThis.playerGuard={...guard,target:'p'};
  humans=[guard,playerGuard];etanks=[tank];bushes=[];covers=[];objects=[];rebuildSpatialGrid();`);
 assert.equal(h.run("findDetectedTarget(guard,Math.PI).key"),'escapeVip');
 h.run('bushes=[{x:500,y:12580,w:40,h:40}];rebuildSpatialGrid();updateEscapeVipConcealment(mission.vip,.99)');
 assert.equal(h.run('findDetectedTarget(guard,Math.PI)'),null);
 assert.equal(h.run('inheritAlertFromHuman(playerGuard,guard)'),false);
 assert.equal(h.run("guard.target==='escapeVip'&&tank.target==='escapeVip'"),true);
 h.run('updateEscapeVipConcealment(mission.vip,.01)');
 assert.equal(h.run("guard.target===null&&tank.target===null&&playerGuard.target==='p'"),true);
 h.run('bushes=[];rebuildSpatialGrid();updateEscapeVipConcealment(mission.vip,.1);guard._nextDetectAt=0');
 assert.equal(h.run("findDetectedTarget(guard,Math.PI).key"),'escapeVip');
});
test('VIP hearts are drawn in the top right even when the EXIT is off-screen',()=>{
 const h=start();
 const hearts=h.run(`mission.vip.hp=2;cam=WH-H;missionHudNextAt=0;
  globalThis.heartDraws=[];globalThis.realDrawHudHeart=drawHudHeart;
  drawHudHeart=(x,y,fill)=>heartDraws.push([x,y,fill]);
  try{drawEscapeTestMission();}finally{drawHudHeart=realDrawHudHeart;}
  JSON.stringify(heartDraws.map(([x,y,fill])=>[W-x,y,fill]))`);
 assert.deepEqual(JSON.parse(hearts),[[83,61,1],[55,61,1],[27,61,0]]);
 assert.doesNotMatch(h.nodes.get('missionHud').textContent,/[♥♡]/);
});
test('VIP settles behind a stationary player and still enters EXIT at the edge of the circle',()=>{
 const h=start();
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  h.run(`p.body=${angle};Object.assign(mission.vip,{x:p.x+30,y:p.y-30});
   for(let i=0;i<120;i++)updateEscapeVip(1/60)`);
  assert.ok(h.run('D(mission.vip,{x:p.x-Math.cos(p.body)*36,y:p.y-Math.sin(p.body)*36})<=2.01'));
  assert.equal(h.run('mission.vip.moving'),false);
 }
 h.run(`p.x=mission.exit.x+INDOOR_EXIT_RADIUS-2;p.y=mission.exit.y;p.body=Math.PI;
  Object.assign(mission.vip,{x:p.x+40,y:p.y});
  for(let i=0;i<120;i++){updateEscapeVip(1/60);updateMission(1/60);}drawEscapeTestMission()`);
 assert.ok(h.run('mission.escapeProgress>0'));
 assert.match(h.nodes.get('missionHud').textContent,/EXIT：あと/);
 assert.doesNotMatch(h.nodes.get('missionHud').textContent,/要人 ♥/);
});
test('rescue failure records a sortie without a clear, and returning to another stage clears the escape mission',()=>{
 const h=start();unlockRescue(h);h.run("p.hp=0;updateMission(5);finalizeScore(false)");assert.equal(h.run('scoreStats.final.cleared'),false);assert.equal(h.run('readStageRecords().stages.escapeTest.sorties'),1);assert.equal(h.run('readStageRecords().stages.escapeTest.successes'),0);
 h.run("stageMode='beginner';reset(false);draw();update(1/60)");assert.equal(h.run('!!mission?.escapeTest'),false);assert.equal(h.run("ZONES.some(z=>z.escapeArea!==undefined)"),false);assert.equal(h.run('!!scoreStats.escapeTest'),false);
});
test('shared river and lake generators retain legacy probability boundaries, sizes and random draw counts',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),river=html.slice(html.indexOf('function rollRiverCrossing('),html.indexOf('function reset(',html.indexOf('function rollRiverCrossing(')));
 const canyon=fs.readFileSync(path.join(root,'js/canyon.js'),'utf8'),lake=canyon.slice(canyon.indexOf('function rollWildernessLake('),canyon.indexOf('function buildCanyonZones('));
 function run(code,seq){let draws=0;const c={WW:960,WH:12800,Math,R:()=>{if(draws>=seq.length)throw Error('unexpected random draw');return seq[draws++];},water:[],bridges:[]};vm.createContext(c);const value=vm.runInContext(code,c);return {value:JSON.parse(JSON.stringify(value)),draws,c};}
 assert.equal(run(river+'rollRiverCrossing(5000)',[.75]).value,null);assert.equal(run(lake+'rollWildernessLake({y1:1000,y0:3400})',[.55]).value,null);
 assert.equal(run(river+'rollRiverCrossing(5000,{jungle:true,chance:.6,maxWidth:300})',[.6]).value,null);
 assert.equal(run(lake+'rollWildernessLake({y1:1000,y0:3400},.4)',[.4]).value,null);
 assert.equal(run(lake+'rollWildernessLake({y1:1000,y0:3400},.4)',[.399999,.5,.5,.5,.5,.5]).value.sizeScale,.2+.5*1.3);
 for(const n of [0,.5,.999999]){
  const r=run(river+'rollRiverCrossing(5000)',[.749999,n,.25,.5,.5,.5]);assert.equal(r.draws,6);assert.equal(r.value.h,35+Math.pow(n,.72)*565);assert.equal(r.c.water.length,2);assert.equal(r.c.bridges.length,1);assert.equal(r.value.bridge.w,160);
  const l=run(lake+'rollWildernessLake({y1:1000,y0:3400})',[.549999,n,.5,.5,.5,.5]);assert.equal(l.draws,6);assert.equal(l.value.sizeScale,.2+n*1.3);assert.equal(l.value.w,710*l.value.sizeScale);assert.equal(l.value.h,560*l.value.sizeScale);assert.equal(l.value.flowSpeed,0);
 }
});

test('jungle buildings, separate water banks and capped marshes remain safe across random worlds',()=>{
 const planned=new Set(),buildingTypes=new Set();let lakesWithRivers=0,ponds=0,trails=0,lakeTrees=0,lakeGrass=0;
 for(let seed=1;seed<=30;seed++){
  const h=start(seed);
  assert.equal(h.run("covers.some(c=>c.jungleAsset==='watchtower')"),false);
  assert.equal(h.run("ZONES.slice(1,-1).every(z=>humans.filter(h=>h.commander==='blue'&&zoneAt(h.y)===z).length===1)"),true,'commander seed '+seed);
  assert.equal(h.run('covers.filter(c=>JUNGLE_BUILDING_KEYS.includes(c.jungleAsset)).length<=10'),true);
  assert.equal(h.run('ZONES.slice(1,-1).every(z=>covers.filter(c=>JUNGLE_BUILDING_KEYS.includes(c.jungleAsset)&&zoneAt(c.y+c.h/2)===z).length<=4)'),true);
  for(const n of h.run('ZONES.slice(1,-1).map(z=>z.jungleBuildingKeys.length)'))planned.add(n);
  for(const key of h.run('covers.filter(c=>JUNGLE_BUILDING_KEYS.includes(c.jungleAsset)).map(c=>c.jungleAsset)'))buildingTypes.add(key);
  assert.equal(h.run('ZONES.every(z=>!z.escapeRiver||!z.oasis||z.oasis.y+z.oasis.h+80<=z.escapeRiver.y+1e-7||z.oasis.y>=z.escapeRiver.y+z.escapeRiver.h+80-1e-7)'),true,'banks seed '+seed);
  assert.equal(h.run('mud.length<=5&&mud.every(m=>m.w>=105&&m.w<=260&&m.h>=48&&m.h<=106&&!water.some(w=>ov2(m,w,50))&&!bridges.some(w=>ov2(m,w,50))&&!covers.some(c=>ov2(m,coverSpriteRect(c)||c,5)))'),true,'mud seed '+seed);
  assert.equal(h.run('inWaterAt(mission.exit.x,mission.exit.y,90)||inMudAt(mission.exit.x,mission.exit.y,90)||hitsC(mission.exit.x,mission.exit.y,90)||inSlowTerrainAt(p.x,p.y,8)||hitsM(p.x,p.y,8)'),false,'start/exit seed '+seed);
  lakesWithRivers+=h.run('ZONES.filter(z=>z.escapeRiver&&z.oasis).length');ponds+=h.run('mud.length');
  trails+=h.run('roadBands.length-1');assert.equal(h.run("roadBands.length<=6&&roadBands.slice(0,-1).every(r=>r.kind==='dirt'&&r.lanes===1&&r.h===96&&!water.some(w=>ov2(r,w,60))&&!mud.some(m=>ov2(r,m,24)))"),true);
  h.run('for(const r of roadBands){const cache=roadVisualCache(r);if(!cache||cache!==roadVisualCache(r))throw Error("trail cache not reused");}');
  assert.equal(h.run('roadTruckEvents.length===roadBands.length-1&&roadTruckEvents.every(t=>roadBands.includes(t.road)&&t.state==="waiting")'),true);
  assert.equal(h.run('roadTruckEvents.every(t=>!covers.some(c=>segmentHitsCover({x:0,y:t.y},{x:WW,y:t.y},c,ROAD_TRUCK_HALF_WIDTH)))'),true);
  lakeTrees+=h.run("covers.filter(c=>c.kd===6&&water.some(w=>w.oasis&&oasisContains(w,c.x+c.w/2,c.y+c.h/2))).length");
  lakeGrass+=h.run("bushes.filter(b=>water.some(w=>w.oasis&&oasisContains(w,b.x+b.w/2,b.y+b.h/2))).length");
  if(seed<=3)h.run('for(const w of water){cam=Math.max(0,w.y-100);draw()}for(const m of mud){cam=m.y-100;draw()}');
  if(h.run('mud.length>0')){
   h.run('globalThis.m=mud[0];p.x=m.x+m.w/2;p.y=m.y+m.h/2;p.tank=null');
   assert.equal(h.run('terrainMoveScale(p,1,0,8)'),.3);h.run('p.tank=cars[0]');assert.equal(h.run('terrainMoveScale(p,1,0,8)'),.6);
  }
 }
 assert.deepEqual([...planned].sort(),[0,2,4]);assert.equal(buildingTypes.size,4);assert.ok(lakesWithRivers>20&&ponds>10&&trails>50&&lakeTrees>0&&lakeGrass>0);
});
test('large overlapping lake is relocated without changing dimensions or bridge/current geometry',()=>{
 const h=start();h.run("water=[{x:0,y:2075,w:300,h:250,flowDir:-1,flowSpeed:12},{x:500,y:2075,w:460,h:250,flowDir:-1,flowSpeed:12}];bridges=[{x:300,y:2075,w:200,h:250}];globalThis.river={x:0,y:2075,w:960,h:250,bridge:bridges[0]};globalThis.pond={x:-120,y:1650,w:1200,h:1020,sizeScale:1.5};separateJungleLake({y1:1000,y0:3400},river,pond)");
 assert.equal(h.run('pond.w===1200&&pond.h===1020&&pond.sizeScale===1.5&&pond.y>=1220&&pond.y+pond.h<=3050'),true);
 assert.equal(h.run('pond.y+pond.h+80<=river.y+1e-7||pond.y>=river.y+river.h+80-1e-7'),true);
 assert.equal(h.run('water.every(w=>w.y===river.y&&w.h===250&&w.flowDir===-1&&w.flowSpeed===12)&&bridges[0].y===river.y&&bridges[0].h===250'),true);
});
test('escape rivers are 150–300px wide, roll at 60 percent, and never generate bridges',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),source=html.slice(html.indexOf('function rollRiverCrossing('),html.indexOf('function reset(',html.indexOf('function rollRiverCrossing(')));
 let seed=7;const c={WW:960,Math,water:[],bridges:[],R:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)};vm.createContext(c);vm.runInContext(source,c);
 let total=0,narrow=0;
 for(let i=0;i<3000;i++){
  c.water=[];c.bridges=[];const r=c.rollRiverCrossing(5000,{jungle:true,chance:.6,maxWidth:300});if(!r)continue;
  total++;if(r.h<225)narrow++;
  assert.ok(r.h>=150&&r.h<=300);assert.equal(r.bridge,null);assert.equal(c.bridges.length,0);
  assert.equal(c.water.length,1);assert.equal(c.water[0].w,960);
 }
 assert.ok(total/3000>.56&&total/3000<.64);
 assert.ok(narrow/total>.33&&narrow/total<.42);
});


test('both jungle modes alternate rain and squalls with stronger enemy sight loss',()=>{
 const h=createGameEngine(root);
 for(const setup of ["stageMode='escapeTest';areaDebugEnabled=false","stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林'"]){
  h.run(setup+';reset(false)');
  assert.equal(h.run('weatherNext>=5&&weatherNext<=15'),true);
  const seen=new Set();
  for(let i=0;i<12;i++){
   h.run('updateWeather(weatherNext)');
   const type=h.run('weather');
   assert.ok(type==='rain'||type==='squall');
   seen.add(type);
   assert.equal(h.run('weatherT'),type==='squall'?15:30);
   assert.ok(Math.abs(h.run("detectRange('enemy')/DETECT_RANGE_BASE")-(type==='squall'?.45:.75))<1e-10);
   h.run('updateWeather(5);drawWeatherOverlay();updateWeather(weatherT)');
   assert.equal(h.run("weather==='clear'&&rainIntensity===0&&weatherNext>=10&&weatherNext<=20"),true);
  }
  assert.equal(seen.size,2);
 }
 h.run("stageMode='beginner';areaDebugEnabled=false;reset(false)");
 assert.equal(h.run('weatherNext>=15&&weatherNext<=50'),true);
 h.run('updateWeather(weatherNext);updateWeather(30)');
 assert.equal(h.run('weatherNext>=22&&weatherNext<=60'),true);
});

test('escape areas two and four each drop three white soldiers early without bombing or repeating',()=>{
 const h=start(7);
 h.run('updateEscapeTestMission(1)');
 assert.equal(h.run('mission.enemyDrop.next'),0);
 for(const [area,total] of [[1,3],[3,6]]){
  h.run(`p.y=ZONES[${area+1}].y0-160;updateEscapeTestMission(1/60)`);
  assert.equal(h.run('mission.enemyDrop.next'),total/3);
  assert.equal(h.run('mission.enemyDrop.plane.dropY'),h.run('Math.max(frontlineView().y+70,p.y-220)-120'));
  h.run('while(mission.enemyDrop.plane.y<mission.enemyDrop.plane.dropY+120)updateEscapeTestMission(1/60);');
  assert.equal(h.run('mission.enemyDrop.parachutes.length'),3);
  assert.ok(h.run('mission.enemyDrop.parachutes.every(unit=>unit.elite)'));
  assert.equal(h.run("humans.filter(h=>h.escapeParatrooper).length"),total-3);
  h.run('drawEnemyParachutePass(mission.enemyDrop,0,Math.max(0,p.y-H*.6));');
  h.run('for(let i=0;i<400;i++)updateEscapeTestMission(1/60)');
  assert.equal(h.run('humans.filter(h=>h.escapeParatrooper).length'),total);
  assert.ok(h.run('humans.filter(h=>h.escapeParatrooper).every(h=>h.elite&&!hitsM(h.x,h.y,12))'));
  assert.ok(h.run('!mission.enemyDrop.plane&&!mission.enemyDrop.parachutes.length'));
  assert.equal(h.run('bombs.length+airbombs.length'),0);
 }
 h.run('p.y=ZONES[2].y0-160;updateEscapeTestMission(1);p.y=ZONES[4].y0-160;updateEscapeTestMission(1)');
 assert.equal(h.run('humans.filter(h=>h.escapeParatrooper).length'),6);
 assert.equal(h.run('mission.enemyDrop.plane'),null);
});

test('advanced rescue completion saves official stage results and clears',()=>{
 const h=createGameEngine(root,{seed:1771});unlockRescue(h,true);
 h.run(`stageMode='indoor';rescueAdvancedTest=true;reset(false);state='play';
  recordStageSortie(scoreStats);
  const vip=indoorWorld.rescue.vip;
  Object.assign(p,indoorWorld.exit);
  Object.assign(vip,indoorWorld.exit,{freed:true,indoorFloor:1});
  updateMission(5);`);
 assert.equal(h.run('state'),'indoorEscape');
 assert.equal(h.run('scoreStats.final.cleared'),true);
 assert.equal(h.run('scoreStats.awards.disabled'),false);
 assert.equal(h.run('readStageRecords().stages.rescueAdvancedTest.successes'),1);
 assert.equal(h.run("readStageProgress().cleared.includes('rescueAdvancedTest')"),true);
});

test('beginner rescue deploys after beginner capture, uses forest and villages, and saves the shared VIP mission',()=>{
 const h=createGameEngine(root,{seed:13});
 assert.equal(h.run("setSelectedStage('rescueBeginner')"),false);
 h.storage.set('tankGameStageProgressV1',JSON.stringify({version:5,cleared:previousStages.slice(0,3),unlocked:[]}));
 assert.equal(h.run("setSelectedStage('rescueBeginner')"),true);
 h.run("state='stage';selectedSkillId='throw';deploySelectedStage();reset(false);");
 assert.equal(h.run("stageDisplayNumber(currentStageId())"),'04');
 assert.equal(h.run("ZONES.map(z=>z.n).join('/')"),'草原/森林/村/村/草原');
 assert.equal(h.run("ZONES.slice(1,-1).every(z=>humans.some(h=>zoneAt(h.y)===z))"),true);
 assert.equal(h.run("etanks.length===0&&humans.every(h=>!h.commander)&&!mission.enemyDrop"),true);
 assert.equal(h.run("!hitsM(p.x,p.y,10)&&!hitsM(mission.vip.x,mission.vip.y,10)&&!hitsM(mission.exit.x,mission.exit.y,90)"),true);
 assert.equal(h.run(`(()=>{for(let y=mission.exit.y;y<p.y;y+=8)if(hitsM(WW/2,y,16))return false;return true;})()`),true);
 h.run("spawnParachuteAlly(p.x,p.y,p.y,0,true);");
 assert.equal(h.run("allies[0].frontCommander"),false);
 h.run("Object.assign(p,mission.exit);Object.assign(mission.vip,mission.exit);updateMission(5);");
 assert.equal(h.run("state"),'indoorEscape');
 assert.equal(h.run("readStageRecords().stages.rescueBeginner.successes"),1);
 assert.equal(h.run("stageSelectable('baseIntermediate')"),true);
 assert.equal(h.run("readStageRecords().stages.escapeTest.successes"),0);
 h.run("state='stage';localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify({version:5,cleared:STAGE_DISPLAY_ORDER.slice(0,7)}));setSelectedStage('escapeTest');gameBuildQueued=false;deploySelectedStage();reset(false)");
 assert.equal(h.run("rescueBeginner"),false);
 assert.equal(h.run("ZONES.filter(z=>z.n==='密林').length"),5);
 assert.ok(h.run("etanks.length>0&&humans.some(h=>h.commander==='blue')&&!!mission.enemyDrop"));
});

test('outdoor rescue evaluation follows the VIP instead of the player across areas',()=>{
 for(const beginner of [true,false]){
  const h=start(7);
  if(beginner)h.run('rescueBeginner=true;reset(false)');
  h.run("state='play';mission.enemyDrop=null;p.y=mission.exit.y;updateEscapeTestMission(0)");
  assert.equal(h.run('scoreStats.objectiveProgress'),0);
  h.run('mission.vip.y=(ZONES[1].y0+ZONES[1].y1)/2;updateEscapeTestMission(0)');
  assert.equal(h.run('scoreStats.objectiveProgress'),h.run('1/ZONES.length'));
 }
});
