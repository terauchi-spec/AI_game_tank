const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 let seed=3;const calls=[];
 const gm=new Proxy({}, {get:(o,k)=>o[k]||((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
 const c={WW:960,WH:12800,W:480,H:800,TANK_HIT:28,cars:[],etanks:[],p:{x:480,y:10000,body:0},stageMode:'front',debugMode:0,weather:'clear',areaDebugEnabled:false,mission:{points:[],index:0,enemyRoster:[],enemyRosterIndex:0},humans:[],enemyDogs:[],allies:[],allySeq:0,covers:[],bridges:[],gm,
 performance:{now:()=>1000},patrolRoutePlanAt:0,PATROL_SEARCH_PENDING:Symbol('pending'),findPatrolReturnPath:()=>null,R:()=>((seed=(seed*1664525+1013904223)>>>0)/2**32),D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),hitsM:()=>false,hitsC:()=>false,inWaterAt:()=>false,inBase:()=>false,patrolLineClear:()=>true,missionSpot:(x,y)=>({x,y}),rebuildSpatialGrid(){},ensureEnemyTankSpawns(){},setSkillCooldown(){},sfx(){},say(){},
 mv:(a,dx,dy)=>{a.x+=dx;a.y+=dy;},dogMoveAround:(h,q,sp,dt)=>{const angle=Math.atan2(q.y-h.y,q.x-h.x);h.x+=Math.cos(angle)*sp*dt;h.y+=Math.sin(angle)*sp*dt;}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/frontline.js'),'utf8'),c);
 vm.runInContext(html.slice(html.indexOf('function missionAllies('),html.indexOf('function setupMission(')),c);
 vm.runInContext(html.slice(html.indexOf('function moveAllySmart('),html.indexOf('function stunHuman(')),c);
 vm.runInContext(html.slice(html.indexOf('function summonAlly('),html.indexOf('let partner=null;')),c);
 c.calls=calls;c.get=s=>vm.runInContext(s,c);return c;
}
test('spawn points are above the camera in narrow and wide views, including paired dogs',()=>{
 const c=harness();for(const width of [320,480,840]){c.W=width;for(const hasDog of [false,true]){const q=c.frontlineSpawnSpot(hasDog),v=c.frontlineView();assert.ok(q.y<v.y-60);assert.ok(q.x>v.x&&q.x<v.x+width);if(hasDog)assert.ok(q.y+75<v.y-60);}}
});
test('blocked or top-of-world entries defer spawning instead of teleporting on screen',()=>{
 const c=harness();c.hitsM=()=>true;assert.equal(c.frontlineSpawnSpot(),null);assert.equal(c.spawnFrontlineWave(),0);c.hitsM=()=>false;c.p.y=100;assert.equal(c.frontlineSpawnSpot(),null);assert.equal(c.spawnFrontlineWave(),0);
});
test('waves stop at 16 live infantry and spawn without a detected target or a patrol route',()=>{
 const c=harness();for(let i=0;i<20;i++)c.spawnFrontlineWave(6);assert.equal(c.humans.length,16);assert.ok(c.humans.every(h=>h.frontMarch&&h.face===Math.PI/2&&h.st===0&&h.path.length===0));
});
test('reserve infantry classes are retained; dogs enter only with their handler',()=>{
 const c=harness(),dog={},handler={alive:true,dogHandler:true,dog},blue={alive:true,commander:'blue'},white={alive:true,commander:'white',elite:true};dog.handler=handler;c.humans=[handler,blue,white];c.enemyDogs=[dog];c.setupFrontlineArmy();c.p.y-=800;c.updateFrontlineEnemyEntry();assert.ok(c.humans.includes(handler)&&c.humans.includes(blue)&&c.humans.includes(white));assert.equal(c.enemyDogs.length,1);assert.equal(c.enemyDogs[0].handler,handler);assert.equal(dog.y-handler.y,75);
});
test('southbound movement does not reverse into a patrol loop',()=>{
 const c=harness(),h={x:400,y:9000,frontLaneX:400,frontMarch:true};for(let i=0;i<100;i++)c.moveFrontlineEnemy(h,.1,30);assert.ok(Math.abs(h.y-9300)<1e-6);assert.equal(h.frontLaneX,400);
});
test('off-screen retirements cannot count as kills and remove dog pairs',()=>{
 const c=harness(),h={x:400,y:c.frontlineView().y+c.H+210,alive:true,frontMarch:true};c.humans=[h];c.enemyDogs=[{handler:h}];c.cleanupFrontlineArmy(1);assert.equal(h.frontRetired,true);assert.equal(h.scoreCounted,true);assert.equal(c.humans.length,0);assert.equal(c.enemyDogs.length,0);
});
test('unrecorded combat deaths remain until ordinary score tracking counts them',()=>{
 const c=harness();c.humans=[{alive:false,scoreCounted:false}];c.cleanupFrontlineArmy(1);assert.equal(c.humans.length,1);c.humans[0].scoreCounted=true;c.cleanupFrontlineArmy(1);assert.equal(c.humans.length,0);
});
test('frontline soldier speeds are assigned once in the 50–100% range; reinforcements share it',()=>{
 const c=harness();c.missionAllies(9000);assert.equal(c.allies.length,6);const speeds=c.allies.map(a=>a.speedScale);assert.ok(speeds.every(s=>s>=.5&&s<=1));assert.ok(new Set(speeds).size>1);c.summonAlly();const a=c.allies.at(-1);assert.ok(a.speedScale>=.5&&a.speedScale<=1);c.stageMode='base';c.summonAlly();assert.equal(c.allies.at(-1).speedScale,1);
});
test('50% and 100% soldiers actually cover half and full baseline distance, without changing partners',()=>{
 const c=harness();for(const scale of [.5,1]){const a={x:0,y:0,speedScale:scale};c.moveAllySmart(a,{x:0,y:1000},135,1);assert.ok(Math.abs(a.y-135*scale)<1e-6);}const partner={x:0,y:0};c.moveAllySmart(partner,{x:0,y:1000},135,1);assert.equal(partner.y,135);
});
test('capture gauge has correct fraction, countdown and contested/paused labels',()=>{
 const c=harness();let v=c.frontlineCaptureVisual({progress:12,capturing:true});assert.equal(v.fraction,.25);assert.equal(v.remaining,36);assert.equal(v.label,'制圧まで 36.0秒');assert.ok(c.frontlineCaptureVisual({progress:6,contested:true}).label.includes('敵が範囲内'));assert.ok(c.frontlineCaptureVisual({progress:6}).label.includes('一時停止'));assert.equal(c.frontlineCaptureVisual({progress:99}).fraction,1);
});
test('capture ring is drawn only on the active circle, and quarter time draws a quarter arc',()=>{
 const c=harness(),q={},m={index:0,points:[q],progress:12,capturing:true};c.drawFrontlineCaptureRing(q,100,200,m);const arcs=c.calls.filter(x=>x[0]==='arc');assert.equal(arcs.length,2);assert.ok(arcs.every(arc=>arc[3]===360));assert.ok(Math.abs(arcs[1][5]-arcs[1][4]-Math.PI/2)<1e-6);const count=c.calls.length;c.drawFrontlineCaptureRing({},100,200,m);assert.equal(c.calls.length,count);
});
test('navigation anchor stays below the top-right area label at different viewport widths',()=>{
 const c=harness();for(const width of [480,840]){c.W=width;const q=c.frontlineArrowPosition();assert.equal(q.x,width-26);assert.ok(q.y>40);assert.ok(q.y+13<100);}
});
test('frontline-specific initialization leaves other stages alone',()=>{
 const c=harness();c.stageMode='base';const original=[{alive:true}];c.humans=original;c.setupFrontlineArmy();assert.equal(c.humans,original);assert.equal(c.spawnFrontlineWave(),0);
});

test('white commanders can engage and fire without patrol waypoints',()=>{
 for(const route of [[],undefined,[{x:800}]]){
  const c=harness(),moves=[];Object.assign(c,{commanderVelocity:{x:0,y:0},WHITE_CHASE_DROP:2000,COMMANDER_WHITE_RANGE:700,COMMANDER_BLUE_RANGE:700,bullets:[],performance:{now:()=>1000},
   findDetectedTarget:()=>({key:'p'}),enterHumanFound(){},targetObj:key=>key==='p'?c.p:null,enemyModePaused:()=>false,los:()=>true,commanderMove:(h,q)=>moves.push({...q}),fire:()=>c.bullets.push({})});
  vm.runInContext(html.slice(html.indexOf('function updateCommanderAI('),html.indexOf('function commanderRocketBlast(')),c);
  const h={x:480,y:9700,alive:true,commander:'white',st:1,target:'p',path:route,frontMarch:true,frontLaneX:200,commanderTactics:0,commanderMode:'intercept',commanderCharge:0};
  const expectedSide=(route?.[0]?.x??h.frontLaneX)<c.WW/2?1:-1;
  assert.doesNotThrow(()=>c.updateCommanderAI(h,.1));assert.equal(moves[0].y,c.p.y+expectedSide*100);
  for(let i=0;i<200;i++)c.updateCommanderAI(h,.1);
  assert.ok(moves.length>10);assert.ok(moves.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)));assert.ok(c.bullets.length>=3);assert.ok(c.bullets.every(b=>b.commanderRifle&&b.commanderShooter===h));
 }
});

test('Frontline allies stop and aim for half a second before a burst, and re-aim on a target switch',()=>{
 const c=harness(),shots=[];c.los=()=>true;c.fire=(...a)=>shots.push(a);const a={x:480,y:10000,alive:true,shotCd:0,burstLeft:3},t={x:480,y:9900,alive:true};
 for(let i=0;i<4;i++)c.updateFrontlineAlly(a,t,.1);assert.equal(shots.length,0);assert.equal(a.y,10000);
 c.updateFrontlineAlly(a,t,.1);assert.equal(shots.length,1);assert.equal(a.y,10000);
 a.shotCd=0;c.updateFrontlineAlly(a,{...t},.1);assert.equal(shots.length,1);
 c.updateFrontlineAlly(a,null,.1);assert.equal(a.frontAimT,0);assert.equal(a.frontAimTarget,null);
});
test('allies cannot shoot through cover or while approaching a distant enemy',()=>{
 const c=harness();let shots=0;c.fire=()=>shots++;c.los=()=>false;const a={x:480,y:10000,shotCd:0,burstLeft:3,speedScale:1};
 c.updateFrontlineAlly(a,{x:480,y:9900},1);assert.equal(shots,0);
 c.updateFrontlineAlly(a,{x:480,y:9800},.1);assert.equal(shots,0);assert.equal(a.frontAimT,0);assert.ok(a.y<10000);
});
test('allied advance stops at the viewport limit and waits at least two seconds for the player',()=>{
 const c=harness(),limit=c.frontlineAllyLimit(),a={x:480,y:limit+5};assert.equal(c.frontlineAllyWaiting(a,.1),true);
 c.p.y-=200;assert.equal(c.frontlineAllyWaiting(a,.5),true);assert.equal(c.frontlineAllyWaiting(a,1),true);assert.equal(c.frontlineAllyWaiting(a,5),false);
 c.p.y+=1000;assert.equal(c.frontlineAllyWaiting(a,3),true);
});
test('detours cannot cross the allied advance limit and speed randomization still applies',()=>{
 const c=harness(),limit=c.frontlineAllyLimit(),a={x:480,y:limit+15,speedScale:.5};let speed;
 c.dogMoveAround=(a,q,sp)=>{speed=sp;a.y=limit-20;a.x+=20;};c.moveFrontlineAlly(a,{x:480,y:limit-500},135,1);
 assert.equal(speed,67.5);assert.equal(a.y,limit+15);assert.equal(a.x,480);assert.equal(a.frontAllyNav,true);
});
test('spawn sites require a free southbound corridor, not only a free center',()=>{
 const c=harness(),q={x:480,y:9000};assert.equal(c.frontlineSpawnExitClear(q),true);
 c.hitsM=(x,y)=>y>9030&&y<9070;assert.equal(c.frontlineSpawnExitClear(q),false);
 c.hitsM=()=>false;c.patrolLineClear=()=>false;assert.equal(c.frontlineSpawnExitClear(q),false);
 c.patrolLineClear=()=>true;c.cars=[{x:480,y:9060}];assert.equal(c.frontlineSpawnExitClear(q),false);
 c.cars=[];c.humans=[{x:480,y:9060,alive:true}];assert.equal(c.frontlineSpawnExitClear(q),false);
});
test('Frontline aiming does not change other stages',()=>{
 const c=harness();c.stageMode='base';const a={x:480,y:10000};assert.equal(c.updateFrontlineAlly(a,{},1),false);assert.equal(a.frontAimT,undefined);
});
test('the settled advance position enters waiting instead of getting stuck just short of its trigger',()=>{
 const c=harness(),a={x:480,y:10000,shotCd:0,burstLeft:3,speedScale:1,frontline:true};c.mission.points=[{x:480,y:3000}];
 for(let i=0;i<600;i++)c.updateFrontlineAlly(a,null,.1);
 assert.ok(a.y>=c.frontlineAllyLimit());assert.equal(a.frontHolding,true);
 const y=a.y;c.p.y-=200;c.updateFrontlineAlly(a,null,.5);assert.equal(a.y,y);for(let i=0;i<50;i++)c.updateFrontlineAlly(a,null,.1);assert.ok(a.y<y);
});
test('allies left at a distant objective cannot capture it without the player advancing',()=>{
 const c=harness();vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);
 const q={x:480,y:3000};c.mission={points:[q],index:0,progress:0,waveT:999,reinforceT:999};c.allies=[{...q,alive:true,frontline:true}];
 c.updateMission(10);assert.equal(c.mission.progress,0);assert.equal(c.mission.capturing,false);
 c.p.y=q.y+100;c.updateMission(1);assert.equal(c.mission.progress,2);assert.equal(c.mission.capturing,true);
});

test('a stunned Frontline ally needs on-foot contact and line of sight to recover',()=>{
 const c=harness();c.los=()=>true;const a={x:c.p.x,y:c.p.y-30,alive:true,stun:5,stunRecover:1};
 assert.equal(c.rescueFrontlineAlly(a),false);a.y=c.p.y-15;c.p.tank={};assert.equal(c.rescueFrontlineAlly(a),false);c.p.tank=null;c.los=()=>false;assert.equal(c.rescueFrontlineAlly(a),false);
 c.los=()=>true;assert.equal(c.rescueFrontlineAlly(a),true);assert.equal(a.stun,0);assert.equal(a.stunRecover,0);assert.equal(a.shotCd,.2);assert.equal(c.rescueFrontlineAlly(a),false);
 a.stun=5;c.stageMode='base';assert.equal(c.rescueFrontlineAlly(a),false);a.alive=false;c.stageMode='front';assert.equal(c.rescueFrontlineAlly(a),false);
});
test('each objective triggers a six-person counterattack only on the player’s first entry',()=>{
 const c=harness(),q={x:c.p.x,y:c.p.y-400};let calls=0,total=0;c.spawnFrontlineWave=(n,point)=>{calls++;total+=n;assert.equal(point,q);return n;};
 c.updateFrontlineCounterattack(q,.1);assert.equal(calls,0);c.p.y-=50;c.updateFrontlineCounterattack(q,.1);assert.equal(total,6);assert.equal(q.counterTriggered,true);assert.equal(q.counterBluePending,2);
 c.p.y+=500;c.updateFrontlineCounterattack(q,2);c.p.y-=500;c.updateFrontlineCounterattack(q,2);assert.equal(calls,1);
});
test('counterattacks retry safely after a full enemy cap and include two blue commanders',()=>{
 const c=harness(),q={x:c.p.x,y:c.p.y};c.humans=Array.from({length:16},()=>({alive:true,x:100,y:100}));c.updateFrontlineCounterattack(q,.1);assert.equal(q.counterPending,6);assert.equal(c.humans.length,16);
 c.humans=[];c.updateFrontlineCounterattack(q,1);assert.equal(c.humans.length,6);assert.equal(q.counterPending,0);assert.equal(q.counterBluePending,0);assert.ok(c.humans.filter(h=>h.commander==='blue').length>=2);assert.ok(c.humans.every(h=>h.frontObjective.x===q.x&&h.frontObjective.y===q.y&&h.y<c.frontlineView().y));
});
test('ordinary waves retain a blue commander for every four spawned enemies after reserves run out',()=>{
 const c=harness();let blue=0;for(let i=0;i<5;i++){c.spawnFrontlineWave(4);blue+=c.humans.filter(h=>h.commander==='blue').length;c.humans=[];}
 assert.equal(blue,5);assert.equal(c.mission.enemySpawned,20);
});
test('counterattack troops move toward the captured area instead of marching past its lane',()=>{
 const c=harness(),h={x:200,y:9000,frontLaneX:200,frontObjective:{x:480,y:9200}};c.moveFrontlineEnemy(h,1,30);assert.ok(h.x>200&&h.y>9000);
});
test('blue commander and regular blue soldier use equal body heights despite differing image widths',()=>{
 const c=harness(),b={naturalWidth:175,naturalHeight:192},commander={naturalWidth:182,naturalHeight:192},calls=[];
 Object.assign(c,{CHARACTER_GRAPHICS_MODE:'webp',CHARACTER_GRAPHICS_SCALE:.84,CHARACTER_ART:{blue:b,blue_commander:commander},performance:{now:()=>1000},g:c.gm,assetOK:()=>true,characterArtKey:(p,e,t)=>t==='blue'?'blue_commander':'blue',characterGait:()=>0,drawOverheadCutout:(...a)=>calls.push(a)});
 const source=fs.readFileSync(path.join(__dirname,'../js/characters.js'),'utf8');vm.runInContext(source.slice(source.indexOf('function drawCharacterWebP('),source.indexOf('function drawCharacterProne(')),c);
 for(const type of ['', 'blue'])c.drawCharacterWebP(0,0,0,false,false,false,false,type,false,false);
 assert.equal(calls[0][2],calls[1][2]);assert.equal(calls[0][1],32);assert.ok(calls[1][1]>32);delete c.CHARACTER_ART.blue;c.drawCharacterWebP(0,0,0,false,false,false,false,'blue',false,false);assert.equal(calls[2][2],calls[1][2]);
});
test('Frontline blast stun lasts ten seconds without adding an extra recovery delay',()=>{
 const c=harness();vm.runInContext(html.slice(html.indexOf('function stunHumanBlast('),html.indexOf('function beginBlastFlight(')),c);
 const a={x:480,y:9500,alive:true};c.allies=[a];c.stunHumanBlast(a,5);assert.equal(a.stun,10);assert.equal(a.stunRecover,0);
 c.updateFrontlineAllyStun(a,9.9);assert.ok(a.stun>0);c.updateFrontlineAllyStun(a,.11);assert.equal(a.stun,0);assert.equal(a.stunRecover,0);
 const enemy={alive:true};c.stunHumanBlast(enemy,5);assert.equal(enemy.stun,5);assert.equal(enemy.stunRecover,1);
 c.stageMode='base';a.stun=0;c.stunHumanBlast(a,5);assert.equal(a.stun,5);assert.equal(a.stunRecover,1);
});
test('contact still recovers a Frontline ally before the ten-second timeout',()=>{
 const c=harness();c.los=()=>true;const a={x:c.p.x,y:c.p.y-10,alive:true,stun:9,stunRecover:0};c.updateFrontlineAllyStun(a,.1);assert.equal(a.stun,0);assert.equal(a.shotCd,.2);
});

test('ally sight distinguishes front, rear, range, corner angles and solid cover',()=>{
 const c=harness(),a={x:480,y:10000,face:-Math.PI/2};let checks=0;c.los=()=>{checks++;return true;};
 assert.equal(c.frontlineAllyCanSee(a,{x:480,y:9701,alive:true}),true);
 for(const h of [{x:480,y:9699,alive:true},{x:480,y:10100,alive:true},{x:680,y:9990,alive:true},{x:480,y:9900,alive:false}])assert.equal(c.frontlineAllyCanSee(a,h),false);
 assert.equal(checks,1);c.los=()=>false;assert.equal(c.frontlineAllyCanSee(a,{x:480,y:9900,alive:true}),false);
 c.los=()=>true;assert.equal(c.frontlineAllyCanSee(a,{x:480,y:9600,alive:true},true),true);assert.equal(c.frontlineAllyCanSee(a,{x:480,y:9570,alive:true},true),false);
 c.weather='rain';assert.equal(c.frontlineAllySightRange(),225);c.weather='sandstorm';assert.equal(c.frontlineAllySightRange(),165);
});
test('allies acquire only visible enemies, retain a visible target and lose it behind cover',()=>{
 const c=harness(),a={x:480,y:10000,face:-Math.PI/2},rear={x:480,y:10050,alive:true},front={x:480,y:9800,alive:true};c.los=()=>true;c.humans=[rear,front];
 c.refreshFrontlineAllyTargets([a]);assert.equal(a._combatTarget,front);
 const closer={x:480,y:9900,alive:true};c.humans.push(closer);c.refreshFrontlineAllyTargets([a]);assert.equal(a._combatTarget,front);
 c.los=()=>false;c.refreshFrontlineAllyTargets([a]);assert.equal(a._combatTarget,null);
});
test('found mode runs faster, searches last known position without tracking hidden movement, then returns to patrol',()=>{
 const c=harness(),a={x:480,y:10000,face:-Math.PI/2,speedScale:1},t={x:480,y:9700,alive:true};c.los=()=>true;
 c.updateFrontlineAlly(a,t,.1);assert.equal(a.frontMode,'found');assert.ok(Math.abs(Math.hypot(a.x-480,a.y-10000)-20.25)<1e-6);assert.ok(a.y<10000);assert.equal(a.frontMoving,true);
 t.x=800;c.updateFrontlineAlly(a,null,.1);assert.equal(a.frontLastSeen.x,480);assert.equal(a.frontLastSeen.y,9700);assert.equal(a.frontMode,'found');
 c.updateFrontlineAlly(a,null,2);assert.equal(a.frontMode,'patrol');assert.equal(a.frontLastSeen,null);
});
test('a dead tracked enemy clears found mode immediately; waiting still limits combat pursuit',()=>{
 const c=harness(),a={x:480,y:c.frontlineAllyLimit()+5,face:-Math.PI/2,speedScale:1},t={x:480,y:a.y-250,alive:true};
 const y=a.y;c.updateFrontlineAlly(a,t,.1);assert.equal(a.y,y);assert.equal(a.frontMode,'found');t.alive=false;c.updateFrontlineAlly(a,null,.1);assert.equal(a.frontMode,'patrol');
});
test('ally vision cones stay hidden while found markers disappear when stunned',()=>{
 const c=harness();c.g=c.gm;const marks=[];c.lab=(...a)=>marks.push(a);const a={x:480,y:10000,face:-Math.PI/2,frontMode:'found'};
 c.drawFrontlineAllyVision(a);assert.equal(c.calls.filter(x=>x[0]==='arc').length,0);assert.equal(marks.length,1);
 const count=c.calls.length;a.stun=5;c.drawFrontlineAllyVision(a);assert.equal(c.calls.length,count);c.stageMode='base';a.stun=0;c.drawFrontlineAllyVision(a);assert.equal(c.calls.length,count);
});

function mazeHarness(mode,seed=3){
 const c=harness();Object.assign(c,{stageMode:mode,MAP_SCALE:4,ZONES:[{n:'敵迷路基地',y0:9000,y1:7000}],water:[],bridges:[],mud:[],bushes:[],base:{x:0,y:-1000,w:1,h:1},BLOCK_WALL_LONG:128,BLOCK_WALL_SHORT:32,BARRIER_LONG:126,BARRIER_SHORT:39,CRATE_W:74.8,CRATE_H:74.8,BARREL_SIZE:39.1,nearBridge:()=>false,coverFragmentRect:q=>q});
 c.R=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 vm.runInContext(html.slice(html.indexOf('function genCovers('),html.indexOf('const AREA_DEBUG_ORDER=')),c);return c;
}
test('Frontline maze restores at least 2.5 times the sparse wall count across twenty seeds',()=>{
 for(let seed=1;seed<=20;seed++){
  const base=mazeHarness('base',seed),front=mazeHarness('front',seed),sparse=mazeHarness('front',seed);vm.runInContext('openFrontlineMaze='+front.openFrontlineMaze.toString().replace('walls.length*.55','walls.length*.15'),sparse);base.genCovers();front.genCovers();sparse.genCovers();
  const normal=base.covers.filter(c=>c.mazeWall).length,reduced=front.covers.filter(c=>c.mazeWall).length;
  assert.ok(normal>400);assert.ok(reduced>=sparse.covers.filter(c=>c.mazeWall).length*2.5,`${seed}: restored ${reduced}`);assert.ok(reduced<=normal*.7,`${seed}: ${reduced}/${normal}`);
 }
});
test('all three Frontline maze lanes remain clear of walls, defense barriers and crate colliders',()=>{
 for(let seed=1;seed<=10;seed++){
  const c=mazeHarness('front',seed);c.genCovers();c.genObjects();const lanes=c.ZONES[0].frontlineMazeLanes;
  assert.equal(lanes.length,3);assert.ok(lanes.every(l=>l.w>=150&&l.h===2000));
  for(const cover of c.covers)assert.equal(c.frontlineMazeLaneBlocked({...cover,y:cover.y*4}),false);
  for(const o of c.objects)assert.equal(c.frontlineMazeLaneBlocked({...o,y:o.y*4}),false);
 }
});
test('base maze generation is identical with and without Frontline hooks',()=>{
 const current=mazeHarness('base',3),baseline=mazeHarness('base',3);baseline.openFrontlineMaze=()=>{};baseline.frontlineMazeLaneBlocked=()=>false;
 for(const c of [current,baseline]){c.genCovers();c.genObjects();}
 assert.equal(JSON.stringify(current.covers),JSON.stringify(baseline.covers));assert.equal(JSON.stringify(current.objects),JSON.stringify(baseline.objects));assert.equal(current.ZONES[0].frontlineMazeLanes,undefined);
});

test('the whole Frontline formation waits until the player advances 240px north',()=>{
 const c=harness();c.mission.advanceStartY=c.p.y;c.mission.advanceReleased=false;c.mission.points=[{x:480,y:3000}];c.missionAllies(c.p.y-100);
 const start=c.allies.map(a=>({x:a.x,y:a.y}));for(let i=0;i<100;i++){c.updateFrontlineAdvance();for(const a of c.allies)c.updateFrontlineAlly(a,null,.1);}
 assert.deepEqual(c.allies.map(a=>({x:a.x,y:a.y})),start);c.p.x+=400;c.updateFrontlineAdvance();assert.equal(c.mission.advanceReleased,false);
 c.p.y+=500;c.updateFrontlineAdvance();assert.equal(c.mission.advanceReleased,false);c.p.y=c.mission.advanceStartY-239;c.updateFrontlineAdvance();assert.equal(c.mission.advanceReleased,false);
 c.p.y--;c.updateFrontlineAdvance();assert.equal(c.mission.advanceReleased,true);for(const a of c.allies)c.updateFrontlineAlly(a,null,.1);
 assert.ok(c.allies.every((a,i)=>a.y<start[i].y));c.p.y+=1000;c.updateFrontlineAdvance();assert.equal(c.mission.advanceReleased,true);
});
test('waiting troops can defend in place but cannot pursue before the shared start signal',()=>{
 const c=harness();c.mission.advanceReleased=false;c.los=()=>true;let shots=0;c.fire=()=>shots++;
 const a={x:480,y:10000,shotCd:0,burstLeft:3,speedScale:1},near={x:480,y:9900,alive:true};c.updateFrontlineAlly(a,near,.5);assert.equal(shots,1);assert.equal(a.y,10000);
 c.updateFrontlineAlly(a,{x:480,y:9700,alive:true},.1);assert.equal(a.y,10000);
});
test('initial advance gating does not affect other stages or missions without a gate',()=>{
 const c=harness();c.stageMode='base';c.mission.advanceReleased=false;c.mission.advanceStartY=c.p.y+500;c.updateFrontlineAdvance();assert.equal(c.mission.advanceReleased,false);
 c.stageMode='front';delete c.mission.advanceReleased;assert.equal(c.frontlineAllyWaiting({x:480,y:10000},.1),false);
});

test('capture progress scales with one, two and three active friendly people inside the circle',()=>{
 for(const count of [1,2,3]){
  const c=harness(),q={x:480,y:10000,counterTriggered:true,playerEntered:true};c.mission={points:[q],index:0,progress:0,waveT:999,reinforceT:999};c.p.y=10400;c.allies=Array.from({length:count},()=>({x:480,y:10000,alive:true,frontline:true}));
  vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);c.updateMission(1);
  assert.equal(c.mission.captureCount,count);assert.equal(c.mission.captureRate,count);assert.equal(c.mission.progress,count);
  assert.equal(c.frontlineCaptureVisual(c.mission).remaining,(48-count)/count);
 }
});
test('capture completes after 48, 24 and 16 seconds for one, two and three people',()=>{
 for(const count of [1,2,3]){
  const c=harness(),q={x:480,y:10000,counterTriggered:true,playerEntered:true};c.mission={points:[q,{x:480,y:6500},{x:480,y:3000}],index:0,progress:0,waveT:999,reinforceT:999};c.p.y=10400;c.allies=Array.from({length:count},()=>({x:480,y:10000,alive:true,frontline:true}));
  vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);
  c.updateMission(48/count-.01);assert.equal(c.mission.index,0);assert.ok(c.mission.progress<48);assert.notEqual(q.done,true);
  c.updateMission(.02);assert.equal(c.mission.index,1);assert.equal(q.done,true);assert.equal(c.mission.progress,0);
 }
});
test('each capture area requires its own first ground player entry; leaving afterwards keeps it unlocked',()=>{
 const c=harness(),q={x:480,y:10000,counterTriggered:true},next={x:480,y:9600,counterTriggered:true};c.mission={points:[q,next,{x:480,y:3000}],index:0,progress:0,waveT:999,reinforceT:999};c.p.y=10400;c.allies=[{x:480,y:10000,alive:true,id:1}];
 vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);
 c.updateMission(1);assert.equal(c.mission.progress,0);assert.equal(c.mission.capturing,false);assert.equal(c.mission.captureReady,false);assert.match(c.frontlineCaptureVisual(c.mission).label,/プレイヤーの進入待ち/);
 c.p.y=10360;c.updateMission(1);assert.equal(c.mission.captureReady,false);
 c.p.y=10000;c.p.tank={kind:'fighter'};c.updateMission(1);assert.equal(c.mission.captureReady,false);assert.equal(c.mission.progress,0);
 c.p.tank=null;c.updateMission(1);assert.equal(q.playerEntered,true);assert.equal(c.mission.progress,2);
 c.p.y=10400;c.updateMission(1);assert.equal(c.mission.captureReady,true);assert.equal(c.mission.progress,3);
 c.mission.progress=47.99;c.updateMission(.02);assert.equal(c.mission.index,1);
 c.allies=[{x:480,y:9600,alive:true,id:2}];c.p.y=10000;c.updateMission(1);assert.equal(c.mission.progress,0);assert.equal(c.mission.captureReady,false);assert.notEqual(next.playerEntered,true);
 c.p.y=9600;c.updateMission(1);assert.equal(next.playerEntered,true);assert.equal(c.mission.progress,2);
});
test('a lone player cannot capture, and the gauge pauses when the last active ally leaves or is stunned',()=>{
 const c=harness(),q={x:480,y:10000,counterTriggered:true,playerEntered:true};c.mission={points:[q],index:0,progress:5,waveT:999,reinforceT:999};
 vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);
 for(const dig of [0,1]){c.p.dig=dig;c.updateMission(1);assert.equal(c.mission.captureCount,0);assert.equal(c.mission.progress,5);assert.equal(c.mission.capturing,false);}
 assert.match(c.frontlineCaptureVisual(c.mission).label,/味方兵の合流待ち/);
 c.p.dig=0;const a={x:480,y:10000,alive:true,id:1};c.allies=[a];c.updateMission(1);assert.equal(c.mission.captureCount,2);assert.equal(c.mission.progress,7);
 a.stun=1;c.updateMission(1);assert.equal(c.mission.progress,7);assert.equal(c.mission.captureCount,0);
 a.stun=0;a.y=10400;c.updateMission(1);assert.equal(c.mission.progress,7);
 a.y=10000;c.updateMission(1);assert.equal(c.mission.progress,9);
});
test('the active capture circle explains the allied requirement before any progress is earned',()=>{
 const c=harness(),q={x:480,y:10000},m={points:[q],index:0,progress:0,captureCount:0,capturing:false};
 c.drawFrontlineCaptureRing(q,100,200,m);assert.ok(c.calls.some(call=>call[0]==='fillText'&&call[1]==='味方兵の合流待ち'));
 const count=c.calls.length;c.p.y=10400;c.drawFrontlineCaptureRing(q,100,200,m);assert.equal(c.calls.length,count);
});
test('nearby tanks receive capture alarms from active allied soldiers only, including across cover and behind them',()=>{
 const c=harness(),q={x:480,y:10000},a={...q,alive:true,id:7},e={x:480,y:9450,ang:-Math.PI/2};c.mission.points=[q];c.los=()=>false;
 assert.equal(c.frontlineTankAreaTarget(e),null);c.allies=[a];assert.equal(c.frontlineTankAreaTarget(e).key,'ally:7');
 const b={x:480,y:9900,alive:true,id:8};c.allies.push(b);assert.equal(c.frontlineTankAreaTarget(e).key,'ally:8');
 for(const flag of ['stun','stunRecover','chute','blastAirT']){a[flag]=1;b[flag]=1;assert.equal(c.frontlineTankAreaTarget(e),null);a[flag]=b[flag]=0;}
 e.y=9399;assert.equal(c.frontlineTankAreaTarget(e),null);e.y=9400;assert.ok(c.frontlineTankAreaTarget(e));
 q.done=true;assert.equal(c.frontlineTankAreaTarget(e),null);q.done=false;c.stageMode='base';assert.equal(c.frontlineTankAreaTarget(e),null);c.stageMode='front';c.areaDebugEnabled=true;assert.equal(c.frontlineTankAreaTarget(e),null);
});
test('capture counts exclude stunned, recovering, descending, airborne and out-of-circle troops',()=>{
 const c=harness(),q={x:480,y:10000};c.allies=[{...q,alive:true},{...q,alive:true,stun:1},{...q,alive:true,stunRecover:1},{...q,alive:true,chute:1},{...q,alive:true,blastAirT:1},{...q,alive:false},{x:480,y:10370,alive:true}];
 assert.equal(c.frontlineCaptureCount(q),2);c.p.tank={kind:'fighter'};assert.equal(c.frontlineCaptureCount(q),1);
 c.p.tank=null;c.p.dig=1;assert.equal(c.frontlineCaptureCount(q),1);
});
test('the expanded 360px circle shares entry, capture, awareness and contest boundaries',()=>{
 const c=harness(),q={x:480,y:10000,counterTriggered:true};c.mission={points:[q],index:0,progress:0,waveT:999,reinforceT:999};c.p.y=10360;
 const a={x:839,y:10000,alive:true,id:1};c.allies=[a];
 vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);
 c.updateMission(1);assert.equal(c.mission.captureReady,false);assert.equal(c.mission.progress,0);assert.equal(c.frontlineCombatPoint(a),q);
 c.p.y=10359;c.updateMission(1);assert.equal(c.mission.captureReady,true);assert.equal(c.mission.progress,2);
 a.x=840;assert.equal(c.frontlineAllyCanCapture(a,q),false);assert.equal(c.frontlineCombatPoint(a),null);
 a.x=839;c.humans=[{x:480,y:10389,alive:true}];c.updateMission(1);assert.equal(c.mission.contested,true);assert.equal(c.mission.capturing,false);
 c.humans[0].y=10390;c.updateMission(1);assert.equal(c.mission.contested,false);assert.equal(c.mission.capturing,true);
});
test('capture area grants all-around alert even across cover, while shooting still waits for line of sight',()=>{
 const c=harness(),q={x:480,y:10000},a={...q,alive:true,face:-Math.PI/2,shotCd:0,burstLeft:3},h={x:480,y:10100,alive:true};c.mission.points=[q];c.humans=[h];c.allies=[a];c.los=()=>false;let shots=0;c.fire=()=>shots++;
 assert.equal(c.frontlineAllyCanSee(a,h),true);c.refreshFrontlineAllyTargets([a]);assert.equal(a._combatTarget,h);assert.equal(a.frontTargetVisible,false);c.updateFrontlineAlly(a,h,1);assert.equal(a.frontMode,'found');assert.equal(shots,0);
 c.updateFrontlineAlly(a,null,.1);assert.equal(a.frontMode,'found');c.p.y=9000;a.y=9000;c.updateFrontlineAlly(a,null,3);assert.equal(a.frontMode,'patrol');
});
test('enemies inside a capture area detect opponents there from any direction and across cover',()=>{
 const c=harness(),q={x:480,y:10000},h={x:480,y:9900,alive:true,face:-Math.PI/2};c.mission.points=[q];c.los=()=>false;
 assert.equal(c.frontlineEnemyAreaTarget(h).key,'p');c.p.y=9000;assert.equal(c.frontlineEnemyAreaTarget(h),null);
 c.allies=[{x:480,y:10000,alive:true,id:7}];assert.equal(c.frontlineEnemyAreaTarget(h).key,'ally:7');c.stageMode='base';assert.equal(c.frontlineEnemyAreaTarget(h),null);
});
test('opening infantry wait for 800px of player advance; waves cannot leak out early',()=>{
 const c=harness();c.humans=[{alive:true}];c.setupFrontlineArmy();const start=c.p.y;assert.equal(c.humans.length,0);assert.equal(c.spawnFrontlineWave(6),0);
 c.p.y=start-799;c.updateFrontlineEnemyEntry();assert.equal(c.humans.length,0);c.p.y--;c.updateFrontlineEnemyEntry();assert.equal(c.humans.length,6);assert.equal(c.mission.enemyWavesStarted,true);
 c.updateFrontlineEnemyEntry();assert.equal(c.humans.length,6);assert.equal(c.mission.waveT,6);
});

test('a stalled ally requests the shared incremental search and stays still while it is pending',()=>{
 const c=harness(),a={x:480,y:10000,speedScale:1},goal={x:480,y:9700};let requests=0;c.dogMoveAround=()=>{};
 c.findPatrolReturnPath=(start,end,r,owner)=>{requests++;assert.equal(owner,a);assert.equal(r,10);return c.PATROL_SEARCH_PENDING;};
 for(let i=0;i<29;i++)c.moveFrontlineAlly(a,goal,135,.1);assert.equal(requests,0);c.moveFrontlineAlly(a,goal,135,.2);assert.equal(requests,1);assert.equal(a.y,10000);
});
test('an ally can back out of a U-shaped building pocket and reach the far side',()=>{
 const c=harness();let clock=1000;c.performance.now=()=>clock;c.p.y=9000;
 c.covers=[{x:360,y:9000,w:240,h:180},{x:330,y:9160,w:40,h:220},{x:590,y:9160,w:40,h:220}];
 c.hitsC=(x,y,r)=>c.covers.some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h);
 c.mv=(a,dx,dy)=>{if(!c.hitsC(a.x+dx,a.y,8))a.x+=dx;if(!c.hitsC(a.x,a.y+dy,8))a.y+=dy;};
 c.dogMoveAround=(a,q,sp,dt)=>{const angle=Math.atan2(q.y-a.y,q.x-a.x);c.mv(a,Math.cos(angle)*sp*dt,Math.sin(angle)*sp*dt);};
 vm.runInContext(html.slice(html.indexOf('function patrolLineClear('),html.indexOf('function movePatrolReturn(')),c);
 for(const scale of [.5,1]){
  const a={x:480,y:9192,speedScale:scale},goal={x:480,y:8800};let maxY=a.y;
  for(let i=0;i<800;i++){clock+=50;c.patrolSearchBudgetMs=2;c.moveFrontlineAlly(a,goal,135,.05);maxY=Math.max(maxY,a.y);assert.equal(c.hitsC(a.x,a.y,8),false);if(c.D(a,goal)<8)break;}
  assert.ok(maxY>9380);assert.ok(c.D(a,goal)<8,JSON.stringify(a));
 }
});
test('a temporary advance-limit goal inside cover uses a free waiting point',()=>{
 const c=harness(),goal={x:480,y:9600};c.hitsC=(x,y)=>Math.abs(x-480)<90&&Math.abs(y-9600)<70;
 const q=c.frontlineInfantryDetourGoal({x:480,y:9800},goal);assert.ok(q);assert.equal(c.hitsC(q.x,q.y,12),false);assert.ok(q.y>=c.frontlineAllyLimit()+12);
});
test('changed destinations and rebuilt cover invalidate an ally’s cached detour',()=>{
 const c=harness(),a={x:480,y:10000,speedScale:1};c.moveFrontlineAlly(a,{x:480,y:9700},135,.1);const first=a.frontNav;
 c.moveFrontlineAlly(a,{x:680,y:9700},135,.1);assert.notEqual(a.frontNav,first);const second=a.frontNav;c.covers=[];c.moveFrontlineAlly(a,{x:680,y:9700},135,.1);assert.notEqual(a.frontNav,second);
});
test('camera movement alone does not discard a useful detour toward the same objective',()=>{
 const c=harness(),a={x:480,y:10000,speedScale:1},goal={x:480,y:3000};c.moveFrontlineAlly(a,goal,135,.1);const nav=a.frontNav;
 c.p.y-=150;c.moveFrontlineAlly(a,goal,135,.1);assert.equal(a.frontNav,nav);
});

test('Frontline infantry clearance is larger than separation distance, preventing repeated pushes',()=>{
 const c=harness();vm.runInContext(html.slice(html.indexOf('function enemyUnitBlocked('),html.indexOf('// 敵戦車は描画')),c);
 const mover={x:480,y:9900,alive:true,frontMarch:true},other={x:480,y:10000,alive:true};c.humans=[mover,other];
 assert.equal(c.enemyUnitBlocked(mover,480,9972,8),true);assert.equal(c.enemyUnitBlocked(mover,480,9971,8),false);
 mover.frontMarch=false;assert.equal(c.enemyUnitBlocked(mover,480,9972,8),false);
});
test('enemy marching keeps a stable forward waypoint and does not reset detours every frame',()=>{
 const c=harness(),h={x:480,y:9000,alive:true,frontMarch:true,frontLaneX:480};c.moveFrontlineEnemy(h,.1,30);const nav=h.frontNav,goalY=h.frontMarchGoalY;
 c.moveFrontlineEnemy(h,.1,30);assert.equal(h.frontNav,nav);assert.equal(h.frontMarchGoalY,goalY);assert.ok(h.y>9000);
});
test('an enemy holding behind an obstacle keeps its unmodified movement heading',()=>{
 const c=harness(),h={x:480,y:9000,alive:true,frontMarch:true,frontMoveFace:.4,face:1.7};c.dogMoveAround=()=>{};
 assert.equal(c.moveFrontlineEnemy(h,.1,30),.4);h.face=2.1;assert.equal(c.moveFrontlineEnemy(h,.1,30),.4);
});
test('Frontline blue and white commanders and ordinary pursuers share the bounded detour mover',()=>{
 const c=harness();c.moveEliteBombAvoidance=()=>false;c.mazeComparisonEnemyFrozen=()=>false;c.targetObj=()=>({x:480,y:9000});let calls=0;c.moveFrontlineInfantry=()=>calls++;
 vm.runInContext(html.slice(html.indexOf('function commanderMove('),html.indexOf('function cancelCommanderAttack(')),c);
 vm.runInContext(html.slice(html.indexOf('function moveHumanChase('),html.indexOf('function moveAllySmart(')),c);
 for(const type of ['blue','white'])c.commanderMove({frontMarch:true,commander:type},{x:480,y:9000},.1,95);
 c.moveHumanChase({frontMarch:true},0,95,.1);assert.equal(calls,3);
});

test('a squad keeps distinct routes and waiting positions instead of merging at the objective center',()=>{
 const c=harness(),q={x:480,y:3000};c.mission.points=[q];
 const squad=Array.from({length:6},(_,i)=>({id:i+1,x:480,y:10000,alive:true,frontline:true,speedScale:.75}));
 for(let frame=0;frame<1200;frame++)for(const a of squad){c.updateFrontlineAlly(a,null,.05);assert.ok(a.y>=c.frontlineAllyLimit());}
 assert.ok(new Set(squad.map(a=>Math.round(a.x))).size>=4);assert.ok(new Set(squad.map(a=>Math.round(a.y))).size>=4);assert.ok(squad.every(a=>a.frontHolding));
 const goals=squad.map(a=>c.frontlineAllyObjective(a,q));assert.ok(new Set(goals.map(g=>Math.round(g.x))).size>=4);
 for(let i=0;i<squad.length;i++)assert.equal(c.frontlineAllyObjective(squad[i],q),goals[i]);
 c.p.y=3000;for(const a of squad){a.x=480;a.y=3300;a.frontHolding=false;a.frontWaitT=0;}
 for(let frame=0;frame<900;frame++)for(const a of squad)c.updateFrontlineAlly(a,null,.05);
 assert.ok(squad.every(a=>c.D(a,q)<c.get('FRONTLINE_CAPTURE_RADIUS')));assert.ok(new Set(squad.map(a=>Math.round(a.x))).size>=4);
});
test('pace changes smoothly inside the 50–100% band and resting never prevents reacting to a target',()=>{
 const c=harness(),a={id:1,x:480,y:10000,frontline:true,speedScale:.75};c.mission.points=[{x:480,y:3000}];const seen=new Set();
 for(let i=0;i<500;i++){const previous=a.frontStyle?.pace??.75;c.updateFrontlineAlly(a,null,.05);const pace=a.frontStyle.pace;assert.ok(pace>=.5&&pace<=1);assert.ok(Math.abs(pace-previous)<=.00500001);seen.add(pace.toFixed(2));}
 assert.ok(seen.size>=5);
 c.p.y=9000;a.x=480;a.y=9200;a.frontHolding=false;a.frontWaitT=0;a.frontStyle.rest=.8;const old={x:a.x,y:a.y};c.updateFrontlineAlly(a,{x:480,y:8800,alive:true},.1);assert.equal(a.frontStyle.rest,0);assert.equal(a.frontMode,'found');assert.ok(c.D(a,old)>0);
});

test('only Frontline enemy tanks double their range, field of view and known-target range',()=>{
 const c=harness(),e={x:0,y:10000,alive:true},h={x:0,y:10000,alive:true},target={x:600,y:10000};c.etanks=[e];c.humans=[h];
 Object.assign(c,{DETECT_CENTER_HALF:7.5*Math.PI/180,DETECT_OUTER_HALF:52.5*Math.PI/180,WHITE_CHASE_DROP:2000,partner:null,inBush:()=>false,inTumbleweed:()=>false,los:()=>true,detectRange:()=>315,detectOuterRange:()=>220.5,detectDropRange:()=>472.5,angD:(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b))});
 vm.runInContext(html.slice(html.indexOf('function canDetect('),html.indexOf('function findDetectedTarget(')),c);
 assert.equal(c.canDetect(e,target,0,'ally:1'),true);assert.equal(c.canDetect(h,target,0,'ally:1'),false);c.stageMode='base';assert.equal(c.canDetect(e,target,0,'ally:1'),false);c.stageMode='front';
 target.x=630;assert.equal(c.canDetect(e,target,0,'ally:1'),false);
 for(const angle of [100,106]){target.x=400*Math.cos(angle*Math.PI/180);target.y=10000+400*Math.sin(angle*Math.PI/180);assert.equal(c.canDetect(e,target,0,'ally:1'),angle===100);}
 e.st=1;e.target='ally:1';target.x=900;target.y=10000;assert.equal(c.canDetect(e,target,0,'ally:1'),true);target.x=945;assert.equal(c.canDetect(e,target,0,'ally:1'),false);
 c.los=()=>false;target.x=600;assert.equal(c.canDetect(e,target,0,'ally:1'),false);
});
test('the third objective alone uses a 540px capture circle for progress, awareness and rendering',()=>{
 const c=harness();vm.runInContext(html.slice(html.indexOf('function setupMission('),html.indexOf('function completeMission(')),c);c.setupMission();
 assert.deepEqual(Array.from(c.mission.points,q=>c.frontlineCaptureRadius(q)),[360,360,540]);const q=c.mission.points[2];q.counterTriggered=true;c.mission.index=2;c.mission.waveT=999;c.mission.reinforceT=999;
 c.p.x=q.x;c.p.y=q.y+500;const a={x:q.x,y:q.y+500,alive:true,id:7};c.allies=[a];assert.equal(c.frontlineCaptureCount(q),2);assert.equal(c.frontlineCombatPoint(a),q);
 vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);c.updateMission(1);assert.equal(c.mission.progress,2);assert.equal(q.playerEntered,true);
 const h={x:q.x,y:q.y-400,alive:true};c.los=()=>false;assert.equal(c.frontlineAllyCanSee(a,h),true);assert.ok(c.frontlineEnemyAreaTarget(h));
 c.drawFrontlineCaptureRing(q,100,200,c.mission);assert.ok(c.calls.filter(call=>call[0]==='arc').every(call=>call[3]===540));
 a.y=q.y+540;assert.equal(c.frontlineAllyCanCapture(a,q),false);
});
test('regular waves use six-second spacing and accelerate to three seconds when nearby enemies are scarce',()=>{
 for(const nearby of [0,4]){
  const c=harness(),view=c.frontlineView(),times=[];let clock=0;c.mission.enemyWavesStarted=true;c.mission.waveT=6;c.mission.waveCheckT=1;
  c.humans=Array.from({length:nearby},()=>({x:view.x+50,y:view.y+50,alive:true}));c.spawnFrontlineWave=n=>{assert.equal(n,2);times.push(clock);return n;};
  for(let i=0;i<200;i++){clock+=.1;c.updateFrontlineWaves(.1);}
  assert.ok(times.length>=(nearby?3:6));for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]<=(nearby?6.11:3.11));
  c.mission.enemyWavesStarted=false;const count=times.length;c.mission.waveT=0;c.updateFrontlineWaves(10);assert.equal(times.length,count);
 }
});
test('remote off-screen infantry release spawn slots without awarding kills',()=>{
 const c=harness(),view=c.frontlineView();c.humans=Array.from({length:16},()=>({x:view.x-200,y:view.y+100,alive:true,frontMarch:true}));const retired=c.humans.slice();
 c.cleanupFrontlineArmy(1);assert.equal(c.humans.length,0);assert.ok(retired.every(h=>h.frontRetired&&h.scoreCounted&&!h.alive));
 c.mission.enemyWavesStarted=true;c.mission.waveT=0;c.updateFrontlineWaves(.1);assert.equal(c.humans.length,2);assert.ok(c.humans.every(h=>h.y<c.frontlineView().y));
});

function startingVehiclesHarness(){
 const c=harness();Object.assign(c,{TRUCK_TYPE:{id:'truck',hp:5,fmax:100},ARMORED_TYPE:{id:'armored',hp:7.5,cmax:0,vmax:120,fmax:95}});c.p.y=12400;c.missionAllies(c.p.y-100);return c;
}
test('Frontline starts with two fueled trucks and two armed armored cars behind the squad, without duplicating them',()=>{
 const c=startingVehiclesHarness(),existing={x:100,y:5000};c.cars=[existing];assert.equal(c.setupFrontlineVehicles(),4);assert.equal(c.cars.length,5);assert.equal(c.cars[0],existing);
 const added=c.cars.slice(1),back=Math.max(...c.allies.map(a=>a.y));assert.equal(added.filter(v=>v.kind==='truck').length,2);assert.equal(added.filter(v=>v.t.id==='armored').length,2);
 for(let i=0;i<added.length;i++){const v=added[i];assert.ok(v.y>back);assert.ok(v.x>=52&&v.x<=c.WW-52&&v.y<=c.WH-52);assert.equal(v.f,v.t.fmax);assert.equal(v.v,v.t.vmax||0);assert.equal(v.hp,v.t.hp);for(let j=0;j<i;j++)assert.ok(c.D(v,added[j])>=108);}
 assert.equal(c.setupFrontlineVehicles(),0);assert.equal(c.cars.length,5);
});
test('starting vehicles search for clear positions and never overlap cover or a blocked exit',()=>{
 const c=startingVehiclesHarness();c.hitsM=(x,y)=>x>330&&x<630&&y<12580;c.patrolLineClear=q=>q.x<300||q.x>660;
 assert.equal(c.setupFrontlineVehicles(),4);assert.ok(c.cars.every(v=>!c.hitsM(v.x,v.y,44)&&c.patrolLineClear(v)));
 const blocked=startingVehiclesHarness();blocked.hitsM=()=>true;assert.equal(blocked.setupFrontlineVehicles(),0);assert.equal(blocked.cars.length,0);assert.equal(blocked.mission.startVehiclesAdded,false);
});
test('starting vehicle additions are exclusive to the standard Frontline stage',()=>{
 for(const mode of ['beginner','base','stealth']){const c=startingVehiclesHarness();c.stageMode=mode;assert.equal(c.setupFrontlineVehicles(),0);assert.equal(c.cars.length,0);}
 const c=startingVehiclesHarness();c.areaDebugEnabled=true;assert.equal(c.setupFrontlineVehicles(),0);assert.equal(c.cars.length,0);
});

test('Frontline objective antennas use two small sprites and one large sprite with base-only colliders',()=>{
 const c=harness();c.mission.points=[{x:480,y:10000},{x:480,y:6500},{x:480,y:3000}];c.setupFrontlineAntennas();
 assert.deepEqual(Array.from(c.mission.points,q=>q.antenna.asset),['frontline_antenna_small','frontline_antenna_small','frontline_antenna_large']);assert.equal(c.covers.length,3);
 for(const q of c.mission.points){const a=q.antenna;assert.equal(a.collider.frontAntenna,true);assert.ok(a.collider.h<a.height*.12);assert.equal(a.collider.x+a.collider.w/2,q.x);assert.equal(a.collider.y+a.collider.h/2,q.y);}
 assert.ok(c.mission.points[2].antenna.height>c.mission.points[0].antenna.height);c.setupFrontlineAntennas();assert.equal(c.covers.length,3);
});
test('antenna colliders survive cannon, blast and crushing damage without fragmenting or awarding destruction points',()=>{
 const c=harness();c.mission.points=[{x:480,y:10000},{x:480,y:6500},{x:480,y:3000}];c.setupFrontlineAntennas();const original=c.covers;
 c.damageObjectsInRadius=()=>{};c.scoreStats={coverDestroyed:0,styleDestroyed:0};
 vm.runInContext(html.slice(html.indexOf('function carve('),html.indexOf('function useSkill(')),c);
 for(const source of ['cannonBlast','bombBlast','impact',null])for(const q of c.mission.points)assert.equal(c.carve(q.x,q.y,300,true,source),0);
 assert.equal(c.covers,original);assert.equal(c.covers.length,3);assert.ok(c.covers.every(o=>!o.fr));assert.equal(c.scoreStats.coverDestroyed,0);assert.equal(c.scoreStats.styleDestroyed,0);
});
test('antenna rendering splits a static upper sprite from the ground pass and culls distant objectives',()=>{
 const c=harness();c.g=c.gm;c.COVER_IMG={frontline_antenna_small:{naturalWidth:320,naturalHeight:640},frontline_antenna_large:{naturalWidth:480,naturalHeight:960}};c.assetOK=()=>true;
 c.mission.points=[{x:480,y:10000},{x:480,y:6500},{x:480,y:3000}];c.setupFrontlineAntennas();c.drawFrontlineAntennas(0,9700);c.drawFrontlineAntennas(0,9700,true);
 const calls=c.calls.filter(x=>x[0]==='drawImage');assert.equal(calls.length,2);assert.equal(calls[0][1],c.COVER_IMG.frontline_antenna_small);assert.equal(calls[0].length,6);assert.equal(calls[1].length,10);assert.ok(calls[1][5]<640);
 c.stageMode='base';const count=c.calls.length;c.drawFrontlineAntennas(0,9700);assert.equal(c.calls.length,count);
});

test('antenna placement avoids parked vehicles and is disabled outside standard Frontline',()=>{
 const c=harness(),q={x:480,y:10000};c.mission.points=[q];c.cars=[{...q}];c.setupFrontlineAntennas();assert.ok(c.D(q,c.cars[0])>=85);assert.equal(c.covers.length,1);
 for(const mode of ['base','beginner','stealth']){const other=harness();other.stageMode=mode;other.mission.points=[{x:480,y:10000}];other.setupFrontlineAntennas();assert.equal(other.covers.length,0);}
 const debug=harness();debug.areaDebugEnabled=true;debug.mission.points=[{x:480,y:10000}];debug.setupFrontlineAntennas();assert.equal(debug.covers.length,0);
});

function commanderHarness(){
 const c=harness();Object.assign(c,{commanderSignals:[],commanderRallying:false,los:()=>true,enemyCannonSpeed:()=>300,bullets:[],fire:(...args)=>c.bullets.push({from:args[3],k:args[4],x:args[0],y:args[1]}),tone(){},setTimeout(){},enterHumanFound:()=>{throw Error('Friendly radio alerted enemies');}});
 vm.runInContext(html.slice(html.indexOf('function commanderWhistle('),html.indexOf('function commanderMove(')),c);
 return c;
}
test('frontline stage commanders appear once per five initial and replacement troops',()=>{
 const c=commanderHarness();c.missionAllies(10000);assert.equal(c.allies.length,6);assert.equal(c.allies.filter(a=>a.frontCommander).length,1);assert.equal(c.allies[4].frontCommander,true);
 for(const a of c.allies)a.alive=false;c.missionAllies(10000);
 assert.equal(c.mission.allySpawnCount,12);assert.equal(c.allies.filter(a=>a.frontCommander).length,2);
 for(let i=12;i<25;i++)c.assignFrontlineAllyRole({});assert.equal(c.mission.allySpawnCount,25);
 c.stageMode='base';const normal=c.assignFrontlineAllyRole({});assert.equal(normal.frontCommander,undefined);assert.equal(c.mission.allySpawnCount,25);
});
test('allied radio notifies active nearby allies after one second, without alerting enemies, and completes after source loss',()=>{
 const c=commanderHarness(),source={x:480,y:10000,alive:true,frontCommander:true},enemy={x:480,y:9900,alive:true};
 const near={x:580,y:10000,alive:true,frontStyle:{rest:1}},far={x:480,y:12500,alive:true},stunned={x:480,y:10000,alive:true,stun:3};c.allies=[source,near,far,stunned];
 c.frontlineCommanderRadio(source,enemy);assert.equal(c.commanderSignals.length,1);c.frontlineCommanderRadio(source,enemy);assert.equal(c.commanderSignals.length,1);
 c.updateCommanderSignals(.9);assert.equal(near.frontMode,undefined);source.alive=false;c.updateCommanderSignals(.1);
 assert.equal(near.frontMode,'found');assert.equal(near.frontRadioT,6);assert.equal(near.frontLastSeen.y,9900);assert.equal(near.frontStyle.rest,0);assert.equal(far.frontMode,undefined);assert.equal(stunned.frontMode,undefined);
 enemy.y=9000;assert.equal(near.frontLastSeen.y,9900);c.updateCommanderSignals(1.5);assert.equal(c.commanderSignals.length,0);
});
test('a radio report triggers pursuit without granting vision or shots through cover',()=>{
 const c=commanderHarness(),a={x:480,y:10000,alive:true,shotCd:0,burstLeft:3,face:-Math.PI/2},enemy={x:480,y:9900,alive:true};c.allies=[a];c.humans=[enemy];c.los=()=>false;
 c.notifyFrontlineAllies({x:480,y:10000,seen:{x:480,y:9900},target:enemy});c.refreshFrontlineAllyTargets([a]);assert.equal(a._combatTarget,null);
 c.updateFrontlineAlly(a,null,.1);assert.equal(a.frontMode,'found');assert.ok(a.y<10000);assert.equal(c.bullets.length,0);
});
test('commanders stop to radio, aim for half a second, launch allied rockets and wait four seconds between shots',()=>{
 const c=commanderHarness(),a={x:480,y:10000,alive:true,frontCommander:true,shotCd:0},enemy={x:480,y:9900,alive:true};
 assert.equal(c.updateFrontlineCommander(a,enemy,.1),true);assert.equal(a.whistleT,2.5);assert.equal(c.bullets.length,0);
 c.updateCommanderSignals(2.5);for(let i=0;i<4;i++)c.updateFrontlineCommander(a,enemy,.1);assert.equal(c.bullets.length,0);
 c.updateFrontlineCommander(a,enemy,.1);assert.equal(c.bullets.length,1);assert.equal(c.bullets[0].from,'ally');assert.equal(c.bullets[0].commanderRocket,true);assert.equal(a.shotCd,4);
 c.updateFrontlineCommander(a,enemy,1);assert.equal(c.bullets.length,1);c.los=()=>false;a.shotCd=0;c.updateFrontlineCommander(a,enemy,1);assert.equal(c.bullets.length,1);
});
test('commanders prioritize visible tanks while ordinary allies retain infantry-only sight',()=>{
 const c=commanderHarness(),a={x:480,y:10000,alive:true,frontCommander:true,face:-Math.PI/2},b={...a,frontCommander:false},human={x:480,y:9900,alive:true},tank={x:480,y:9800,alive:true};c.humans=[human];c.etanks=[tank];
 c.refreshFrontlineAllyTargets([a,b]);assert.equal(a._combatTarget,tank);assert.equal(b._combatTarget,human);
 c.los=(a,t)=>t!==tank;c.refreshFrontlineAllyTargets([a]);assert.equal(a._combatTarget,human);
});
test('allied rockets sweep fast segments, collide with enemies and cover, and pass allied troops safely',()=>{
 const c=commanderHarness(),hits=[];c.frontlineCommanderRocketBlast=(x,y)=>hits.push({x,y});c.p={x:20,y:0};c.allies=[{x:40,y:0,alive:true}];
 const bullet={from:'ally',x:200,y:0};assert.equal(c.updateFrontlineCommanderRocket(bullet,0,0,false),false);assert.equal(hits.length,0);
 c.etanks=[{x:100,y:0,alive:true}];assert.equal(c.updateFrontlineCommanderRocket(bullet,0,0,false),true);assert.ok(hits[0].x<100);
 c.etanks=[];c.hitsC=x=>x>=48&&x<=56;assert.equal(c.updateFrontlineCommanderRocket(bullet,0,0,false),true);assert.equal(hits[1].x,48);
 c.hitsC=()=>false;assert.equal(c.updateFrontlineCommanderRocket(bullet,0,0,true),true);assert.equal(hits[2].x,200);
});
test('one allied bazooka blast destroys a tank and credits support without damaging player or allies',()=>{
 const c=commanderHarness();let support=0;Object.assign(c,{cannonImpactFx(){},damageObjectsInRadius(){},carve(){},scatterSpinifexAt(){},fb(){},burst(){},suspectTanksNear(){},recordSupportResult:()=>support++,destroyEnemyTank:e=>{e.alive=false;}});
 vm.runInContext(html.slice(html.indexOf('function explode('),html.indexOf('function summonAlly(')),c);
 c.p={x:480,y:10000,hp:3};c.allies=[{x:480,y:10000,alive:true}];c.etanks=[{x:480,y:10000,alive:true,hp:999}];c.humans=[{x:500,y:10000,alive:true}];
 c.frontlineCommanderRocketBlast(480,10000);assert.equal(c.etanks[0].alive,false);assert.equal(c.humans[0].alive,false);assert.equal(support,2);assert.equal(c.p.hp,3);assert.equal(c.allies[0].alive,true);
});

test('capture starts blue, turns orange only for an enemy inside an engaged active circle, and returns blue after clearing',()=>{
 const c=harness(),q={x:480,y:10000,counterTriggered:true,playerEntered:true};c.mission={points:[q,{x:480,y:6500},{x:480,y:3000}],index:0,progress:0,waveT:999,reinforceT:999};c.p={x:480,y:10000};c.allies=[{x:480,y:10000,alive:true,frontline:true}];
 vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);
 c.humans=[{x:480,y:10000,alive:true}];c.updateMission(.1);assert.equal(c.frontlineCaptureColors(q,c.mission).stroke,'#8dd3ff');
 c.humans=[];c.updateMission(1);assert.equal(q.captureStarted,true);assert.ok(c.mission.progress>0);
 c.humans=[{x:480,y:10365,alive:true}];c.updateMission(.1);assert.equal(c.mission.contested,true);assert.equal(c.frontlineCaptureColors(q,c.mission).stroke,'#8dd3ff');
 c.humans[0].y=10350;c.updateMission(.1);assert.equal(c.mission.capturing,false);assert.equal(c.frontlineCaptureColors(q,c.mission).stroke,'#ffac52');assert.equal(c.frontlineCaptureColors(c.mission.points[1],c.mission).stroke,'#8dd3ff');
 c.humans[0].stun=2;c.updateMission(.1);assert.equal(c.frontlineCaptureColors(q,c.mission).stroke,'#8dd3ff');
 c.etanks=[{x:480,y:10000,alive:true}];c.updateMission(.1);assert.equal(c.frontlineCaptureColors(q,c.mission).stroke,'#ffac52');
 c.etanks=[];c.updateMission(.1);assert.equal(c.frontlineCaptureColors(q,c.mission).stroke,'#8dd3ff');q.done=true;assert.equal(c.frontlineCaptureColors(q,c.mission).stroke,'#9de7ae');
});
test('orange capture colors apply to the gauge and a zero gauge retains the engaged contested state',()=>{
 const c=harness(),q={captureStarted:true},m={points:[q],index:0,progress:12,contested:true,enemiesInside:true};c.drawFrontlineCaptureRing(q,100,200,m);assert.equal(c.gm.fillStyle,'#ffe0b6');
 m.progress=0;assert.equal(c.frontlineCaptureColors(q,m).stroke,'#ffac52');m.enemiesInside=false;assert.equal(c.frontlineCaptureColors(q,m).stroke,'#8dd3ff');
});
test('three captured objectives freeze combat, finalize once, then show the normal success screen after the antenna transmission',()=>{
 const c=harness();Object.assign(c,{state:'play',cam:2900,camX:240,successFrameDrawn:true,shake:8});let finalized=0;c.finalizeScore=cleared=>{assert.equal(cleared,true);finalized++;};c.mission={index:3,points:[{done:true},{done:true},{x:480,y:3000,done:true}]};
 vm.runInContext(html.slice(html.indexOf('function completeMission('),html.indexOf('function updateMission(')),c);
 c.completeMission();assert.equal(c.state,'frontVictory');assert.equal(finalized,1);c.completeMission();assert.equal(finalized,1);
 c.updateFrontlineVictory(2.9);assert.equal(c.state,'frontVictory');c.updateFrontlineVictory(.1);assert.equal(c.state,'succeeded');assert.equal(c.successFrameDrawn,false);c.updateFrontlineVictory(1);assert.equal(finalized,1);
 const d=harness();d.state='play';d.mission={index:2,points:[{done:true},{done:true},{done:false}]};assert.equal(d.beginFrontlineVictory(),false);
 d.stageMode='stealth';d.finalizeScore=()=>{};vm.runInContext(html.slice(html.indexOf('function completeMission('),html.indexOf('function updateMission(')),d);d.completeMission();assert.equal(d.state,'win');
});
test('victory camera keeps the large antenna tip visible and signal rings stop outside the victory transition',()=>{
 const c=harness();for(const [w,h] of [[840,720],[480,1039],[480,680]]){
  c.W=w;c.H=h;c.state='frontVictory';c.cam=3000;c.camX=0;c.mission={index:3,points:[],victory:{elapsed:1.5,point:{x:480,y:3000},fromX:0,fromY:3000}};
  const view=c.frontlineVictoryCamera(),shape=c.frontlineAntennaGeometry(c.mission.victory.point,2);assert.ok(shape.y+12-view.y>0);assert.ok(shape.y+12-view.y<h);c.cam=view.y;c.camX=view.x;
  const before=c.calls.length;c.drawFrontlineVictorySignal();const arcs=c.calls.slice(before).filter(x=>x[0]==='arc');assert.ok(arcs.length>0&&arcs.length<=3);
  c.state='succeeded';const count=c.calls.length;c.drawFrontlineVictorySignal();assert.equal(c.calls.length,count);
 }
});


test('capturing each Frontline objective preserves vehicle fuel and both ammo stores while restoring player health',()=>{
 for(const index of [0,1,2])for(const kind of ['tank','truck','armored']){
  const c=harness(),q={x:480,y:10000,counterTriggered:true,playerEntered:true};
  c.mission={points:Array.from({length:3},(_,i)=>i===index?q:{x:480,y:6500}),index,progress:47.99,waveT:999,reinforceT:999};
  c.p.hp=1;c.p.tank={kind,c:2,v:7,f:13,t:{cmax:20,vmax:100,fmax:100}};
  c.allies=[{x:480,y:10000,alive:true,frontline:true}];let completed=0;c.completeMission=()=>completed++;
  vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);
  c.updateMission(.02);assert.equal(q.done,true);assert.equal(c.mission.index,index+1);
  assert.equal(c.p.tank.c,2);assert.equal(c.p.tank.v,7);assert.equal(c.p.tank.f,13);assert.equal(c.p.hp,3);assert.equal(completed,index===2?1:0);
 }
});

test('antenna upper pass follows every bush foreground pass while the ground pass stays behind people',()=>{
 const start=html.indexOf(' drawFrontlineAntennas(cx,cy);'),end=html.indexOf(' drawFrontlineAntennas(cx,cy,true);',start);
 assert.ok(start>=0&&end>start);const between=html.slice(start,end);
 for(const pass of ['drawGrassBushChunks(cx,cy);','drawBushCached(b);','drawSpinifexTopLayer(cx,cy);','drawPartner();'])assert.ok(between.includes(pass),pass);
});


test('first Frontline objective varies north/south and sideways while avoiding bridges, water, cover and parked vehicles',()=>{
 const c=harness();c.bridges=[{x:300,y:9800,w:360,h:400}];c.cars=[{x:200,y:9400}];c.etanks=[{x:700,y:10600,alive:true}];c.inWaterAt=(x,y,r)=>y+r>9800&&y-r<10200;c.hitsM=(x,y)=>x<240&&y>10300;
 const spots=Array.from({length:100},()=>c.frontlineFirstObjectiveSpot());
 assert.ok(spots.some(q=>q.y<9800));assert.ok(spots.some(q=>q.y>10200));assert.ok(new Set(spots.map(q=>Math.round(q.x))).size>30);
 for(const q of spots){assert.ok(q.x>=180&&q.x<=780&&q.y>=9300&&q.y<=10700);assert.equal(c.inWaterAt(q.x,q.y,90),false);assert.equal(c.hitsM(q.x,q.y),false);assert.ok(c.D(q,c.cars[0])>=100&&c.D(q,c.etanks[0])>=100);assert.ok(q.y+120<=9800||q.y-120>=10200);}
});
test('first objective uses a bounded dry-land fallback if random candidates are blocked',()=>{
 const c=harness();c.bridges=[];c.R=()=>.5;c.hitsM=(x,y)=>!(x===180&&y===10100);const q=c.frontlineFirstObjectiveSpot();assert.equal(q.x,180);assert.equal(q.y,10100);
 c.hitsM=()=>true;let fallback=0;c.missionSpot=(x,y,r)=>{fallback++;assert.equal(r,75);return{x:480,y:11000};};assert.equal(c.frontlineFirstObjectiveSpot().y,11000);assert.equal(fallback,1);
});


test('beginner Frontline selects three distinct permitted areas after the starting grassland; other maps retain their lengths',()=>{
 const c=harness(),allowed=['草原','森林','村','丘陵','湿地'];c.frontlineBeginner=true;c.ZONE_STYLE=Object.fromEntries([...allowed,'敵前線基地','街','敵迷路基地','敵司令本部','荒野'].map(n=>[n,{g:'green',p:[]} ]));
 vm.runInContext(html.slice(html.indexOf('function setupZones('),html.indexOf('const zoneAt=')),c);const combinations=new Set();
 for(let i=0;i<30;i++){c.setupZones();assert.equal(c.ZONES.length,4);assert.equal(c.ZONES[0].n,'草原');const mid=c.ZONES.slice(1).map(z=>z.n);assert.ok(mid.every(n=>allowed.includes(n)));assert.equal(new Set(mid).size,3);combinations.add(mid.join(','));for(let j=1;j<c.ZONES.length;j++)assert.equal(c.ZONES[j].y0,c.ZONES[j-1].y1);}
 assert.ok(combinations.size>10);c.frontlineBeginner=false;c.setupZones();assert.equal(c.ZONES.length,7);c.stageMode='beginner';c.setupZones();assert.equal(c.ZONES.length,5);
});
test('beginner Frontline builds two cargo objectives and completes after the second capture',()=>{
 const c=harness();c.frontlineBeginner=true;
 vm.runInContext(html.slice(html.indexOf('function setupMission('),html.indexOf('function completeMission(')),c);c.setupMission();
 assert.equal(c.mission.points.length,2);assert.deepEqual(Array.from(c.mission.points,q=>Array.from(q.cargo,a=>a.asset)),[['frontline_cargo_small'],['frontline_cargo_large','frontline_cargo_large','frontline_cargo_large']]);assert.deepEqual(Array.from(c.mission.points,q=>q.captureRadius),[360,540]);
 const q=c.mission.points[1];c.mission.index=1;c.mission.points[0].done=true;q.playerEntered=true;q.counterTriggered=true;c.mission.progress=47.99;c.mission.waveT=999;c.mission.reinforceT=999;c.p.x=q.x;c.p.y=q.y;c.allies=[{x:q.x,y:q.y,alive:true,frontline:true}];let finished=0;c.completeMission=()=>finished++;
 vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);c.updateMission(.02);assert.equal(finished,1);assert.equal(c.mission.index,2);
 c.state='play';c.camX=0;c.cam=0;assert.equal(c.beginFrontlineVictory(),true);assert.equal(c.state,'frontVictory');assert.equal(c.mission.victory.point,q);c.successFrameDrawn=true;c.updateFrontlineVictory(3);assert.equal(c.state,'succeeded');
});
test('beginner Frontline army caps enemy tanks at two and removes reserve commanders, elites and dogs',()=>{
 const c=harness();c.frontlineBeginner=true;c.etanks=Array.from({length:8},(_,i)=>({x:100,y:2000+i*1200,alive:true}));c.humans=[{alive:true,commander:'white',elite:true,dog:{},dogHandler:true},{alive:true,commander:'blue'}];c.setupFrontlineArmy();
 assert.equal(c.etanks.length,2);assert.ok(c.etanks.every(e=>e.y<10800));assert.ok(c.mission.enemyRoster.every(h=>!h.commander&&!h.elite&&!h.dog&&!h.dogHandler));assert.equal(c.enemyDogs.length,0);
});
test('beginner regular reinforcements use one blue commander per eight soldiers and cap active infantry at ten',()=>{
 const c=harness();c.frontlineBeginner=true;c.frontlineSpawnSpot=()=>({x:480,y:9000});
 c.spawnFrontlineWave(8);assert.equal(c.humans.filter(h=>h.commander==='blue').length,1);assert.equal(c.humans[7].commander,'blue');c.spawnFrontlineWave(8);assert.equal(c.humans.length,10);
 c.humans=[];c.spawnFrontlineWave(6);assert.equal(c.humans.filter(h=>h.commander==='blue').length,1);
});
test('beginner first entry sends four attackers including exactly one blue commander',()=>{
 const c=harness();c.frontlineBeginner=true;c.frontlineSpawnSpot=()=>({x:480,y:9000});const q={...c.p};c.mission.points=[q];c.mission.enemySpawned=7;c.updateFrontlineCounterattack(q,.1);
 assert.equal(c.humans.length,4);assert.equal(c.humans.filter(h=>h.commander==='blue').length,1);assert.equal(q.counterPending,0);c.updateFrontlineCounterattack(q,10);assert.equal(c.humans.length,4);
});


test('beginner cargo has one small sprite and three paired sprites showing six containers with stable body colliders',()=>{
 const c=harness();c.frontlineBeginner=true;c.mission.points=[{x:480,y:10000},{x:480,y:3500}];c.setupFrontlineAntennas();
 assert.equal(c.covers.length,4);assert.ok(c.covers.every(v=>v.frontCargo&&v.frontAntenna));assert.ok(c.mission.points.every(q=>!q.antenna));
 const [left,middle,right]=c.mission.points[1].cargo;assert.equal(left.y,right.y);assert.ok(left.x+left.width<middle.x&&middle.x+middle.width<right.x);assert.equal(right.x+right.width-left.x,880);assert.equal(left.width,280);assert.equal(left.height,188);assert.ok(left.x>=12&&right.x+right.width<=c.WW-12);for(const cargo of [left,middle,right])assert.ok(cargo.collider.w<cargo.width&&cargo.collider.h<cargo.height);
 c.setupFrontlineAntennas();assert.equal(c.covers.length,4);
});
test('cargo rejects distant damage, keeps at most six small nicks, and survives repeated cannon, bomb and ram damage',()=>{
 const c=harness();c.frontlineBeginner=true;c.mission.points=[{x:480,y:10000}];c.setupFrontlineAntennas();const block=c.covers[0],cargo=block.frontCargo,original={x:block.x,y:block.y,w:block.w,h:block.h};
 assert.equal(c.damageFrontlineCargo(block,0,0,10),false);for(let i=0;i<20;i++)c.damageFrontlineCargo(block,block.x,block.y+i*12,30);assert.equal(cargo.damage.length,6);
 c.damageObjectsInRadius=()=>{};c.scoreStats={coverDestroyed:0,styleDestroyed:0};vm.runInContext(html.slice(html.indexOf('function carve('),html.indexOf('function useSkill(')),c);
 for(const source of ['cannonBlast','bombBlast','impact',null])assert.equal(c.carve(block.x,block.y,300,true,source),0);
 assert.equal(c.covers.length,1);assert.equal(c.covers[0],block);for(const k of ['x','y','w','h'])assert.equal(block[k],original[k]);assert.equal(cargo.damage.length,6);assert.equal(c.scoreStats.coverDestroyed,0);
});
test('cargo damage raster is built only after a new nick and reuses its canvas on later frames',()=>{
 const c=harness();c.frontlineBeginner=true;c.mission.points=[{x:480,y:10000}];c.setupFrontlineAntennas();const cargo=c.mission.points[0].cargo[0];let canvases=0,contexts=0;
 c.COVER_IMG={frontline_cargo_small:{}};c.assetOK=()=>true;c.g=c.gm;c.document={createElement:()=>{canvases++;return{};}};c.gameCanvasContext=()=>{contexts++;return c.gm;};
 c.drawFrontlineCargo(cargo);assert.equal(canvases,0);c.damageFrontlineCargo(cargo.collider,cargo.collider.x,cargo.collider.y,4);for(let i=0;i<20;i++)c.drawFrontlineCargo(cargo);assert.equal(canvases,1);assert.equal(contexts,1);
 c.damageFrontlineCargo(cargo.collider,cargo.collider.x,cargo.collider.y+22,4);c.drawFrontlineCargo(cargo);assert.equal(canvases,1);assert.equal(contexts,2);
});
test('beginner victory sparkles on all cargo pairs instead of drawing antenna radio rings',()=>{
 const c=harness();c.frontlineBeginner=true;c.cam=3000;c.camX=0;c.state='frontVictory';const point={x:480,y:3500};point.cargo=c.frontlineCargoLayout(point,1);c.mission.victory={point,elapsed:1.1};
 c.drawFrontlineVictorySignal();assert.ok(c.calls.some(a=>a[0]==='fill'));assert.equal(c.calls.filter(a=>a[0]==='arc').length,0);
 const xs=c.calls.filter(a=>a[0]==='moveTo').map(a=>a[1]);assert.ok(xs.some(x=>x<480)&&xs.some(x=>x>480));const before=c.calls.length;c.state='play';c.drawFrontlineVictorySignal();assert.equal(c.calls.length,before);
});

test('cargo rendering enables high-quality interpolation locally and restores other sprite settings',()=>{
 const c=harness(),cargo=c.frontlineCargoLayout({x:480,y:10000},0)[0],draws=[];
 c.COVER_IMG={frontline_cargo_small:{}};c.assetOK=()=>true;
 c.g={imageSmoothingEnabled:false,imageSmoothingQuality:'low',drawImage(){draws.push([this.imageSmoothingEnabled,this.imageSmoothingQuality]);}};
 c.drawFrontlineCargo(cargo);assert.deepEqual(draws,[[true,'high']]);assert.equal(c.g.imageSmoothingEnabled,false);assert.equal(c.g.imageSmoothingQuality,'low');
});
test('desktop cargo bypasses the half-resolution pass, draws visible sprites once at native resolution, and leaves mobile and advanced alone',()=>{
 const c=harness();c.frontlineBeginner=true;c.MOBILE_VIEW=false;c.W=960;c.mission.points=[{x:480,y:10000},{x:480,y:10200}];c.setupFrontlineAntennas();
 c.COVER_IMG={frontline_cargo_small:{},frontline_cargo_large:{}};c.assetOK=()=>true;const original={};c.g=original;
 c.drawFrontlineAntennas(0,9700,true);assert.equal(c.calls.filter(q=>q[0]==='drawImage').length,0);
 c.drawFrontlineCargoNative(0,9700);assert.equal(c.calls.filter(q=>q[0]==='drawImage').length,4);assert.equal(c.g,original);assert.ok(c.calls.some(q=>q[0]==='setTransform'&&q[1]===1&&q[6]===-9700));
 const count=c.calls.length;c.drawFrontlineCargoNative(0,0);assert.equal(c.calls.filter(q=>q[0]==='drawImage').length,4);
 c.MOBILE_VIEW=true;const mobile=c.calls.length;c.drawFrontlineCargoNative(0,9700);assert.equal(c.calls.length,mobile);
 c.MOBILE_VIEW=false;c.frontlineBeginner=false;c.drawFrontlineCargoNative(0,9700);assert.equal(c.calls.length,mobile);
});


test('frontline end follows the actual final objective in both difficulties',()=>{
 const c=harness();
 for(const y of [3000,3500,4700]){
  c.mission.points=[{y:10000},{y,captureRadius:540}];c.setupFrontlineBoundary();
  assert.equal(c.frontlineNorthEdge(),y-540-180);
  c.p.y=100;c.enforceFrontlineBoundary();assert.equal(c.p.y,y-540-180+10);
  c.p.tank={kind:'tank'};c.p.y=100;c.enforceFrontlineBoundary();assert.equal(c.p.y,y-540-180+c.TANK_HIT);c.p.tank=null;
  assert.equal(c.frontlineView().y,c.frontlineNorthEdge());
  assert.equal(c.frontlineMovementTop({frontline:true},14),c.frontlineNorthEdge()+14);
  assert.equal(c.frontlineMovementTop({frontMarch:true},14),14);
 }
 c.stageMode='base';assert.equal(c.frontlineNorthEdge(),0);assert.equal(c.frontlineMovementTop(c.p,10),10);
 c.stageMode='front';c.areaDebugEnabled=true;assert.equal(c.frontlineNorthEdge(),0);
});
test('north boundary allows sideways movement, clamps large forward steps and leaves enemy entries open',()=>{
 const c=harness();Object.assign(c,{mazeComparisonEnemyFrozen:()=>false,terrainMoveScale:()=>1,hitsC:()=>false,enemyTankObjectBlocked:()=>false,tankBlocked:()=>false,enemyUnitBlocked:()=>false});
 vm.runInContext(html.slice(html.indexOf('function mv('),html.indexOf('function mv(')+html.slice(html.indexOf('function mv(')).indexOf('\n')),c);
 c.mission.northEdge=2300;c.p.y=2320;c.mv(c.p,25,-500,10);assert.equal(c.p.y,2310);assert.equal(c.p.x,505);
 c.mv(c.p,0,50,10);assert.equal(c.p.y,2360);
 const enemy={x:100,y:2200};c.mv(enemy,0,25,14);assert.equal(enemy.y,2225);
});

test('skill reinforcements roll commanders at the 20 percent threshold in every stage',()=>{
 const c=harness();for(const mode of ['front','base','beginner'])for(const roll of [0,.199999,.2,.9999]){
  c.stageMode=mode;c.allies=[];c.R=()=>roll;c.summonAlly();assert.equal(c.allies[0].frontCommander,roll<.2);
 }
});
test('allied soldiers raise weapons throughout discovery and lower them while stunned or radioing',()=>{
 const c=harness(),a={frontMode:'found'};assert.equal(c.allyWeaponVisible(a),true);
 for(const key of ['stun','stunRecover','whistleT']){a[key]=1;assert.equal(c.allyWeaponVisible(a),false);a[key]=0;}
 a.frontMode='patrol';assert.equal(c.allyWeaponVisible(a),false);
 c.stageMode='base';a._combatTarget={alive:true};assert.equal(c.allyWeaponVisible(a),true);
 a._combatTarget=null;a.frontRadioT=2;assert.equal(c.allyWeaponVisible(a),true);
});
test('skill commanders can broadcast to allies outside frontline stages',()=>{
 const c=commanderHarness();c.stageMode='base';const enemy={x:480,y:9900,alive:true},a={x:480,y:10000,alive:true,frontCommander:true,shotCd:0},friend={x:500,y:10000,alive:true};c.allies=[a,friend];
 c.updateFrontlineCommander(a,enemy,.1);c.updateCommanderSignals(1);assert.equal(friend.frontMode,'found');assert.equal(friend._combatTarget,enemy);
 c.updateCommanderSignals(1.5);a.frontRadioCooldown=5;c.updateFrontlineCommander(a,enemy,.5);assert.equal(c.bullets.length,1);assert.equal(c.bullets[0].commanderRocket,true);
});

test('evaluation records personal and joint capture participation but not remote allied capture',()=>{
 for(const present of [false,true]){
  const c=harness(),q={x:480,y:10000,counterTriggered:true,playerEntered:true};c.mission={points:[q,{x:480,y:6500}],index:0,progress:46,waveT:999,reinforceT:999};c.p.y=present?10000:10400;c.scoreStats={};c.allies=[{x:480,y:10000,alive:true,frontline:true}];
  vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);c.updateMission(3);
  assert.equal(c.mission.index,1);assert.equal(c.scoreStats.capturePoints,Number(present));assert.equal(c.scoreStats.captureSeconds||0,present?3:0);assert.equal(c.scoreStats.jointObjectiveSeconds||0,present?3:0);assert.equal(c.scoreStats.objectiveProgress,.5);
 }
});

test('Oni triples initial enemy entry and regular waves while retaining advanced timing',()=>{
 const normal=harness(),oni=harness();oni.frontlineOni=true;
 for(const c of [normal,oni]){c.mission.enemyWavesStarted=false;c.mission.enemyEntryY=c.p.y;c.updateFrontlineEnemyEntry();}
 assert.equal(normal.humans.length,6);assert.equal(oni.humans.length,18);assert.equal(oni.mission.waveT,normal.mission.waveT);
 for(const c of [normal,oni]){c.humans=[];c.mission.waveT=0;c.mission.waveCheckT=1;c.mission.nearbyEnemies=c===oni?12:4;c.updateFrontlineWaves(.1);}
 assert.equal(normal.humans.length,2);assert.equal(oni.humans.length,6);assert.equal(oni.mission.waveT,normal.mission.waveT);
});
test('Oni triples counterattack troops and commanders and defers them at the 48-person limit',()=>{
 const c=harness();c.frontlineOni=true;const q={x:c.p.x,y:c.p.y};c.humans=Array.from({length:48},()=>({alive:true,x:100,y:100}));c.updateFrontlineCounterattack(q,.1);assert.equal(q.counterPending,18);assert.equal(q.counterBluePending,6);assert.equal(c.humans.length,48);
 c.humans=[];c.updateFrontlineCounterattack(q,1);assert.equal(c.humans.length,18);assert.equal(q.counterPending,0);assert.equal(q.counterBluePending,0);assert.ok(c.humans.filter(h=>h.commander==='blue').length>=6);
});
test('Oni reserve classes and dog handlers have three independent copies',()=>{
 const c=harness();c.frontlineOni=true;const dog={},handler={alive:true,dogHandler:true,dog},blue={alive:true,commander:'blue'},white={alive:true,elite:true,commander:'white'};dog.handler=handler;c.humans=[handler,blue,white];c.enemyDogs=[dog];c.setupFrontlineArmy();const roster=c.mission.enemyRoster;
 assert.equal(roster.length,9);assert.equal(new Set(roster).size,9);assert.equal(roster.filter(h=>h.commander==='blue').length,3);assert.equal(roster.filter(h=>h.commander==='white').length,3);const handlers=roster.filter(h=>h.dogHandler);assert.equal(new Set(handlers.map(h=>h.dog)).size,3);assert.ok(handlers.every(h=>h.dog.handler===h));assert.equal(c.humans.length,0);assert.equal(c.enemyDogs.length,0);
});
test('Oni cannot exceed 48 active infantry; beginner and other stages keep their original settings',()=>{
 const c=harness();c.W=960;c.frontlineOni=true;for(let i=0;i<10;i++){for(const h of c.humans)h.y+=200;c.spawnFrontlineWave(100);}assert.equal(c.humans.length,48);assert.equal(c.frontlineEnemyLimit(),48);
 c.frontlineOni=false;c.frontlineBeginner=true;assert.equal(c.frontlineEnemyLimit(),10);assert.equal(c.frontlineEnemyMultiplier(),1);c.frontlineBeginner=false;assert.equal(c.frontlineEnemyLimit(),16);
 c.frontlineOni=true;c.stageMode='base';assert.equal(c.isFrontlineOni(),false);assert.equal(c.frontlineEnemyMultiplier(),1);c.stageMode='front';c.areaDebugEnabled=true;assert.equal(c.isFrontlineOni(),false);
});

test('Oni triples placed enemy tanks with independent patrol routes and reruns placement correction',()=>{
 const c=harness();c.frontlineOni=true;const a={x:100,y:5000,alive:true,path:[{x:100,y:5000},{x:200,y:5000}]},b={x:200,y:7000,alive:true,static:true,path:[{x:200,y:7000}]};c.etanks=[a,b];let placements=0;c.ensureEnemyTankSpawns=()=>{placements++;};c.setupFrontlineArmy();assert.equal(c.etanks.length,6);assert.equal(placements,1);assert.equal(new Set(c.etanks).size,6);assert.equal(new Set(c.etanks.map(e=>e.path)).size,6);assert.equal(c.etanks.filter(e=>e.static).length,3);c.etanks[2].path[0].x=999;assert.equal(a.path[0].x,100);
 const normal=harness();normal.etanks=[a,b];normal.setupFrontlineArmy();assert.equal(normal.etanks.length,2);
});
test('tripled tanks use real startup placement to remain separate and outside the starting safety radius',()=>{
 const c=harness();c.frontlineOni=true;c.zoneAt=()=>({n:'草原'});c.pOK=()=>true;
 vm.runInContext(html.slice(html.indexOf('function ensureEnemyTankSpawns('),html.indexOf('function pOK(')),c);
 c.etanks=[{x:400,y:9200,alive:true,path:[{x:400,y:9200},{x:450,y:9200}]},{x:600,y:9000,alive:true,path:[{x:600,y:9000}]}];c.setupFrontlineArmy();assert.equal(c.etanks.length,6);
 for(let i=0;i<c.etanks.length;i++){const a=c.etanks[i];assert.ok(c.D(a,c.p)>=700);for(const b of c.etanks.slice(i+1))assert.ok(c.D(a,b)>=c.TANK_HIT*2+10);}
});
