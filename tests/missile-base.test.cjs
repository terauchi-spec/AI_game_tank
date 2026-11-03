const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function stage(id){const h=createGameEngine(root);h.run(`stageMode='base';intermediateStageId=${id==='base'?'null':"'baseIntermediate'"};reset(false);`);return h;}
test('advanced destruction uses missile sprite, mission text and silhouette without changing middle target',()=>{
 const h=stage('base');assert.equal(h.run('baseSpriteKey()'),'missile_base');assert.equal(h.run('base.w'),585);assert.equal(h.run('base.h'),390);assert.equal(h.run('base.x+base.w/2'),480);assert.equal(h.run('base.maxHp'),30);
 assert.equal(h.run("STAGE_ORDER.find(s=>s.id==='base').target"),'戦略ミサイル基地');assert.equal(h.run('STAGE_NAMES.base'),'破壊（上級）：戦略ミサイル基地');
 assert.equal(h.run('circleHitsBase(base.x+base.w*.5,base.y+base.h*.5,3)'),true);
 assert.equal(h.run('circleHitsBase(base.x+base.w*.1,base.y+base.h*.02,2)'),false);
 h.run('const hitX=base.x+base.w*.5,hitY=base.y+base.h*.5;damageBase(3,hitX,hitY,20);');
 assert.equal(h.run('base.hp'),27);assert.equal(h.run('circleHitsBase(hitX,hitY,2)'),false);h.run('drawBase();');
 h.run('damageBase(27,base.x+base.w*.5,base.y+base.h*.7,20);');assert.equal(h.run('base.hp'),0);assert.notEqual(h.run('state'),'play');
 const m=stage('baseIntermediate');assert.equal(m.run('baseSpriteKey()'),'command_building_1');assert.equal(m.run('base.w'),390);assert.equal(m.run('base.h'),336.7);assert.match(m.run('STAGE_NAMES.base'),/軍司令施設/);
});
