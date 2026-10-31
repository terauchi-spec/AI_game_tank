const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function start(seed=7){
 const e=createGameEngine(root,{seed});
 e.run("localStorage.setItem(STAGE_PROGRESS_KEY,JSON.stringify({version:2,cleared:STAGE_ORDER.slice(0,-1).map(s=>s.id)}));localStorage.setItem(INTRO_NAME_KEY,'テスト');stageMode='decisive';areaDebugEnabled=false;skillDebugAll=false;stageDebugAll=false;skill='throw';reset(false);recordStageSortie(scoreStats)");return e;
}
test('10 unlocks after 09 and preserves its identity through the AI phase change, score submission and victory',()=>{
 const {run,storage}=start();assert.equal(run('currentStageId()'),'decisive');assert.equal(run('stageDisplayNumber(currentStageId())'),'10');
 assert.equal(run('allies.length'),0);assert.equal(run('p.tank'),null);assert.equal(run('zoneAt(p.y)===ZONES[0]'),true);assert.equal(run('scoreStats.stageRecordId'),'decisive');
 run('humans=[];etanks=[];p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y;for(let i=0;i<48;i++)updateMission(1)');
 assert.equal(run('decisiveBattle.phase'),'assault');assert.equal(run('stageMode'),'front');assert.equal(run('currentStageId()'),'decisive');assert.equal(run('scoreStats.stage'),'decisive');
 assert.equal(run('allies.length'),6);assert.ok(run('allies.every(a=>a.frontline)'));assert.ok(run('humans.length>0&&humans.length<=frontlineEnemyLimit()&&humans.every(h=>h.frontMarch)'));assert.equal(run('state'),'play');
 run('draw();for(let i=0;i<90;i++)update(1/60);draw()');assert.equal(run('state'),'play');
 run("damageBase(1000,base.x+base.w/2,base.y+base.h/2,100,1,'player')");assert.equal(run('state'),'blast');
 run('blastUpdate(3)');assert.equal(run('state'),'succeeded');assert.equal(run('scoreStats.final.cleared'),true);assert.equal(run('scoreStats.objectiveProgress'),1);
 assert.equal(run('scoreStats.stageRecordId'),'decisive');assert.equal(run('readStageRecords().stages.decisive.successes'),1);assert.equal(run('readStageRecords().stages.front.successes'),0);assert.equal(run('leaderboardPending.decisive.stage'),'decisive');assert.equal(run('readStageProgress().cleared.length'),10);assert.ok(run("scoreStats.awards.newTitles.includes('v3_all_stages_clear')"));
});
test('layout is starting grass, three distinct random areas and three contiguous desert areas',()=>{
 const {run}=start();const variants=new Set();
 for(let i=0;i<35;i++){
  run('setupDecisiveZones()');const z=JSON.parse(run('JSON.stringify(ZONES)'));assert.equal(z.length,7);assert.equal(z[0].n,'草原');assert.equal(new Set(z.slice(1,4).map(z=>z.n)).size,3);assert.ok(z.slice(4).every(z=>z.n==='砂漠'));for(let j=1;j<7;j++)assert.equal(z[j].y0,z[j-1].y1);variants.add(z.slice(1,4).map(z=>z.n).join(','));
 }
 assert.ok(variants.size>20);
});
test('desert defenses leave a central vehicle route and the relay cannot be bypassed or farmed from hiding',()=>{
 const {run}=start(11);assert.equal(run('covers.filter(c=>c.decisiveKind==="bunker").length'),9);assert.equal(run('covers.filter(c=>c.decisiveKind==="sandbags").length'),18);assert.ok(run('covers.every(c=>!decisiveRectsOverlap(c,{x:base.x-75,y:base.y,w:base.w+150,h:base.h}))'));
 assert.ok(run('covers.filter(c=>c.decisiveKind).every(c=>c.x+c.w<WW/2-100||c.x>WW/2+100)'));assert.ok(run('ZONES.slice(4).every(z=>cars.some(v=>v.y<z.y0&&v.y>z.y1))'));
 const hp=run('base.hp');run("damageBase(1000,base.x,base.y,60,1,'bomb')");assert.equal(run('base.hp'),hp);assert.equal(run('state'),'play');
 run('p.y=100;updateMission(.1)');assert.equal(run('p.y'),run('decisiveBattle.border+32'));
 run('humans=[];etanks=[];p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y;p.dig=1;updateMission(10)');assert.equal(run('mission.progress'),0);run('p.dig=0;p.tank={kind:"fighter"};updateMission(10)');assert.equal(run('mission.progress'),0);
 run('p.tank=null;humans=[{x:p.x+20,y:p.y,alive:true}];updateMission(10)');assert.equal(run('mission.progress'),0);assert.equal(run('mission.contested'),true);
 run('humans=[];updateMission(10)');assert.equal(run('mission.progress'),10);assert.equal(run('allies.length'),0);assert.equal(run('stageMode'),'decisive');
});
test('capturing the relay or reaching the final objective cannot finish the stage; wave and ally bounds persist',()=>{
 const {run}=start();run('humans=[];etanks=[];p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y;updateMission(48)');assert.equal(run('state'),'play');assert.equal(run('beginDecisiveAssault()'),false);
 run('p.x=mission.points[0].x;p.y=mission.points[0].y;for(let i=0;i<200;i++)updateMission(.5)');assert.equal(run('state'),'play');assert.ok(run('base.hp>0'));assert.ok(run('humans.filter(h=>h.alive).length<=frontlineEnemyLimit()'));assert.ok(run('allies.filter(a=>a.alive&&a.frontline).length<=10'));assert.equal(run('scoreStats.final'),null);
});
test('moving fortress yields to nearby units; bunker and fortress guns reuse existing enemy projectiles',()=>{
 const {run}=start();run('humans=[];etanks=[];p.x=decisiveBattle.gate.x;p.y=decisiveBattle.gate.y;updateMission(48)');const x=run('base.x');run('updateDecisiveFortress(.1)');assert.notEqual(run('base.x'),x);
 run('p.x=base.x+base.w+5;p.y=base.y+100');const blocked=run('base.x');run('updateDecisiveFortress(.1)');assert.equal(run('base.x'),blocked);
 run('p.x=base.x+base.w/2;p.y=base.y+base.h+150;decisiveBattle.fortressCd=0;updateDecisiveFortress(.1)');assert.ok(run('bullets.some(b=>b.from==="e"&&b.k==="c")'));
 run('const bunker=decisiveBattle.bunkers[0];p.x=bunker.x+bunker.w/2;p.y=bunker.y+bunker.h+45;bunker.gunCd=0;decisiveBattle.gunScan=0;updateDecisiveBunkers(.2)');assert.ok(run('bullets.some(b=>b.from==="e"&&b.k==="v")'));
});
test('starting an existing stage clears decisive state and preserves its normal map and mission rules',()=>{
 const {run}=start();run("stageMode='beginner';reset(false)");assert.equal(run('decisiveBattle'),null);assert.equal(run('isDecisiveStage()'),false);assert.equal(run('currentStageId()'),'beginner');assert.equal(run('ZONES.length'),5);assert.equal(run('ZONES.some(z=>z.n==="砂漠")'),false);assert.equal(run('base.maxHp'),30);assert.equal(run('mission'),null);
 run("stageMode='front';frontlineBeginner=false;reset(false)");assert.equal(run('decisiveBattle'),null);assert.equal(run('mission.points.length'),3);assert.equal(run('currentStageId()'),'front');assert.ok(run('allies.length>0'));
});
test('decisive sprites, stage preview and script exist without new per-frame image loading',()=>{
 const src=fs.readFileSync(path.join(root,'js/decisive.js'),'utf8');for(const name of ['fortress','bunker','sandbags','desert'])assert.ok(fs.statSync(path.join(root,'assets/decisive',name+'.webp')).size<16000);assert.ok(fs.statSync(path.join(root,'assets/ui/stages/decisive.webp')).size<16000);assert.doesNotMatch(src.slice(src.indexOf('function updateDecisiveMission')),/makeAssetImage\(/);
});
