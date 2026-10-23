const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),source=fs.readFileSync(path.join(__dirname,'../js/enemy-bomber.js'),'utf8');
function harness(rolls=[0,.5]){
 const sounds=[],rects=[],texts=[],gradients=[],damage=[],draws=[],terrain=[];let blasts=0,wrecks=0;
 const gm={save(){},restore(){},setTransform(){},beginPath(){},ellipse(){},arc(){},fill(){},stroke(){},fillRect(...args){rects.push(args);},strokeText(){},fillText(...args){texts.push(args[0]);},createLinearGradient(...args){const stops=[];const gradient={args,stops,addColorStop(...s){stops.push(s);}};gradients.push(gradient);return gradient;}};
 const c={ZONES:[{n:'草原',y0:13200,y1:10800},{n:'森林',y0:10800,y1:7000},{n:'草原',y0:7000,y1:2000},{n:'敵司令本部',y0:2000,y1:-400}],stageMode:'front',areaDebugEnabled:false,frontlineBeginner:false,frontlineOni:false,state:'play',WW:960,W:480,H:800,mission:{index:0,enemyWavesStarted:false},view:{x:0,y:8500,w:480,h:800},p:{x:900,y:9000,hp:3,dig:0,tank:null},allies:[],partner:null,hound:null,humans:[],etanks:[],enemyDogs:[],objects:[],debugInvincible:false,shake:0,flash:0,FIGHTER_TYPE:{hp:8},performance:{now:()=>1000},
 R:()=>rolls.length?rolls.shift():.5,isFrontlineBeginner:()=>c.frontlineBeginner,isFrontlineOni:()=>c.frontlineOni,frontlineView:()=>c.view,sfx:s=>sounds.push(s),fb(){blasts++;},burst(){},scatterSpinifexAt(){},cannonCoverDebris(){},damageBridgeByBomb(){},damageObjectsInRadius(){},carve(...args){terrain.push(args);},recordPlayerDamage(...args){damage.push(args);},beginBlastFlight(){},triggerPlayerDeath(){c.state='dying';},wreck(){wrecks++;c.p.tank=null;},stunHound(t){c.hound.stun=t;},partnerVehicleDestroyed(q){q.vehicle=null;q.down=true;},gm,g:gm,drawSupportBomber(...args){draws.push(args);}};
 vm.createContext(c);vm.runInContext(source,c);return{c,sounds,rects,texts,gradients,damage,draws,terrain,get blasts(){return blasts;},get wrecks(){return wrecks;}};
}
function run(s,seconds,step=.05){for(let t=0;t<seconds-1e-9;t+=step)s.c.updateEnemyBomber(Math.min(step,seconds-t));}
function objects(s){const c=s.c;Object.assign(c,{nearbyObjects:()=>c.objects,objectHitRect:o=>o,newCombatAction(){throw Error('enemy blast must never claim player combat credit');},playerCannonGroundImpact(){throw Error('enemy chain must not use player explosion damage');},carveMazeWalls(){}});vm.runInContext(html.slice(html.indexOf('let lastObjectExplosionSfx='),html.indexOf('function drawObject(')),c);}

test('enemy bombers are scheduled only in advanced capture, excluding beginner, Oni, debug and other stages',()=>{
 for(const settings of [{stageMode:'base'},{stageMode:'beginner'},{stageMode:'indoor'},{frontlineBeginner:true},{frontlineOni:true},{areaDebugEnabled:true}]){const s=harness();Object.assign(s.c,settings);s.c.setupEnemyBomber();assert.equal(s.c.mission.enemyAirRaid,undefined);s.c.updateEnemyBomber(100);s.c.drawEnemyBomberWarning();assert.equal(s.rects.length,0);}
 const s=harness();s.c.setupEnemyBomber();assert.ok(s.c.mission.enemyAirRaid);s.c.updateEnemyBomber(100);assert.equal(s.c.mission.enemyAirRaid.phase,'idle');assert.equal(s.sounds.length,0);
});
test('only shuffled areas trigger warnings, including shuffled grassland but excluding the start and HQ',()=>{
 for(const [y,expected] of [[13200,'idle'],[12000,'idle'],[10800,'idle'],[10799,'warning'],[7000,'warning'],[5000,'warning'],[2001,'warning'],[2000,'idle'],[1000,'idle']]){
  const s=harness(),c=s.c;c.p.y=y;c.mission.enemyWavesStarted=true;c.setupEnemyBomber();c.updateEnemyBomber(.1);
  assert.equal(c.mission.enemyAirRaid.phase,expected,`player y=${y}`);
 }
});
test('retreating during a warning defers the pass without spending it and restarts the full warning',()=>{
 const s=harness(),c=s.c;c.setupEnemyBomber();c.mission.enemyWavesStarted=true;c.updateEnemyBomber(.1);c.updateEnemyBomber(7.9);
 const raid=c.mission.enemyAirRaid;c.p.y=12000;c.updateEnemyBomber(.1);assert.equal(raid.phase,'idle');assert.equal(raid.plane,null);assert.equal(raid.remaining,1);assert.equal(raid.passes,0);
 run(s,20);assert.equal(raid.phase,'idle');c.p.y=5000;c.updateEnemyBomber(.1);assert.equal(raid.timer,8);c.updateEnemyBomber(7.99);assert.equal(raid.plane,null);c.updateEnemyBomber(.01);assert.equal(raid.phase,'flight');assert.equal(raid.passes,1);
});
test('aircraft spawn stays inside the random area band even at its edge or after a camera retreat',()=>{
 for(const [playerY,viewY] of [[2001,1400],[10799,11000]]){
  const s=harness(),c=s.c;c.p.y=playerY;c.view.y=viewY;c.setupEnemyBomber();c.mission.enemyWavesStarted=true;c.updateEnemyBomber(.1);c.updateEnemyBomber(8);
  assert.ok(c.mission.enemyAirRaid.plane.y>2000);assert.ok(c.mission.enemyAirRaid.plane.y<10800);
 }
});
test('the exact warning messages precede aircraft appearance by eight seconds',()=>{
 const s=harness([0,.99]),c=s.c;c.setupEnemyBomber();c.mission.enemyWavesStarted=true;c.updateEnemyBomber(.02);const raid=c.mission.enemyAirRaid;assert.equal(raid.phase,'warning');assert.equal(raid.timer,8);c.drawEnemyBomberWarning();assert.deepEqual(s.texts,['敵の通信を傍受！','敵の爆撃機がそちらに向かっている']);
 c.updateEnemyBomber(7.999);assert.equal(raid.plane,null);assert.equal(raid.bombs.length,0);c.updateEnemyBomber(.001);assert.equal(raid.phase,'flight');assert.equal(raid.plane.x,396.8);assert.equal(raid.plane.y,8320);assert.equal(raid.bombs.length,0);
});
test('continuous horizontal positions align warnings and flights, retaining the cached gradient',()=>{
 for(const roll of [0,.125,.25,.375,.5,.625,.75,.875,1]){
  const left=roll*320;
  const s=harness([0,roll]),c=s.c;c.setupEnemyBomber();c.mission.enemyWavesStarted=true;c.updateEnemyBomber(.1);c.drawEnemyBomberWarning();assert.ok(Math.abs(s.rects[0][0]-left)<1e-9);assert.equal(s.rects[0][1],0);assert.ok(Math.abs(s.rects[0][2]-160)<1e-9);assert.equal(s.rects[0][3],150);assert.deepEqual(s.gradients[0].stops,[[0,'rgba(190,22,18,.48)'],[1,'rgba(190,22,18,0)']]);c.drawEnemyBomberWarning();assert.equal(s.gradients.length,1);
  c.updateEnemyBomber(8);assert.ok(Math.abs(c.mission.enemyAirRaid.plane.x-(80+roll*320))<1e-9);c.view.x=40;s.rects.length=0;c.drawEnemyBomberWarning();const [x,,width]=s.rects[0];assert.ok(Math.abs(x-Math.max(0,left-40))<1e-9);assert.ok(Math.abs(width-(left<40?120+left:160))<1e-9);assert.equal(s.texts.at(-1),'敵爆撃機 通過中');
 }
});
test('a full run contains one or two complete 25-bomb carpet passes, with bounded in-flight bombs',()=>{
 for(const [roll,count] of [[0,1],[.99,2]]){
  const s=harness([roll,.5]),c=s.c;c.setupEnemyBomber();c.mission.enemyWavesStarted=true;c.mission.index=1;let peak=0;
  for(let i=0;i<6000;i++){c.updateEnemyBomber(.05);peak=Math.max(peak,c.mission.enemyAirRaid.bombs.length);}
  const raid=c.mission.enemyAirRaid;assert.equal(raid.phase,'done');assert.equal(raid.passes,count);assert.equal(raid.remaining,0);assert.equal(s.blasts,count*25);assert.ok(peak<=4);assert.equal(s.sounds.filter(s=>s==='radio').length,count);s.rects.length=0;c.drawEnemyBomberWarning();assert.equal(s.rects.length,0);
 }
});
test('warning remains active during the aircraft pass and resets cleanly for a new mission',()=>{
 const s=harness(),c=s.c;c.setupEnemyBomber();c.mission.enemyWavesStarted=true;c.updateEnemyBomber(.01);c.updateEnemyBomber(8);run(s,1);assert.equal(c.mission.enemyAirRaid.phase,'flight');c.drawEnemyBomberAircraft();assert.ok(s.draws.some(args=>args[2]===true));c.drawEnemyBomberWarning();assert.ok(s.rects.length>0);
 c.state='dying';const y=c.mission.enemyAirRaid.plane.y;c.updateEnemyBomber(10);assert.equal(c.mission.enemyAirRaid.plane.y,y);s.rects.length=0;c.drawEnemyBomberWarning();assert.equal(s.rects.length,0);
 c.state='play';c.setupEnemyBomber();assert.equal(c.mission.enemyAirRaid.phase,'idle');assert.equal(c.mission.enemyAirRaid.passes,0);assert.equal(c.mission.enemyAirRaid.bombs.length,0);
});
test('bomb damage applies to player troops and companions but never enemy infantry, tanks or dogs',()=>{
 const s=harness(),c=s.c;c.p={x:100,y:100,hp:3,dig:0,tank:null};c.allies=[{x:100,y:100,alive:true},{x:100,y:100,alive:true,chute:1},{x:500,y:500,alive:true}];c.partner={x:100,y:100,hp:3,down:false,vehicle:null};c.hound={x:100,y:100,stun:0};c.humans=[{x:100,y:100,alive:true}];c.etanks=[{x:100,y:100,alive:true,ch:0}];c.enemyDogs=[{x:100,y:100,stun:0}];c.enemyBomberBlast(100,100);
 assert.equal(c.p.hp,2);assert.equal(c.allies[0].alive,false);assert.equal(c.allies[1].alive,true);assert.equal(c.allies[2].alive,true);assert.equal(c.partner.hp,2);assert.equal(c.hound.stun,5);assert.equal(c.humans[0].alive,true);assert.equal(c.etanks[0].ch,0);assert.equal(c.enemyDogs[0].stun,0);assert.deepEqual(s.damage,[[1/3]]);assert.deepEqual(s.terrain[0],[100,100,100,false,null]);
});
test('vehicles take actual damage; shared partner vehicles are not hit twice and hiding/debug protects the player',()=>{
 const s=harness(),c=s.c;c.p={x:100,y:100,hp:3,dig:0,tank:{kind:'tank',ch:0,t:{armor:3}}};c.partner={x:100,y:100,hp:3,down:false,vehicle:c.p.tank};c.enemyBomberBlast(100,100);assert.equal(c.p.tank.ch,1.1);assert.equal(c.partner.hp,3);assert.equal(s.damage.length,1);c.enemyBomberBlast(100,100);c.enemyBomberBlast(100,100);assert.equal(s.wrecks,1);
 c.partner=null;c.p.tank={kind:'truck'};c.enemyBomberBlast(100,100);assert.equal(s.wrecks,2);c.p.tank={kind:'fighter',hp:8};c.enemyBomberBlast(100,100);assert.equal(c.p.tank.hp,5);
 c.p.tank=null;c.p.dig=1;c.enemyBomberBlast(100,100);assert.equal(c.p.hp,3);c.p.dig=0;c.debugInvincible=true;c.enemyBomberBlast(100,100);assert.equal(c.p.hp,3);
});
test('enemy-owned delayed object chains retain enemy immunity and never award combat points',()=>{
 const s=harness(),c=s.c;objects(s);c.objects=[{x:100,y:100,w:20,h:20,kind:'barrel'},{x:180,y:100,w:20,h:20,kind:'crate'}];c.humans=[{x:110,y:110,alive:true}];c.etanks=[{x:110,y:110,alive:true}];c.enemyDogs=[{x:110,y:110,stun:0}];c.enemyBomberBlast(110,110);assert.ok(c.objects.every(o=>o.enemyAirStrikeOrigin&&o.burnT===3));c.updateBurningObjects(3.1);assert.equal(c.objects.length,0);assert.equal(c.humans[0].alive,true);assert.equal(c.etanks[0].alive,true);assert.equal(c.enemyDogs[0].stun,0);
});
test('a later player hit reclaims an enemy-ignited object instead of inheriting enemy immunity',()=>{
 const s=harness(),c=s.c;objects(s);const barrel={x:100,y:100,w:20,h:20,kind:'barrel'};c.objects=[barrel];c.damageObject(barrel,'enemyBomb');assert.equal(barrel.enemyAirStrikeOrigin,true);c.damageObject(barrel,'mg');assert.equal(barrel.enemyAirStrikeOrigin,undefined);
});
test('enemy artwork reuses the support bomber geometry with a blue palette and reversed heading',()=>{
 const s=harness(),c=s.c,colors=[],rotations=[],paths=[];c.g=new Proxy({}, {get:(_o,k)=>(...args)=>{if(k==='rotate')rotations.push(args[0]);if(k==='moveTo'||k==='lineTo')paths.push([k,...args]);},set:(o,k,v)=>{if(k==='fillStyle')colors.push(v);o[k]=v;return true;}});
 vm.runInContext(html.slice(html.indexOf('function drawSupportBomber('),html.indexOf('function armoredShape(')),c);c.drawSupportBomber(0,0);const friendly=JSON.stringify(paths);assert.ok(colors.includes('#596650'));assert.equal(rotations[0],-Math.PI/2);colors.length=0;paths.length=0;rotations.length=0;c.drawSupportBomber(0,0,true);assert.ok(colors.includes('#4b66a1'));assert.equal(rotations[0],Math.PI/2);assert.equal(JSON.stringify(paths),friendly);
});
test('setup, world drawing and screen-space alerts are integrated without altering friendly carpet bombing',()=>{
 assert.match(html,/setupFrontlineBoundary\(\);if\(typeof setupEnemyBomber/);assert.match(html,/updateFrontlineWaves\(dt\);if\(typeof updateEnemyBomber/);assert.match(html,/drawEnemyBomberAircraft\(\)/);assert.match(html,/drawFrontlineVictorySignal\(\);if\(typeof drawEnemyBomberWarning==='function'\)drawEnemyBomberWarning\(\)/);assert.match(html,/<script src="js\/enemy-bomber.js\?v=/);assert.match(html,/maxDrops:25/);assert.match(html,/airstrike\.drop=\.14/);
});

test('friendly and enemy aircraft bombs break bridges into river gaps while preserving surviving spans and current',()=>{
 for(const kind of ['radio','fighter','enemy']){
  const s=harness(),c=s.c;
  Object.assign(c,{bridges:[{x:100,y:200,w:100,h:200,flowDir:-1,flowSpeed:14,burnT:2,bridgeBurn:true},{x:600,y:200,w:100,h:200}],water:[],riverFlowDir:b=>b.flowDir,riverFlowSpeed:b=>b.flowSpeed,newCombatAction:()=>1,stunHoundAtBlast(){},radioStrikeKillContext:0,explode(){},baseHitRect:()=>({x:0,y:0,w:1,h:1}),base:{hp:0}});
  vm.runInContext(html.slice(html.indexOf('function damageBridgeByBomb('),html.indexOf('function bombBlast(')),c);
  vm.runInContext(html.slice(html.indexOf('function airBombBlast('),html.indexOf('function fighterBomb(')),c);
  const blast=()=>kind==='enemy'?c.enemyBomberBlast(150,300):c.airBombBlast(150,300,kind);
  blast();assert.equal(c.bridges.length,3,kind);assert.deepEqual(Array.from(c.bridges,b=>[b.x,b.y,b.h]),[[100,200,58],[100,342,58],[600,200,200]]);
  assert.equal(c.water.length,1);assert.deepEqual(JSON.parse(JSON.stringify(c.water[0])),{x:100,y:258,w:100,h:84,flowDir:-1,flowSpeed:14});
  assert.ok(c.bridges.slice(0,2).every(b=>b.burnT===undefined&&b.bridgeBurn===false));
  blast();assert.equal(c.water.length,1,'repeated blast in an open gap does not add duplicate water');assert.equal(c.radioStrikeKillContext,0);
 }
});
test('aircraft bomb misses leave bridges and river unchanged; direct hits remove a narrow bridge completely',()=>{
 for(const kind of ['radio','enemy']){
  const s=harness(),c=s.c;Object.assign(c,{bridges:[{x:100,y:270,w:100,h:60,flowDir:1,flowSpeed:8}],water:[],riverFlowDir:b=>b.flowDir,riverFlowSpeed:b=>b.flowSpeed,newCombatAction:()=>1,stunHoundAtBlast(){},radioStrikeKillContext:0,explode(){},baseHitRect:()=>({x:0,y:0,w:1,h:1}),base:{hp:0}});
  vm.runInContext(html.slice(html.indexOf('function damageBridgeByBomb('),html.indexOf('function bombBlast(')),c);vm.runInContext(html.slice(html.indexOf('function airBombBlast('),html.indexOf('function fighterBomb(')),c);
  const blast=(x,y)=>kind==='enemy'?c.enemyBomberBlast(x,y):c.airBombBlast(x,y);
  blast(500,300);assert.equal(c.bridges.length,1);assert.equal(c.water.length,0);blast(150,300);assert.equal(c.bridges.length,0);assert.equal(c.water.length,1);assert.equal(c.water[0].h,60);
 }
});
