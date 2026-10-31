const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
function scene(){const h=createGameEngine(path.join(__dirname,'..'));h.run("stageMode='base';setupZones();state='play';skill='partner';p={x:480,y:11500,hp:3,body:0,ang:0,cc:0,vc:0,dig:0,scd:0};allies=[];parts=[];covers=[];objects=[];bushes=[];humans=[];etanks=[];cars=[];bullets=[];fx=[];waves=[];water=[];bridges=[];mud=[];mission=null;base={x:100,y:50,w:100,h:100,hp:30,maxHp:30};scoreStats=newScoreStats();los=()=>true;rebuildSpatialGrid();v={x:480,y:11000,t:GUN_TOWER_TYPE,kind:'tower',hp:8,c:0,v:500,f:0,ch:0,body:0,aim:0};");return h;}
test('emplacements spawn only in the two advanced stages and start with zero fuel and 500 rounds',()=>{
 for(const id of ['beginner','baseIntermediate','base','frontBeginner','frontIntermediate','front','indoor','indoorLab','decisive','training']){
  const h=scene();h.c.sampleId=id;h.run("currentStageId=()=>sampleId;stageMode=sampleId==='front'?'front':'base';mission={points:[{x:240,y:9000},{x:720,y:6000},{x:240,y:3000}]};setupGunTowers();");
  assert.equal(h.run("cars.filter(v=>v.kind==='tower').length"),['base','front'].includes(id)?3:0,id);
  assert.equal(h.run("cars.every(v=>v.v===500&&v.f===0&&v.t.sp===0)"),true,id);
 }
});
test('each tower uses a 50% initial blue-gunner draw without replenishing ammunition on capture',()=>{
 for(const roll of [.49,.5]){
  const h=scene();h.c.roll=roll;h.run('(function(R){return '+h.run('setupGunTowers.toString()')+'})(()=>roll)();');assert.equal(h.run('cars.filter(v=>v.gunner).length'),roll<.5?3:0);
 }
 const h=scene();h.run("cars=[v];enemy={x:v.x,y:v.y,alive:true,elite:false};boardEnemyGunTower(v,enemy);fireGunTower(v,0,'e',enemy);gunTowerBlast(v.x,v.y,95);");
 assert.equal(h.run('gunTowerAvailable(v)'),true);assert.equal(h.run('enemy.gunTower'),null);assert.equal(h.run('v.v'),499);assert.ok(h.run('enemy.stun')>0);
 h.run("partner={x:v.x,y:v.y,hp:3};partnerBoardVehicle(partner,v)");assert.equal(h.run('partner.vehicle===v'),true);assert.equal(h.run('v.v'),499);
});
test('swept gatling rounds hit nearer enemy infantry during friendly fire and spare their own gunner',()=>{
 const h=scene();h.run("v.x=100;v.y=400;enemy={x:100,y:400,alive:true};friend={x:170,y:400,alive:true};humans=[enemy,friend];p.x=240;p.y=400;fireGunTower(v,0,'e',enemy);b=bullets[0];b.x=300;b.y=400;updateGatlingBullet(b,130,400,false);");
 assert.equal(h.run('enemy.alive'),true);assert.equal(h.run('friend.alive'),false);assert.equal(h.run('p.hp'),3);assert.equal(h.run('scoreStats.playerKills'),0);
});
test('the gun keeps a strict shared 500-round limit with superior fire rate and range',()=>{
 const h=scene();h.run("for(let i=0;i<510;i++)fireGunTower(v,0,'p');");
 assert.equal(h.run('v.v'),0);assert.equal(h.run('bullets.length'),500);assert.equal(h.run('fireGunTower(v,0,\'p\')'),false);
 assert.ok(h.run('GUN_TOWER_TYPE.vcd<Math.min(...TYPES.map(t=>t.vcd))'));assert.equal(h.run('GUN_TOWER_TYPE.range'),150*4);assert.equal(h.run('bullets[0].life*GUN_TOWER_TYPE.speed'),600);
});
test('cover is chipped only after sustained hits and always stops gatling rounds before a soldier behind it',()=>{
 const h=scene();h.run("wall={x:150,y:380,w:80,h:60,kd:1};covers=[wall];victim={x:260,y:400,alive:true};humans=[victim];rebuildSpatialGrid();v.x=100;v.y=400;Math.random=()=>.5;for(let i=0;i<7;i++){fireGunTower(v,0,'p');b=bullets.pop();b.x=300;b.y=400;updateGatlingBullet(b,137,400,false);}");
 assert.equal(h.run('victim.alive'),true);assert.equal(h.run('wall.gatlingHits'),7);assert.equal(h.run('covers.length'),1);
 h.run("fireGunTower(v,0,'p');b=bullets.pop();b.x=300;b.y=400;updateGatlingBullet(b,137,400,false);");assert.equal(h.run('victim.alive'),true);assert.ok(h.run('scoreStats.coverDestroyed')>0);
});
test('a partner can select a dry tower on a route, board it, fire and leave it without moving the tower',()=>{
 const h=scene();h.run("v.x=400;v.y=400;cars=[v];partner={x:380,y:400,hp:3,face:0};pickup=partnerRouteVehicle([{x:350,y:400},{x:500,y:400}]);partnerBoardVehicle(partner,pickup.car);oldX=v.x;oldY=v.y;partnerVehicleMove(partner,{x:700,y:600},100,.2);victim={x:800,y:400,alive:true};humans=[victim];partnerVehicleAttack(partner,.1);");
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
  assert.equal(h.run("cars.filter(v=>v.kind==='tower').length"),3,stage);
  assert.equal(h.run("cars.filter(v=>v.kind==='tower').every(v=>!hitsC(v.x,v.y,38)&&!inWaterAt(v.x,v.y,38))"),true,stage);
  h.run("draw(null);station=cars.find(v=>v.kind==='tower');if(station.gunner){station.gunner.alive=false;releaseGunTower(station);}humans=humans.filter(h=>D(h,station)>1000);allies=[];p.x=station.x;p.y=station.y+45;interact=true;update(.016);");
  assert.equal(h.run('p.tank===station'),true,stage);
  h.run("startX=p.x;startY=p.y;startAmmo=station.v;keys.ArrowUp=true;keys.KeyS=true;items=[{x:p.x,y:p.y,got:false}];for(let i=0;i<10;i++)update(.016);keys.ArrowUp=false;keys.KeyS=false;draw(null);");
  assert.equal(h.run('p.x===startX&&p.y===startY'),true,stage);assert.ok(h.run('station.v<startAmmo'),stage);assert.equal(h.run('station.f'),0);assert.equal(h.run('items[0].got'),false);
  h.run('interact=true;update(.016);draw(null);');assert.equal(h.run('p.tank'),null,stage);assert.equal(h.run('cars.includes(station)'),true,stage);
 }
});
test('nearby blue infantry can occupy a vacant tower and fire without walking the emplacement',()=>{
 const h=scene();h.run("cars=[v];v.reboardT=0;p.x=v.x+200;p.y=v.y;enemy={x:v.x+25,y:v.y,alive:true,elite:false};humans=[enemy];updateGunTowers(.016);updateGunTowerEnemy(enemy,.016);updateGunTowerEnemy(enemy,.08);");
 assert.equal(h.run('enemy.gunTower===v'),true);assert.equal(h.run('v.v'),498);assert.equal(h.run('bullets.every(b=>b.gatling&&b.from===\'e\')'),true);assert.equal(h.run('v.x'),480);assert.equal(h.run('v.y'),11000);assert.ok(h.run('D(enemy,v)')>20);
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
  assert.equal(h.run('ordinary'),visible,String([distance,angle,weather,vehicle,hidden]));assert.equal(h.run('!!v.scanTarget'),h.run('ordinary'));assert.equal(h.run('bullets.length>0'),visible);
 }
});
test('AI operators stop after at most 1.5 seconds and cannot fire for the next three seconds',()=>{
 for(const owner of ['enemy','partner']){
  const h=scene();h.c.sampleOwner=owner;
  h.run("p.x=v.x+200;p.y=v.y;if(sampleOwner==='enemy'){cars=[v];enemy={alive:true,elite:false};humans=[enemy];boardEnemyGunTower(v,enemy);attack=dt=>updateGunTowerEnemy(enemy,dt);}else{cars=[];partner={x:v.x,y:v.y,hp:3,vehicle:v};humans=[{x:v.x+200,y:v.y,alive:true}];attack=dt=>partnerGunTowerAttack(partner,dt);}step=dt=>{updateGunTowers(dt);attack(dt);};attack(0);step(.75);step(.74);beforeRest=v.v;step(.02);");
  assert.equal(h.run('v.v'),497,owner);assert.equal(h.run('beforeRest'),497,owner);assert.ok(h.run('v.aiRestT')>2.98,owner);
  h.run('step(2.98)');assert.equal(h.run('v.v'),497,owner);
  h.run('step(.02)');assert.equal(h.run('v.v'),496,owner);assert.equal(h.run('v.aiBurstT'),1.5,owner);
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
