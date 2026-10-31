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
 assert.match(h.run("indoorPropImage('desk').src"),/laboratory\/lab-bench.webp\?v=overhead-r4$/);
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
test('all twenty-eight master PNGs and runtime WebPs exist and only WebPs are referenced by the theme',()=>{
 const h=createGameEngine(root),names=Array.from(h.run('[...new Set(Object.values(LABORATORY_ART))]'));assert.equal(names.length,28);
 for(const name of names){const dir=path.join(root,'assets/indoor/laboratory'),png=fs.readFileSync(path.join(dir,name+'.png')),webp=fs.readFileSync(path.join(dir,name+'.webp'));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(webp.subarray(8,12).toString(),'WEBP');assert.ok(png.length>1000&&webp.length>1000);}
});
test('laboratory exterior reuses city, preserves upstairs void and invalidates an unloaded city placeholder',()=>{
 const h=game(true);
 h.run("var exteriorSamples=[];terrainSurfacePattern=t=>{exteriorSamples.push(t.n);return 'terrain:'+t.n;};indoorWorld.currentFloor=0;indoorUncachedFloors(camX,cam);");
 assert.equal(h.run('exteriorSamples[0]'),'街');
 h.run("exteriorSamples=[];indoorLaboratory=false;indoorUncachedFloors(camX,cam);");assert.equal(h.run('exteriorSamples[0]'),'丘陵');
 h.run("exteriorSamples=[];indoorLaboratory=true;indoorWorld.currentFloor=1;var exteriorFill;g.fillRect=()=>{if(exteriorFill===undefined)exteriorFill=g.fillStyle;};indoorUncachedFloors(camX,cam);");
 assert.equal(h.run('exteriorSamples.length'),0);assert.equal(h.run('exteriorFill'),'#11171c');
 h.run("TERRAIN_IMG['街']={complete:true,naturalWidth:256,naturalHeight:256};");
 const ready=h.run("indoorRasterAssetStamp('floor')");h.run("TERRAIN_IMG['街'].complete=false");assert.notEqual(h.run("indoorRasterAssetStamp('floor')"),ready);
});

test('laboratory role layouts and physical paths stay coherent across 60 seeds',()=>{
 for(let seed=1;seed<=60;seed++){
  const h=game(true,seed);
  assert.equal(h.run(`indoorWorld.floors.length===3&&indoorWorld.floors.every(f=>
   mission.points.filter(q=>q.floor===f.number).length===1&&enemyDogs.filter(d=>d.indoorFloor===f.number&&d.handler?.alive&&d.handler.dog===d&&d.handler.dogHandler).length===1)`),true,'three floors, documents and dog pairs seed '+seed);
  assert.equal(h.run(`indoorWorld.floors.every(f=>{
   const cargo=objects.filter(o=>o.y>=f.footprint.y&&o.y<f.footprint.y+f.footprint.h);
   return ['waste_tank','container'].every(k=>cargo.some(o=>o.laboratoryArt===k))&&cargo.every(o=>{
    const expected=o.laboratoryArt==='waste_tank'?[91.546875,108]:o.laboratoryArt==='container'?[112,63]:null;
    if(!expected)return true;
    const hit=objectHitRect(o);return Math.abs(o.w-expected[0])<.001&&Math.abs(o.h-expected[1])<.001&&hit.w===o.w&&hit.h===o.h;
   });
  })`),true,'doubled cargo deployed seed '+seed);
  assert.equal(h.run(`indoorWorld.floors.every(f=>{
   const hall=f.props.filter(o=>o.propZone==='hallway'),cargo=objects.filter(o=>o.laboratoryRole==='corridor'&&o.y>=f.footprint.y&&o.y<f.footprint.y+f.footprint.h);
   return hall.length+cargo.length>=20&&hall.length+cargo.length<=24&&cargo.filter(o=>o.laboratoryArt==='wooden_crate').length>=8&&
    hall.filter(o=>laboratoryBaseArt(o.propArt)==='cabinet').length>=8&&
    ['transport_container','transport_container_vertical'].every(k=>hall.some(o=>o.propArt===k))&&
    !f.props.some(o=>laboratoryBaseArt(o.propArt)==='fume_hood');
  })`),true,'dense corridors seed '+seed);
  assert.equal(h.run(`indoorWorld.floors.every(f=>{
   const roles=new Set(f.rooms.map(r=>r.laboratoryRole));
   return roles.size===6&&f.rooms.every(r=>{
    const plan=LABORATORY_ROOM_ROLES[r.purpose]||LABORATORY_ROOM_ROLES.inspection,props=f.props.filter(o=>o.roomId===r.id);
    return r.name===plan.name&&r.laboratoryRole===plan.id&&props.some(o=>laboratoryBaseArt(o.propArt)===plan.furniture[0])&&props.every(o=>o.laboratoryRole===plan.id&&plan.furniture.includes(laboratoryBaseArt(o.propArt)));
   })&&f.props.some(o=>o.propZone==='hallway')&&f.postGuards.every(h=>!f.props.some(o=>circleHitsRect(h.x,h.y,8,o)));
  })`),true,'room roles seed '+seed);
  assert.equal(h.run(`objects.every(o=>indoorWorld.floors.some(f=>o.laboratoryRole==='corridor'?f.corridors.some(t=>o.x>=t.x-.001&&o.y>=t.y-.001&&o.x+o.w<=t.x+t.w+.001&&o.y+o.h<=t.y+t.h+.001):f.rooms.some(r=>{
   const plan=LABORATORY_ROOM_ROLES[r.purpose]||LABORATORY_ROOM_ROLES.inspection;
   return r.id===o.laboratoryRoomId&&r.laboratoryRole===o.laboratoryRole&&(plan.cargo.includes(o.kind)||plan.cargo.includes(o.laboratoryArt))&&Math.abs(r.tiles.reduce((sum,t)=>sum+Math.max(0,Math.min(o.x+o.w,t.x+t.w)-Math.max(o.x,t.x))*Math.max(0,Math.min(o.y+o.h,t.y+t.h)-Math.max(o.y,t.y)),0)-o.w*o.h)<.01;
  })))`),true,'cargo roles seed '+seed);
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

test('laboratory uses common automatic-door assets and identical leaf geometry at every open amount',()=>{
 const lab=game(true),advanced=game(false);
 for(const vertical of [false,true])for(const open of [0,.3,.8]){
  const capture=h=>h.run(`(()=>{let calls=[];g.drawImage=(im,...args)=>calls.push({src:im.src,args});drawInfiltrationDoorPanels({x:30,y:40,vertical:${vertical}},${open},42,42*(1-${open}));return JSON.stringify(calls);})()`);
  assert.equal(capture(lab),capture(advanced));
 }
 assert.equal(lab.run("!!laboratoryImages['lab-door']"),false);
});
test('lab cargo uses the requested tank and sample case sizes and retains wooden crate sizes',()=>{
 const lab=game(true);
 assert.equal(lab.run(`objects.length>0&&objects.every(o=>{
  const size=laboratoryObjectSize(o.kind,o.laboratoryArt),hit=objectHitRect(o);
  return (o.laboratoryArt===LABORATORY_OBJECT_ART[o.kind]||o.kind==='crate'&&o.laboratoryArt==='wooden_crate')&&Math.abs(o.w-size.w)<.001&&Math.abs(o.h-size.h)<.001&&
   Math.max(o.w,o.h)<=112&&hit.x===o.x&&hit.y===o.y&&hit.w===o.w&&hit.h===o.h;
 })`),true);
 assert.equal(lab.run("objects.some(o=>o.laboratoryArt==='waste_tank')&&objects.some(o=>o.laboratoryArt==='cooling_unit')"),true);
 assert.equal(lab.run("objects.filter(o=>o.kind==='shellPallet').every(o=>Math.max(o.w,o.h)<=112)"),true);
 assert.equal(lab.run(`indoorWorld.floors.every(f=>f.props.every(o=>Math.max(o.w,o.h)<=138))`),true);
 assert.equal(lab.run(`(()=>{let calls=[];g.drawImage=(im,...args)=>calls.push(args);for(const o of objects){calls=[];drawObject(o);if(calls.length!==1||calls[0][2]>o.w+.001||calls[0][3]>o.h+.001)return false;}return true;})()`),true);
 const advanced=game(false);assert.equal(advanced.run('objects.some(o=>o.laboratoryArt)'),false);
 assert.equal(advanced.run("objects.some(o=>o.kind==='shellPallet'&&o.h>100)"),true);
});
test('laboratory furniture and cargo draw authored orientation art without runtime rotation',()=>{
 const lab=game(true);
 assert.equal(lab.run(`(()=>{let turns=0;g.rotate=()=>turns++;for(const f of indoorWorld.floors)for(const o of f.props)drawInfiltrationPropSprite(o);for(const o of objects)drawObject(o);return turns;})()`),0);
});

test('laboratory cover sizes follow the existing indoor worktables, lockers, beds and cargo',()=>{
 const h=game(true);
 assert.equal(h.run("laboratoryPropSize('desk').w>=INDOOR_PROP_LENGTH.operations_table*.75"),true);
 assert.equal(h.run("laboratoryPropSize('cabinet').w>=INDOOR_PROP_LENGTH.personal_lockers*.8"),true);
 assert.equal(h.run("laboratoryPropSize('generator').w>=INDOOR_PROP_LENGTH.generator*.7"),true);
 assert.equal(h.run("laboratoryPropSize('bed').h>=104"),true);
 assert.equal(h.run("objects.every(o=>Math.max(o.w,o.h)>=50&&Math.max(o.w,o.h)<=112)"),true);
});

test('research machines, large wooden crates and corridor covers are installed along real walls',()=>{
 for(const seed of [7,17,42,91,125]){
  const h=game(true,seed);
  assert.equal(h.run(`indoorWorld.floors.every(f=>{
   const art=new Set(f.props.map(o=>laboratoryBaseArt(o.propArt)));
   if(!['transport_container','ultra_freezer','centrifuge','incubator','wash_station'].every(k=>art.has(k)))return false;
   if(!f.props.some(o=>o.propZone==='hallway'))return false;
   const cargo=objects.filter(o=>o.y>=f.footprint.y&&o.y<f.footprint.y+f.footprint.h);
   if(!cargo.some(o=>o.laboratoryArt==='wooden_crate'&&o.w===80&&o.laboratoryRole==='corridor'))return false;
   return [...f.props.filter(o=>o.propKind!=='postTable'),...cargo].every(o=>f.walls.some(w=>{
    const side=o.laboratoryWallSide;
    const tangent=side==='north'||side==='south'?Math.min(o.x+o.w,w.x+w.w)-Math.max(o.x,w.x):Math.min(o.y+o.h,w.y+w.h)-Math.max(o.y,w.y);
    const gap=side==='north'?o.y-w.y-w.h:side==='south'?w.y-o.y-o.h:side==='west'?o.x-w.x-w.w:w.x-o.x-o.w;
    return tangent>1&&Math.abs(gap-4)<.01;
   }));
  })`),true,'seed '+seed);
 }
});

test('laboratory furniture keeps 110 percent, sinks grow again and vertical artwork is actually deployed',()=>{
 const original={
  'lab-bench':[112,35.4375],'lab-storage':[96,36.375],'lab-analyzer':[84,57.75],
  'lab-reactor':[112,62.5625],'lab-medical':[34.53125,104],'lab-samples':[112,63],
  'lab-transport-container':[96,44.625],'lab-freezer':[98,54.359375],'lab-centrifuge':[96,77.25],
  'lab-incubator':[104,58.09375],'lab-wash-sink':[112,40.25]
 };
 const h=game(true);
 for(const [asset,[w,d]] of Object.entries(original)){
  const size=JSON.parse(h.run(`JSON.stringify(LABORATORY_COVER_SIZES[${JSON.stringify(asset)}])`));
  const scale=asset==='lab-wash-sink'?1.21:asset==='lab-transport-container'?1.43:1.1;
  assert.ok(Math.abs(size.w-w*scale)<.001&&Math.abs(size.h-d*scale)<.001,asset+' scales correctly');
 }
 assert.equal(h.run(`indoorWorld.floors.every(f=>f.props.some(o=>{
  if(!o.propArt.endsWith('_vertical'))return false;
  const base=laboratoryBaseArt(o.propArt),src=indoorPropImage(o.propArt).src,original=indoorPropImage(base).src;
  return src!==original&&src.includes('-vertical.webp')&&o.h>o.w&&(o.laboratoryWallSide==='west'||o.laboratoryWallSide==='east');
 }))`),true);
 assert.equal(h.run("objects.filter(o=>o.laboratoryArt==='wooden_crate').every(o=>Math.abs(o.w-80)<.001&&Math.abs(o.h-55.625)<.001)"),true);
});


test('retired fume hoods are not loaded and both sink orientations grow another ten percent',()=>{
 const h=game(true);h.run('prepareLaboratoryAssets()');
 assert.equal(h.run("Object.keys(laboratoryImages).some(k=>k.includes('fume-hood'))"),false);
 for(const [kind,w,d] of [['wash_station',112,40.25],['wash_station_vertical',34.125,112]]){
  const size=JSON.parse(h.run(`JSON.stringify(laboratoryPropSize('${kind}'))`));
  assert.ok(Math.abs(size.w-w*1.21)<.001&&Math.abs(size.h-d*1.21)<.001);
 }
});


test('sample cases in furniture and both orientations are exactly twice their preceding size',()=>{
 const h=game(true);
 for(const [kind,w,d] of [['container',61.6,34.65],['container_vertical',23.340625,61.6],['waste_tank',45.7734375,54]]){
  const size=JSON.parse(h.run(`JSON.stringify(laboratoryPropSize('${kind}'))`));
  assert.ok(Math.abs(size.w-w*2)<.001&&Math.abs(size.h-d*2)<.001,kind);
 }
 assert.equal(h.run("objects.filter(o=>o.laboratoryArt==='cooling_unit').every(o=>o.w===72&&o.h===45.5625)"),true);
});


test('laboratory stair walls and safe landings match the tall sprite on both floors',()=>{
 const h=game(true);
 h.run("laboratoryImages['lab-stairs']={complete:true,naturalWidth:107,naturalHeight:384};");
 assert.equal(h.run(`indoorWorld.floors.every(f=>{
  const b=indoorStairBounds(f.stair,f.number),walls=indoorStairWalls(f.stair,f.number),landing=indoorStairLanding(f),safe=indoorStairSafeArea(f);
  let imageBounds;const old=g.drawImage;g.drawImage=(image,x,y,w,h)=>{imageBounds={x,y,w,h};};
  drawInfiltrationStairSprite(f);g.drawImage=old;
  return ['x','y','w','h'].every(k=>Math.abs(b[k]-imageBounds[k])<.001)&&
   walls.every(w=>w.x+w.w<=b.x||w.x>=b.x+b.w||w.y+w.h<=b.y)&&
   landing.x>=safe.x&&landing.x<=safe.x+safe.w&&landing.y>=safe.y&&landing.y<=safe.y+safe.h&&
   f.walls.filter(w=>w.indoorStairWall).every(w=>w.x+w.w<=b.x+.001||w.x>=b.x+b.w-.001||w.y+w.h<=b.y+.001);
 })`),true);
 h.run('indoorLaboratory=false');
 assert.equal(h.run('indoorStairBounds({x:0,y:0},1).h'),192);
 assert.ok(Math.abs(h.run('indoorStairBounds({x:0,y:0},2).h')-60*320/162)<.001);
});


test('lab rescue routes reuse cached asphalt roads and leave exterior scenery clear',()=>{
 const h=game(true);
 assert.equal(h.run(`roadBands.length===indoorWorld.exits.length&&indoorWorld.exits.every(exit=>{
  const r=roadBands.find(r=>r.indoorExtractionRoad&&r.y+r.h/2===exit.y);
  return r&&r.x===0&&r.w===WW&&r.h===320&&r.kind==='asphalt'&&r.lanes===4&&
    (r.y+r.h<=indoorWorld.floors[0].footprint.y||r.y>=indoorWorld.floors[0].footprint.y+indoorWorld.floors[0].footprint.h);
 })&&indoorWorld.exterior.every(o=>!roadBands.some(r=>o.x+o.w>r.x&&o.x<r.x+r.w&&o.y+o.h>r.y-12&&o.y<r.y+r.h+12))`),true);
 assert.equal(h.run(`indoorWorld.exits.every(exit=>[-1,1].every(side=>{
  mission.extraction=null;state='play';p.x=exit.x;p.y=exit.y+side*50;beginInfiltrationExtraction(exit);
  const v=mission.extraction,r=roadBands.find(r=>r.y+r.h/2===exit.y);
  return v.y-38>=r.y&&v.y+38<=r.y+r.h&&v.startX<v.stopX&&v.endX>v.stopX;
 }))`),true);
 assert.equal(h.run(`roadBands.every(r=>{const a=roadVisualCache(r);return a&&roadVisualCache(r)===a;})`),true);
 const standard=game(false);assert.equal(standard.run('roadBands.length'),0);
});


test('lab EXIT stays above rescue roads on desktop, cold mobile frames and warm cached frames',()=>{
 for(const touch of [false,true]){
  const h=createGameEngine(root,{seed:17,touch});h.run("stageMode='indoor';indoorLaboratory=true;state='play';reset(false);state='play';");
  h.run(`var exitEvents=[];drawRoadBand=r=>exitEvents.push('road');g.fillText=t=>{if(t==='EXIT')exitEvents.push('EXIT');};
    var pickupExit=indoorWorld.exits[0],viewY=pickupExit.y-H/2;indoorWorld.currentFloor=0;`);
  h.run('indoorUncachedFloors(0,viewY);');
  assert.equal(h.run("exitEvents.includes('road')&&exitEvents.includes('EXIT')&&exitEvents.lastIndexOf('road')<exitEvents.indexOf('EXIT')"),true,'uncached order '+touch);
  h.run(`exitEvents=[];var oldExitDraw=drawInfiltrationExitsForFloor;drawInfiltrationExitsForFloor=(...args)=>{exitEvents.push('EXIT');oldExitDraw(...args);};
    for(let i=0;i<30;i++)drawInfiltrationFloors(0,viewY);exitEvents=[];drawInfiltrationFloors(0,viewY);`);
  assert.equal(h.run("exitEvents.includes('EXIT')&&(exitEvents.lastIndexOf('road')<exitEvents.indexOf('EXIT'))"),true,'cached order '+touch);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/if\(stageMode!=='indoor'\)for\(const r of roadBands\)/,'outdoor road pass cannot cover indoor EXIT');
  h.run('ROAD_TEXTURE_IMG.asphalt.complete=true;');const stamp=h.run("indoorRasterAssetStamp('floor')");
  h.run('ROAD_TEXTURE_IMG.asphalt.complete=false;');assert.notEqual(h.run("indoorRasterAssetStamp('floor')"),stamp);
 }
});

test('lab can collect every document, wait at EXIT, board rescue jeep and finish successfully',()=>{
 for(const seed of [7,17,42]){
  const h=game(true,seed);h.run(`state='play';for(const q of mission.points){indoorWorld.currentFloor=q.floor-1;p.x=q.x;p.y=q.y;updateInfiltrationMission(8);}`);
  assert.equal(h.run('mission.index'),3);assert.equal(h.run('mission.points.every(q=>q.done)'),true);
  h.run(`indoorWorld.currentFloor=0;p.x=indoorWorld.exits[0].x;p.y=indoorWorld.exits[0].y;updateInfiltrationMission(4.9);`);
  assert.equal(h.run('state'),'play');assert.equal(h.run('mission.escapeProgress'),4.9);
  h.run('updateInfiltrationMission(.1);');assert.equal(h.run('state'),'indoorEscape');
  h.run('updateInfiltrationExtraction(2.8);');assert.equal(h.run('state'),'succeeded');assert.equal(h.run('mission.extraction.boarded'),true);
  h.run('updateInfiltrationExtraction(1.8);');assert.equal(h.run('mission.extraction.phase'),'departed');
 }
});


test('three-floor laboratory stair travel reaches 1-2-3-2-1, retains partner and does not bounce',()=>{
 const h=game(true);h.run("state='play';skill='partner';partner={alive:true,x:p.x,y:p.y,hp:3};");
 for(const [target,side] of [[1,1],[2,1],[1,1],[0,-1]]){
  h.run(`(()=>{const w=indoorWorld,f=w.floors[w.currentFloor],b=indoorStairBounds(f.stair,f.number);w.stairsCooldown=0;w.stairMoveLock=0;w.stairEntryFloor=null;p.tank=null;p.x=f.stair.x+${side}*12;p.y=b.y+b.h-14;updateInfiltrationMission(.01);p.y=b.y+20;updateInfiltrationMission(.01);})()`);
  assert.equal(h.run('indoorWorld.currentFloor'),target);
  assert.equal(h.run(`(()=>{const f=indoorWorld.floors[indoorWorld.currentFloor],landing=indoorStairLanding(f);return p.x===landing.x&&p.y===landing.y&&partner.x===landing.x+14&&partner.y===landing.y+12&&indoorStairProtected();})()`),true);
  h.run('updateInfiltrationMission(2.1);');assert.equal(h.run('indoorWorld.currentFloor'),target,'no immediate return at landing');
 }
 const standard=game(false);assert.equal(standard.run('indoorWorld.floors.length'),2);assert.equal(standard.run('enemyDogs.length'),1);
});

test('third-floor boundary remains solid after exterior walls are destroyed',()=>{
 const h=game(true);h.run('indoorWorld.currentFloor=2;');
 assert.equal(h.run(`(()=>{const f=indoorWorld.floors[2].footprint;p.x=f.x-100;p.y=f.y-100;enforceInfiltrationBoundary();return p.x===f.x+8&&p.y===f.y+8&&indoorFloorEdgeBlocked(p,f.x-1,p.y,8);})()`),true);
 h.run('indoorWorld.currentFloor=2;var terrainCalls=0;terrainSurfacePattern=()=>{terrainCalls++;};indoorUncachedFloors(camX,cam);');assert.equal(h.run('terrainCalls'),0);
});
