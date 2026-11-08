const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
test('jungle debug stage is isolated, traversable and contains all nine supplied assets',()=>{
 for(const seed of [1,7,91]){
  const h=createGameEngine(root,{seed});
  h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false)");
  assert.deepEqual(Array.from(h.run('ZONES.map(z=>z.n)')),['密林']);
  assert.equal(h.run("TERRAIN_ASSET_SRC['密林']===TERRAIN_ASSET_SRC['湿地']"),true);
  assert.equal(h.run('debugInvincible'),true);
  assert.equal(h.run("Object.keys(JUNGLE_ASSETS).every(k=>covers.some(c=>c.jungleAsset===k))"),true);
  assert.equal(h.run("(()=>{for(let y=ZONES[0].y1+32;y<p.y;y+=16)if(hitsM(WW/2,y,28))return false;return true;})()"),true);
  assert.equal(h.run('cars.length'),h.run('TYPES.length'));
  assert.ok(h.run('humans.length')>0);assert.ok(h.run('etanks.length')>0);
  assert.equal(h.run('hitsM(p.x,p.y,8)'),false);
  assert.equal(h.run("covers.filter(c=>c.jungleAsset).every(c=>drawCoverAsset(c))"),true);
  assert.equal(h.run("covers.filter(c=>c.jungleAsset).every(c=>circleHitsCover(c.x+c.w/2,c.y+c.h/2,8,c))"),true);
 }
});
test('jungle images are lazy loaded and optimized with preserved masters',()=>{
 const h=createGameEngine(root);h.run('startAssetLoading()');
 assert.equal(h.run("Object.keys(COVER_IMG).some(k=>k.startsWith('jungle_'))"),false);
 h.run('loadJungleAssets()');const count=h.run('assetLoadTotal');h.run('loadJungleAssets()');assert.equal(h.run('assetLoadTotal'),count);
 let total=0;
 for(const key of h.run('Object.keys(JUNGLE_ASSETS)')){
  const base=path.join(root,'assets/jungle',key),webp=fs.readFileSync(base+'.webp');total+=webp.length;
  assert.equal(webp.toString('ascii',8,12),'WEBP');assert.ok(fs.existsSync(base+'.png'));assert.ok(fs.existsSync(base+'.jpeg'));
 }
 assert.ok(total<450000);
});
test('jungle transparent corners and gaps do not block movement or shots',()=>{
 const h=createGameEngine(root);
 h.run("loadJungleAssets();globalThis.palmCover={kd:6,jungleAsset:'palm',x:100,y:100,w:320,h:320};globalThis.towerCover={kd:3,jungleAsset:'watchtower',x:100,y:100,w:320,h:320}");
 assert.equal(h.run('circleHitsCover(105,105,2,palmCover)'),false);
 assert.equal(h.run('pointHitsCover(260,260,palmCover)'),true);
 assert.equal(h.run('segmentHitsCover({x:100,y:100},{x:115,y:100},palmCover)'),false);
 assert.equal(h.run('segmentHitsCover({x:100,y:260},{x:420,y:260},palmCover)'),true);
 assert.equal(h.run('circleHitsCover(165,405,2,towerCover)'),false);
 assert.equal(h.run('circleHitsCover(260,405,2,towerCover)'),true);
});
test('partial destruction retains every jungle sprite and clips its original collider',()=>{
 const h=createGameEngine(root);
 h.run('loadJungleAssets()');
 for(const key of h.run('Object.keys(JUNGLE_ASSETS)')){
  h.run(`covers=[{kd:JUNGLE_ASSETS['${key}'][0],jungleAsset:'${key}',x:100,y:100,w:320,h:320}];objects=[];globalThis.originalCover=covers[0];carve(260,260,32,false,null)`);
  assert.ok(h.run('covers.length')>0);
  assert.equal(h.run(`covers.every(c=>c.fr&&c.jungleAsset==='${key}')`),true);
  assert.equal(h.run('covers.some(c=>circleHitsCover(260,260,0,c))'),false);
  assert.equal(h.run('(()=>{for(const c of covers)for(const [x,y] of [[c.x+.2,c.y+.2],[c.x+c.w/2,c.y+c.h/2]])if(pointHitsCover(x,y,c)&&!pointHitsCover(x,y,originalCover))return false;return true;})()'),true);
  const drawn=[];h.run('g').drawImage=(im)=>{if(im._src)drawn.push(im._src);};
  h.run('covers.forEach(drawCoverFragment)');
  assert.ok(drawn.length>0);
  assert.ok(drawn.every(src=>src.includes('/jungle/'+key+'.webp')));
  h.run('carve(260,260,1000,false,null)');assert.equal(h.run('covers.length'),0);
 }
});
test('jungle plants share spinifex stealth, burning and scatter behavior',()=>{
 for(let seed=1;seed<=20;seed++){
  const h=createGameEngine(root,{seed});h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false);globalThis.plants=bushes.filter(b=>b.junglePlant)");
  assert.ok(h.run('plants.length')>=12&&h.run('plants.length')<=18);
  assert.equal(h.run('new Set(plants.map(b=>b.junglePlant)).size'),2);
  assert.equal(h.run('plants.every(b=>b.spinifex&&b.w===b.h&&b.w>=59.15&&b.w<=129.675)'),true);
  assert.equal(h.run('plants.every(b=>b.x+b.w<=WW/2-ZONES[0].jungleLaneHalf||b.x>=WW/2+ZONES[0].jungleLaneHalf)'),true);
  assert.equal(h.run('plants.every(b=>!covers.some(c=>circleHitsRect(b.x+b.w/2,b.y+b.h/2,b.w/2,c)))'),true);
  h.run('globalThis.plant=plants[0];p.x=plant.x+plant.w/2;p.y=plant.y+plant.h/2;p.tank=null');
  assert.equal(h.run('inBush(p)'),true);
  assert.equal(h.run("canDetect({x:p.x,y:p.y+30,st:1,target:'p'},p,-Math.PI/2,'p')"),false);
  assert.equal(h.run("spinifexSprite(plant)===COVER_IMG['jungle_'+plant.junglePlant]"),true);
  assert.equal(h.run('igniteNature(plant)'),true);
  h.run('scatterSpinifexAt(p.x,p.y,5)');
  assert.equal(h.run('bushes.includes(plant)'),false);
  assert.equal(h.run('burningNatureSet.has(plant)'),false);
  assert.equal(h.run('spinifexScatters.some(f=>f.b.junglePlant===plant.junglePlant)'),true);
 }
});
test('jungle plant images retain masters and use small lazy WebP assets',()=>{
 const h=createGameEngine(root);h.run('startAssetLoading()');
 assert.equal(h.run("JUNGLE_PLANTS.some(k=>COVER_IMG['jungle_'+k])"),false);
 h.run('loadJungleAssets()');const count=h.run('assetLoadTotal');h.run('loadJungleAssets()');assert.equal(h.run('assetLoadTotal'),count);
 for(const key of h.run('JUNGLE_PLANTS')){
  const base=path.join(root,'assets/jungle',key),webp=fs.readFileSync(base+'.webp');
  assert.equal(webp.toString('ascii',8,12),'WEBP');assert.ok(webp.length<40000);
  for(const suffix of ['.png','_source.png','.jpeg'])assert.ok(fs.existsSync(base+suffix));
 }
});

test('expanded jungle props and denser vegetation stay separated and within bounded counts',()=>{
 const dimensions={fallen_log:[190,62,1.3],wood_hut_small:[160,135,1.1*1.1],wood_hut_large:[220,158,1.1*1.1],concrete_hut:[185,156,1.1*1.1],watchtower:[150,205,1.1],wood_watchtower:[150,150*320/295,1.1*2]};
 for(let seed=1;seed<=40;seed++){
  const h=createGameEngine(root,{seed,touch:seed%2===0,width:seed%2===0?390:840});
  h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false)");
  for(const [key,[w,hh,scale]] of Object.entries(dimensions)){
   assert.ok(h.run(`covers.some(c=>c.jungleAsset==='${key}')`),key);
   h.c.key=key;h.c.expectedW=w*scale;h.c.expectedH=hh*scale;
   if(key==='fallen_log'){assert.equal(h.run('covers.filter(c=>c.jungleAsset===key).every(c=>Math.abs(c.jungleSpriteW-expectedW)<1e-8&&Math.abs(c.jungleSpriteH-expectedH)<1e-8&&Math.abs(c.jungleAngle)<=Math.PI/12)'),true);continue;}
   assert.equal(h.run('covers.filter(c=>c.jungleAsset===key).every(c=>Math.abs(c.w-expectedW)<1e-8&&Math.abs(c.h-expectedH)<1e-8)'),true,key);
  }
  assert.equal(h.run('(()=>{const all=[...covers.map(c=>coverSpriteRect(c)||c),...bushes];return all.every((a,i)=>all.slice(i+1).every(b=>a.x>=b.x+b.w||a.x+a.w<=b.x||a.y>=b.y+b.h||a.y+a.h<=b.y));})()'),true,'overlap seed '+seed);
  assert.equal(h.run('covers.length<=80&&bushes.length<=90'),true);
  assert.equal(h.run('covers.every(c=>!circleHitsRect(WW/2,p.y-150,310,coverSpriteRect(c)||c))&&bushes.every(b=>!circleHitsRect(WW/2,p.y-150,310,b))'),true);
  assert.equal(h.run('Object.entries(ZONES[0].jungleDensity.targets).every(([key,n])=>ZONES[0].jungleDensity[key]===n)'),true,'triple population seed '+seed);
  assert.ok(h.run('covers.filter(c=>c.kd===6).length')>=14,'tree density seed '+seed);
  assert.ok(h.run('bushes.filter(b=>!b.junglePlant).length')>=12,'bush density seed '+seed);
  assert.equal(h.run('(()=>{for(let y=ZONES[0].y1+32;y<p.y;y+=16)if(hitsM(WW/2,y,28))return false;return true;})()'),true);
 }
});

test('jungle edge rubble is cached and rebuilt only when destruction changes',()=>{
 const h=createGameEngine(root);
 h.run("loadJungleAssets();covers=[{kd:4,jungleAsset:'wood_hut_large',x:100,y:100,w:220,h:158}];objects=[];carve(210,180,32,false,null);globalThis.edgeDraws=0;globalThis.originalEdgeRubble=drawFragmentEdgeRubble;drawFragmentEdgeRubble=c=>{edgeDraws++;originalEdgeRubble(c);};fragmentDrawFrame++;covers.forEach(drawCoverFragmentGroup)");
 const first=h.run('edgeDraws'),scratch=h.run('jungleFragmentEdgeCanvas');assert.ok(first>0);
 h.run('fragmentDrawFrame++;covers.forEach(drawCoverFragmentGroup)');assert.equal(h.run('edgeDraws'),first);
 assert.equal(h.run('jungleFragmentEdgeCanvas'),scratch);
 h.run('carve(242,180,24,false,null);fragmentDrawFrame++;covers.forEach(drawCoverFragmentGroup)');assert.ok(h.run('edgeDraws')>first);
 assert.equal(h.run('jungleFragmentEdgeCanvas'),scratch);
});

test('rotated jungle logs preserve transformed colliders and partial destruction',()=>{
 for(const angle of [-Math.PI/12,0,Math.PI/12]){
  const h=createGameEngine(root);h.c.angle=angle;
  h.run("loadJungleAssets();globalThis.log={kd:0,jungleAsset:'fallen_log',x:100,y:100};rotateJungleLog(log,angle);covers=[log];objects=[];globalThis.cx=log.x+log.w/2;globalThis.cy=log.y+log.h/2;");
  assert.equal(h.run('jungleCircleHit(log,cx,cy,1)'),true);
  assert.equal(h.run('jungleCircleHit(log,log.x,log.y,0)'),false);
  assert.equal(h.run('jungleSegmentHit(log,{x:cx-200,y:cy},{x:cx+200,y:cy})'),true);
  h.run('carve(cx,cy,20,false,null)');
  assert.ok(h.run('covers.length')>0);
  assert.equal(h.run('covers.every(c=>c.jungleAngle===angle&&c.jungleHitMask===log.jungleHitMask&&c.jungleSpriteW===log.jungleSpriteW&&c.jungleSpriteH===log.jungleSpriteH)'),true);
  assert.equal(h.run('covers.some(c=>jungleCircleHit(c,cx,cy,0))'),false);
  assert.equal(h.run('covers.every(c=>!jungleMaskIntersects(c,c.x,c.y,c.x+c.w,c.y+c.h,(x,y,w,h)=>!jungleCircleHit(log,x+w/2,y+h/2,0)))'),true);
 }
});
test('jungle randomness is seeded, spreads vegetation and stays within log angle limits',()=>{
 const layout=seed=>{const h=createGameEngine(root,{seed});h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false)");return {h,text:h.run('JSON.stringify([covers,bushes],(key,value)=>key.startsWith("_")?undefined:value)')};};
 const a=layout(7),b=layout(7),c=layout(91);assert.equal(a.text,b.text);assert.notEqual(a.text,c.text);
 assert.equal(a.h.run("covers.filter(c=>c.jungleAsset==='fallen_log').every(c=>Math.abs(c.jungleAngle)<=Math.PI/12)"),true);
 assert.ok(a.h.run('new Set([...covers.filter(c=>c.kd===6),...bushes].map(c=>c.y.toFixed(2))).size')>80);
});
