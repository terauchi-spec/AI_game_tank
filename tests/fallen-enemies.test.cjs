const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/fallen-enemies.js'),'utf8');
function harness(){
 const requests=[],draws=[];let depth=0;const g={save(){depth++;},restore(){depth--;},translate(){},rotate(){},scale(){},drawImage(...args){draws.push(args);}};
 const c={g,stageMode:'base',W:480,H:720,indoorWorld:null,makeAssetImage(src){requests.push(src);return{src,complete:true,naturalWidth:192,naturalHeight:144};},assetOK:im=>!!im?.complete};vm.createContext(c);vm.runInContext(source,c);return{c,requests,draws,get:s=>vm.runInContext(s,c),depth:()=>depth};
}
test('front, rear and either flank choose stable directional poses independently of world heading',()=>{
 const {c}=harness();for(const face of [0,.7,Math.PI,-2]){
  assert.equal(c.enemyFallPose(face,face+Math.PI).pose,'supine');assert.equal(c.enemyFallPose(face,face).pose,'prone');assert.equal(c.enemyFallPose(face,face+Math.PI/2).pose,'side');assert.equal(c.enemyFallPose(face,face-Math.PI/2).pose,'side');assert.notEqual(c.enemyFallPose(face,face+Math.PI/2).flip,c.enemyFallPose(face,face-Math.PI/2).flip);
 }
});
test('only defeated enemies leave one independent body; living, stunned and retired actors do not',()=>{
 const h=harness(),{c}=h,enemy={x:100,y:100,face:0,alive:true,stun:60};c.rememberFallenEnemy(enemy);assert.equal(h.get('fallenEnemies.length'),0);c.noteEnemyFallHit(enemy,-1,0);enemy.alive=false;c.rememberFallenEnemy(enemy);c.rememberFallenEnemy(enemy);assert.equal(h.get('fallenEnemies.length'),1);assert.equal(h.get('fallenEnemies[0].pose'),'supine');enemy.x=999;assert.equal(h.get('fallenEnemies[0].x'),100);
 c.rememberFallenEnemy({x:100,y:100,alive:false,frontRetired:true});assert.equal(h.get('fallenEnemies.length'),1);
});
test('ground bodies survive removed/replenished actors, are bounded, and reset between sorties',()=>{
 const h=harness(),{c}=h;const first={x:0,y:0,alive:false};c.rememberFallenEnemy(first);for(let i=1;i<=100;i++)c.rememberFallenEnemy({x:i,y:100,alive:false});assert.equal(h.get('fallenEnemies.length'),80);assert.equal(h.get('fallenEnemies[0].x'),21);c.rememberFallenEnemy(first);assert.equal(h.get('fallenEnemies.length'),80);c.clearFallenEnemies();assert.equal(h.get('fallenEnemies.length'),0);
});
test('only visible bodies on the active indoor floor are stamped; images load once without pixel processing',()=>{
 const h=harness(),{c}=h;c.loadFallenEnemyArtwork();c.loadFallenEnemyArtwork();assert.equal(h.requests.length,3);c.rememberFallenEnemy({x:100,y:100,alive:false});c.rememberFallenEnemy({x:5000,y:100,alive:false});c.drawFallenEnemies(0,0);assert.equal(h.draws.length,1);assert.equal(h.depth(),0);
 c.clearFallenEnemies();c.stageMode='indoor';c.indoorWorld={currentFloor:0};for(const indoorFloor of [0,1])c.rememberFallenEnemy({x:100,y:100,alive:false,indoorFloor});h.draws.length=0;c.drawFallenEnemies(0,0);assert.equal(h.draws.length,1);c.indoorWorld.currentFloor=1;c.drawFallenEnemies(0,0);assert.equal(h.draws.length,2);assert.equal(h.depth(),0);
});
test('real bullets and piercing sniper shots preserve scoring and leave the direction-selected body after effects finish',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs'),e=createGameEngine(root,{seed:7}),{run}=e;
 run("stageMode='beginner';skill='throw';reset(false);covers=[];objects=[];water=[];bridges=[];mud=[];bushes=[];cars=[];etanks=[];humans=[];bullets=[];rebuildSpatialGrid();clearFallenEnemies()");
 for(const [angle,pose] of [[Math.PI,'supine'],[0,'prone'],[Math.PI/2,'side']]){
  run("humans=[{x:500,y:1000,face:0,alive:true,st:0,sus:0,path:[],cd:1,burstLeft:0}];bullets=[]");run(`fire(500,1000,${angle},'p','v',480,500);update(0)`);assert.equal(run('humans[0].alive'),false);assert.equal(run('fallenEnemies.at(-1).pose'),pose);
 }
 run("humans=[{x:500,y:1000,face:0,alive:true,st:0,path:[]}];bullets=[];updateSniperPiercingBullet({x:490,y:1000,vx:-480,vy:0,actionId:0},510,1000);trackEnemyDeaths();trackEnemyDeaths()");assert.equal(run('fallenEnemies.length'),4);assert.equal(run('fallenEnemies.at(-1).pose'),'supine');assert.equal(run('scoreStats.humanKills'),4);assert.equal(run('scoreStats.playerKills'),4);assert.equal(run('scoreStats.sniperKills'),1);
 run('humans=[];drawFallenEnemies(300,800)');assert.equal(run('fallenEnemies.length'),4);
 run("reset(false)");assert.equal(run('fallenEnemies.length'),0);
});

test('all three transparent WebP assets are complete nonempty RIFF images',()=>{
 for(const pose of ['prone','supine','side']){
  const data=fs.readFileSync(path.join(root,'assets/characters/fallen',pose+'.webp'));
  assert.ok(data.length>1000);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.equal(data.readUInt32LE(4)+8,data.length);
  assert.ok(data.includes(Buffer.from('ALPH')),'transparent alpha channel');
 }
});
