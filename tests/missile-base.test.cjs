const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function stage(id,seed=7){const h=createGameEngine(root,{seed});h.run(`stageMode='base';intermediateStageId=${id==='base'?'null':"'baseIntermediate'"};reset(false);`);return h;}
test('advanced destruction uses missile sprite, mission text and silhouette without changing middle target',()=>{
 const h=stage('base');assert.equal(h.run('baseSpriteKey()'),'missile_base');assert.equal(h.run('base.w'),585);assert.equal(h.run('base.h'),390);assert.equal(h.run('base.x+base.w/2'),480);assert.equal(h.run('base.maxHp'),60);assert.equal(h.run('base.hp'),60);
 assert.equal(h.run("STAGE_ORDER.find(s=>s.id==='base').target"),'戦略ミサイル基地');assert.equal(h.run('STAGE_NAMES.base'),'破壊（上級）：戦略ミサイル基地');
 assert.equal(h.run('circleHitsBase(base.x+base.w*.5,base.y+base.h*.5,3)'),true);
 assert.equal(h.run('circleHitsBase(base.x+base.w*.1,base.y+base.h*.02,2)'),false);
 h.run('const hitX=base.x+base.w*.5,hitY=base.y+base.h*.5;damageBase(3,hitX,hitY,20);');
 assert.equal(h.run('base.hp'),57);assert.equal(h.run('circleHitsBase(hitX,hitY,2)'),false);h.run('drawBase();');
 h.run('damageBase(57,base.x+base.w*.5,base.y+base.h*.7,20);');assert.equal(h.run('base.hp'),0);assert.notEqual(h.run('state'),'play');
 const m=stage('baseIntermediate');assert.equal(m.run('baseSpriteKey()'),'command_building_1');assert.equal(m.run('base.w'),390);assert.equal(m.run('base.h'),336.7);assert.equal(m.run('base.hp'),30);assert.equal(m.run('base.maxHp'),30);assert.match(m.run('STAGE_NAMES.base'),/軍司令施設/);
 const novice=createGameEngine(root);novice.run("stageMode='beginner';reset(false);");assert.equal(novice.run('base.hp'),30);assert.equal(novice.run('base.maxHp'),30);
});

test('missile objective occupies a forest with a clear doorway approach across generated maps',()=>{
 for(const seed of [7,17,42,87,123]){
  const h=stage('base',seed);
  assert.equal(h.run('ZONES.length'),7);
  assert.equal(h.run('ZONES.at(-1).n'),'森林');
  assert.equal(h.run('ZONES.at(-1).missileFacility'),true);
  assert.equal(h.run("ZONES.filter(z=>z.n==='森林').length"),1);
  assert.equal(h.run("ZONES.some(z=>z.n==='敵司令本部')"),false);
  assert.equal(h.run("covers.some(c=>c.kd===6&&zoneAt(c.y).missileFacility)"),true);
  assert.equal(h.run('patrolLineClear({x:base.x+base.w/2,y:base.y+base.h+10},{x:base.x+base.w/2,y:base.y+base.h+100},8)'),true);
 }
 const middle=stage('baseIntermediate');assert.equal(middle.run('ZONES.at(-1).n'),'敵司令本部');
});

test('missile reinforcements emerge at the central doorway and face along the clear exit route',()=>{
 const h=stage('base');h.run('humans=[];etanks=[];cars=[];spawnHQEnemy();');
 assert.equal(h.run('humans.length'),1);
 assert.equal(h.run('humans[0].x'),h.run('base.x+base.w/2'));
 assert.equal(h.run('humans[0].y'),h.run('base.y+base.h+10'));
 assert.equal(h.run('humans[0].face'),Math.PI/2);
 assert.equal(h.run('humans[0].hq'),true);
 assert.equal(h.run('pOK(humans[0].path,8,false)'),true);
 assert.equal(h.run('hitsM(humans[0].x,humans[0].y,8)'),false);
});

test('blocked missile entrance defers reinforcement rather than moving it elsewhere',()=>{
 const h=stage('base');h.run('humans=[];etanks=[];cars=[];spawnHQEnemy();spawnHQEnemy();');
 assert.equal(h.run('humans.length'),1);
 h.run('humans=[];etanks=[{x:base.x+base.w/2,y:base.y+base.h+10,alive:true}];spawnHQEnemy();');
 assert.equal(h.run('humans.length'),0);
 h.run("etanks=[];cars=[{kind:'tank',x:base.x+base.w/2,y:base.y+base.h+10}];spawnHQEnemy();");
 assert.equal(h.run('humans.length'),0);
 h.run('cars=[];patrolLineClear=()=>false;spawnHQEnemy();');assert.equal(h.run('humans.length'),0);
});

test('forest objective retains timed reinforcements only in its own zone and while alive',()=>{
 const h=stage('base');h.run('humans=[];etanks=[];cars=[];p.y=ZONES[1].y0-100;baseSpawnT=0;updateHQSpawn(.1);');
 assert.equal(h.run('humans.length'),0);
 h.run('p.y=base.y+base.h+250;baseSpawnT=0;updateHQSpawn(.1);');assert.equal(h.run('humans.length'),1);
 h.run('humans=[];base.hp=0;baseSpawnT=0;updateHQSpawn(.1);');assert.equal(h.run('humans.length'),0);
});

test('each destruction objective composites its own damaged deck and rubble and caches the result',()=>{
 for(const [id,key] of [['beginner','radio_facility'],['baseIntermediate','command_building_1'],['base','missile_base']]){
  const h=id==='beginner'?createGameEngine(root):stage(id);
  if(id==='beginner')h.run("stageMode='beginner';reset(false)");
  h.run('startAssetLoading()');
  h.c.expectedArt=key;
  assert.ok(h.run(`(()=>{
   if(base.damageArt!==expectedArt||baseDamageCanvas()!==null)return false;
   const deck=COVER_IMG[expectedArt+'-underlay'],rubble=COVER_IMG[expectedArt+'-rubble'];
   if(!assetOK(deck)||!assetOK(rubble))return false;
   const create=gameCanvasContext,events=[];
   gameCanvasContext=()=>new Proxy({
    rect(){events.push('rect');},clip(){events.push('clip');},
    drawImage(im){events.push(im===deck?'deck':im===rubble?'rubble':'roof');}
   },{get:(o,k)=>o[k]??(()=>{})});
   try{
    carveBaseFragments(base.x+base.w/2,base.y+base.h/2,30);
    const partial=baseDamageCanvas();
    if(!partial||partial!==baseDamageCanvas()||events.indexOf('clip')<0||
       events.indexOf('deck')<events.indexOf('clip')||events.indexOf('rubble')<=events.indexOf('deck')||
       events.indexOf('roof')<=events.indexOf('rubble'))return false;
    events.length=0;base.hp=0;
    const destroyed=baseDamageCanvas();
    return destroyed!==partial&&events.join(',')==='deck,rubble';
   }finally{gameCanvasContext=create;}
  })()`),id);
 }
});
