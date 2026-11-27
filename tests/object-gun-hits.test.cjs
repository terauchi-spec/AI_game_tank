const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
test('crates and barrels ignite on the second gun hit and explode on the fourth',()=>{
 const h=createGameEngine(path.join(__dirname,'..'));
 for(const kind of ['crate','barrel']){
  h.c.kind=kind;
  h.run(`stageMode='base';objects=[{kind,x:100,y:100,w:40,h:40}];globalThis.o=objects[0];globalThis.explosions=0;explodeObject=(target)=>{explosions++;objects=objects.filter(v=>v!==target);return true};burst=()=>{};`);
  h.run("damageObject(o,'mg')");assert.equal(h.run('o.burnT||0'),0);
  h.run("damageObject(o,'mg')");assert.equal(h.run('o.burnT'),3);
  h.run("damageObject(o,'mg')");assert.equal(h.run('explosions'),0);assert.equal(h.run('o.burnT'),3);
  h.run("damageObject(o,'mg')");assert.equal(h.run('explosions'),1);assert.equal(h.run('objects.length'),0);
 }
});
