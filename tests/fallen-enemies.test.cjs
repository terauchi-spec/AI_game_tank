const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/fallen-enemies.js'),'utf8');
function harness(){
 const requests=[],draws=[];let depth=0;const g={save(){depth++;},restore(){depth--;},translate(){},rotate(){},scale(){},drawImage(...args){draws.push(args);}};
 const c={g,stageMode:'base',W:480,H:720,indoorWorld:null,makeAssetImage(src){requests.push(src);return{src,complete:true,naturalWidth:192,naturalHeight:144};},assetOK:im=>!!im?.complete};vm.createContext(c);vm.runInContext(source,c);return{c,requests,draws,get:s=>vm.runInContext(s,c),depth:()=>depth};
}
test('crying flight follows impact direction and settles upright without changing actors',()=>{
 const h=harness(),{c}=h;c.loadFallenEnemyArtwork();
 for(const angle of [0,Math.PI,Math.PI/2,-Math.PI/2]){
  c.clearFallenEnemies();const enemy={x:100,y:100,face:0,alive:true};c.noteEnemyFallHit(enemy,Math.cos(angle),Math.sin(angle));enemy.alive=false;c.rememberFallenEnemy(enemy);
  assert.ok(Math.abs(h.get('fallenEnemies[0].dx')-Math.cos(angle)*18)<1e-8);assert.ok(Math.abs(h.get('fallenEnemies[0].dy')-Math.sin(angle)*18)<1e-8);
  c.drawFallenEnemies(0,0);assert.match(h.draws.at(-1)[0].src,/cry-flying/);
  c.updateFallenEnemies(.3);assert.ok(h.get('fallenEnemies[0].age')>0);c.drawFallenEnemies(0,0);assert.match(h.draws.at(-1)[0].src,/cry-flying/);
  c.updateFallenEnemies(1);c.drawFallenEnemies(0,0);assert.match(h.draws.at(-1)[0].src,/cry-sitting/);
  const age=h.get('fallenEnemies[0].age');c.updateFallenEnemies(NaN);assert.equal(h.get('fallenEnemies[0].age'),age);c.updateFallenEnemies(100);assert.equal(h.get('fallenEnemies.length'),0);
  assert.equal(enemy.x,100);assert.equal(enemy.y,100);assert.equal(h.depth(),0);
 }
});
test('only defeated enemies leave one independent body; living, stunned and retired actors do not',()=>{
 const h=harness(),{c}=h,enemy={x:100,y:100,face:0,alive:true,stun:60};c.rememberFallenEnemy(enemy);assert.equal(h.get('fallenEnemies.length'),0);c.noteEnemyFallHit(enemy,-1,0);enemy.alive=false;c.rememberFallenEnemy(enemy);c.rememberFallenEnemy(enemy);assert.equal(h.get('fallenEnemies.length'),1);assert.equal(h.get('fallenEnemies[0].flip'),-1);enemy.x=999;assert.equal(h.get('fallenEnemies[0].x'),100);
 c.rememberFallenEnemy({x:100,y:100,alive:false,frontRetired:true});assert.equal(h.get('fallenEnemies.length'),1);
});
test('ground bodies survive removed/replenished actors, are bounded, and reset between sorties',()=>{
 const h=harness(),{c}=h;const first={x:0,y:0,alive:false};c.rememberFallenEnemy(first);for(let i=1;i<=100;i++)c.rememberFallenEnemy({x:i,y:100,alive:false});assert.equal(h.get('fallenEnemies.length'),80);assert.equal(h.get('fallenEnemies[0].x'),21);c.rememberFallenEnemy(first);assert.equal(h.get('fallenEnemies.length'),80);c.clearFallenEnemies();assert.equal(h.get('fallenEnemies.length'),0);
});
test('only visible bodies on the active indoor floor are stamped; images load once without pixel processing',()=>{
 const h=harness(),{c}=h;c.loadFallenEnemyArtwork();c.loadFallenEnemyArtwork();assert.equal(h.requests.length,3);c.rememberFallenEnemy({x:100,y:100,alive:false});c.rememberFallenEnemy({x:5000,y:100,alive:false});c.drawFallenEnemies(0,0);assert.equal(h.draws.length,1);assert.equal(h.get('fallenEnemies.length'),1);assert.equal(h.depth(),0);
 c.drawFallenEnemies(1000,0);assert.equal(h.get('fallenEnemies.length'),0);c.drawFallenEnemies(0,0);assert.equal(h.draws.length,1);
 c.clearFallenEnemies();c.stageMode='indoor';c.indoorWorld={currentFloor:0};for(const indoorFloor of [0,1])c.rememberFallenEnemy({x:100,y:100,alive:false,indoorFloor});h.draws.length=0;c.drawFallenEnemies(0,0);assert.equal(h.draws.length,1);c.indoorWorld.currentFloor=1;c.drawFallenEnemies(0,0);assert.equal(h.draws.length,1);assert.equal(h.get('fallenEnemies.length'),0);assert.equal(h.depth(),0);
});
test('real bullets and piercing sniper shots preserve scoring and leave the crying reaction after effects finish',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs'),e=createGameEngine(root,{seed:7}),{run}=e;
 run("stageMode='beginner';skill='throw';reset(false);covers=[];objects=[];water=[];bridges=[];mud=[];bushes=[];cars=[];etanks=[];humans=[];bullets=[];rebuildSpatialGrid();clearFallenEnemies()");
 for(const angle of [Math.PI,0,Math.PI/2]){
  run("humans=[{x:500,y:1000,face:0,alive:true,st:0,sus:0,path:[],cd:1,burstLeft:0}];bullets=[]");run(`fire(500,1000,${angle},'p','v',480,500);update(0)`);assert.equal(run('humans[0].alive'),false);assert.ok(Math.abs(run('fallenEnemies.at(-1).dx')-Math.cos(angle)*18)<1e-8);assert.equal(run('fallenEnemies.at(-1).age'),0);
 }
 run("humans=[{x:500,y:1000,face:0,alive:true,st:0,path:[]}];bullets=[];updateSniperPiercingBullet({x:490,y:1000,vx:-480,vy:0,actionId:0},510,1000);trackEnemyDeaths();trackEnemyDeaths()");assert.equal(run('fallenEnemies.length'),4);assert.equal(run('fallenEnemies.at(-1).flip'),-1);assert.equal(run('scoreStats.humanKills'),4);assert.equal(run('scoreStats.playerKills'),4);assert.equal(run('scoreStats.sniperKills'),1);
 run('humans=[];update(1);drawFallenEnemies(300,800)');assert.equal(run('fallenEnemies.at(-1).age'),1);assert.equal(run('fallenEnemies.length'),4);
 run("reset(false)");assert.equal(run('fallenEnemies.length'),0);
});

test('crying and supine transparent WebP assets are complete nonempty RIFF images',()=>{
 for(const pose of ['cry-flying','cry-sitting','supine']){
  const data=fs.readFileSync(path.join(root,'assets/characters/fallen',pose+'.webp'));
  assert.ok(data.length>1000);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.equal(data.readUInt32LE(4)+8,data.length);
  assert.ok(data.includes(Buffer.from('ALPH')),'transparent alpha channel');
 }
});

test('sniper scope uses the same airborne and seated crying artwork',()=>{
 const h=harness(),{c}=h;c.loadFallenEnemyArtwork();const enemy={sniperFallMax:.72,sniperFallT:.72,sniperFallA:Math.PI};
 assert.equal(c.drawScopedCryingEnemy(enemy,100,100,70),true);assert.match(h.draws.at(-1)[0].src,/cry-flying/);
 enemy.sniperFallT=.01;c.drawScopedCryingEnemy(enemy,100,100,70);assert.match(h.draws.at(-1)[0].src,/cry-sitting/);assert.equal(h.depth(),0);
});

test('requested sprite sizes apply to world and scope, with ten-second expiry',()=>{
 const h=harness(),{c}=h;c.loadFallenEnemyArtwork();const enemy={x:100,y:100,alive:false};c.rememberFallenEnemy(enemy);
 c.drawFallenEnemies(0,0);assert.ok(Math.abs(Math.max(...h.draws.at(-1).slice(3))-44*1.10)<1e-8);
 c.updateFallenEnemies(9.99);c.drawFallenEnemies(0,0);assert.equal(h.get('fallenEnemies.length'),1);assert.ok(Math.abs(Math.max(...h.draws.at(-1).slice(3))-44*.95)<1e-8);
 c.updateFallenEnemies(.02);assert.equal(h.get('fallenEnemies.length'),0);c.rememberFallenEnemy(enemy);assert.equal(h.get('fallenEnemies.length'),0);
 c.drawStunnedEnemy(100,100,0);assert.match(h.draws.at(-1)[0].src,/supine/);assert.ok(Math.abs(Math.max(...h.draws.at(-1).slice(3))-44*1.15)<1e-8);
 for(const [remaining,factor] of [[.72,1.10],[.01,.95]]){c.drawScopedCryingEnemy({sniperFallMax:.72,sniperFallT:remaining},100,100,70);assert.ok(Math.abs(Math.max(...h.draws.at(-1).slice(3))-70*factor)<1e-8);}
 assert.equal(h.depth(),0);
});
test('real enemy stun uses supine until recovery without replacing living allies or scoring a defeat',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs'),{run}=createGameEngine(root,{seed:7});
 run("stageMode='beginner';skill='throw';reset(false);covers=[];objects=[];water=[];bridges=[];mud=[];bushes=[];cars=[];etanks=[];bullets=[];humans=[{x:500,y:1000,face:0,alive:true,stun:.05,st:0,sus:0,path:[],cd:1,burstLeft:0}];rebuildSpatialGrid();clearFallenEnemies();var stunnedDraws=0;var originalStunDraw=drawStunnedEnemy;drawStunnedEnemy=function(...args){stunnedDraws++;return originalStunDraw(...args)}");
 run("soldier(500,1000,0,false,false,false,false,'',false,false,humans[0])");assert.equal(run('stunnedDraws'),1);
 run("soldier(500,1000,0,true,false,false,false,'',false,false,humans[0])");assert.equal(run('stunnedDraws'),1);
 run('update(.1)');assert.equal(run('humans[0].alive'),true);assert.equal(run('humans[0].stun'),0);assert.equal(run('fallenEnemies.length'),0);assert.equal(run('scoreStats.humanKills'),0);
 run("soldier(500,1000,0,false,false,false,false,'',false,false,humans[0])");assert.equal(run('stunnedDraws'),1);
});
