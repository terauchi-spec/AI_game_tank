const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function game(lab,seed=17){const h=createGameEngine(root,{seed,touch:true});h.run(`stageMode='indoor';indoorLaboratory=${lab};indoorBeginner=false;reset(false);`);return h;}
test('laboratory narrows only its width and has an unbroken perimeter corridor on both floors',()=>{
 for(const seed of [7,17,42,91,125]){
  const advanced=game(false,seed),lab=game(true,seed);
  assert.equal(lab.run('indoorWorld.floors[0].footprint.w'),advanced.run('indoorWorld.floors[0].footprint.w')*.95);
  assert.equal(lab.run('indoorWorld.floors[0].footprint.h'),advanced.run('indoorWorld.floors[0].footprint.h'));
  assert.equal(lab.run(`indoorWorld.floors.every(f=>{
   const boundary=Array.from({length:35},(_,i)=>i).filter(i=>i%5===0||i%5===4||i<5||i>=30);
   const seen=new Set([boundary[0]]),queue=[boundary[0]];
   for(let at=0;at<queue.length;at++)for(const j of f.navigation.neighbors[queue[at]])if(boundary.includes(j)&&!seen.has(j)){seen.add(j);queue.push(j);}
   return f.pattern==='外周'&&seen.size===boundary.length&&f.rooms.every(r=>r.tiles.every(t=>t.x>f.footprint.x&&t.x+t.w<f.footprint.x+f.footprint.w+.001&&t.y>f.footprint.y&&t.y+t.h<f.footprint.y+f.footprint.h));
  })`),true);
  assert.equal(lab.run('INDOOR_FILES_TOTAL'),3);assert.equal(lab.run('INDOOR_ACQUIRE_SECONDS'),8);assert.equal(lab.run('INDOOR_EXIT_SECONDS'),5);
  assert.equal(lab.run('indoorWorld.intel.length'),3);
  assert.equal(lab.run(`indoorWorld.floors.every(f=>f.props.every(p=>{
   const size=laboratoryPropSize(p.propArt),a=[p.w,p.h].sort((a,b)=>a-b),b=[size.w,size.h].sort((a,b)=>a-b);
   return Math.abs(a[0]-b[0])<.001&&Math.abs(a[1]-b[1])<.001;
  }))`),true);
 }
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
 assert.match(h.run("indoorPropImage('desk').src"),/laboratory\/lab-bench.webp\?v=2000-r3$/);
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

test('laboratory physical paths connect perimeter, documents and doors to stairs across 60 seeds',()=>{
 for(let seed=1;seed<=60;seed++){
  const h=game(true,seed);
  assert.equal(h.run(`indoorWorld.floors.every(f=>{
   const g=f.navigation.grid,start=indoorGridFreeNearest(g,indoorGridPoint(g,f.stair)),seen=new Set([start]),q=[start];
   for(let i=0;i<q.length;i++){
    const id=q[i],x=id%g.cols,y=Math.floor(id/g.cols);
    for(const j of [x?id-1:-1,x+1<g.cols?id+1:-1,y?id-g.cols:-1,y+1<g.rows?id+g.cols:-1])if(j>=0&&!g.solid[j]&&!seen.has(j)){seen.add(j);q.push(j);}
   }
   return [...f.corridors.map(t=>({x:t.x+t.w/2,y:t.y+t.h/2})),...indoorWorld.intel.filter(p=>p.floor===f.number),...f.openings.map(p=>({x:p.x,y:p.y-p.side*40}))].every(p=>seen.has(indoorGridFreeNearest(g,indoorGridPoint(g,p))));
  })`),true,'seed '+seed);
 }
});
