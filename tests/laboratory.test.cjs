const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function game(lab,seed=17){const h=createGameEngine(root,{seed,touch:true});h.run(`stageMode='indoor';indoorLaboratory=${lab};indoorBeginner=false;reset(false);`);return h;}
function geometry(h){return h.run(`(()=>{const seen=new WeakSet();return JSON.stringify({floors:indoorWorld.floors.map(f=>({footprint:f.footprint,walls:f.walls,props:f.props,doors:f.doors,windows:f.windows,stair:f.stair,guards:f.guards})),intel:indoorWorld.intel,dogs:enemyDogs,exits:indoorWorld.exits,files:INDOOR_FILES_TOTAL,acquire:INDOOR_ACQUIRE_SECONDS,escape:INDOOR_EXIT_SECONDS},(k,v)=>{if(v&&typeof v==='object'){if(seen.has(v))return;seen.add(v);}return v;});})()`);}
test('laboratory preserves the advanced layout, colliders, patrols, dogs and mission timing for identical seeds',()=>{
 for(const seed of [7,17,42]){const advanced=game(false,seed),lab=game(true,seed);assert.equal(geometry(lab),geometry(advanced));assert.equal(lab.run('INDOOR_FILES_TOTAL'),3);assert.equal(lab.run('INDOOR_ACQUIRE_SECONDS'),8);assert.equal(lab.run('INDOOR_EXIT_SECONDS'),5);}
});
test('test selection is developer-only and switching stages resets the skin and difficulty',()=>{
 const h=createGameEngine(root);assert.equal(h.run("stageAvailableForSelection('indoorLab')"),false);
 h.run("setDeveloperMode(true);state='stage';selectedSkillId='throw';setSelectedStage('indoorLab');deploySelectedStage();");
 assert.equal(h.run('isLaboratoryStage()'),true);assert.equal(h.run('indoorBeginner'),false);assert.equal(h.run('currentStageId()'),'indoorLab');
 assert.equal(h.run("STAGE_ORDER.some(s=>s.id==='indoorLab')"),false);
 h.run("gameBuildQueued=false;state='stage';stageDebugAll=true;setSelectedStage('indoorBeginner');deploySelectedStage();");
 assert.equal(h.run('isLaboratoryStage()'),false);assert.equal(h.run('indoorBeginner'),true);assert.equal(h.run('currentStageId()'),'indoorBeginner');
 h.run("gameBuildQueued=false;state='stage';setSelectedStage('indoor');deploySelectedStage();");assert.equal(h.run('indoorBeginner'),false);assert.equal(h.run('isLaboratoryStage()'),false);
});
test('laboratory has separate assets and floor cache, and all generated indoor furniture has a replacement',()=>{
 const h=game(true);assert.equal(h.run('indoorWorld.floors.flatMap(f=>f.props).every(p=>!!LABORATORY_ART[p.propArt])'),true);
 assert.match(h.run("indoorPropImage('desk').src"),/laboratory\/lab-bench.webp$/);
 assert.equal(h.run('laboratoryFloorPattern(g)===laboratoryFloorPattern(g)'),true);
 const stamp=h.run('laboratoryAssetStamp()');h.run("laboratoryImages['lab-bench'].complete=false");assert.notEqual(h.run('laboratoryAssetStamp()'),stamp);
 h.run('indoorLaboratory=false');assert.match(h.run("indoorPropImage('desk').src"),/assets\/indoor\/desk.webp/);assert.equal(h.run('isLaboratoryStage()'),false);
});
test('a lab result can be evaluated without changing progression, awards, records or leaderboard state',()=>{
 const h=game(true),before=JSON.stringify([...h.storage]);h.run('recordStageSortie(scoreStats);scoreStats.time=90;finalizeScore(true);');
 assert.equal(h.run('scoreStats.final.cleared'),true);assert.equal(h.run('scoreStats.laboratoryTest'),true);assert.equal(h.run('scoreStats.awards.disabled'),true);
 assert.equal(JSON.stringify([...h.storage]),before);assert.equal(h.run('!!scoreStats.unlockedStage'),false);assert.equal(h.run('!!scoreStats.unlockedSkill'),false);
});
test('mobile laboratory scenery warms the bounded cache and invalidates it when assets finish loading',()=>{
 const h=game(true);h.run('prepareLaboratoryAssets();for(let i=0;i<30;i++){drawInfiltrationFloors(camX,cam);drawInfiltrationWallChunks(camX,cam);drawInfiltrationProps(camX,cam);}');
 const before=h.run('indoorRenderStats.builds');h.run('for(let i=0;i<10;i++){drawInfiltrationFloors(camX,cam);drawInfiltrationWallChunks(camX,cam);drawInfiltrationProps(camX,cam);}');
 assert.equal(h.run('indoorRenderStats.builds'),before);assert.ok(h.run('indoorRenderStats.pixels<=INDOOR_RASTER_LIMIT'));
 const stamp=h.run("indoorRasterAssetStamp('walls')");h.run("laboratoryImages['lab-wall-horizontal'].complete=false");assert.notEqual(h.run("indoorRasterAssetStamp('walls')"),stamp);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/#stageScreen \.stage-card\[hidden\]\{display:none\}/);
});
test('all twelve master PNGs and runtime WebPs exist and only WebPs are referenced by the theme',()=>{
 const h=createGameEngine(root),names=Array.from(h.run('[...new Set(Object.values(LABORATORY_ART))]'));assert.equal(names.length,12);
 for(const name of names){const dir=path.join(root,'assets/indoor/laboratory'),png=fs.readFileSync(path.join(dir,name+'.png')),webp=fs.readFileSync(path.join(dir,name+'.webp'));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(webp.subarray(8,12).toString(),'WEBP');assert.ok(png.length>1000&&webp.length>1000);}
});
test('laboratory exterior reuses grassland, preserves upstairs void and invalidates an unloaded grass placeholder',()=>{
 const h=game(true);
 h.run("var exteriorSamples=[];terrainSurfacePattern=t=>{exteriorSamples.push(t.n);return 'terrain:'+t.n;};indoorWorld.currentFloor=0;indoorUncachedFloors(camX,cam);");
 assert.equal(h.run('exteriorSamples[0]'),'草原');
 h.run("exteriorSamples=[];indoorLaboratory=false;indoorUncachedFloors(camX,cam);");assert.equal(h.run('exteriorSamples[0]'),'丘陵');
 h.run("exteriorSamples=[];indoorLaboratory=true;indoorWorld.currentFloor=1;var exteriorFill;g.fillRect=()=>{if(exteriorFill===undefined)exteriorFill=g.fillStyle;};indoorUncachedFloors(camX,cam);");
 assert.equal(h.run('exteriorSamples.length'),0);assert.equal(h.run('exteriorFill'),'#11171c');
 h.run("TERRAIN_IMG['草原']={complete:true,naturalWidth:256,naturalHeight:256};");
 const ready=h.run("indoorRasterAssetStamp('floor')");h.run("TERRAIN_IMG['草原'].complete=false");assert.notEqual(h.run("indoorRasterAssetStamp('floor')"),ready);
});
