const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
test('city factory is registered and its sprite is a lightweight WebP',()=>{
 const asset=path.join(root,'assets/cover/factory_small.webp');assert.ok(fs.existsSync(asset));
 const file=fs.readFileSync(asset);assert.ok(file.length>1000&&file.length<80000);assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');
 const h=createGameEngine(root);assert.ok(h.run('COVER_ASSET_SRC.factory_small').endsWith('cover/factory_small.webp'));
});
test('city factory renders and blocks movement and uses building patrol/shadow rules',()=>{
 const h=createGameEngine(root);
 h.run("stageMode='base';reset(false);areaDebugEnabled=true;setupAreaDebugStage();COVER_IMG.factory_small={complete:true,naturalWidth:224,naturalHeight:187};");
 assert.equal(h.run("covers.filter(c=>c.kd===11).length"),1);
 assert.equal(h.run("PATROL_BUILDING_TYPES.has(11)"),true);
 assert.equal(h.run("BUILDING_SHADOW_KDS.has(11)"),true);
 assert.equal(h.run("drawCoverAsset(covers.find(c=>c.kd===11))"),true);
 assert.equal(h.run("(()=>{const c=covers.find(c=>c.kd===11);return circleHitsCover(c.x+c.w/2,c.y+c.h/2,8,c)})()"),true);
});
test('factory substitutes one existing city building, preserving total placed cover count',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.includes('const cityStart=covers.length;'));
 assert.ok(html.includes('const cityBuildings=covers.slice(cityStart).filter('));
 assert.ok(html.includes('if(cityBuildings.length)cityBuildings[(R()*cityBuildings.length)|0].kd=11;'));
});
