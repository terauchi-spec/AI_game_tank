const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function start(seed=7){const h=createGameEngine(root,{seed});h.run("stageMode='escapeTest';areaDebugEnabled=false;skill='throw';reset(false)");return h;}
test('escape test selection is developer-only and does not change the ten official stages',()=>{
 const h=createGameEngine(root);assert.equal(h.run('STAGE_ORDER.length'),10);
 assert.equal(h.run("setSelectedStage('escapeTest')"),false);
 h.run('setDeveloperMode(true)');assert.equal(h.run("setSelectedStage('escapeTest')"),true);
 assert.equal(h.nodes.get('stageDeploy').textContent,'脱出（テスト）で出撃');
 h.run("state='stage';selectedSkillId='throw'");assert.equal(h.run('deploySelectedStage()'),true);assert.equal(h.run('stageMode'),'escapeTest');assert.equal(h.run('areaDebugEnabled'),false);
 h.run('setDeveloperMode(false)');assert.equal(h.run('selectedStageId'),null);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/data-stage="escapeTest" hidden/);
});
test('five contiguous jungle areas reuse normal combat and terrain, with safe start and EXIT',()=>{
 const variants=new Set();
 for(const seed of [1,7,13,31,91]){
  const h=start(seed);assert.equal(h.run('ZONES.length'),5);
  assert.equal(h.run("ZONES.every((z,i)=>z.n==='密林'&&z.y0-z.y1===2400&&(i===0||ZONES[i-1].y1===z.y0))"),true);
  assert.equal(h.run('zoneAt(p.y)===ZONES[0]'),true);assert.equal(h.run('zoneAt(mission.exit.y)===ZONES[4]'),true);
  assert.equal(h.run('inWaterAt(mission.exit.x,mission.exit.y)||hitsC(mission.exit.x,mission.exit.y,90)||hitsM(p.x,p.y,8)'),false);
  assert.equal(h.run('areaDebugEnabled||debugInvincible||cars.some(v=>v.debugInfinite)'),false);
  assert.equal(h.run('cars.length'),1);assert.equal(h.run('humans.length'),40);assert.equal(h.run('etanks.length'),10);
  assert.equal(h.run('ZONES.every(z=>z.jungleDensity.trees>5&&z.jungleDensity.grass>20)'),true);
  assert.equal(h.run('ZONES.every(z=>!z.escapeRiver||z.escapeRiver.h>=35&&z.escapeRiver.h<=600&&z.escapeRiver.bridge.h===z.escapeRiver.h)'),true);
  assert.equal(h.run('ZONES.every(z=>!z.oasis||z.oasis.sizeScale>=.2&&z.oasis.sizeScale<=1.5&&water.includes(z.oasis))'),true);
  variants.add(h.run('ZONES.map(z=>Number(!!z.escapeRiver)+2*Number(!!z.oasis)).join()'));
  h.run('draw();for(let i=0;i<120;i++)update(1/60);p.x=mission.exit.x;p.y=mission.exit.y;cam=p.y-300;draw()');
  assert.equal(h.run('state'),'play');
 }
 assert.ok(variants.size>1);
});
test('EXIT requires five uninterrupted seconds on foot, resets outside, and finalizes exactly once without saving',()=>{
 const h=start(),before=Array.from(h.storage.entries());h.run('recordStageSortie(scoreStats);p.x=mission.exit.x;p.y=mission.exit.y;updateMission(4.9)');
 assert.equal(h.run('state'),'play');assert.equal(h.run('mission.escapeProgress'),4.9);
 h.run('p.x+=INDOOR_EXIT_RADIUS+1;updateMission(.2)');assert.equal(h.run('mission.escapeProgress'),0);
 h.run('p.x=mission.exit.x;p.tank=cars[0];updateMission(5)');assert.equal(h.run('mission.escapeProgress'),0);
 h.run("p.tank=null;state='briefing';updateMission(5)");assert.equal(h.run('mission.escapeProgress'),0);
 h.run("p.y=0;state='play';updateMission(.1)");assert.equal(h.run('mission.index'),4);h.run('p.y=mission.exit.y;updateMission(5)');assert.equal(h.run('state'),'succeeded');assert.equal(h.run('scoreStats.final.cleared'),true);
 assert.equal(h.run('scoreStats.awards.disabled&&scoreStats.debugUsed'),true);assert.equal(h.run('scoreStats.objectiveProgress'),1);
 const final=h.run('scoreStats.final');h.run('updateMission(5);finalizeScore(true);draw()');assert.equal(h.run('scoreStats.final'),final);
 assert.deepEqual(Array.from(h.storage.entries()),before);
});
test('test failure cannot save records and returning to a normal stage clears the escape mission',()=>{
 const h=start(),before=Array.from(h.storage.entries());h.run("p.hp=0;updateMission(5);finalizeScore(false)");assert.equal(h.run('scoreStats.final.cleared'),false);assert.deepEqual(Array.from(h.storage.entries()),before);
 h.run("stageMode='beginner';reset(false);draw();update(1/60)");assert.equal(h.run('!!mission?.escapeTest'),false);assert.equal(h.run("ZONES.some(z=>z.escapeArea!==undefined)"),false);assert.equal(h.run('!!scoreStats.escapeTest'),false);
});
test('shared river and lake generators retain legacy probability boundaries, sizes and random draw counts',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),river=html.slice(html.indexOf('function rollRiverCrossing('),html.indexOf('function reset(',html.indexOf('function rollRiverCrossing(')));
 const canyon=fs.readFileSync(path.join(root,'js/canyon.js'),'utf8'),lake=canyon.slice(canyon.indexOf('function rollWildernessLake('),canyon.indexOf('function buildCanyonZones('));
 function run(code,seq){let draws=0;const c={WW:960,WH:12800,Math,R:()=>{if(draws>=seq.length)throw Error('unexpected random draw');return seq[draws++];},water:[],bridges:[]};vm.createContext(c);const value=vm.runInContext(code,c);return {value:JSON.parse(JSON.stringify(value)),draws,c};}
 assert.equal(run(river+'rollRiverCrossing(5000)',[.75]).value,null);assert.equal(run(lake+'rollWildernessLake({y1:1000,y0:3400})',[.55]).value,null);
 for(const n of [0,.5,.999999]){
  const r=run(river+'rollRiverCrossing(5000)',[.749999,n,.25,.5,.5,.5]);assert.equal(r.draws,6);assert.equal(r.value.h,35+Math.pow(n,.72)*565);assert.equal(r.c.water.length,2);assert.equal(r.c.bridges.length,1);assert.equal(r.value.bridge.w,160);
  const l=run(lake+'rollWildernessLake({y1:1000,y0:3400})',[.549999,n,.5,.5,.5,.5]);assert.equal(l.draws,6);assert.equal(l.value.sizeScale,.2+n*1.3);assert.equal(l.value.w,710*l.value.sizeScale);assert.equal(l.value.h,560*l.value.sizeScale);assert.equal(l.value.flowSpeed,0);
 }
});
