const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),dogs=fs.readFileSync(require.resolve('../js/enemy-dogs.js'),'utf8'),world=fs.readFileSync(require.resolve('../js/infiltration-world.js'),'utf8');
function harness(mode='indoor'){
 const calls=[],c={stageMode:mode,debugMode:0,p:{x:100,y:100},skill:'throw',partner:null,commanderRallying:false,humans:[],
  tone(){},say(){},D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),W:800,H:600,cam:0,camX:0,hound:null,
  g:{save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){calls.push('leash');}},drawHound(){calls.push('dog');}};
 c.enterHumanFound=(h,key)=>{h.st=1;h.target=key;h.indoorAlert||={phase:'found'};};
 vm.createContext(c);vm.runInContext(world+'\n'+dogs+`;indoorWorld={currentFloor:0,floors:[],alarm:{active:false,witnesses:new Set(),elapsed:0}};
 api={bark:dogBark,record:indoorRecordGuardDiscovery,level:indoorAlarmLevel,leashes:drawEnemyDogLeashes,bodies:drawEnemyDogs,world:indoorWorld,dogs:enemyDogs};`,c);
 c.handler={x:150,y:100,alive:true,indoorGuard:true,indoorFloor:1};
 c.other={x:200,y:100,alive:true,indoorGuard:true,indoorFloor:1};
 c.third={x:230,y:100,alive:true,indoorGuard:true,indoorFloor:1};c.humans.push(c.handler,c.other,c.third);
 c.dog={x:120,y:100,face:0,handler:c.handler,patrolMode:mode==='indoor'?'indoor':'orbit',indoorFloor:1,targetKey:'p',stun:0,barkCooldown:0};
 c.api.dogs.push(c.dog);return{c,calls};
}
test('one indoor bark plus subsequent direct sightings adds one red eye for all bark responders',()=>{
 const {c}=harness();c.api.bark(c.dog);assert.equal(c.api.level(),1);
 assert.ok(c.humans.every(h=>h.st===1&&h.target==='p'));
 for(const h of c.humans)c.api.record(h);assert.equal(c.api.level(),1);assert.equal(c.api.world.alarm.active,false);
 c.dog.barkCooldown=0;c.api.bark(c.dog);for(const h of c.humans)c.api.record(h);assert.equal(c.api.level(),1);
});
test('seeing the handler first and hearing its dog later still counts once',()=>{
 const {c}=harness();c.enterHumanFound(c.handler,'p');c.api.record(c.handler);assert.equal(c.api.level(),1);
 c.api.bark(c.dog);for(const h of c.humans)c.api.record(h);assert.equal(c.api.level(),1);
});
test('independent discoveries keep their warnings, including new encounters after dog pursuit ends',()=>{
 const {c}=harness();c.enterHumanFound(c.other,'p');c.api.record(c.other);c.api.bark(c.dog);
 assert.equal(c.api.level(),2);c.api.record(c.other);assert.equal(c.api.level(),2);
 const second=harness().c;second.api.bark(second.dog);second.other.indoorAlert=null;
 second.enterHumanFound(second.other,'p');second.api.record(second.other);assert.equal(second.api.level(),2);
});
test('outdoor barks keep alerting soldiers without indoor warning bookkeeping',()=>{
 for(const mode of ['base','front']){const {c}=harness(mode);c.api.bark(c.dog);assert.equal(c.api.level(),0);assert.ok(c.humans.every(h=>h.st===1));}
});
test('a bark at the partner does not count as a player discovery',()=>{
 const {c}=harness();c.skill='partner';c.partner={x:100,y:100};c.dog.targetKey='partner';c.api.bark(c.dog);
 assert.equal(c.api.level(),0);assert.ok(c.humans.every(h=>h.target==='partner'));
});
test('leash pass draws once for each visible living handler; dog pass draws no leashes in any stage',()=>{
 for(const mode of ['base','front','indoor']){
  const {c,calls}=harness(mode);c.api.leashes();assert.deepEqual(calls,['leash']);
  calls.length=0;c.api.bodies();assert.deepEqual(calls,['dog']);
  c.handler.alive=false;calls.length=0;c.api.leashes();assert.deepEqual(calls,[]);
  c.handler.alive=true;c.dog.y=2000;c.api.leashes();assert.deepEqual(calls,[]);
 }
});
test('world rendering calls the leash pass before enemy infantry and dog bodies',()=>{
 const start=html.indexOf(' drawEnemyDogLeashes();'),infantry=html.indexOf(' if(enemyAlpha>.001)for(const h of humans)',start),bodies=html.indexOf('drawEnemyDogs();',start);
 assert.ok(start>=0&&infantry>start&&bodies>infantry);
 assert.ok(!html.slice(start,infantry).includes("stageMode==="),'shared by every stage');
});
