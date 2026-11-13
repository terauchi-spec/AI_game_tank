const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function start(seed=7){
 const e=createGameEngine(root,{seed});
 e.run("localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify({version:2,cleared:STAGE_ORDER.slice(0,-1).map(s=>s.id)}));localStorage.setItem(INTRO_NAME_KEY,'テスト');stageMode='decisive';areaDebugEnabled=false;skillDebugAll=false;stageDebugAll=false;skill='throw';reset(false);recordStageSortie(scoreStats)");return e;
}
test('developer-only 13 preserves its identity through phase change and victory while public completion is already earned',()=>{
 const {run,storage}=start();assert.equal(run('currentStageId()'),'decisive');assert.equal(run('stageDisplayNumber(currentStageId())'),'13');
 assert.equal(run('allies.length'),0);assert.equal(run('p.tank'),null);assert.equal(run('zoneAt(p.y)===ZONES[0]'),true);assert.equal(run('scoreStats.stageRecordId'),'decisive');
 run('humans=[];etanks=[];p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y;for(let i=0;i<15;i++)updateMission(1)');
 assert.equal(run('decisiveBattle.phase'),'assault');assert.equal(run('stageMode'),'front');assert.equal(run('currentStageId()'),'decisive');assert.equal(run('scoreStats.stage'),'decisive');
 assert.equal(run('allies.length'),6);assert.ok(run('allies.every(a=>a.frontline)'));assert.ok(run('humans.length>0&&humans.length<=frontlineEnemyLimit()&&humans.every(h=>h.frontMarch)'));assert.equal(run('state'),'play');
 run('draw();for(let i=0;i<90;i++)update(1/60);draw()');assert.equal(run('state'),'play');
 run("damageBase(1000,base.x+base.w/2,base.y+base.h/2,100,1,'player')");assert.equal(run('state'),'blast');
 run('blastUpdate(3)');assert.equal(run('state'),'succeeded');assert.equal(run('scoreStats.final.cleared'),true);assert.equal(run('scoreStats.objectiveProgress'),1);
 assert.equal(run('scoreStats.stageRecordId'),'decisive');assert.equal(run('readStageRecords().stages.decisive.successes'),1);assert.equal(run('readStageRecords().stages.front.successes'),0);assert.equal(run('leaderboardPending.decisive.stage'),'decisive');assert.equal(run('readStageProgress().cleared.length'),13);assert.ok(run("readTitleArchive().titles.v3_all_stages_clear"));assert.equal(run("scoreStats.awards.newTitles.includes('v3_all_stages_clear')"),false);
});
test('desert town replaces the random sections and shares the desert tile and uses its own buildings',()=>{
 for(const seed of [7,11,42]){
  const {run}=start(seed);
  assert.deepEqual(Array.from(run('ZONES.map(z=>z.n)')),['草原','砂漠街','砂漠街','砂漠街','砂漠街','砂漠','砂漠','砂漠']);
  assert.ok(run('ZONES.slice(1).every((z,i)=>z.y0===ZONES[i].y1)'));
  assert.equal(run('water.filter(w=>w.oasis).length'),1);
  assert.ok(run('water.some(w=>w.oasis&&w.sizeScale>=.2&&w.sizeScale<=1.5)'));
  assert.ok(run("TERRAIN_IMG['砂漠街']===TERRAIN_IMG['砂漠']&&terrainSurfacePattern(ZONES[1])===terrainSurfacePattern(ZONES[5])"));
  assert.ok(run(`(ZONES.slice(1,5).every(z=>{
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
   covers.every(c=>!DESERT_TOWN_BUILDINGS.some(([key])=>key===c.decisiveKind)||!circleHitsRect(decisiveBattle.gate.x,decisiveBattle.gate.y,300,c))`));
 }
 const {run}=createGameEngine(root,{seed:7});
 run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='砂漠街';reset(false)");
 assert.equal(run('ZONES[0].n'),'砂漠街');
 assert.equal(run('water.filter(w=>w.oasis).length'),1);
 assert.ok(run('DESERT_TOWN_BUILDINGS.every(([key])=>covers.some(c=>c.decisiveKind===key))'));
});
test('desert town scatters all four scenery types clear of buildings, the lane and relay',()=>{
 const layouts=new Set();
 for(const seed of [7,11,42]){
  const {run}=start(seed);
  assert.ok(run(`ZONES.slice(1,5).every(z=>{
   const inside=o=>o.y>=z.y1&&o.y+o.h<=z.y0;
   const sandbags=covers.filter(c=>c.decisiveKind==='sandbags'&&!c.desertTownGate&&inside(c)&&c.y>=decisiveBattle.border+800);
   const grass=bushes.filter(inside),props=objects.filter(inside),buildings=covers.filter(c=>inside(c)&&DESERT_TOWN_BUILDINGS.some(([key])=>key===c.decisiveKind));
   const scenery=[...sandbags,...grass,...props.map(o=>o.kind==='barrel'?barrelVisualRect(o):o)];
   const rows=sandbags.map(c=>c.y),columns=new Set(sandbags.map(c=>c.x));
   const gates=covers.filter(c=>c.desertTownGate&&inside(c)).sort((a,b)=>a.y-b.y);
   return gates.length===3&&gates.every(c=>c.w===210&&c.h===52)&&
    Math.abs(gates[1].x-gates[0].x)-gates[0].w>=2*TANK_HIT&&columns.size<=2&&
    sandbags.every(c=>c.w===210&&c.h===52&&(c.y-rows[0])%168===0)&&
    scenery.every((o,i)=>(o.x+o.w<=WW/2-100||o.x>=WW/2+100)&&
     !circleHitsRect(decisiveBattle.gate.x,decisiveBattle.gate.y,300,o)&&
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
test('desert town clears ongoing rain, prevents new rain and lets the usual schedule resume outside',()=>{
 const {run}=start();
 run("p.y=ZONES[0].y1+1;weatherNext=0;updateWeather(1);");
 assert.equal(run('weather'),'rain');
 run("ZONES[1].desertTownStorm=false;p.y=ZONES[1].y0-1;rainIntensity=1;updateWeather(1);");
 assert.deepEqual(Array.from(run('[weather,weatherT,rainIntensity]')),['clear',0,0]);
 run('weatherNext=0;updateWeather(120)');
 assert.equal(run('weather'),'clear');
 run('p.y=ZONES[0].y1+1;updateWeather(1)');
 assert.equal(run('weather'),'rain');
});
test('a selected town section gets one sandstorm with the same detection penalty as rain',()=>{
 const {run}=start();
 run("p.y=ZONES[1].y0-50;ZONES[1].desertTownStorm=true;weather='rain';weatherT=20;");
 const rain=run('detectRange()');
 run('updateWeather(.2);updateWeather(.6)');
 assert.equal(run('weather'),'sandstorm');
 assert.equal(run('detectRange()'),rain);
 assert.ok(run('sandIntensity>0'));
 run('updateWeather(10);updateWeather(20)');
 assert.equal(run('weather'),'clear');
 run('p.y=ZONES[0].y1+20;updateWeather(1)');
 assert.ok(run('Number.isFinite(weatherNext)'));
 run('p.y=ZONES[1].y0-50;updateWeather(20)');
 assert.equal(run('weather'),'clear');
});
test('desert defenses leave a central vehicle route and the relay cannot be bypassed or farmed from hiding',()=>{
 const {run}=start(11);assert.equal(run('covers.filter(c=>c.decisiveKind==="bunker").length'),9);assert.equal(run('covers.filter(c=>c.decisiveKind==="sandbags"&&c.y<decisiveBattle.border+70).length'),18);assert.ok(run('covers.every(c=>!decisiveRectsOverlap(c,{x:base.x-75,y:base.y,w:base.w+150,h:base.h}))'));
 assert.ok(run(`covers.filter(c=>(c.decisiveKind==="bunker"||c.decisiveKind==="sandbags")&&!c.desertTownGate).every(c=>c.x+c.w<WW/2-100||c.x>WW/2+100)`));assert.ok(run('ZONES.slice(5).every(z=>cars.some(v=>v.y<z.y0&&v.y>z.y1))'));
 const hp=run('base.hp');run("damageBase(1000,base.x,base.y,60,1,'bomb')");assert.equal(run('base.hp'),hp);assert.equal(run('state'),'play');
 run('p.y=100;updateMission(.1)');assert.equal(run('p.y'),run('decisiveBattle.border+32'));
 run('humans=[];etanks=[];p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y;p.dig=1;updateMission(10)');assert.equal(run('mission.progress'),0);run('p.dig=0;p.tank={kind:"fighter"};updateMission(10)');assert.equal(run('mission.progress'),0);
 run('p.tank=null;humans=[{x:p.x+20,y:p.y,alive:true}];updateMission(10)');assert.equal(run('mission.progress'),0);assert.equal(run('mission.contested'),true);
 run('humans=[];updateMission(10)');assert.equal(run('mission.progress'),10);assert.equal(run('allies.length'),0);assert.equal(run('stageMode'),'decisive');
 assert.equal(run('frontlineCaptureVisual(mission,DECISIVE_RELAY_CAPTURE_SECONDS).remaining'),5);
 run('p.x+=400;updateMission(5);p.x-=400;updateMission(4)');
 assert.equal(run('mission.progress'),14);assert.equal(run('decisiveBattle.phase'),'infiltration');
 run('updateMission(1)');assert.equal(run('decisiveBattle.phase'),'assault');
});
test('capturing the relay or reaching the final objective cannot finish the stage; wave and ally bounds persist',()=>{
 const {run}=start();run('humans=[];etanks=[];p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y;updateMission(15)');assert.equal(run('state'),'play');assert.equal(run('beginDecisiveAssault()'),false);
 run('p.x=mission.points[0].x;p.y=mission.points[0].y;for(let i=0;i<200;i++)updateMission(.5)');assert.equal(run('state'),'play');assert.ok(run('base.hp>0'));assert.ok(run('humans.filter(h=>h.alive).length<=frontlineEnemyLimit()'));assert.ok(run('allies.filter(a=>a.alive&&a.frontline).length<=10'));assert.equal(run('scoreStats.final'),null);
});
test('moving fortress yields to nearby units; bunker and fortress guns reuse existing enemy projectiles',()=>{
 const {run}=start();run('humans=[];etanks=[];p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y;updateMission(15)');const x=run('base.x');run('updateDecisiveFortress(.1)');assert.notEqual(run('base.x'),x);
 run('p.x=base.x+base.w+5;p.y=base.y+100');const blocked=run('base.x');run('updateDecisiveFortress(.1)');assert.equal(run('base.x'),blocked);
 run('p.x=base.x+base.w/2;p.y=base.y+base.h+150;decisiveBattle.fortressCd=0;updateDecisiveFortress(.1)');assert.ok(run('bullets.some(b=>b.from==="e"&&b.k==="c")'));
 run('const bunker=decisiveBattle.bunkers[0];p.x=bunker.x+bunker.w/2+44;p.y=bunker.y+bunker.h+52;bunker.gunCd=.8;decisiveBattle.gunScan=0;updateDecisiveBunkers(.2)');
 assert.equal(run('bunker.gunAim'),Math.PI/4);
 assert.equal(run('decisiveBunkerAngle(bunker,performance.now()+100)'),3*Math.PI/8);
 assert.equal(run('bullets.some(b=>b.from==="e"&&b.k==="v")'),false);
 run('bunker.gunCd=0;decisiveBattle.gunScan=0;updateDecisiveBunkers(.2)');
 assert.ok(run('bullets.some(b=>b.from==="e"&&b.k==="v"&&Math.abs(Math.atan2(b.vy,b.vx)-bunker.gunAim)<1e-10)'));
 run('var bunkerLayers=[];g.drawImage=(im)=>bunkerLayers.push(im.src);drawDecisiveCover(bunker);drawDecisiveCover({decisiveKind:"bunker",x:bunker.x,y:bunker.y,w:bunker.w,h:bunker.h});');
 assert.deepEqual(Array.from(run('bunkerLayers.map(src=>src.split("/").pop().split("?")[0])')),['bunker.webp','bunker-barrel.webp','bunker.webp']);
});
test('starting an existing stage clears decisive state and preserves its normal map and mission rules',()=>{
 const {run}=start();run("stageMode='beginner';reset(false)");assert.equal(run('decisiveBattle'),null);assert.equal(run('isDecisiveStage()'),false);assert.equal(run('currentStageId()'),'beginner');assert.equal(run('ZONES.length'),5);assert.equal(run('ZONES.some(z=>z.n==="砂漠")'),false);assert.equal(run('base.maxHp'),30);assert.equal(run('mission'),null);
 run("stageMode='front';frontlineBeginner=false;reset(false)");assert.equal(run('decisiveBattle'),null);assert.equal(run('mission.points.length'),3);assert.equal(run('currentStageId()'),'front');assert.ok(run('allies.length>0'));
});
test('decisive sprites, stage preview and script exist without new per-frame image loading',()=>{
 const src=fs.readFileSync(path.join(root,'js/decisive.js'),'utf8');for(const name of ['fortress','bunker','sandbags','desert','bunker-barrel'])assert.ok(fs.statSync(path.join(root,'assets/decisive',name+'.webp')).size<16000);assert.ok(fs.statSync(path.join(root,'assets/ui/stages/decisive.webp')).size<16000);assert.doesNotMatch(src.slice(src.indexOf('function updateDecisiveMission')),/makeAssetImage\(/);
});
test('adobe doors deploy blue infantry and stay disabled after damage to their entrance',()=>{
 const {run}=start(11);
 run(`const town=ZONES[2],building=covers.find(c=>c.desertTownDoor&&zoneAt(c.y)===town);
  covers=[building];humans=[];etanks=[];cars=[];objects=[];water=[];rebuildSpatialGrid();
  p.x=WW/2;p.y=town.y0-10;
  setupDesertTownEvents();const door=building.desertTownDoor;`);
 assert.ok(run('door.remaining>=10&&door.remaining<=30'));
 run("carve(building.x+20,building.y+20,34,false,null);rebuildSpatialGrid();");
 assert.equal(run('door.broken'),false);
 run('door.remaining=.2;updateDesertTownEvents(.02);draw();updateDesertTownEvents(.3);');
 assert.equal(run('humans.length'),1);
 assert.ok(run("humans[0].y===door.exitY&&!humans[0].elite&&(!humans[0].commander||humans[0].commander==='blue')"));
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
