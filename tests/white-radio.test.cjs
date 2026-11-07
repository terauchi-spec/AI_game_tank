const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
const root=path.join(__dirname,'..');

test('white radio rolls once per eligible sortie and uses normal spawn clearance',()=>{
 const h=createGameEngine(root);
 h.run("p={x:480,y:9000};mission={northEdge:2400};specialSpawnZones=()=>[];randomSpecialSpawn=(radius,accept,zones,gap)=>accept({x:500,y:2460})&&gap===420?{x:500,y:2460}:null;");
 const place=roll=>h.run('(function(R){return '+h.run('placeWhiteRadio.toString()')+';})(()=>'+roll+')()');
 for(const mode of ['beginner','base','front','indoor','training','decisive']){
  h.run("stageMode='"+mode+"';areaDebugEnabled=false");place(.49);
  assert.equal(h.run('!!whiteRadio'),['beginner','base','front'].includes(mode),mode);
 }
 h.run("stageMode='front';areaDebugEnabled=true");place(0);assert.equal(h.run('whiteRadio'),null);
 h.run('areaDebugEnabled=false');place(.5);assert.equal(h.run('whiteRadio'),null);
});

test('support pass drops one commander and two ordinary parachutists alongside existing support',()=>{
 for(const mode of ['base','front']){
  const h=createGameEngine(root);
  h.run("stageMode='"+mode+"';state='play';p={x:480,y:6000,body:0,scd:0};allies=[{alive:true,slot:0}];allySeq=1;airstrike={x:1,y:9000};airbombs=[];missionSpot=(x,y)=>({x,y});startReinforcementPass();");
  assert.equal(h.run('allies.length'),1);assert.ok(h.run('reinforcementPass.y>frontlineView().y+H'));
  h.run('for(let i=0;i<300;i++)updateReinforcementPass(.02)');
  assert.equal(h.run('allies.length'),4);assert.equal(h.run('allies.filter(a=>a.frontCommander).length'),1);
  assert.equal(h.run('allies.slice(1).filter(a=>a.frontCommander===false).length'),2);
  assert.equal(h.run('allies.slice(1).every(a=>a.chute===3&&a.shotCd===.2&&a.burstLeft===3&&a.landY>=a.startY)'),true);
  assert.equal(h.run('new Set(allies.map(a=>a.slot)).size'),4);
  assert.equal(h.run('reinforcementPass'),null);assert.equal(h.run('airstrike.x'),1);assert.equal(h.run('airbombs.length'),0);
  assert.equal(h.run('p.scd'),0);
 }
});

test('parachute soldiers move to open ground when the touchdown spot becomes blocked',()=>{
 const h=createGameEngine(root);
 h.run("stageMode='base';p={x:480,y:6300,body:0};allies=[];humans=[];etanks=[];objects=[];water=[];bridges=[];covers=[];base={x:0,y:-1000,w:20,h:20,hp:30};rebuildSpatialGrid();spawnParachuteAlly(480,5680,6000,0,true);");
 h.run("covers=[{kd:1,x:420,y:5960,w:120,h:80}];rebuildSpatialGrid();updateAlly(3);");
 assert.equal(h.run('allies[0].chute'),0);
 assert.ok(h.run('Math.hypot(allies[0].x-480,allies[0].y-6000)>0'));
 assert.ok(h.run('Math.hypot(allies[0].x-480,allies[0].y-6000)<200'));
 assert.equal(h.run('hitsM(allies[0].x,allies[0].y,12)'),false);
 assert.equal(h.run('allies[0].frontCommander'),true);
});
