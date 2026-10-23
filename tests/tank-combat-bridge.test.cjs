const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const angD=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function weapons(){
 const shots=[],c={Math,angD,R:()=>.5,fire:(...args)=>shots.push(args),firstBlockingCover:()=>null,detectDropRange:()=>900,enemyCannonSpeed:()=>300};vm.createContext(c);
 vm.runInContext(section('function turnEnemyTankTurret(','// 戦車の疑惑モード：'),c);
 return{c,shots,e:{x:0,y:0,ang:0,cc:0,vc:0,target:'p'}};
}
test('a target behind the tank gets fast MG tracking but no cannon until the turret has rotated into aim',()=>{
 const {c,shots,e}=weapons();
 for(let i=0;i<108;i++)c.updateEnemyTankWeapons(e,{x:-150,y:0},150,Math.PI,true,true,1/60);
 assert.ok(Math.abs(e.ang-Math.PI*.9)<1e-9);assert.equal(shots.filter(s=>s[4]==='c').length,0);assert.equal(shots[0][4],'v');assert.equal(shots[0][2],Math.PI);
 for(let i=0;i<12;i++)c.updateEnemyTankWeapons(e,{x:-150,y:0},150,Math.PI,true,true,1/60);
 const cannon=shots.find(s=>s[4]==='c');assert.ok(cannon);assert.ok(Math.abs(angD(Math.PI,cannon[2]))<=Math.PI/30+1e-9);assert.ok(Math.abs(cannon[0]-Math.cos(cannon[2])*38)<1e-9);assert.equal(e.cc,2.8);
});
test('cover shots also wait for turret alignment and firing pauses retain their protection',()=>{
 const {c,shots,e}=weapons();c.firstBlockingCover=()=>({x:-160,y:-10,w:20,h:20});
 c.updateEnemyTankWeapons(e,{x:150,y:0},150,0,false,true,.1);assert.equal(shots.length,0);assert.ok(e.ang>0);
 c.updateEnemyTankWeapons(e,{x:150,y:0},150,0,false,true,2);assert.equal(shots.length,1);assert.equal(shots[0][4],'c');assert.equal(shots[0][6],340);
 e.cc=0;c.updateEnemyTankWeapons(e,{x:150,y:0},150,0,true,false,2);assert.equal(shots.length,1);
});
test('turret rate is frame-rate independent and takes the short path across the angle boundary',()=>{
 for(const dt of [1/30,1/60,1/120]){const {c,e}=weapons();for(let i=0;i<Math.round(1/dt);i++)c.turnEnemyTankTurret(e,Math.PI,dt);assert.ok(Math.abs(e.ang-Math.PI/2)<1e-9);}
 const {c,e}=weapons();e.ang=Math.PI-.1;c.turnEnemyTankTurret(e,-Math.PI+.1,.1);assert.ok(e.ang>Math.PI);assert.ok(Math.abs(angD(-Math.PI+.1,e.ang))<.05);
});
test('first detection and repeated detection do not snap the turret toward the target',()=>{
 const {c,e}=weapons();Object.assign(c,{recordDecoyLure(){},targetObj:()=>({x:-150,y:0}),debugMode:0,DETECT_MEMORY:3,foundModePause:()=>.5,enemyModePaused(){},activateStaticTank(){},scoreStats:{foundEntries:0}});e.alive=true;
 vm.runInContext(section('function enterTankFound(','// Main gun follows'),c);c.enterTankFound(e,'p');assert.equal(e.ang,0);assert.equal(c.scoreStats.foundEntries,1);c.enterTankFound(e,'p');assert.equal(e.ang,0);assert.equal(c.scoreStats.foundEntries,1);
});
function bombContext(){
 const kills=[],c={Math,TANK_HIT:28,TANK_BOMB_HIT:42,p:{x:500,y:500,tank:null,dig:0},bombs:[],etanks:[],humans:[],hound:null,newCombatAction:()=>7,destroyEnemyTank:e=>{e.alive=false;},recordPlayerKill:(id,_s,e)=>kills.push([id,e]),burst(){},bombBlast(){},D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),waves:[],baseHitRect:()=>({x:900,y:900,w:10,h:10}),damageBase(){},fb(){},shake:0};vm.createContext(c);
 vm.runInContext('function updateBombs(dt){'+section(' // 爆弾\n for(let i=bombs.length-1',' // 弾\n')+'}',c);
 vm.runInContext('function updateWaves(dt){'+section(' for(const w of waves){w.r+=260*dt',' updateAlly(dt);')+'}',c);return{c,kills};
}
test('placed bomb contact catches a tank 40px away while a 43px miss does not trigger it',()=>{
 for(const [distance,hit] of [[40,true],[43,false]]){const {c,kills}=bombContext();c.bombs=[{x:distance,y:0,own:'p',armed:true}];c.etanks=[{x:0,y:0,alive:true}];c.updateBombs(.016);assert.equal(c.etanks[0].alive,!hit);assert.equal(c.bombs.length,hit?0:1);assert.equal(kills.length,hit?1:0);}
});
test('placed bomb blast waves never destroy tanks or award tank kills, even within the blast center',()=>{
 const {c,kills}=bombContext();c.waves=[{x:0,y:0,r:0,max:95,actionId:7}];c.etanks=[0,40,80,120].map(x=>({x,y:0,alive:true}));
 for(let i=0;i<30;i++)c.updateWaves(1/60);
 assert.equal(c.waves.length,0);assert.ok(c.etanks.every(e=>e.alive));assert.equal(kills.length,0);
});
test('bomb and burn bridge destruction launch capped rotating wooden fragments with gravity',()=>{
 const c={Math,R:()=>.5,MAX_PARTS:24,parts:[],bridges:[],water:[],shake:0,riverFlowDir:()=>1,riverFlowSpeed:()=>8};vm.createContext(c);
 vm.runInContext(section('function trimParts(','function updateParts('),c);vm.runInContext(section('function damageBridgeByBomb(','function bombBlast('),c);
 vm.runInContext('function burnBridges(dt){'+section(' const survivingBridges=[];',' bridges=survivingBridges;')+' bridges=survivingBridges;}',c);
 for(const mode of ['bomb','burn']){c.parts=[];c.bridges=[{x:100,y:200,w:100,h:60,burnT:.01}];if(mode==='bomb')c.damageBridgeByBomb(150,230);else c.burnBridges(.1);assert.equal(c.parts.length,8);assert.ok(c.parts.every(p=>p.arcFrag&&p.vz>0&&p.g>0&&p.col==='#7a4a25'));assert.equal(c.bridges.length,0);}
 for(let i=0;i<10;i++)c.cannonCoverDebris(0,0,'#7a4a25',8);assert.equal(c.parts.length,24);
});
