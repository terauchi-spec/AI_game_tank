const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 let seed=3;const calls=[];
 const gm=new Proxy({}, {get:(o,k)=>o[k]||((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
 const c={WW:960,WH:12800,W:480,H:800,TANK_HIT:28,cars:[],etanks:[],p:{x:480,y:10000,body:0},stageMode:'front',areaDebugEnabled:false,mission:{points:[],index:0,enemyRoster:[],enemyRosterIndex:0},humans:[],enemyDogs:[],allies:[],allySeq:0,covers:[],gm,
 R:()=>((seed=(seed*1664525+1013904223)>>>0)/2**32),D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),hitsM:()=>false,hitsC:()=>false,inWaterAt:()=>false,inBase:()=>false,patrolLineClear:()=>true,missionSpot:(x,y)=>({x,y}),setSkillCooldown(){},sfx(){},say(){},
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
 const c=harness(),dog={},handler={alive:true,dogHandler:true,dog},blue={alive:true,commander:'blue'},white={alive:true,commander:'white',elite:true};dog.handler=handler;c.humans=[handler,blue,white];c.enemyDogs=[dog];c.setupFrontlineArmy();assert.ok(c.humans.includes(handler)&&c.humans.includes(blue)&&c.humans.includes(white));assert.equal(c.enemyDogs.length,1);assert.equal(c.enemyDogs[0].handler,handler);assert.equal(dog.y-handler.y,75);
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
 const c=harness();let v=c.frontlineCaptureVisual({progress:3,capturing:true});assert.equal(v.fraction,.25);assert.equal(v.remaining,9);assert.equal(v.label,'制圧まで 9.0秒');assert.ok(c.frontlineCaptureVisual({progress:6,contested:true}).label.includes('敵が範囲内'));assert.ok(c.frontlineCaptureVisual({progress:6}).label.includes('一時停止'));assert.equal(c.frontlineCaptureVisual({progress:99}).fraction,1);
});
test('capture ring is drawn only on the active circle, and quarter time draws a quarter arc',()=>{
 const c=harness(),q={},m={index:0,points:[q],progress:3,capturing:true};c.drawFrontlineCaptureRing(q,100,200,m);const arcs=c.calls.filter(x=>x[0]==='arc');assert.equal(arcs.length,2);assert.ok(Math.abs(arcs[1][5]-arcs[1][4]-Math.PI/2)<1e-6);const count=c.calls.length;c.drawFrontlineCaptureRing({},100,200,m);assert.equal(c.calls.length,count);
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
 c.p.y=q.y+100;c.updateMission(1);assert.equal(c.mission.progress,1);assert.equal(c.mission.capturing,true);
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
