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
  const drawn=[];h.run('g').drawImage=(im)=>drawn.push(im._src);
  h.run('covers.forEach(drawCoverFragment)');
  assert.ok(drawn.length>0);
  assert.ok(drawn.every(src=>src.includes('/jungle/'+key+'.webp')));
  h.run('carve(260,260,1000,false,null)');assert.equal(h.run('covers.length'),0);
 }
});
