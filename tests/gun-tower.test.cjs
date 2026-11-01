const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
function scene(){const h=createGameEngine(path.join(__dirname,'..'));h.run("stageMode='base';setupZones();state='play';skill='partner';p={x:480,y:11500,hp:3,body:0,ang:0,cc:0,vc:0,dig:0,scd:0};allies=[];parts=[];covers=[];objects=[];bushes=[];humans=[];etanks=[];cars=[];bullets=[];fx=[];waves=[];water=[];bridges=[];mud=[];mission=null;base={x:100,y:50,w:100,h:100,hp:30,maxHp:30};scoreStats=newScoreStats();los=()=>true;rebuildSpatialGrid();v={x:480,y:11000,t:GUN_TOWER_TYPE,kind:'tower',hp:8,c:0,v:500,f:0,ch:0,body:0,aim:0};");return h;}
test('emplacements spawn only in the two advanced stages and start with zero fuel and 500 rounds',()=>{
 for(const id of ['beginner','baseIntermediate','base','frontBeginner','frontIntermediate','front','indoor','indoorLab','decisive','training']){
  const h=scene();h.c.sampleId=id;h.run("currentStageId=()=>sampleId;stageMode=sampleId==='front'?'front':'base';mission={points:[{x:240,y:9000},{x:720,y:6000},{x:240,y:3000}]};setupGunTowers();");
  assert.equal(h.run("cars.filter(v=>v.kind==='tower').length"),id==='base'?6:id==='front'?3:0,id);
  assert.equal(h.run("cars.every(v=>v.v===500&&v.f===0&&v.t.sp===0)"),true,id);
 }
});
test('each tower uses a 50% initial blue-gunner draw without replenishing ammunition on capture',()=>{
 for(const roll of [.49,.5]){
  const h=scene();h.c.roll=roll;h.run('(function(R){return '+h.run('setupGunTowers.toString()')+'})(()=>roll)();');assert.equal(h.run('cars.filter(v=>v.gunner).length'),roll<.5?6:0);
 }
 const h=scene();h.run("cars=[v];enemy={x:v.x,y:v.y,alive:true,elite:false};boardEnemyGunTower(v,enemy);fireGunTower(v,0,'e',enemy);gunTowerBlast(v.x,v.y,95);");
 assert.equal(h.run('gunTowerAvailable(v)'),true);assert.equal(h.run('enemy.gunTower'),null);assert.equal(h.run('v.v'),499);assert.ok(h.run('enemy.stun')>0);
 h.run("partner={x:v.x,y:v.y,hp:3};partnerBoardVehicle(partner,v)");assert.equal(h.run('partner.vehicle===v'),true);assert.equal(h.run('v.v'),499);
});
test('swept gatling rounds hit nearer enemy infantry during friendly fire and spare their own gunner',()=>{
 const h=scene();h.run("v.x=100;v.y=400;enemy={x:100,y:400,alive:true};friend={x:210,y:400,alive:true};humans=[enemy,friend];p.x=310;p.y=400;fireGunTower(v,0,'e',enemy);b=bullets[0];b.x=400;b.y=400;updateGatlingBullet(b,174,400,false);");
 assert.equal(h.run('enemy.alive'),true);assert.equal(h.run('friend.alive'),false);assert.equal(h.run('p.hp'),3);assert.equal(h.run('scoreStats.playerKills'),0);
});
test('the gun keeps a strict shared 500-round limit with superior fire rate and range',()=>{
 const h=scene();h.run("for(let i=0;i<510;i++)fireGunTower(v,0,'p');");
 assert.equal(h.run('v.v'),0);assert.equal(h.run('bullets.length'),500);assert.equal(h.run('fireGunTower(v,0,\'p\')'),false);
 assert.ok(h.run('GUN_TOWER_TYPE.vcd<Math.min(...TYPES.map(t=>t.vcd))'));assert.equal(h.run('GUN_TOWER_TYPE.range'),400);assert.equal(h.run('bullets[0].life*GUN_TOWER_TYPE.speed'),400);
});
test('cover is chipped only after sustained hits and always stops gatling rounds before a soldier behind it',()=>{
 const h=scene();h.run("wall={x:200,y:380,w:80,h:60,kd:1};covers=[wall];victim={x:310,y:400,alive:true};humans=[victim];rebuildSpatialGrid();v.x=100;v.y=400;Math.random=()=>.5;for(let i=0;i<5;i++){fireGunTower(v,0,'p');b=bullets.pop();b.x=400;b.y=400;updateGatlingBullet(b,174,400,false);}");
 assert.equal(h.run('victim.alive'),true);assert.equal(h.run('wall.gatlingHits'),7.5);assert.equal(h.run('covers.length'),1);
 h.run("fireGunTower(v,0,'p');b=bullets.pop();b.x=400;b.y=400;updateGatlingBullet(b,174,400,false);");assert.equal(h.run('victim.alive'),true);assert.ok(h.run('scoreStats.coverDestroyed')>0);
});
test('a partner can select a dry tower on a route, board it, fire and leave it without moving the tower',()=>{
 const h=scene();h.run("v.x=400;v.y=400;cars=[v];partner={x:380,y:400,hp:3,face:0};pickup=partnerRouteVehicle([{x:350,y:400},{x:500,y:400}]);partnerBoardVehicle(partner,pickup.car);oldX=v.x;oldY=v.y;partnerVehicleMove(partner,{x:700,y:600},100,.2);victim={x:750,y:400,alive:true};humans=[victim];partnerVehicleAttack(partner,.5);");
 assert.equal(h.run('v.x===oldX&&v.y===oldY'),true);assert.equal(h.run('v.v'),499);assert.equal(h.run('bullets[0].gatling&&bullets[0].from===\'ally\''),true);
 h.run('partnerExitVehicle(partner)');assert.equal(h.run('cars.includes(v)'),true);assert.equal(h.run('v.f'),0);assert.equal(h.run('v.x===oldX&&v.y===oldY'),true);
});
test('enemy use is exclusive and an operator killed by gunfire releases a reusable tower',()=>{
 const h=scene();h.run("cars=[v];enemy={x:v.x,y:v.y,alive:true,elite:false};boardEnemyGunTower(v,enemy);partner={x:v.x,y:v.y,hp:3};");assert.equal(h.run('partnerBoardVehicle(partner,v)'),false);
 h.run('enemy.alive=false;updateGunTowers(.01)');assert.equal(h.run('gunTowerAvailable(v)'),true);assert.equal(h.run('partnerBoardVehicle(partner,v)'),true);
});
test('stationary mounts cannot be pushed by movement, blast flight or river current',()=>{
 const h=scene();h.run("p.tank=v;p.x=v.x;p.y=v.y;partner={x:v.x,y:v.y,vehicle:v};water=[{x:0,y:0,w:960,h:12800,flowDir:1,flowSpeed:100}];ox=p.x;oy=p.y;playerMove(100,100,28,.1);beginBlastFlight(p,p.x-30,p.y,263,82,8,5);applyRiverCurrents(1);");
 assert.equal(h.run('p.x===ox&&p.y===oy'),true);assert.ok(!h.run('p.blastAirT'));assert.equal(h.run('v.f'),0);
});
test('real advanced worlds place towers on land clear of scenery while intermediate worlds exclude them',()=>{
 for(const stage of ['base','front']){
  const h=createGameEngine(path.join(__dirname,'..'));h.c.testStage=stage;h.run("stageMode=testStage;skill='throw';reset(false);");
  assert.equal(h.run("cars.filter(v=>v.kind==='tower').length"),stage==='base'?6:3,stage);
  assert.equal(h.run("cars.filter(v=>v.kind==='tower').every(v=>!hitsC(v.x,v.y,GUN_TOWER_TYPE.clearance)&&!inWaterAt(v.x,v.y,GUN_TOWER_TYPE.clearance))"),true,stage);
  h.run("draw(null);station=cars.find(v=>v.kind==='tower');if(station.gunner){station.gunner.alive=false;releaseGunTower(station);}humans=humans.filter(h=>D(h,station)>1000);allies=[];p.x=station.x;p.y=station.y+45;interact=true;update(.016);");
  assert.equal(h.run('p.tank===station'),true,stage);
  h.run("startX=p.x;startY=p.y;startAmmo=station.v;keys.ArrowUp=true;keys.KeyS=true;items=[{x:p.x,y:p.y,got:false}];for(let i=0;i<40;i++)update(.016);keys.ArrowUp=false;keys.KeyS=false;draw(null);");
  assert.equal(h.run('p.x===startX&&p.y===startY'),true,stage);assert.ok(h.run('station.v<startAmmo'),stage);assert.equal(h.run('station.f'),0);assert.equal(h.run('items[0].got'),false);
  h.run('interact=true;update(.016);draw(null);');assert.equal(h.run('p.tank'),null,stage);assert.equal(h.run('cars.includes(station)'),true,stage);
 }
});
test('nearby blue infantry can occupy a vacant tower and fire without walking the emplacement',()=>{
 const h=scene();h.run("cars=[v];v.reboardT=0;p.x=v.x+200;p.y=v.y;enemy={x:v.x+25,y:v.y,alive:true,elite:false};humans=[enemy];updateGunTowers(.016);updateGunTowerEnemy(enemy,.25);updateGunTowerEnemy(enemy,.25);updateGunTowerEnemy(enemy,.08);");
 assert.equal(h.run('enemy.gunTower===v'),true);assert.ok(h.run('v.v')<500);assert.equal(h.run('bullets.every(b=>b.gatling&&b.from===\'e\')'),true);assert.equal(h.run('v.x'),480);assert.equal(h.run('v.y'),11000);assert.ok(h.run('D(enemy,v)')>20);
});
test('a player can shoot the visible gunner and immediately claim the unchanged mount',()=>{
 const h=scene();h.run("cars=[v];enemy={x:v.x,y:v.y,alive:true,elite:false};humans=[enemy];boardEnemyGunTower(v,enemy);b={x:enemy.x+50,y:enemy.y,vx:1000,vy:0,from:'p',k:'v',gatling:true};updateGatlingBullet(b,enemy.x-50,enemy.y,false);");
 assert.equal(h.run('enemy.alive'),false);assert.equal(h.run('gunTowerAvailable(v)'),true);assert.equal(h.run('v.v'),500);assert.equal(h.run('scoreStats.playerKills'),1);
});
test('drawn partner routes finish at the gun seat instead of trying to drive a dry tower onward',()=>{
 const h=scene();h.run("p.x=400;p.y=400;v.x=420;v.y=400;cars=[v];partner={x:400,y:400,hp:3,face:0,route:[{x:420,y:400},{x:700,y:400}],routeIndex:0,boardTarget:v,boardAt:0,routeStart:{x:400,y:400}};updatePartner(.016);updatePartner(.016);");
 assert.equal(h.run('partner.vehicle===v'),true);assert.equal(h.run('partner.route'),null);assert.equal(h.run('partner.x===v.x&&partner.y===v.y'),true);
 h.run("p.y=450;startPartnerOrder();finishPartnerOrder(true);updatePartner(.016)");assert.equal(h.run('partner.vehicle'),null);assert.equal(h.run('cars.includes(v)'),true);assert.equal(h.run('v.x'),420);
});

test('tower gunners share the ordinary blue soldier detection cone, distance, concealment and weather',()=>{
 for(const [distance,angle,weather,vehicle,hidden,visible] of [[200,0,'clear',false,false,true],[260,0,'clear',false,false,false],[150,50,'clear',false,false,true],[150,70,'clear',false,false,false],[100,180,'clear',false,false,false],[200,0,'rain',false,false,false],[400,0,'clear',true,false,true],[100,0,'clear',false,true,false]]){
  const h=scene();Object.assign(h.c,{sampleDistance:distance,sampleAngle:angle,sampleWeather:weather,sampleVehicle:vehicle,sampleHidden:hidden});
  h.run("cars=[v];enemy={alive:true,elite:false};boardEnemyGunTower(v,enemy);blue={x:enemy.x,y:enemy.y,face:enemy.face,alive:true,elite:false};humans=[enemy,blue];weather=sampleWeather;p.x=enemy.x+Math.cos(sampleAngle*Math.PI/180)*sampleDistance;p.y=enemy.y+Math.sin(sampleAngle*Math.PI/180)*sampleDistance;p.tank=sampleVehicle?{kind:'tank',f:10}:null;p.dig=sampleHidden?1:0;ordinary=!!findDetectedTarget(blue,blue.face);updateGunTowerEnemy(enemy,.016);");
  assert.equal(h.run('ordinary'),visible,String([distance,angle,weather,vehicle,hidden]));assert.equal(h.run('!!v.scanTarget'),h.run('ordinary'));assert.equal(h.run('bullets.length'),0);
 }
});
test('AI operators spin up before bursts and still rest for three seconds',()=>{
 for(const owner of ['enemy','partner']){
  const h=scene();h.c.sampleOwner=owner;
  h.run("p.x=v.x+200;p.y=v.y;if(sampleOwner==='enemy'){cars=[v];enemy={alive:true,elite:false};humans=[enemy];boardEnemyGunTower(v,enemy);attack=dt=>updateGunTowerEnemy(enemy,dt);}else{cars=[];partner={x:v.x,y:v.y,hp:3,vehicle:v};humans=[{x:v.x+200,y:v.y,alive:true}];attack=dt=>partnerGunTowerAttack(partner,dt);}step=dt=>{updateGunTowers(dt);attack(dt)};attack(0);");
  assert.equal(h.run('v.v'),500,owner);
  h.run('step(.25);');assert.equal(h.run('v.v'),500,owner);
  h.run('step(.25);');assert.equal(h.run('v.v'),499,owner);
  h.run('for(let i=0;i<25;i++)step(.1);');
  assert.ok(h.run('v.aiRestT')>0,owner);
  h.run('stoppedAmmo=v.v;step(.1);');assert.equal(h.run('v.v'),h.run('stoppedAmmo'),owner);
 }
});
test('player fire bypasses AI burst rest without consuming or resetting the AI cooldown',()=>{
 const h=scene();h.run("v.aiRestT=3;for(let i=0;i<100;i++)fireGunTower(v,0,'p');before=v.v;blocked=fireGunTower(v,0,'e');");
 assert.equal(h.run('before'),400);assert.equal(h.run('v.v'),400);assert.equal(h.run('blocked'),false);assert.equal(h.run('v.aiRestT'),3);
});

test('temporary suspicion and fire-related detection holds expire for a seated gunner',()=>{
 const h=scene();h.run("cars=[v];enemy={alive:true,elite:false,sus:.01,burnSuspicionHold:.01};boardEnemyGunTower(v,enemy);humans=[enemy];p.x=enemy.x+300;p.y=enemy.y;updateGunTowerEnemy(enemy,.02);");
 assert.equal(h.run('enemy.sus'),0);assert.equal(h.run('enemy.burnSuspicionHold'),0);assert.equal(h.run('bullets.length'),0);
});

test('200 enemy gatling hits destroy every player tank, while 199 do not',()=>{
 for(const id of ['t34','tiger','type10','m1','sherman','churchill','kingtiger']){
  const h=scene();h.c.testId=id;
  h.run("p.x=400;p.y=400;p.tank={kind:'tank',t:TYPES.find(t=>t.id===testId),ch:0,hp:10};round=()=>{b={x:450,y:400,vx:1000,vy:0,from:'e',k:'v',gatling:true};updateGatlingBullet(b,350,400,false);};for(let i=0;i<199;i++)round();");
  assert.equal(h.run('!!p.tank'),true,id);assert.ok(h.run('p.tank.ch')>0,id);
  h.run('round()');assert.equal(h.run('p.tank'),null,id);
  assert.ok(h.run('scoreStats.vehicleDamage')>0,id);
 }
});
test('enemy cannon destroys occupied and empty towers in one direct hit and leaves wreckage',()=>{
 for(const occupier of ['empty','enemy','player','partner']){
  const h=scene();h.c.occupier=occupier;
  h.run("cars=[v];if(occupier==='enemy'){enemy={x:v.x,y:v.y,alive:true};humans=[enemy];boardEnemyGunTower(v,enemy);}if(occupier==='player'){cars=[];p.tank=v;p.x=v.x;p.y=v.y;}if(occupier==='partner'){cars=[];partner={x:v.x,y:v.y,vehicle:v,hp:3,face:0};}shell={x:v.x+120,y:v.y,from:'e',k:'c'};hit=hitGunTowerByEnemyCannon(shell,v.x-120,v.y);");
  assert.equal(h.run('hit'),true,occupier);assert.equal(h.run('v.destroyed'),true,occupier);
  assert.equal(h.run("tankWrecks.filter(w=>w.id==='gunTower').length"),1,occupier);
  assert.equal(h.run('gunTowerAvailable(v)'),false,occupier);
  assert.equal(h.run('cars.includes(v)'),false,occupier);
  if(occupier==='player')assert.equal(h.run('p.tank'),null);
  if(occupier==='partner')assert.equal(h.run('partner.vehicle'),null);
  if(occupier==='enemy')assert.equal(h.run('enemy.alive'),false);
 }
});
test('gun tower geometry shrinks to 80 percent of prior dimensions',()=>{
 const h=scene();assert.equal(h.run('GUN_TOWER_TYPE.drawScale'),1.6);
 assert.equal(h.run('GUN_TOWER_TYPE.muzzleOffset'),59.2);
 assert.equal(h.run('GUN_TOWER_TYPE.playerTankHits'),200);
});
test('player gatling damage accumulates on an enemy tank and awards exactly one kill at thirty hits',()=>{
 const h=scene();h.run("enemyTank={x:400,y:400,alive:true,body:0,ang:0};etanks=[enemyTank];hit=()=>{const round={x:450,y:400,vx:1000,vy:0,from:'p',k:'v',gatling:true};updateGatlingBullet(round,350,400,false);};for(let i=0;i<29;i++)hit();");
 assert.equal(h.run('enemyTank.alive'),true);assert.equal(h.run('enemyTank.gatlingHits'),29);assert.equal(h.run('scoreStats.playerKills'),0);
 h.run('hit();for(let i=0;i<5;i++)hit();');assert.equal(h.run('enemyTank.alive'),false);assert.equal(h.run('enemyTank.wreckSpawned'),true);assert.equal(h.run('scoreStats.playerKills'),1);assert.equal(h.run('scoreStats.playerTankKills'),1);
});
test('partner gatling retains its previous tank behavior and enemy rounds still harm infantry',()=>{
 const h=scene();h.run("enemyTank={x:400,y:400,alive:true,body:0,ang:0};etanks=[enemyTank];for(let i=0;i<30;i++)updateGatlingBullet({x:450,y:400,vx:1000,vy:0,from:'ally',k:'v',gatling:true},350,400,false);etanks=[];p.x=400;p.y=400;updateGatlingBullet({x:450,y:400,vx:1000,vy:0,from:'e',k:'v',gatling:true},350,400,false);");
 assert.equal(h.run('enemyTank.alive'),true);assert.equal(h.run('enemyTank.gatlingHits||0'),0);assert.equal(h.run('p.hp'),2.5);
});
test('gatling retains original cover area with 1.5 times penetration',()=>{
 const h=scene();h.run("calls=[];carve=(x,y,r,credit,source)=>calls.push({r,credit,source});wall={};for(let i=0;i<5;i++)damageGunTowerCover(wall,100,100,'p');");assert.equal(h.run('calls.length'),0);
 h.run("damageGunTowerCover(wall,100,100,'p')");assert.equal(h.run('calls.length'),1);assert.ok(Math.abs(h.run('calls[0].r**2')-400)<1e-9);assert.equal(h.run('calls[0].credit'),true);
 h.run("damageGunTowerCover({frontAntenna:true},100,100,'p')");assert.equal(h.run('calls.length'),1);
});
test('frontline cargo uses original radius and 1.5 times penetration',()=>{
 const h=scene();h.run("damageFrontlineCargo=(c,x,y,r)=>{cargoRadius=r};cargo={frontCargo:true};for(let i=0;i<6;i++)damageGunTowerCover(cargo,100,100,'e');");
 assert.equal(h.run('cargoRadius'),12);
});
test('unalerted enemy gunners sweep a fixed 180-degree forward arc slowly and reverse at both limits',()=>{
 const h=scene();h.run("cars=[v];enemy={x:v.x,y:v.y,alive:true,elite:false};boardEnemyGunTower(v,enemy);findDetectedTarget=()=>null;v.scanT=0;start=v.aim;for(let i=0;i<1000;i++)updateGunTowerEnemy(enemy,.016);right=v.scanOffset;dir=v.scanDirection;for(let i=0;i<1000;i++)updateGunTowerEnemy(enemy,.016);left=v.scanOffset;");
 assert.ok(Math.abs(h.run('right'))<=Math.PI/2);assert.ok(Math.abs(h.run('left'))<=Math.PI/2);
 assert.equal(h.run('dir'),-1);assert.ok(Math.abs(h.run('left-right'))>.2);
 assert.ok(Math.abs(h.run('start-v.scanCenter'))<1e-9);
});
test('gunner sweep keeps ordinary vision checks and aims at detected targets',()=>{
 const h=scene();h.run("cars=[v];enemy={x:v.x,y:v.y,alive:true,elite:false};boardEnemyGunTower(v,enemy);target={x:v.x+180,y:v.y+90,alive:true};findDetectedTarget=()=>({obj:target,key:'p'});updateGunTowerEnemy(enemy,.2);");
 assert.equal(h.run('enemy.st'),1);assert.ok(Math.abs(h.run('v.aim-Math.atan2(90,180)'))<1e-9);
 assert.equal(h.run('bullets.length'),0);
 h.run('updateGunTowerEnemy(enemy,.3)');assert.equal(h.run('bullets.length'),1);
});

test('enemy gunner scanning turns at 80 percent of previous speed',()=>{
 const h=scene();h.run("cars=[v];enemy={x:v.x,y:v.y,alive:true,elite:false};boardEnemyGunTower(v,enemy);findDetectedTarget=()=>null;updateGunTowerEnemy(enemy,1);");
 assert.ok(Math.abs(h.run('v.scanOffset')-.208)<1e-10);
});
test('player gun tower is aimed by left-stick directions, and does not move with the stick',()=>{
 const h=scene();h.run("cars=[];p.tank=v;p.x=v.x;p.y=v.y;state='play';keys.ArrowLeft=true;touchTurretAngle=Math.PI/3;mx=0;my=0;lastMouse=performance.now();px=p.x;py=p.y;update(.016);");
 assert.ok(Math.abs(h.run('p.ang')-Math.PI)<1e-10);
 assert.equal(h.run('p.x===px&&p.y===py'),true);
 h.run("keys.ArrowLeft=false;keys.ArrowUp=true;update(.016);");
 assert.ok(Math.abs(h.run('p.ang')+Math.PI/2)<1e-10);
 h.run("keys.ArrowUp=false;update(.016);");
 assert.ok(Math.abs(h.run('p.ang')+Math.PI/2)<1e-10);
});

test('gun tower spin-up prevents firing for the first half second and keeps spinning while held',()=>{
 const h=scene();h.run("spinSounds=0;sfx=(name)=>{if(name==='gatlingSpin')spinSounds++};ready=updateGunTowerSpin(v,.25,true);");
 assert.equal(h.run('ready'),false);assert.equal(h.run('v.spinActive'),true);assert.equal(h.run('spinSounds'),1);
 h.run("phase=v.spinPhase;ready=updateGunTowerSpin(v,.24,true);");assert.equal(h.run('ready'),false);assert.ok(h.run('v.spinPhase!==phase'));
 h.run("ready=updateGunTowerSpin(v,.01,true);fireIfReady=ready&&fireGunTower(v,0,'p');");assert.equal(h.run('fireIfReady'),true);assert.equal(h.run('v.v'),499);
 h.run("phase=v.spinPhase;ready=updateGunTowerSpin(v,.1,true);");assert.equal(h.run('ready'),true);assert.ok(h.run('phase!==v.spinPhase'));assert.equal(h.run('spinSounds'),1);
 h.run("updateGunTowerSpin(v,.01,false);");assert.equal(h.run('v.spinTime'),0);assert.equal(h.run('v.spinActive'),false);
});
test('left joystick keeps continuous analog axes rather than quantizing turret to 8 directions',()=>{
 const h=scene();h.run("cars=[];p.tank=v;p.x=v.x;p.y=v.y;state='play';analogStickX=.7;analogStickY=.3;keys.ArrowRight=true;keys.ArrowDown=true;update(.016);");
 assert.ok(Math.abs(h.run('p.ang')-Math.atan2(.3,.7))<1e-10);
 h.run("analogStickX=0;analogStickY=0;keys.ArrowRight=false;keys.ArrowDown=false;update(.016);");
 assert.ok(Math.abs(h.run('p.ang')-Math.atan2(.3,.7))<1e-10);
});
test('enemy and partner tower operators warm up before the first bullet',()=>{
 for(const owner of ['enemy','partner']){
  const h=scene();h.c.mode=owner;h.run("p.x=v.x+180;p.y=v.y;if(mode==='enemy'){cars=[v];enemy={alive:true,elite:false};humans=[enemy];boardEnemyGunTower(v,enemy);attack=dt=>updateGunTowerEnemy(enemy,dt);}else{cars=[];partner={x:v.x,y:v.y,hp:3,vehicle:v};humans=[{x:v.x+180,y:v.y,alive:true}];attack=dt=>partnerGunTowerAttack(partner,dt);}attack(.25);");
  assert.equal(h.run('bullets.length'),0,owner);
  h.run('attack(.25)');assert.equal(h.run('bullets.length'),1,owner);
 }
});

test('enemy gunner holds target alert for two seconds after sight is lost',()=>{
 const h=scene();h.run("cars=[v];enemy={x:v.x,y:v.y,alive:true,elite:false};boardEnemyGunTower(v,enemy);p.x=v.x+200;p.y=v.y;updateGunTowerEnemy(enemy,.2);los=()=>false;before=bullets.length;for(let i=0;i<10;i++)updateGunTowerEnemy(enemy,.15);");
 assert.equal(h.run('enemy.st'),1);assert.equal(h.run('bullets.length'),h.run('before'));
 h.run("for(let i=0;i<6;i++)updateGunTowerEnemy(enemy,.15);");assert.equal(h.run('enemy.st'),0);
});

test('transparent Gatling sprites are drawn at the fixed base and rotating gun pivot',()=>{
 const h=scene();h.run("baseDraw=0;bodyDraw=0;bodyLeft=null;gunTowerSprites.base={complete:true,naturalWidth:312};gunTowerSprites.body={complete:true,naturalWidth:312};prevDrawImage=g.drawImage;g.drawImage=(image,x,y,w,h)=>{if(image===gunTowerSprites.base)baseDraw++;if(image===gunTowerSprites.body){bodyDraw++;bodyLeft=x;}};drawGunTower(v,v.x,v.y,Math.PI/3);g.drawImage=prevDrawImage;");
 assert.equal(h.run('baseDraw'),1);assert.equal(h.run('bodyDraw'),1);assert.equal(h.run('bodyLeft'),-31);
 assert.equal(h.run('GUN_TOWER_TYPE.seatOffset'),22.4);
});

test('new Gatling WebP sprites are both exactly 312x312 and have alpha',()=>{
 const fs=require('node:fs');
 for(const part of ['base','body']){
  const data=fs.readFileSync(path.join(__dirname,'..','assets','vehicles','gatling_'+part+'.webp'));
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.equal(data.toString('ascii',12,16),'VP8X');
  assert.equal((data[24]|(data[25]<<8)|(data[26]<<16))+1,312);
  assert.equal((data[27]|(data[28]<<8)|(data[29]<<16))+1,312);
  assert.ok(data[20]&16,'WebP should declare alpha');
 }
});
