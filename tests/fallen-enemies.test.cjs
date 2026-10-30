const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/fallen-enemies.js'),'utf8');
function harness(){
 const requests=[],draws=[],bursts=[];let depth=0;const g={save(){depth++;},restore(){depth--;},translate(){},rotate(){},scale(){},drawImage(...args){draws.push(args);}};
 const c={g,burst(...args){bursts.push(args);},stageMode:'base',W:480,H:720,indoorWorld:null,makeAssetImage(src){requests.push(src);return{src,complete:true,naturalWidth:192,naturalHeight:144};},assetOK:im=>!!im?.complete};vm.createContext(c);vm.runInContext(source,c);return{c,requests,draws,bursts,get:s=>vm.runInContext(s,c),depth:()=>depth};
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
 const h=harness(),{c}=h;c.loadFallenEnemyArtwork();c.loadFallenEnemyArtwork();assert.equal(h.requests.length,9);c.rememberFallenEnemy({x:100,y:100,alive:false});c.rememberFallenEnemy({x:5000,y:100,alive:false});c.drawFallenEnemies(0,0);assert.equal(h.draws.length,1);assert.equal(h.get('fallenEnemies.length'),1);assert.equal(h.depth(),0);
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
 for(const variant of ['','white-','ally-'])for(const pose of ['cry-flying','cry-sitting','supine']){
  const data=fs.readFileSync(path.join(root,'assets/characters/fallen',variant+pose+'.webp'));
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
 c.drawFallenEnemies(0,0);assert.ok(Math.abs(Math.max(...h.draws.at(-1).slice(3))-44*1.10*1.10)<1e-8);
 c.updateFallenEnemies(9.99);c.drawFallenEnemies(0,0);assert.equal(h.get('fallenEnemies.length'),1);assert.ok(Math.abs(Math.max(...h.draws.at(-1).slice(3))-44*.95*.95)<1e-8);
 c.updateFallenEnemies(.02);assert.equal(h.get('fallenEnemies.length'),0);c.rememberFallenEnemy(enemy);assert.equal(h.get('fallenEnemies.length'),0);
 c.drawStunnedEnemy(100,100,0);assert.match(h.draws.at(-1)[0].src,/supine/);assert.ok(Math.abs(Math.max(...h.draws.at(-1).slice(3))-44*1.15*1.10)<1e-8);
 for(const [remaining,factor] of [[.72,1.10*1.10],[.01,.95*.95]]){c.drawScopedCryingEnemy({sniperFallMax:.72,sniperFallT:remaining},100,100,70);assert.ok(Math.abs(Math.max(...h.draws.at(-1).slice(3))-70*factor)<1e-8);}
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

test('expiry emits one allied-style blue burst at the seated location, without off-floor particles',()=>{
 const h=harness(),{c}=h;c.rememberFallenEnemy({x:100,y:100,alive:false,face:0});
 c.updateFallenEnemies(9.99);assert.equal(h.bursts.length,0);c.updateFallenEnemies(.01);
 assert.deepEqual(h.bursts[0],[118,100,18,'#8fd7ff',180]);c.updateFallenEnemies(1);assert.equal(h.bursts.length,1);
 c.stageMode='indoor';c.indoorWorld={currentFloor:0};c.rememberFallenEnemy({x:100,y:100,alive:false,indoorFloor:1});c.updateFallenEnemies(10);assert.equal(h.bursts.length,1);
});
test('simultaneous expiries reuse the real particle cap and do not score additional kills',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs'),{run}=createGameEngine(root,{seed:7});
 run("stageMode='beginner';reset(false);clearFallenEnemies();parts=[];for(let i=0;i<80;i++)rememberFallenEnemy({x:500,y:1000,alive:false});updateFallenEnemies(10)");
 assert.equal(run('fallenEnemies.length'),0);assert.equal(run('parts.length'),run('MAX_PARTS'));assert.equal(run("parts.every(q=>q.col==='#8fd7ff')"),true);assert.equal(run('scoreStats.humanKills'),0);
 run('updateFallenEnemies(1);updateParts(1)');assert.equal(run('parts.length'),0);
});


test('white infantry and commanders retain their artwork in world, stun, and scope',()=>{
 const h=harness(),{c}=h;c.loadFallenEnemyArtwork();
 for(const actor of [{elite:true},{commander:'white'}]){
  c.clearFallenEnemies();const enemy={...actor,x:100,y:100,alive:false};c.rememberFallenEnemy(enemy);
  c.drawFallenEnemies(0,0);assert.match(h.draws.at(-1)[0].src,/white-cry-flying/);
  c.updateFallenEnemies(1);c.drawFallenEnemies(0,0);assert.match(h.draws.at(-1)[0].src,/white-cry-sitting/);
  c.drawStunnedEnemy(100,100,0,undefined,c.fallenSoldierVariant(enemy));assert.match(h.draws.at(-1)[0].src,/white-supine/);
  c.drawScopedCryingEnemy({...actor,sniperFallMax:.72,sniperFallT:.72},100,100,70);assert.match(h.draws.at(-1)[0].src,/white-cry-flying/);
 }
});
test('allied combat losses persist independently without recording a living or distant ally as defeated',()=>{
 const h=harness(),{c}=h;c.loadFallenEnemyArtwork();const ally={x:100,y:100,alive:true};
 c.rememberFallenAlly(ally,-1,0);assert.equal(h.get('fallenEnemies.length'),0);
 ally.alive=false;c.rememberFallenAlly(ally,-1,0);c.rememberFallenAlly(ally,-1,0);
 assert.equal(h.get('fallenEnemies.length'),1);assert.equal(h.get('fallenEnemies[0].flip'),-1);
 c.drawFallenEnemies(0,0);assert.match(h.draws.at(-1)[0].src,/ally-cry-flying/);
 c.updateFallenEnemies(1);c.drawFallenEnemies(0,0);assert.match(h.draws.at(-1)[0].src,/ally-cry-sitting/);
});
test('reinforcement and Frontline ally stun selects olive supine and preserves timed or contact recovery',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs'),{run}=createGameEngine(root,{seed:7});
 run("stageMode='beginner';reset(false);loadFallenEnemyArtwork();var stunVariants=[];drawStunnedEnemy=(x,y,f,s,v)=>{stunVariants.push(v);return true};humans=[];etanks=[];allies=[{x:p.x,y:p.y,alive:true,stun:.05,face:0,shotCd:1}]");
 run("soldier(allies[0].x,allies[0].y,0,true,false,false,false,'',false,false,allies[0])");assert.equal(run('stunVariants.at(-1)'),'ally');
 run('updateAlly(.1)');assert.equal(run('allies[0].alive'),true);assert.equal(run('allies[0].stun'),0);
 run("stageMode='front';allies[0].frontline=true;allies[0].stun=10;allies[0].x=p.x+50;updateAlly(1)");assert.equal(run('allies[0].stun'),9);
 run('allies[0].x=p.x;rescueFrontlineAlly(allies[0])');assert.equal(run('allies[0].stun'),0);assert.equal(run('fallenEnemies.length'),0);
});
test('rocket defeats use allied sprites without kill credit; despawn leaves no reaction',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs'),{run}=createGameEngine(root,{seed:7});
 run("stageMode='beginner';reset(false);humans=[];etanks=[];covers=[];objects=[];cars=[];clearFallenEnemies();allies=[{x:500,y:1000,alive:true}];commanderRocketBlast(500,1000)");
 assert.equal(run('allies[0].alive'),false);assert.equal(run('fallenEnemies[0].variant'),'ally');assert.equal(run('scoreStats.humanKills'),0);
 run("updateAlly(.1);clearFallenEnemies();allies=[{x:p.x,y:p.y-2000,alive:true,shotCd:1}];updateAlly(.1)");assert.equal(run('allies.length'),0);assert.equal(run('fallenEnemies.length'),0);
});

test('enemy bullets and mines leave one olive reaction even after dead allies are filtered',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs'),{run}=createGameEngine(root,{seed:7});
 for(const kind of ['bullet','mine']){
  run("stageMode='beginner';skill='throw';reset(false);covers=[];objects=[];water=[];bridges=[];mud=[];bushes=[];cars=[];etanks=[];humans=[];bullets=[];bombs=[];partner=null;hound=null;p.x=700;p.y=1500;allies=[{x:500,y:1000,alive:true,face:0,shotCd:100,burstLeft:3}];rebuildSpatialGrid();clearFallenEnemies()");
  if(kind==='bullet')run("fire(500,1000,0,'e','r',480,500)");else run("bombs=[{x:500,y:1000,own:'e',t:10}]");
  run('var defeatedAlly=allies[0];update(0)');assert.equal(run('defeatedAlly.alive'),false);assert.equal(run('fallenEnemies.length'),1);assert.equal(run('fallenEnemies[0].variant'),'ally');
  run('updateAlly(.1)');assert.equal(run('allies.length'),0);assert.equal(run('fallenEnemies.length'),1);assert.equal(run('scoreStats.humanKills'),0);
 }
});

// Measured from the shipped assets' alpha >=32 silhouette, independent of render constants.
const cryingAssetMeasurements={
 'cry-flying':{width:192,height:165,solid:188},'cry-sitting':{width:191,height:192,solid:188},
 'white-cry-flying':{width:256,height:221,solid:248},'white-cry-sitting':{width:256,height:219,solid:197},
 'ally-cry-flying':{width:256,height:216,solid:250},'ally-cry-sitting':{width:256,height:212,solid:212}
};
function measuredArt(h){
 for(const [name,m] of Object.entries(cryingAssetMeasurements))Object.assign(h.get(`fallenEnemyArt[${JSON.stringify(name)}]`),{naturalWidth:m.width,naturalHeight:m.height});
}
function visibleCryingSize(draw){
 const name=path.basename(draw[0].src,'.webp'),m=cryingAssetMeasurements[name];
 if(draw.length===5)return m.solid*draw[3]/m.width;
 assert.equal(draw.length,9);const [,sx,sy,sw,sh,dx,dy,dw,dh]=draw;
 assert.ok(sx>=0&&sy>=0&&sx+sw<=m.width&&sy+sh<=m.height,'source frame stays inside its image');
 assert.ok(Math.abs(dw/sw-dh/sh)<1e-10,'aspect ratio preserved');assert.equal(dx,-dw/2);assert.equal(dy,-dh/2);
 return m.solid*dw/sw;
}
test('white and allied crying silhouettes match the blue reference in both world poses',()=>{
 const h=harness();h.c.loadFallenEnemyArtwork();measuredArt(h);
 for(const variant of ['blue','white','ally'])h.c.rememberFallenEnemy({x:100,y:100,alive:false},variant);
 for(const dt of [0,1]){
  h.c.updateFallenEnemies(dt);h.draws.length=0;h.c.drawFallenEnemies(0,0);assert.equal(h.draws.length,3);
  const sizes=h.draws.map(visibleCryingSize);for(const size of sizes)assert.ok(Math.abs(size-sizes[0])<1e-8);
  const blue=h.draws.find(d=>!/(white|ally)-/.test(d[0].src));assert.equal(blue.length,5,'reference blue uses its original untrimmed draw');
 }
});
test('white crying size correction is also applied inside the sniper scope',()=>{
 const h=harness();h.c.loadFallenEnemyArtwork();measuredArt(h);
 for(const remaining of [.72,.01]){
  h.draws.length=0;for(const elite of [false,true])h.c.drawScopedCryingEnemy({elite,sniperFallMax:.72,sniperFallT:remaining},100,100,70);
  assert.ok(Math.abs(visibleCryingSize(h.draws[0])-visibleCryingSize(h.draws[1]))<1e-8);
 }
 for(const variant of ['blue','white','ally']){h.c.drawStunnedEnemy(100,100,0,undefined,variant);assert.equal(h.draws.at(-1).length,5,'stun artwork is not cropped or resized by crying correction');}
});
