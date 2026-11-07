const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
test('jungle debug stage is isolated, traversable and contains all six supplied assets',()=>{
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
 assert.ok(total<400000);
});
