const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 let seed=3;const calls=[];
 const gm=new Proxy({}, {get:(o,k)=>o[k]||((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
 const c={WW:960,WH:12800,W:480,H:800,TANK_HIT:28,cars:[],etanks:[],p:{x:480,y:10000,body:0},stageMode:'front',debugMode:0,weather:'clear',areaDebugEnabled:false,mission:{points:[],index:0,enemyRoster:[],enemyRosterIndex:0},humans:[],enemyDogs:[],allies:[],allySeq:0,covers:[],gm,
 performance:{now:()=>1000},patrolRoutePlanAt:0,PATROL_SEARCH_PENDING:Symbol('pending'),findPatrolReturnPath:()=>null,R:()=>((seed=(seed*1664525+1013904223)>>>0)/2**32),D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),hitsM:()=>false,hitsC:()=>false,inWaterAt:()=>false,inBase:()=>false,patrolLineClear:()=>true,missionSpot:(x,y)=>({x,y}),setSkillCooldown(){},sfx(){},say(){},
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
 const c=harness();let v=c.frontlineCaptureVisual({progress:6,capturing:true});assert.equal(v.fraction,.25);assert.equal(v.remaining,18);assert.equal(v.label,'制圧まで 18.0秒');assert.ok(c.frontlineCaptureVisual({progress:6,contested:true}).label.includes('敵が範囲内'));assert.ok(c.frontlineCaptureVisual({progress:6}).label.includes('一時停止'));assert.equal(c.frontlineCaptureVisual({progress:99}).fraction,1);
});
test('capture ring is drawn only on the active circle, and quarter time draws a quarter arc',()=>{
 const c=harness(),q={},m={index:0,points:[q],progress:6,capturing:true};c.drawFrontlineCaptureRing(q,100,200,m);const arcs=c.calls.filter(x=>x[0]==='arc');assert.equal(arcs.length,2);assert.ok(Math.abs(arcs[1][5]-arcs[1][4]-Math.PI/2)<1e-6);const count=c.calls.length;c.drawFrontlineCaptureRing({},100,200,m);assert.equal(c.calls.length,count);
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
 c.p.y-=200;assert.equal(c.frontlineAllyWaiting(a,.5),true);assert.equal(c.frontlineAllyWaiting(a,1),true);assert.equal(c.frontlineAllyWaiting(a,.6),false);
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
 const y=a.y;c.p.y-=200;c.updateFrontlineAlly(a,null,.5);assert.equal(a.y,y);c.updateFrontlineAlly(a,null,1.6);assert.ok(a.y<y);
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
 const c=harness(),q={x:c.p.x,y:c.p.y-200};let calls=0,total=0;c.spawnFrontlineWave=(n,point)=>{calls++;total+=n;assert.equal(point,q);return n;};
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
 c.updateFrontlineAlly(a,t,.1);assert.equal(a.frontMode,'found');assert.ok(Math.abs(a.y-(10000-20.25))<1e-6);assert.equal(a.frontMoving,true);
 t.x=800;c.updateFrontlineAlly(a,null,.1);assert.equal(a.frontLastSeen.x,480);assert.equal(a.frontLastSeen.y,9700);assert.equal(a.frontMode,'found');
 c.updateFrontlineAlly(a,null,2);assert.equal(a.frontMode,'patrol');assert.equal(a.frontLastSeen,null);
});
test('a dead tracked enemy clears found mode immediately; waiting still limits combat pursuit',()=>{
 const c=harness(),a={x:480,y:c.frontlineAllyLimit()+5,face:-Math.PI/2,speedScale:1},t={x:480,y:a.y-250,alive:true};
 const y=a.y;c.updateFrontlineAlly(a,t,.1);assert.equal(a.y,y);assert.equal(a.frontMode,'found');t.alive=false;c.updateFrontlineAlly(a,null,.1);assert.equal(a.frontMode,'patrol');
});
test('ally sight and found markers are static canvas shapes and disappear while stunned',()=>{
 const c=harness();c.g=c.gm;const marks=[];c.lab=(...a)=>marks.push(a);const a={x:480,y:10000,face:-Math.PI/2,frontMode:'found'};
 c.drawFrontlineAllyVision(a);assert.ok(c.calls.some(x=>x[0]==='arc'&&x[3]===300));assert.equal(marks.length,1);
 const count=c.calls.length;a.stun=5;c.drawFrontlineAllyVision(a);assert.equal(c.calls.length,count);c.stageMode='base';a.stun=0;c.drawFrontlineAllyVision(a);assert.equal(c.calls.length,count);
});

function mazeHarness(mode,seed=3){
 const c=harness();Object.assign(c,{stageMode:mode,MAP_SCALE:4,ZONES:[{n:'敵迷路基地',y0:9000,y1:7000}],water:[],bridges:[],mud:[],bushes:[],base:{x:0,y:-1000,w:1,h:1},BLOCK_WALL_LONG:128,BLOCK_WALL_SHORT:32,BARRIER_LONG:126,BARRIER_SHORT:39,CRATE_W:74.8,CRATE_H:74.8,BARREL_SIZE:39.1,nearBridge:()=>false,coverFragmentRect:q=>q});
 c.R=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 vm.runInContext(html.slice(html.indexOf('function genCovers('),html.indexOf('const AREA_DEBUG_ORDER=')),c);return c;
}
test('Frontline maze wall count falls by at least 75% across twenty map seeds',()=>{
 for(let seed=1;seed<=20;seed++){
  const base=mazeHarness('base',seed),front=mazeHarness('front',seed);base.genCovers();front.genCovers();
  const normal=base.covers.filter(c=>c.mazeWall).length,reduced=front.covers.filter(c=>c.mazeWall).length;
  assert.ok(normal>400);assert.ok(reduced<=normal*.25,`${seed}: ${reduced}/${normal}`);
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
  const c=harness(),q={x:480,y:10000,counterTriggered:true};c.mission={points:[q],index:0,progress:0,waveT:999,reinforceT:999};c.allies=Array.from({length:count-1},()=>({x:480,y:10000,alive:true,frontline:true}));
  vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);c.updateMission(1);
  assert.equal(c.mission.captureCount,count);assert.equal(c.mission.captureRate,count);assert.equal(c.mission.progress,count);
  assert.equal(c.frontlineCaptureVisual(c.mission).remaining,(24-count)/count);
 }
});
test('capture completes after 24, 12 and 8 seconds for one, two and three people',()=>{
 for(const count of [1,2,3]){
  const c=harness(),q={x:480,y:10000,counterTriggered:true};c.mission={points:[q,{x:480,y:6500},{x:480,y:3000}],index:0,progress:0,waveT:999,reinforceT:999};c.allies=Array.from({length:count-1},()=>({x:480,y:10000,alive:true,frontline:true}));
  vm.runInContext(html.slice(html.indexOf('function updateMission('),html.indexOf('let missionHudNextAt=')),c);
  c.updateMission(24/count-.01);assert.equal(c.mission.index,0);assert.ok(c.mission.progress<24);assert.notEqual(q.done,true);
  c.updateMission(.02);assert.equal(c.mission.index,1);assert.equal(q.done,true);assert.equal(c.mission.progress,0);
 }
});
test('capture counts exclude stunned, recovering, descending, airborne and out-of-circle troops',()=>{
 const c=harness(),q={x:480,y:10000};c.allies=[{...q,alive:true},{...q,alive:true,stun:1},{...q,alive:true,stunRecover:1},{...q,alive:true,chute:1},{...q,alive:true,blastAirT:1},{...q,alive:false},{x:480,y:10190,alive:true}];
 assert.equal(c.frontlineCaptureCount(q),2);c.p.tank={kind:'fighter'};assert.equal(c.frontlineCaptureCount(q),1);
 c.p.tank=null;c.p.dig=1;assert.equal(c.frontlineCaptureCount(q),1);
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
 c.updateFrontlineEnemyEntry();assert.equal(c.humans.length,6);assert.equal(c.mission.waveT,24);
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
