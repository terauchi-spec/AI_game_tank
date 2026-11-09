const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function start(seed=7){const h=createGameEngine(root,{seed});h.run("stageMode='escapeTest';areaDebugEnabled=false;skill='throw';reset(false)");return h;}
test('escape test selection is developer-only and does not change the ten official stages',()=>{
 const h=createGameEngine(root);assert.equal(h.run('STAGE_ORDER.length'),10);
 assert.equal(h.run("setSelectedStage('escapeTest')"),false);
 h.run('setDeveloperMode(true)');assert.equal(h.run("setSelectedStage('escapeTest')"),true);
 assert.equal(h.nodes.get('stageDeploy').textContent,'脱出（テスト）で出撃');
 h.run("state='stage';selectedSkillId='throw'");assert.equal(h.run('deploySelectedStage()'),true);assert.equal(h.run('stageMode'),'escapeTest');assert.equal(h.run('areaDebugEnabled'),false);
 h.run('setDeveloperMode(false)');assert.equal(h.run('selectedStageId'),null);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/data-stage="escapeTest" hidden/);
});
test('five contiguous jungle areas reuse normal combat and terrain, with safe start and EXIT',()=>{
 const variants=new Set();
 for(const seed of [1,7,13,31,91]){
  const h=start(seed);assert.equal(h.run('ZONES.length'),5);
  assert.equal(h.run("ZONES.every((z,i)=>z.n==='密林'&&z.y0-z.y1===2400&&(i===0||ZONES[i-1].y1===z.y0))"),true);
  assert.equal(h.run('zoneAt(p.y)===ZONES[0]'),true);assert.equal(h.run('zoneAt(mission.exit.y)===ZONES[4]'),true);
  assert.equal(h.run('inWaterAt(mission.exit.x,mission.exit.y)||hitsC(mission.exit.x,mission.exit.y,90)||hitsM(p.x,p.y,8)'),false);
  assert.equal(h.run('areaDebugEnabled||debugInvincible||cars.some(v=>v.debugInfinite)'),false);
  assert.equal(h.run('cars.length'),1);assert.equal(h.run('humans.length'),45);assert.equal(h.run('etanks.length'),10);
  assert.equal(h.run('ZONES.every(z=>z.jungleDensity.trees>5&&z.jungleDensity.grass>20)'),true);
  assert.equal(h.run('ZONES.every(z=>!z.escapeRiver||z.escapeRiver.h>=150&&z.escapeRiver.h<=250&&z.escapeRiver.bridge===null)'),true);
  assert.equal(h.run('ZONES.every(z=>!z.oasis||z.oasis.sizeScale>=.2&&z.oasis.sizeScale<=1.5&&water.includes(z.oasis))'),true);
  assert.equal(h.run("ZONES.every(z=>covers.filter(c=>c.jungleAsset==='fern_tree'&&zoneAt(c.y+c.h/2)===z).length>=2)"),true);
  assert.equal(h.run("covers.some(c=>c.kd===6&&water.some(w=>!w.oasis&&circleHitsRect(c.x+c.w/2,c.y+c.h/2,0,w)))"),true);
  assert.equal(h.run("bushes.some(b=>water.some(w=>!w.oasis&&circleHitsRect(b.x+b.w/2,b.y+b.h/2,0,w)))"),true);
  assert.equal(h.run('bridges.length'),0);
  assert.equal(h.run("ZONES.every(z=>humans.filter(h=>h.commander==='blue'&&zoneAt(h.y)===z).length===1)"),true);
  variants.add(h.run('ZONES.map(z=>Number(!!z.escapeRiver)+2*Number(!!z.oasis)).join()'));
  assert.equal(h.run('ZONES.every(z=>z.jungleCoreLayout)&&covers.filter(c=>c.jungleCore).length>=3'),true);
  assert.equal(h.run('ZONES.every(z=>{for(let y=z.y1+32;y<Math.min(p.y,z.y0)-40;y+=8)if(hitsC(jungleRouteX(z,y),y,28))return false;return true;})'),true);
  h.run('draw();for(let i=0;i<120;i++)update(1/60);p.x=mission.exit.x;p.y=mission.exit.y;cam=p.y-300;draw()');
  assert.equal(h.run('state'),'play');
 }
 assert.ok(variants.size>1);
});
test('EXIT requires five uninterrupted seconds on foot, resets outside, and finalizes exactly once without saving',()=>{
 const h=start(),before=Array.from(h.storage.entries());h.run('recordStageSortie(scoreStats);p.x=mission.exit.x;p.y=mission.exit.y;updateMission(4.9)');
 assert.equal(h.run('state'),'play');assert.equal(h.run('mission.escapeProgress'),4.9);
 h.run('p.x+=INDOOR_EXIT_RADIUS+1;updateMission(.2)');assert.equal(h.run('mission.escapeProgress'),0);
 h.run('p.x=mission.exit.x;p.tank=cars[0];updateMission(5)');assert.equal(h.run('mission.escapeProgress'),0);
 h.run("p.tank=null;state='briefing';updateMission(5)");assert.equal(h.run('mission.escapeProgress'),0);
 h.run("p.y=0;state='play';updateMission(.1)");assert.equal(h.run('mission.index'),4);h.run('p.y=mission.exit.y;updateMission(5)');assert.equal(h.run('state'),'succeeded');assert.equal(h.run('scoreStats.final.cleared'),true);
 assert.equal(h.run('scoreStats.awards.disabled&&scoreStats.debugUsed'),true);assert.equal(h.run('scoreStats.objectiveProgress'),1);
 const final=h.run('scoreStats.final');h.run('updateMission(5);finalizeScore(true);draw()');assert.equal(h.run('scoreStats.final'),final);
 assert.deepEqual(Array.from(h.storage.entries()),before);
});
test('test failure cannot save records and returning to a normal stage clears the escape mission',()=>{
 const h=start(),before=Array.from(h.storage.entries());h.run("p.hp=0;updateMission(5);finalizeScore(false)");assert.equal(h.run('scoreStats.final.cleared'),false);assert.deepEqual(Array.from(h.storage.entries()),before);
 h.run("stageMode='beginner';reset(false);draw();update(1/60)");assert.equal(h.run('!!mission?.escapeTest'),false);assert.equal(h.run("ZONES.some(z=>z.escapeArea!==undefined)"),false);assert.equal(h.run('!!scoreStats.escapeTest'),false);
});
test('shared river and lake generators retain legacy probability boundaries, sizes and random draw counts',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),river=html.slice(html.indexOf('function rollRiverCrossing('),html.indexOf('function reset(',html.indexOf('function rollRiverCrossing(')));
 const canyon=fs.readFileSync(path.join(root,'js/canyon.js'),'utf8'),lake=canyon.slice(canyon.indexOf('function rollWildernessLake('),canyon.indexOf('function buildCanyonZones('));
 function run(code,seq){let draws=0;const c={WW:960,WH:12800,Math,R:()=>{if(draws>=seq.length)throw Error('unexpected random draw');return seq[draws++];},water:[],bridges:[]};vm.createContext(c);const value=vm.runInContext(code,c);return {value:JSON.parse(JSON.stringify(value)),draws,c};}
 assert.equal(run(river+'rollRiverCrossing(5000)',[.75]).value,null);assert.equal(run(lake+'rollWildernessLake({y1:1000,y0:3400})',[.55]).value,null);
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
  assert.equal(h.run("ZONES.every(z=>humans.filter(h=>h.commander==='blue'&&zoneAt(h.y)===z).length===1)"),true,'commander seed '+seed);
  assert.equal(h.run('covers.filter(c=>JUNGLE_BUILDING_KEYS.includes(c.jungleAsset)).length<=5'),true);
  assert.equal(h.run('ZONES.every(z=>covers.filter(c=>JUNGLE_BUILDING_KEYS.includes(c.jungleAsset)&&zoneAt(c.y+c.h/2)===z).length<=2)'),true);
  for(const n of h.run('ZONES.map(z=>z.jungleBuildingKeys.length)'))planned.add(n);
  for(const key of h.run('covers.filter(c=>JUNGLE_BUILDING_KEYS.includes(c.jungleAsset)).map(c=>c.jungleAsset)'))buildingTypes.add(key);
  assert.equal(h.run('ZONES.every(z=>!z.escapeRiver||!z.oasis||z.oasis.y+z.oasis.h+80<=z.escapeRiver.y+1e-7||z.oasis.y>=z.escapeRiver.y+z.escapeRiver.h+80-1e-7)'),true,'banks seed '+seed);
  assert.equal(h.run('mud.length<=5&&mud.every(m=>m.w>=105&&m.w<=260&&m.h>=48&&m.h<=106&&!water.some(w=>ov2(m,w,50))&&!bridges.some(w=>ov2(m,w,50))&&!covers.some(c=>ov2(m,coverSpriteRect(c)||c,5)))'),true,'mud seed '+seed);
  assert.equal(h.run('inWaterAt(mission.exit.x,mission.exit.y,90)||inMudAt(mission.exit.x,mission.exit.y,90)||hitsC(mission.exit.x,mission.exit.y,90)||inSlowTerrainAt(p.x,p.y,8)||hitsM(p.x,p.y,8)'),false,'start/exit seed '+seed);
  lakesWithRivers+=h.run('ZONES.filter(z=>z.escapeRiver&&z.oasis).length');ponds+=h.run('mud.length');
  trails+=h.run('roadBands.length');assert.equal(h.run("roadBands.length<=5&&roadBands.every(r=>r.kind==='dirt'&&r.lanes===1&&r.h===96&&!water.some(w=>ov2(r,w,60))&&!mud.some(m=>ov2(r,m,24)))"),true);
  h.run('for(const r of roadBands){const cache=roadVisualCache(r);if(!cache||cache!==roadVisualCache(r))throw Error("trail cache not reused");}');
  assert.equal(h.run('roadTruckEvents.length===roadBands.length&&roadTruckEvents.every(t=>roadBands.includes(t.road)&&t.state==="waiting")'),true);
  assert.equal(h.run('roadTruckEvents.every(t=>!covers.some(c=>segmentHitsCover({x:0,y:t.y},{x:WW,y:t.y},c,ROAD_TRUCK_HALF_WIDTH)))'),true);
  lakeTrees+=h.run("covers.filter(c=>c.kd===6&&water.some(w=>w.oasis&&oasisContains(w,c.x+c.w/2,c.y+c.h/2))).length");
  lakeGrass+=h.run("bushes.filter(b=>water.some(w=>w.oasis&&oasisContains(w,b.x+b.w/2,b.y+b.h/2))).length");
  if(seed<=3)h.run('for(const w of water){cam=Math.max(0,w.y-100);draw()}for(const m of mud){cam=m.y-100;draw()}');
  if(h.run('mud.length>0')){
   h.run('globalThis.m=mud[0];p.x=m.x+m.w/2;p.y=m.y+m.h/2;p.tank=null');
   assert.equal(h.run('terrainMoveScale(p,1,0,8)'),.3);h.run('p.tank=cars[0]');assert.equal(h.run('terrainMoveScale(p,1,0,8)'),.6);
  }
 }
 assert.deepEqual([...planned].sort(),[0,1,2]);assert.equal(buildingTypes.size,4);assert.ok(lakesWithRivers>20&&ponds>10&&trails>50&&lakeTrees>0&&lakeGrass>0);
});
test('large overlapping lake is relocated without changing dimensions or bridge/current geometry',()=>{
 const h=start();h.run("water=[{x:0,y:2075,w:300,h:250,flowDir:-1,flowSpeed:12},{x:500,y:2075,w:460,h:250,flowDir:-1,flowSpeed:12}];bridges=[{x:300,y:2075,w:200,h:250}];globalThis.river={x:0,y:2075,w:960,h:250,bridge:bridges[0]};globalThis.pond={x:-120,y:1650,w:1200,h:1020,sizeScale:1.5};separateJungleLake({y1:1000,y0:3400},river,pond)");
 assert.equal(h.run('pond.w===1200&&pond.h===1020&&pond.sizeScale===1.5&&pond.y>=1220&&pond.y+pond.h<=3050'),true);
 assert.equal(h.run('pond.y+pond.h+80<=river.y+1e-7||pond.y>=river.y+river.h+80-1e-7'),true);
 assert.equal(h.run('water.every(w=>w.y===river.y&&w.h===250&&w.flowDir===-1&&w.flowSpeed===12)&&bridges[0].y===river.y&&bridges[0].h===250'),true);
});
test('jungle rivers retain their 150–250px width distribution and never generate bridges',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),source=html.slice(html.indexOf('function rollRiverCrossing('),html.indexOf('function reset(',html.indexOf('function rollRiverCrossing(')));
 let seed=7;const c={WW:960,Math,water:[],bridges:[],R:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)};vm.createContext(c);vm.runInContext(source,c);
 let total=0,narrow=0;
 for(let i=0;i<3000;i++){
  c.water=[];c.bridges=[];const r=c.rollRiverCrossing(5000,{jungle:true});if(!r)continue;
  total++;if(r.h<200)narrow++;
  assert.ok(r.h>=150&&r.h<=250);assert.equal(r.bridge,null);assert.equal(c.bridges.length,0);
  assert.equal(c.water.length,1);assert.equal(c.water[0].w,960);
 }
 assert.ok(total/3000>.71&&total/3000<.79);
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
