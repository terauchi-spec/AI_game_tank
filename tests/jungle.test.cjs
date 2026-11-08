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
  assert.equal(h.run("(()=>{for(let y=ZONES[0].y1+32;y<p.y;y+=16)if(hitsM(jungleRouteX(ZONES[0],y),y,28))return false;return true;})()"),true);
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
  assert.equal(h.run('plants.every(b=>b.x+b.w/2>=0&&b.x+b.w/2<=WW)'),true);
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
  assert.equal(h.run('(()=>{const check=createJunglePlacement(ZONES[0],false);for(const q of [...covers.map(c=>check.make(c,coverSpriteRect(c)||c))]){if(!check.fits(q,q.x,q.y))return false;check.mark(q,1);}return true;})()'),true,'visible overlap seed '+seed);
  assert.equal(h.run('covers.length<=80&&bushes.length<=218'),true);
  assert.equal(h.run('Object.entries(ZONES[0].jungleDensity.targets).every(([key,n])=>key==="trees"?ZONES[0].jungleDensity[key]>n/3&&ZONES[0].jungleDensity[key]<=n:key==="grass"?ZONES[0].jungleDensity[key]>=n*.85&&ZONES[0].jungleDensity[key]<=n:ZONES[0].jungleDensity[key]===n)'),true,'population target seed '+seed);
  assert.equal(h.run("covers.filter(c=>c.jungleAsset==='palm'||c.jungleAsset==='broadleaf_tree').every(c=>c.w===JUNGLE_ASSETS[c.jungleAsset][1]&&c.h===JUNGLE_ASSETS[c.jungleAsset][2])"),true,'no small palm/broadleaf seed '+seed);
  assert.ok(h.run('bushes.filter(b=>!b.junglePlant).length')>=12,'bush density seed '+seed);
  assert.equal(h.run('(()=>{for(let y=ZONES[0].y1+32;y<p.y;y+=16)if(hitsM(jungleRouteX(ZONES[0],y),y,28))return false;return true;})()'),true);
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
 assert.ok(a.h.run('new Set([...covers.filter(c=>c.kd===6),...bushes].map(c=>c.y.toFixed(2))).size')>60);
});

test('jungle tree and log collision shrinks around its center without changing art or rubble bounds',()=>{
 const h=createGameEngine(root);h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false)");
 assert.equal(h.run("covers.filter(c=>c.kd===6||c.jungleAsset==='fallen_log').every(c=>c.jungleHitScale===.95)"),true);
 assert.equal(h.run("covers.filter(c=>c.kd!==6&&c.jungleAsset!=='fallen_log').every(c=>c.jungleHitScale===undefined)"),true);
 const trees=Array.from(h.run("covers.filter(c=>c.jungleAsset&&(c.kd===6||c.jungleAsset==='fallen_log'))"));
 for(const tree of trees){
  h.c.shrunk=tree;h.c.original={...tree,jungleHitScale:1};
  assert.equal(h.run('(()=>{const cx=shrunk.x+shrunk.w/2,cy=shrunk.y+shrunk.h/2;for(let iy=0;iy<=12;iy++)for(let ix=0;ix<=12;ix++){const x=shrunk.x+shrunk.w*ix/12,y=shrunk.y+shrunk.h*iy/12;if(jungleCircleHit(shrunk,x,y,2)!==jungleCircleHit(original,cx+(x-cx)/.95,cy+(y-cy)/.95,2/.95))return false;}return true;})()'),true,tree.jungleAsset);
  assert.equal(h.run('(()=>{const cx=shrunk.x+shrunk.w/2,cy=shrunk.y+shrunk.h/2,unscale=q=>({x:cx+(q.x-cx)/.95,y:cy+(q.y-cy)/.95});for(let i=0;i<=20;i++){const a={x:shrunk.x-5,y:shrunk.y+shrunk.h*i/20},b={x:shrunk.x+shrunk.w+5,y:a.y+3};if(jungleSegmentHit(shrunk,a,b,1)!==jungleSegmentHit(original,unscale(a),unscale(b),1/.95))return false;}return true;})()'),true,tree.jungleAsset+' segment');
 }
 h.run("globalThis.generic=covers.find(c=>c.kd===6&&!c.jungleAsset)");
 assert.equal(h.run('coverHitCircle(generic).r'),h.run('Math.max(generic.w,generic.h)*.37*.95'));
 h.run("covers=[{kd:6,x:100,y:100,w:83,h:83}]");assert.equal(h.run('coverHitCircle(covers[0]).r'),83*.37);
 h.run("globalThis.log={kd:0,jungleAsset:'fallen_log',x:100,y:100,jungleHitScale:.95};rotateJungleLog(log,Math.PI/12);covers=[log];objects=[];carve(log.x+log.w/2,log.y+log.h/2,20,false,null)");
 assert.equal(h.run('covers.every(c=>c.jungleHitScale===.95&&c.jungleHitMask===log.jungleHitMask)'),true);
 assert.equal(h.run('covers.every(c=>!jungleMaskIntersects(c,c.x,c.y,c.x+c.w,c.y+c.h,(x,y,w,h)=>!jungleCircleHit(log,x+w/2,y+h/2,0),.95))'),true);
});

test('visual placement keeps internal holes free and ignores collision shrink',()=>{
 const h=createGameEngine(root);h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false)");
 const ring=new Uint8Array(2048);for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(x<8||x>=120||y<8||y>=120)ring[y*16+(x>>3)]|=1<<(x&7);
 h.c.ringHex=Buffer.from(ring).toString('hex');
 h.run("JUNGLE_PLACEMENT_MASKS.test_ring=ringHex;globalThis.check=createJunglePlacement(ZONES[0]);globalThis.ring={jungleAsset:'test_ring',x:20,y:ZONES[0].y1+100,w:128,h:128};check.commit(check.make(ring,ring));globalThis.inner={x:50,y:ZONES[0].y1+130,w:40,h:40};globalThis.q=check.make(inner,inner)");
 assert.equal(h.run('check.fits(q,50,130)'),true,'fully enclosed transparent hole stays free');
 assert.equal(h.run('check.fits(q,20,100)'),false,'opaque ring blocks placement');
 h.run("globalThis.a={jungleAsset:'palm',x:20,y:ZONES[0].y1+300,w:136,h:136,jungleHitScale:.95};globalThis.b={...a,jungleHitScale:1}");
 assert.equal(h.run('check.make(a,a).stamp===check.make(b,b).stamp'),true,'visual mask is not the shrunken collision mask');
});
test('visual masks decode only for jungle placement and preserve generic tree artwork after moving',()=>{
 const h=createGameEngine(root);assert.equal(h.run('junglePlacementMaskCache.size'),0);
 h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false);globalThis.tree=covers.find(c=>c.kd===6&&!c.jungleAsset)");
 assert.equal(h.run("naturalCoverImage(tree,'tree')===COVER_IMG[tree.jungleTreeArt]"),true);
 h.run('covers=[tree];objects=[];carve(tree.x+tree.w/2,tree.y+tree.h/2,14,false,null)');
 assert.equal(h.run('covers.every(c=>c.jungleTreeArt===tree.jungleTreeArt)'),true);
 assert.ok(h.run('junglePlacementMaskCache.size')>0);
});

test('jungle grass varies in size, overlaps grass and cover, and uses cached chunks',()=>{
 const h=createGameEngine(root);h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false);globalThis.normalGrass=bushes.filter(b=>!b.spinifex)");
 assert.ok(h.run('normalGrass.length')>72);
 assert.ok(h.run('new Set(normalGrass.map(b=>Math.round(b.w))).size')>20);
 assert.equal(h.run('normalGrass.every(b=>b.w>=66&&b.w<=150&&b.h>=48.4&&b.h<=110)'),true);
 assert.equal(h.run('normalGrass.some((a,i)=>normalGrass.slice(i+1).some(b=>ov2(a,b,0)))'),true);
 assert.equal(h.run('normalGrass.some(b=>covers.some(c=>ov2(b,coverSpriteRect(c)||c,0)))'),true);
 const before=h.run('normalGrass.length');h.run('reconcileBushBuildingPlacement()');assert.equal(h.run('bushes.filter(b=>!b.spinifex).length'),before);
 h.run('ensureGrassBushChunkCache()');assert.equal(h.run('grassBushChunkCache.has(ZONES[0])'),true);
 assert.equal(h.run('normalGrass.every(isGrassBush)'),true);
 h.run('drawGrassBushChunks(0,ZONES[0].y1);globalThis.chunks=grassBushChunkCache.get(ZONES[0]);markGrassBushChunkDirty(normalGrass[0])');
 assert.equal(h.run('chunks.some(ch=>ch.dirty)'),true);
});
test('jungle covers draw once above cached foreground grass while other stages keep their layer',()=>{
 const h=createGameEngine(root);h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false);startAssetLoading();state='play';p.y=ZONES[0].y1+800;globalThis.grassDrawn=false;globalThis.coverLayers=[];globalThis.originalGrassChunks=drawGrassBushChunks;globalThis.originalDrawCover=drawCoverAsset;drawGrassBushChunks=(...args)=>{originalGrassChunks(...args);grassDrawn=true;};drawCoverAsset=c=>{coverLayers.push({after:grassDrawn,key:c.jungleAsset||c.jungleTreeArt||c.kd,ref:c});return originalDrawCover(c);};draw(update(1/60))");
 assert.ok(h.run('coverLayers.length')>0);assert.equal(h.run('coverLayers.every(c=>c.after)'),true);assert.equal(h.run('new Set(coverLayers.map(c=>c.ref)).size===coverLayers.length'),true);
 h.run("ZONES=[{n:'草原',y0:12800,y1:0}]");assert.equal(h.run('jungleCoverLayerActive()'),false);
});

test('jungle plants fill the old central and side gaps while retaining a winding traversable route',()=>{
 for(const seed of [1,7,31,91]){
  const h=createGameEngine(root,{seed});h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false)");
  assert.equal(h.run('bushes.some(b=>b.x<0)&&bushes.some(b=>b.x+b.w>WW)'),true);
  assert.equal(h.run('bushes.some(b=>b.x<WW/2&&b.x+b.w>WW/2)'),true);
  assert.equal(h.run('covers.some(c=>c.kd===6&&(c.x<0||c.x+c.w>WW))'),true);
  assert.ok(h.run('new Set(ZONES[0].jungleWalkRoute.map(q=>Math.round(q.x))).size')>4);
  assert.equal(h.run('(()=>{for(let y=ZONES[0].y1+32;y<p.y;y+=8)if(hitsM(jungleRouteX(ZONES[0],y),y,28))return false;return true;})()'),true);
 }
});

test('placement clips off-map foliage without wrapping occupancy into adjacent rows',()=>{
 const h=createGameEngine(root);h.run("stageMode='base';areaDebugEnabled=true;selectedAreaDebug='密林';reset(false);globalThis.check=createJunglePlacement(ZONES[0],false);globalThis.a={x:-5,y:ZONES[0].y1+100,w:10,h:10};globalThis.q=check.make(a,a);check.commit(q)");
 assert.equal(h.run('check.grid[100*WW]'),1);assert.equal(h.run('check.grid[99*WW+WW-1]'),0);
 h.run('globalThis.b={x:WW-3,y:ZONES[0].y1+200,w:6,h:10};globalThis.right=check.make(b,b)');
 assert.equal(h.run('check.fits(right,right.x,right.y)'),true);h.run('check.commit(right)');
 assert.equal(h.run('check.grid[200*WW+WW-1]'),1);assert.equal(h.run('check.grid[201*WW]'),0);
 h.run('globalThis.top={x:20,y:ZONES[0].y1-5,w:10,h:10};check.commit(check.make(top,top))');
 assert.equal(h.run('check.grid[20]'),1);assert.equal(h.run('check.grid[check.grid.length-1]'),0);
});
