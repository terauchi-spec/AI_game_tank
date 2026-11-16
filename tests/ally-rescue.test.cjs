const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
function setup(){const h=createGameEngine(path.join(__dirname,'..'));h.run("stageMode='front';state='play';skill='partner';p={x:400,y:400,body:0};allies=[];parts=[];covers=[];humans=[];etanks=[];cars=[];fx=[];waves=[];water=[];bridges=[];mud=[];mission=null;base={x:100,y:50,w:100,h:100,hp:30};scoreStats=newScoreStats();los=()=>true;");return h;}
test('object chain blasts push allied soldiers without stunning them; enemy cannons still stun',()=>{
 const h=setup();
 h.run(`
  bushes=[];partner=null;hound=null;
  var barrel={x:500,y:500,w:20,h:20,kind:'barrel'},crate={x:585,y:500,w:20,h:20,kind:'crate'};
  var frontlineSoldier={x:510,y:560,alive:true,frontline:true},reinforcement={x:590,y:560,alive:true};
  objects=[barrel,crate];allies=[frontlineSoldier,reinforcement];rebuildSpatialGrid();
  explodeObject(barrel);
 `);
 assert.ok(h.run('crate.burnT>0'));
 for(const ally of ['frontlineSoldier','reinforcement']){
  assert.ok(h.run(ally+'.blastAirT>0'));
  assert.equal(h.run(ally+'.blastLandStun'),0);
  assert.equal(h.run('updateBlastFlight('+ally+',1);'+ally+'.stun||0'),0);
 }
 h.run("stageMode='base';allies=[reinforcement];updateBurningObjects(4)");
 assert.equal(h.run('objects.length'),0);
 assert.ok(h.run('reinforcement.blastAirT>0'));
 assert.equal(h.run('updateBlastFlight(reinforcement,1);reinforcement.stun||0'),0);
 h.run("cannonImpact(reinforcement.x-10,reinforcement.y,'e');updateBlastFlight(reinforcement,1)");
 assert.equal(h.run('reinforcement.stun'),5);
 h.run("stageMode='front';allies=[frontlineSoldier];cannonImpact(frontlineSoldier.x-10,frontlineSoldier.y,'e');updateBlastFlight(frontlineSoldier,1)");
 assert.equal(h.run('frontlineSoldier.stun'),10);
});
test('contact rescue emits exactly one rising, fading, bounded rescue cross',()=>{
 const h=setup();h.run("a={x:400,y:410,alive:true,stun:10};allies=[a];rescueFrontlineAlly(a);rescueFrontlineAlly(a);");
 assert.equal(h.run('a.stun'),0);assert.equal(h.run('a.stunImmuneT'),15);assert.equal(h.run('parts.filter(q=>q.rescueCross).length'),1);
 const y=h.run('parts[0].y');h.run('updateParts(.4)');assert.ok(h.run('parts[0].y')<y);assert.ok(h.run('parts[0].life')<.8);h.run('updateParts(.41)');assert.equal(h.run('parts.length'),0);
});
test('automatic soldier recovery has no cross and blocks blast stun until five seconds elapse',()=>{
 const h=setup();h.run("a={x:700,y:700,alive:true,stun:.1};allies=[a];updateFrontlineAllyStun(a,.1);stunHumanBlast(a,10);");
 assert.equal(h.run('a.stun'),0);assert.equal(h.run('parts.length'),0);assert.equal(h.run('a.stunImmuneT'),5);
 h.run('for(let i=0;i<49;i++)updateAlly(.1);stunHumanBlast(a,10)');assert.equal(h.run('a.stun'),0);
 h.run('updateAlly(.11);stunHumanBlast(a,10)');assert.equal(h.run('a.stun'),10);
});
test('partner contact and automatic recovery protect from repeat own blasts without changing HP',()=>{
 for(const contact of [true,false]){
  const h=setup();h.c.contact=contact;h.run("partner={x:contact?400:700,y:400,hp:3,down:false,stunT:.1,stunContactDelay:0};updatePartner(.1);stunPartnerByOwnBlast(partner.x,partner.y);");
  assert.equal(h.run('partner.stunT'),0);assert.equal(h.run('partner.stunImmuneT'),contact?15:5);assert.equal(h.run('partner.hp'),3);assert.equal(h.run('parts.filter(q=>q.rescueCross).length'),contact?1:0);
  h.run('for(let i=0;i<(contact?149:49);i++)updatePartner(.1);stunPartnerByOwnBlast(partner.x,partner.y)');assert.equal(h.run('partner.stunT'),0);
  h.run('updatePartner(.11);stunPartnerByOwnBlast(partner.x,partner.y)');assert.equal(h.run('partner.stunT'),5);
 }
});
test('rescuing a downed partner also signals the rescue and protects against immediate stun',()=>{
 const h=setup();h.run("partner={x:400,y:400,hp:0,down:true,stunT:0};updatePartner(.1);stunPartnerByOwnBlast(400,400);");
 assert.equal(h.run('partner.down'),false);assert.equal(h.run('partner.hp'),3);assert.equal(h.run('partner.stunT'),0);assert.equal(h.run('partner.stunImmuneT'),15);assert.equal(h.run('parts.filter(q=>q.rescueCross).length'),1);
});

test('reinforcement contact rescue works outside Frontline and emits one cross per rescue',()=>{
 for(const stage of ['base','indoor','front']){
  const h=setup();h.c.sampleStage=stage;
  h.run("stageMode=sampleStage;a={x:400,y:410,alive:true,stun:5,stunRecover:1,chute:0,shotCd:1,slot:0};allies=[a];updateAlly(.016);");
  assert.equal(h.run('a.stun'),0);assert.equal(h.run('a.stunRecover'),0);assert.equal(h.run('a.stunImmuneT'),15);assert.equal(h.run('parts.filter(q=>q.rescueCross).length'),1);
  h.run('updateAlly(.016)');assert.equal(h.run('parts.filter(q=>q.rescueCross).length'),1);
 }
});
test('reinforcement rescue still requires on-foot contact and unobstructed sight',()=>{
 for(const block of ["p.tank={}","p.dig=1","p.x=500","los=()=>false"]){
  const h=setup();h.run("stageMode='base';a={x:400,y:410,alive:true,stun:5};allies=[a];"+block+";updateAlly(.016)");
  assert.ok(h.run('a.stun')>0);assert.equal(h.run('parts.filter(q=>q.rescueCross).length'),0);
 }
});
test('an on-foot companion rescues a nearby soldier only while able to reach them',()=>{
 for(const block of ['', 'partner.down=true', 'partner.stunT=1', 'partner.vehicle={}', 'partner.passengerVehicle={}', 'los=()=>false']){
  const h=setup();h.run("stageMode='base';p.x=900;partner={x:400,y:420};a={x:400,y:410,alive:true,stun:5};allies=[a];"+block+";updateAlly(.016)");
  assert.equal(h.run('a.stun===0'),block==='',block);
  assert.equal(h.run('parts.filter(q=>q.rescueCross).length'),block===''?1:0);
 }
});
test('hound contact rescue emits exactly one cross; automatic recovery emits none',()=>{
 for(const contact of [true,false]){
  const h=setup();h.c.contact=contact;
  h.run("skill='hound';hound={x:contact?400:450,y:400,face:0,stun:contact?5:.01,state:'stunned'};updateHound(.016);");
  assert.equal(h.run('hound.stun'),0);assert.equal(h.run('parts.filter(q=>q.rescueCross).length'),contact?1:0);
  h.run('updateHound(.016)');assert.equal(h.run('parts.filter(q=>q.rescueCross).length'),contact?1:0);
 }
});

test('all three skill companions resist repeat stun for fifteen seconds after contact rescue',()=>{
 for(const kind of ['reinforcement','partner','hound']){
  const h=setup();h.c.kind=kind;
  h.run("if(kind==='reinforcement'){stageMode='base';a={x:400,y:410,alive:true,stun:5,chute:0,shotCd:1,slot:0};allies=[a];tick=dt=>updateAlly(dt);hit=()=>stunHumanBlast(a,5);getStun=()=>a.stun;}else if(kind==='partner'){partner={x:400,y:410,hp:3,stunT:5,stunContactDelay:0};a=partner;tick=dt=>updatePartner(dt);hit=()=>stunPartnerByOwnBlast(a.x,a.y);getStun=()=>a.stunT;}else{skill='hound';spawnHound();hound.x=400;hound.y=410;hound.stun=5;hound.state='stunned';a=hound;tick=dt=>updateHound(dt);hit=()=>stunHound(5);getStun=()=>a.stun;}tick(.016);hit();");
  assert.equal(h.run('a.stunImmuneT'),15,kind);assert.equal(h.run('getStun()'),0,kind);
  h.run('for(let i=0;i<149;i++){tick(.1);hit();}');assert.equal(h.run('getStun()'),0,kind);
  h.run('tick(.11);hit();');assert.ok(h.run('getStun()')>0,kind);
 }
});
test('hound blast stun obeys contact-rescue protection and can stun again after it expires',()=>{
 const h=setup();h.run("skill='hound';spawnHound();hound.x=400;hound.y=410;hound.stun=5;updateHound(.016);stunHoundAtBlast(hound.x,hound.y,95);");
 assert.equal(h.run('hound.stun'),0);assert.equal(h.run('hound.state'),'return');
 h.run('for(let i=0;i<151;i++)updateHound(.1);stunHoundAtBlast(hound.x,hound.y,95);');assert.equal(h.run('hound.stun'),5);
});
