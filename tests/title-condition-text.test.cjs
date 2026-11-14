const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
test('each composite names both of its actual required axes, and legends use the current achievement terminology',()=>{
 const h=createGameEngine(root);
 assert.equal(h.run("TITLE_CATALOG.filter(t=>t.axes).every(t=>t.axes.every(i=>t.note.includes(RES_AXES[i]))&&t.note.includes('ともにLv5'))"),true);
 assert.equal(h.run("TITLE_CATALOG.filter(t=>t.legendFrom).every(t=>t.note.startsWith('実績「')&&t.note.includes('累計3回獲得'))"),true);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.ok(!html.includes('上級称号'));assert.ok(!html.includes('通常6ステージ'));
});
test('stage-dependent tactical notes match actual Lv4 and Lv5 event boundaries',()=>{
 const h=createGameEngine(root);
 for(const [stage,normal,elite] of [['base',16,18],['front',16,18],['indoor',11,12]]){
  for(const [level,count] of [[4,normal],[5,elite]]){
   h.c.sampleStage=stage;h.c.sampleCount=count;h.c.sampleLevel=level;
   assert.equal(h.run('(()=>{const s=Object.assign(newScoreStats(),{stage:sampleStage,tacticalStuns:sampleCount});return resLevel(resultMetrics(s,{})[5])>=sampleLevel})()'),true);
   assert.equal(h.run('(()=>{const s=Object.assign(newScoreStats(),{stage:sampleStage,tacticalStuns:sampleCount-1});return resLevel(resultMetrics(s,{})[5])>=sampleLevel})()'),false);
   assert.ok(h.run(`TITLE_AXIS_REQUIREMENTS[5].${level===4?'normalNote':'eliteNote'}`).includes(String(count)+'回'));
  }
 }
});
test('teamwork notes describe the recorded point weights and the shared time cap while retaining stage-specific estimates',()=>{
 const h=createGameEngine(root);
 for(const [stats,points] of [[{partnerRescues:1},3],[{jointKills:1},1],[{partnerDocuments:1},4],[{jointObjectiveSeconds:4},1],[{jointObjectiveSeconds:8},2],[{jointObjectiveSeconds:100},8]]){
  h.c.sampleStats=stats;assert.equal(h.run('teamworkSuccesses(sampleStats)'),points);
 }
 const note=h.run('TITLE_TEAMWORK_NOTE');for(const text of ['相棒救助1回＝3pt','同乗中の共同撃破1体＝1pt','参加した資料1件＝4pt','共同制圧4秒＝1pt','参加した資料1件＝2pt','合計は8ptまで'])assert.ok(note.includes(text),text);
 assert.match(h.run('TITLE_AXIS_REQUIREMENTS[6].normalNote'),/目安：21pt（潜入と制圧2拠点は14pt、潜入初級は7pt）/);assert.match(h.run('TITLE_AXIS_REQUIREMENTS[6].eliteNote'),/目安：24pt（潜入と制圧2拠点は16pt、潜入初級は8pt）/);
});
test('multi-kill text describes the interval rule; eight kills over 27.3 seconds retain eligibility',()=>{
 const h=createGameEngine(root);h.run("p={x:0,y:0,tank:null};humans=[];etanks=[];scoreStats=newScoreStats();for(let i=0;i<8;i++){scoreStats.time=i*3.9;recordPlayerKill(newCombatAction('mg'),'mg',{});}");
 assert.match(h.run("TITLE_CATALOG.find(t=>t.id==='v3_chain').note"),/撃破間隔を4秒以内/);
 assert.equal(h.run('scoreStats.maxKillChain'),8);assert.equal(h.run("TITLE_CATALOG.find(t=>t.id==='v3_chain').valid([],scoreStats,{})"),true);
});
test('shadow-pair describes solo partner participation; unreleased decisive runs cannot earn titles',()=>{
 const h=createGameEngine(root);
 assert.match(h.run("TITLE_CATALOG.find(t=>t.id==='v3_shadow_pair').note"),/相棒単独の回収も対象/);
 assert.equal(h.run("(()=>{const s=Object.assign(newScoreStats(),{stage:'indoor',documents:3,documentTotal:3,hiddenDocuments:3,partnerDocuments:3,partnerRescues:2,jointObjectiveSeconds:0});const r={cleared:true},m=resultMetrics(s,r);return evaluateRunTitles(m.map(resLevel),m,s,r,{titles:{}}).titles.some(t=>t.id==='v3_shadow_pair')})()"),true);
 assert.match(h.run("TITLE_CATALOG.find(t=>t.id==='v3_infantry').note"),/破壊／制圧/);assert.equal(h.run("TITLE_CATALOG.every(t=>!t.note.includes('決戦'))"),true);
 assert.equal(h.run("TITLE_CATALOG.find(t=>t.id==='v3_infantry').valid([],Object.assign(newScoreStats(),{stage:'decisive',playerKills:10}),{cleared:true})"),false);
});

test('decisive results preserve previously earned titles and counters and never award a new title',()=>{
 const h=createGameEngine(root);
 h.run("localStorage.setItem(TITLE_ARCHIVE_KEY,JSON.stringify({titles:{v3_single_0_elite:{count:2,at:'old'}},medals:{},runs:3}));sampleRun=Object.assign(newScoreStats(),{stage:'decisive',objectiveDamage:1,objectiveProgress:1,playerKills:40,playerKillPoints:9000,maxProgress:12000,maxKillChain:10,final:{cleared:true,total:10000}});beforeArchive=JSON.stringify(readTitleArchive());recordRunAchievements(sampleRun);");
 assert.equal(h.run('sampleRun.awards.excluded'),true);assert.equal(h.run('sampleRun.awards.titles.length'),0);assert.equal(h.run('sampleRun.awards.newTitles.length'),0);assert.equal(h.run('JSON.stringify(readTitleArchive())===beforeArchive'),true);
 const result=h.run('evaluateRunTitles(Array(8).fill(5),Array(8).fill(100),sampleRun,sampleRun.final)');assert.equal(result.titles.length,0);assert.equal(result.primary.id,'unranked');
});

test('escort score and titles distinguish a quiet, intact rescue from a spotted or injured VIP',()=>{
 const h=createGameEngine(root);
 const result=h.run(`(()=>{
  const s=Object.assign(newScoreStats(),{stage:'indoor',rescue:true,vipMaxHp:3,vipHp:3,escortDist:600,hiddenEscortDist:600,objectiveProgress:1});
  const r={cleared:true},archive={titles:{}};
  const check=()=>{const m=resultMetrics(s,r);return evaluateRunTitles(m.map(resLevel),m,s,r,archive).titles.map(t=>t.id);};
  const intact=check(),full=calculateScore(s,true,false).total;
  s.vipDetections=1;const spotted=check();
  s.vipHp=2;const injured=check();
  return {intact,spotted,injured,full,damaged:calculateScore(s,true,false).total};
 })()`);
 assert.ok(result.intact.includes('v3_single_1_elite'));
 assert.ok(result.intact.includes('v3_single_7_elite'));
 assert.ok(!result.spotted.includes('v3_single_1_elite'));
 assert.ok(!result.injured.includes('v3_single_0_elite'));
 assert.ok(!result.injured.includes('v3_single_7_elite'));
 assert.ok(result.full>result.damaged);
});

test('front commander requires every capture, at least two completed joint captures and defence kills',()=>{
 const h=createGameEngine(root);
 assert.deepEqual(Array.from(h.run(`(()=>{
  const s=Object.assign(newScoreStats(),{stage:'front',objectiveProgress:1,objectiveTotal:3,capturePoints:3,jointCapturePoints:3,captureDefenseKills:5});
  const r={cleared:true};
  const earns=()=>{const m=resultMetrics(s,r);return evaluateRunTitles(m.map(resLevel),m,s,r,{titles:{}}).titles.some(t=>t.id==='v3_front_commander');};
  const complete=earns();s.capturePoints--;const missed=earns();s.capturePoints++;s.jointCapturePoints=1;
  return [complete,missed,earns()];
 })()`)),[true,false,false]);
});

test('two-document infiltration earns Shadow Pair through partner recovery alone',()=>{
 const h=createGameEngine(root);
 const ids=h.run(`(()=>{
  const s=Object.assign(newScoreStats(),{stage:'indoor',documents:2,documentTotal:2,hiddenDocuments:2,partnerDocuments:2});
  const r={cleared:true},m=resultMetrics(s,r);
  return evaluateRunTitles(m.map(resLevel),m,s,r,{titles:{}}).titles.map(t=>t.id);
 })()`);
 assert.ok(ids.includes('v3_shadow_pair'));
 assert.ok(ids.includes('v3_single_6_elite'));
});

test('two joint captures qualify for Front Commander without requiring extra kills',()=>{
 const h=createGameEngine(root);
 const earns=h.run(`(()=>{
  const s=Object.assign(newScoreStats(),{stage:'front',objectiveProgress:1,objectiveTotal:2,capturePoints:2,jointCapturePoints:2});
  const r={cleared:true},m=resultMetrics(s,r);
  return evaluateRunTitles(m.map(resLevel),m,s,r,{titles:{}}).titles.some(t=>t.id==='v3_front_commander');
 })()`);
 assert.equal(earns,true);
});
