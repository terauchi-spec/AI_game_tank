const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
test('city factory asset is registered and stays lightweight',()=>{
 const data=fs.readFileSync(path.join(root,'assets/cover/factory_small.webp'));
 assert.ok(data.length>1000&&data.length<80000);
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 const h=createGameEngine(root);
 assert.ok(h.run('COVER_ASSET_SRC.factory_small').endsWith('cover/factory_small.webp'));
});
test('factory debug sample is 1.3x the previous large-building footprint and preserves collision and patrol',()=>{
 const h=createGameEngine(root);
 h.run("stageMode='base';reset(false);areaDebugEnabled=true;setupAreaDebugStage();COVER_IMG.factory_small={complete:true,naturalWidth:224,naturalHeight:187};");
 assert.equal(h.run('FACTORY_SCALE'),1.3);
 assert.equal(h.run('FACTORY_W'),264*1.3);
 assert.equal(h.run('FACTORY_H'),183.7*1.3);
 assert.equal(h.run("covers.filter(c=>c.kd===11).length"),1);
 assert.equal(h.run("drawCoverAsset(covers.find(c=>c.kd===11))"),true);
 assert.equal(h.run("(()=>{const c=covers.find(c=>c.kd===11);return circleHitsCover(c.x+c.w/2,c.y+c.h/2,8,c)})()"),true);
 assert.equal(h.run("PATROL_BUILDING_TYPES.has(11)&&BUILDING_SHADOW_KDS.has(11)"),true);
});
test('street generates 2-3 bigger factories without overlapping other covers',()=>{
 for(const seed of [1,2,3,7,29,91,151,1001,987654321]){
  const h=createGameEngine(root,{seed});
  h.run("stageMode='base';ZONES=[{n:'街',y0:5000,y1:3000,edgeRisk:'left'}];water=[];bridges=[];mud=[];bushes=[];base={x:350,y:100,w:260,h:170};genCovers();");
  const cs=h.run("covers.map(c=>({kd:c.kd,x:c.x,y:c.y*MAP_SCALE,w:c.w,h:c.h}))"),fact=cs.filter(c=>c.kd===11);
  assert.ok(fact.length>=2&&fact.length<=3,'seed '+seed+' factory count '+fact.length);
  for(const c of fact){
   assert.ok(Math.abs(c.w-343.2)<.001&&Math.abs(c.h-238.81)<.001);
   assert.ok(c.y>=3000&&c.y+c.h<=5000);
   for(const q of cs)if(q!==c)assert.equal(c.x<q.x+q.w+14&&c.x+c.w+14>q.x&&c.y<q.y+q.h+14&&c.y+c.h+14>q.y,false,'seed '+seed+' overlap');
  }
 }
});
