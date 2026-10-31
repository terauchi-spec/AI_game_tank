// Run with: node --test tests/playstyle.test.cjs (no dependencies).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 const saved=new Map();
 const c={areaDebugEnabled:false,skillDebugAll:false,debugMode:0,p:{x:0,y:1000,tank:null},partner:null,decoy:null,humans:[],etanks:[],chainToastT:0,oneShotToastT:0,sfx(){},say(){},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}};
 vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('function newScoreStats()'),html.indexOf('function humanMemory(')),c);
 vm.runInContext(html.slice(html.indexOf('const RES_AXES='),html.indexOf('function renderAwardResult(')),c);
 vm.runInContext(html.slice(html.indexOf('function stunHuman('),html.indexOf('function setSkillCooldown(')),c);
 c.scoreStats=c.newScoreStats();c.scoreStats.startY=1000;c.saved=saved;
 c.get=code=>vm.runInContext(code,c);
 c.metrics=(s=c.scoreStats,r=s.final||{cleared:false})=>Array.from(c.resultMetrics(s,r));
 return c;
}
const rich={stage:"base",objectiveDamage:1,maxProgress:11000,objectiveAdvance:11000,hiddenObjectiveAdvance:8500,playerKills:30,playerKillPoints:3000,jointObjectiveSeconds:48,jointKills:16,maxUnseenForwardStreak:8500,unseenDist:5000,totalTravel:5000,sniperKills:8,sniperShots:10,rangedKills:8,assaultKills:12,maxKillChain:8,explosiveKills:15,blastMaxOneShot:5,styleDestroyed:60000,vehicleAdvance:3500,vehicleKills:6,decoyLures:9,tacticalStuns:9,allyKills:12};
test('idle, empty shots, skill spam and parked vehicles earn no style points',()=>{
 const c=harness();Object.assign(c.scoreStats,{shots:999,cannonShots:999,bombBlasts:999,skillUses:999,vehicleTime:999,totalTravel:0});assert.deepEqual(c.metrics(),Array(8).fill(0));
});
test('eight distinct labels and all maximum levels are reachable',()=>{
 const c=harness();assert.equal(c.get('RES_AXES.join("/")'),'任務遂行/隠密/戦闘/爆破/機動/戦術/連携/生存');Object.assign(c.scoreStats,rich,{final:{cleared:true}});assert.deepEqual(c.metrics(),Array(8).fill(100));assert.deepEqual(c.metrics().map(c.get('resLevel')),Array(8).fill(5));
});
test('automatic support, irrelevant cover destruction and wandering do not grant teamwork or mission credit',()=>{
 const c=harness();Object.assign(c.scoreStats,{allyKills:1000,allyStuns:1000,styleDestroyed:1000000,totalTravel:100000});assert.deepEqual(c.metrics(),Array(8).fill(0));
 c.scoreStats.jointObjectiveSeconds=24;assert.ok(c.metrics()[6]>0);assert.equal(c.metrics()[0],0);
});
test('weapon-specific efficiency handles MG bursts and sniper shots separately',()=>{
 const c=harness(),s=c.scoreStats;s.playerKills=8;s.playerKillPoints=800;s.mgKills=8;s.mgShots=64;const mg=c.metrics()[2];s.mgKills=0;s.sniperKills=8;s.sniperShots=10;assert.equal(c.metrics()[2],mg);s.sniperShots=100;assert.ok(c.metrics()[2]<mg);
});
test('sniper multikills cannot boost explosion efficiency',()=>{
 const c=harness();Object.assign(c.scoreStats,{explosiveKills:2,maxOneShotKills:10});assert.equal(c.metrics()[3],8);c.scoreStats.blastMaxOneShot=4;assert.equal(c.metrics()[3],42);
});
test('exactly 34 unique titles cover eight tiers and consolidated accomplishments',()=>{
 const c=harness();assert.equal(c.get('TITLE_CATALOG.length'),34);assert.ok(c.get('new Set(TITLE_CATALOG.map(t=>t.id)).size===34'));assert.equal(c.get('TITLE_COMBOS.length'),4);assert.equal(c.get('TITLE_SPECIAL.length'),4);assert.ok(c.get('TITLE_COMBOS.every(t=>t.axes.every(i=>i>=0&&i<8))'));assert.equal(c.get('typeof MEDAL_CATALOG'),'undefined');
});
test('every axis can earn its upper title and old titles cannot be awarded anew',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,rich);s.final={cleared:true,total:1000};s.vehicleKinds={tank:true};const result=c.evaluateRunTitles(Array(8).fill(5),c.metrics(),s,s.final,{titles:{},medals:{}});for(let i=0;i<8;i++)assert.ok(result.titles.some(t=>t.id===`v3_single_${i}_elite`));assert.ok(result.titles.every(t=>!t.legacy));
});
test('old awards remain stored but never expand the 34-title collection or grant legends on load',()=>{
 const c=harness(),titles={v2_single_1_elite:{count:7,at:'old'},v3_single_1_elite:{count:4,at:'old'},v3_ghost_agent:{count:2}};
 c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles,medals:{untouched:{count:2}},runs:8}));const a=c.readTitleArchive();assert.equal(a.titles.v2_single_1_elite.count,7);assert.equal(a.titles.v3_single_1_elite.count,4);assert.equal(a.medals.untouched.count,2);assert.equal(a.runs,8);assert.equal(a.titles.v3_legend_1,undefined);assert.equal(c.get('TITLE_CATALOG.length'),34);
});
test('third upper-title acquisition earns a new legend without double counting a run',()=>{
 const c=harness();for(let n=1;n<=3;n++){const s=c.scoreStats=Object.assign(c.newScoreStats(),rich,{final:{cleared:true,total:1000},vehicleKinds:{tank:true}});c.recordRunAchievements(s);c.recordRunAchievements(s);assert.equal(!!c.readTitleArchive().titles.v3_legend_1,n===3);}assert.equal(c.readTitleArchive().titles.v3_single_1_elite.count,3);assert.equal(c.readTitleArchive().runs,3);
});
test('debug results persist achievements',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,rich,{debugUsed:true,final:{cleared:true,total:1000}});c.recordRunAchievements(s);assert.equal(c.readTitleArchive().runs,1);assert.equal(s.awards.disabled,false);assert.ok(s.awards.newTitles.length>0);
});
test('decoy counts distinct enemies, not repeated target updates',()=>{
 const c=harness();c.decoy={};const h={};c.recordDecoyLure(h,'decoy');c.recordDecoyLure(h,'decoy');c.recordDecoyLure({},'p');c.recordDecoyLure({},'decoy');assert.equal(c.scoreStats.decoyLures,2);
});
test('support and player grapples record different successes; already stunned enemies do not count twice',()=>{
 const c=harness(),h={alive:true,stun:0,st:0};assert.equal(c.stunHuman(h),true);assert.equal(c.stunHuman(h),false);assert.equal(c.scoreStats.tacticalStuns,1);assert.equal(c.scoreStats.stealthStuns,1);assert.equal(c.scoreStats.allyStuns,0);assert.equal(c.stunHuman({alive:true,stun:0},'partner'),true);assert.equal(c.scoreStats.allyStuns,1);assert.equal(c.scoreStats.tacticalStuns,1);
});
test('last alerted enemy counts for assault even after its death',()=>{
 const c=harness();c.recordPlayerKill(0,'mg',{st:1,target:'p',alive:false});assert.equal(c.scoreStats.assaultKills,1);assert.equal(c.scoreStats.playerKills,1);assert.equal(c.scoreStats.rangedKills,1);
});
test('support, rescue and shared vehicle kills are recorded without player shooting credit',()=>{
 const c=harness();c.p.tank={kind:'tank'};c.partner={passengerVehicle:c.p.tank,down:false};c.recordSupportResult();c.recordSupportResult('stun','hound');c.recordSupportResult('rescue','partner');assert.equal(c.scoreStats.allyKills,1);assert.equal(c.scoreStats.allyStuns,1);assert.equal(c.scoreStats.partnerRescues,1);assert.equal(c.scoreStats.jointKills,1);assert.equal(c.get("teamworkSuccesses(scoreStats)"),4);assert.equal(c.scoreStats.rangedKills,0);assert.equal(c.scoreStats.assaultKills,0);
});
test('vehicle advance only counts new maximum progress, never waiting or retracing',()=>{
 const c=harness();c.p.tank={kind:'tank',t:{id:'armored'}};c.updateScoreTracking(5,0);assert.equal(c.scoreStats.vehicleAdvance,0);c.p.y=800;c.updateScoreTracking(1,200);c.p.y=900;c.updateScoreTracking(1,100);c.p.y=800;c.updateScoreTracking(1,100);assert.equal(c.scoreStats.vehicleAdvance,200);assert.deepEqual(Object.keys(c.scoreStats.vehicleKinds),['armored']);c.p.tank=null;c.p.y=700;c.updateScoreTracking(1,100);assert.equal(c.scoreStats.vehicleAdvance,200);
});
test('radio support cannot earn assault, vehicle, precision or blast multikill points',()=>{
 const c=harness();c.p.tank={};const id=c.newCombatAction('radioBomb');c.recordPlayerKill(id);assert.equal(c.scoreStats.playerKills,0);assert.equal(c.scoreStats.assaultKills,0);assert.equal(c.scoreStats.vehicleKills,0);assert.equal(c.scoreStats.blastMaxOneShot,0);assert.deepEqual(c.metrics(),Array(8).fill(0));
});
test('finalized runs ignore later events',()=>{
 const c=harness();c.scoreStats.finalized=true;c.decoy={};c.recordSupportResult();c.recordPlayerKill(0,'mg');c.recordDecoyLure({},'decoy');assert.equal(c.scoreStats.allyKills+c.scoreStats.rangedKills+c.scoreStats.decoyLures,0);
});

test('perfect noncombat infiltration earns S and mission, stealth and survival maxima',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,{stage:'indoor',documents:3,documentTotal:3,hiddenDocuments:3,objectiveProgress:.75,time:160});
 s.final=c.calculateScore(s,true);const m=c.metrics();assert.equal(s.final.rank,'S');assert.deepEqual([m[0],m[1],m[7]],[100,100,100]);assert.equal(m[2],0);assert.equal(m[3],0);
 const ids=c.evaluateRunTitles(m.map(c.get('resLevel')),m,s,s.final,{titles:{}}).titles.map(t=>t.id);assert.ok(ids.includes('v3_single_1_elite'));
 c.recordRunAchievements(s);assert.equal(s.awards.medals,undefined);assert.ok(s.awards.titles.includes('v3_single_7_elite'));
});
test('infiltration alarm and damage prevent stealth and survival upper titles',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,{stage:'indoor',documents:2,documentTotal:2,hiddenDocuments:2,indoorAlarm:true,detections:1,humanKills:1,playerDamage:.2,damageHits:1,final:{cleared:true,total:1000}});c.recordRunAchievements(s);
 for(const id of ['v3_single_1_elite','v3_single_7_elite','v3_shadow_pair'])assert.ok(!s.awards.titles.includes(id));assert.ok(c.metrics()[1]<100);assert.ok(c.metrics()[7]<100);
});
test('cumulative damage survives healing and includes the occupied vehicle',()=>{
 const c=harness(),s=c.scoreStats;c.recordPlayerDamage(1/3);c.p.hp=3;c.p.tank={};c.recordPlayerDamage(.4,true);c.p.tank=null;
 assert.equal(s.damageHits,2);assert.equal(s.playerDamage,1/3);assert.equal(s.vehicleDamage,.4);s.final={cleared:true,total:100};assert.ok(c.metrics()[7]<100);c.recordRunAchievements(s);assert.ok(!s.awards.titles.includes('v3_single_7_elite'));
});
test('stair teleport and repeated approach cannot create advance or stealth points',()=>{
 const c=harness(),s=c.scoreStats;s.stage='indoor';c.mission={index:0,points:[{x:0,y:0,floor:1}]};c.indoorWorld={currentFloor:0};c.p.x=0;c.p.y=1000;c.updateScoreTracking(1,0);c.p.y=0;c.updateScoreTracking(1,0);assert.equal(s.forwardDist,0);assert.equal(s.maxProgress,0);assert.equal(s.maxUnseenForwardStreak,0);assert.equal(s.objectiveAdvance,0);
 c.p.y=1000;c.updateScoreTracking(1,1);c.p.y=500;c.updateScoreTracking(1,500);const n=s.objectiveAdvance;c.p.y=900;c.updateScoreTracking(1,400);c.p.y=500;c.updateScoreTracking(1,400);assert.equal(s.objectiveAdvance,n);assert.equal(n,500);
});
test('new rules preserve all v2 acquisition counts and do not award v2 entries again',()=>{
 const c=harness(),ids=['v2_single_0_normal','v2_single_1_elite','v2_legend_2'],titles=Object.fromEntries(ids.map(id=>[id,{count:4,at:'old',score:400}]));c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles,medals:{v2_teamwork:{count:7}},runs:12}));
 const a=c.readTitleArchive();for(const id of ids)assert.equal(a.titles[id].count,4);assert.equal(a.medals.v2_teamwork.count,7);Object.assign(c.scoreStats,rich,{final:{cleared:true,total:1000}});c.recordRunAchievements(c.scoreStats);assert.ok(c.scoreStats.awards.titles.every(id=>id.startsWith('v3_')));for(const id of ids)assert.equal(c.readTitleArchive().titles[id].count,4);
});
test('mission Lv5 needs participation and stage-specific mastery; a goal blast alone is Lv3',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,{stage:'front',objectiveTotal:3,capturePoints:2,captureDefenseKills:5,final:{cleared:true,total:1000}});assert.equal(c.metrics()[0],95);s.capturePoints=3;assert.equal(c.metrics()[0],100);s.captureDefenseKills=2;assert.equal(c.metrics()[0],95);
 const b=Object.assign(c.newScoreStats(),{stage:'base',bombObjectiveDamage:1,bombObjectiveFinish:true,final:{cleared:true,total:1000}});assert.equal(c.metrics(b)[3],80);assert.equal(c.get('resLevel')(80),3);b.explosiveKills=5;assert.equal(c.metrics(b)[3],100);
});
test('vehicle overkill credits only remaining durability and immune hits do not count',()=>{
 const c=harness();c.p.tank={kind:'tank',ch:2.8,t:{armor:3}};c.recordPlayerDamage(1.1/3,true);assert.ok(Math.abs(c.scoreStats.vehicleDamage-1/15)<1e-9);c.p.tank.ch=3;c.recordPlayerDamage(1,true);c.recordPlayerDamage(0,true);assert.equal(c.scoreStats.damageHits,1);
});

test('Lv5 begins at 100; previous maxima now require more achievement',()=>{
 const c=harness();assert.equal(c.get('resLevel')(97),4);assert.equal(c.get('resLevel')(99),4);assert.equal(c.get('resLevel')(100),5);
 Object.assign(c.scoreStats,{stage:'base',playerKills:20,playerKillPoints:2000,sniperKills:8,sniperShots:10,maxKillChain:5,explosiveKills:10,blastMaxOneShot:4,maxProgress:8500,tacticalStuns:10,jointKills:12});
 for(const i of [2,3,4,5,6])assert.ok(c.metrics()[i]<100,'former maximum axis '+i);
});
test('failed and empty runs cannot obtain titles; fallback is outside collection',()=>{
 const c=harness(),s=c.scoreStats,r={cleared:false};const a=c.evaluateRunTitles(Array(8).fill(0),c.metrics(),s,r);assert.equal(a.primary.name,'称号なし');assert.equal(a.titles.length,0);assert.ok(!c.get('TITLE_CATALOG.some(t=>t.id===TITLE_FALLBACK.id)'));
});
test('composite title needs both axes at Lv5 plus its evidence',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,{sniperKills:6,sniperShots:7}),lv=Array(8).fill(0);lv[1]=5;lv[2]=4;const ids=()=>c.evaluateRunTitles(lv,Array(8).fill(100),s,{cleared:false},{titles:{}}).titles.map(t=>t.id);assert.ok(!ids().includes('v3_ghost_sniper'));lv[2]=5;assert.ok(ids().includes('v3_ghost_sniper'));s.sniperShots=8;assert.ok(!ids().includes('v3_ghost_sniper'));
});
test('medal history is never awarded or incremented in a new run',()=>{
 const c=harness();c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:{},medals:{v3_mission_clear:{count:2}},runs:2}));Object.assign(c.scoreStats,rich,{final:{cleared:true,total:1000}});c.recordRunAchievements(c.scoreStats);assert.equal(c.scoreStats.awards.medals,undefined);assert.equal(c.readTitleArchive().medals.v3_mission_clear.count,2);assert.equal(c.readTitleArchive().runs,3);
});

test('mythic requires each of the 33 current titles; legacy or duplicate counts cannot substitute',()=>{
 const c=harness(),ids=Array.from(c.get('TITLE_COLLECTION_TARGETS'));assert.equal(ids.length,33);assert.ok(!ids.includes('v3_mythic_complete'));
 const titles=Object.fromEntries(ids.slice(0,-1).map(id=>[id,{count:99}]));titles.v2_single_1_elite={count:999};c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles,runs:12}));assert.equal(c.readTitleArchive().titles.v3_mythic_complete,undefined);
 const result=c.evaluateRunTitles(Array(8).fill(0),Array(8).fill(0),c.scoreStats,{cleared:false},{titles});assert.ok(!result.titles.some(t=>t.id==='v3_mythic_complete'));
});
test('the final missing title unlocks mythic in the same result, once per result',()=>{
 const c=harness(),ids=Array.from(c.get('TITLE_COLLECTION_TARGETS')),missing='v3_single_0_elite';
 c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:Object.fromEntries(ids.filter(id=>id!==missing).map(id=>[id,{count:1}])),runs:12}));
 const s=Object.assign(c.scoreStats,rich,{final:{cleared:true,total:1000}});c.recordRunAchievements(s);assert.ok(s.awards.newTitles.includes(missing));assert.ok(s.awards.newTitles.includes('v3_mythic_complete'));assert.equal(s.awards.primary,'v3_mythic_complete');assert.equal(c.readTitleArchive().titles.v3_mythic_complete.count,1);c.recordRunAchievements(s);assert.equal(c.readTitleArchive().titles.v3_mythic_complete.count,1);assert.equal(c.readTitleArchive().runs,13);
});
test('an already complete collection receives mythic on load without resetting counts, medals or runs',()=>{
 const c=harness(),ids=Array.from(c.get('TITLE_COLLECTION_TARGETS'));
 const titles=Object.fromEntries(ids.map(id=>[id,{count:3,at:'2026-10-20',score:123}]));c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles,medals:{old:{count:4}},runs:40}));
 const a=c.readTitleArchive();assert.equal(a.titles.v3_mythic_complete.count,1);assert.equal(a.runs,40);assert.equal(a.medals.old.count,4);for(const id of ids)assert.equal(a.titles[id].count,3);assert.equal(c.readTitleArchive().titles.v3_mythic_complete.count,1);assert.equal(JSON.parse(c.saved.get(c.get('TITLE_ARCHIVE_KEY'))).titles.v3_mythic_complete.count,1);
});
test('debug saves the final title and mythic, and mythic has the highest priority',()=>{
 const c=harness(),ids=Array.from(c.get('TITLE_COLLECTION_TARGETS')),titles=Object.fromEntries(ids.filter(id=>id!=='v3_single_0_elite').map(id=>[id,{count:1}]));c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles,runs:2}));
 const s=Object.assign(c.scoreStats,rich,{debugUsed:true,final:{cleared:true,total:1000}});c.recordRunAchievements(s);assert.equal(s.awards.disabled,false);assert.equal(c.readTitleArchive().titles.v3_mythic_complete.count,1);assert.equal(c.readTitleArchive().runs,3);assert.equal(c.get('TITLE_MYTHIC.type'),'神話級実績');assert.ok(c.get('TITLE_CATALOG.filter(t=>!t.collection).every(t=>t.priority<TITLE_MYTHIC.priority)'));
});

function stageHarness(cleared=[]){
 const c=harness();Object.assign(c,{stageMode:'front',frontlineBeginner:false,frontlineOni:false,indoorBeginner:false});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/stage-progress.js'),'utf8'),c);
 c.saved.set('tankGameStageProgressV1',JSON.stringify({version:2,cleared}));return c;
}
const allStages=['beginner','indoorBeginner','frontBeginner','baseIntermediate','indoor','frontIntermediate','base','indoorLab','front','decisive'];
test('last normal stage grants the legendary and mythic together before stage persistence, only once',()=>{
 const c=stageHarness(allStages.slice(0,-1));c.stageMode='decisive';const ids=Array.from(c.get('TITLE_COLLECTION_TARGETS'));
 c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:Object.fromEntries(ids.filter(id=>id!=='v3_all_stages_clear').map(id=>[id,{count:1}])),runs:32}));
 const s=Object.assign(c.scoreStats,{final:{cleared:true,total:1000}});c.recordRunAchievements(s);
 for(const id of ['v3_all_stages_clear','v3_mythic_complete'])assert.ok(s.awards.newTitles.includes(id));
 assert.equal(c.readStageProgress().cleared.length,9);c.unlockStageOnClear(s);assert.equal(c.readStageProgress().cleared.length,10);
 c.recordRunAchievements(s);const a=c.readTitleArchive();assert.equal(a.runs,33);assert.equal(a.titles.v3_all_stages_clear.count,1);assert.equal(a.titles.v3_mythic_complete.count,1);
});
test('failure, area debug, test Oni and missing normal stages cannot complete the legendary condition',()=>{
 for(const mode of ['failure','areaDebug','oni','missing']){
  const c=stageHarness(mode==='missing'?allStages.filter(id=>!['front','indoor'].includes(id)):allStages.slice(0,-1));
  const s=Object.assign(c.scoreStats,{debugUsed:mode==='debug',final:{cleared:mode!=='failure',total:1000}});c.areaDebugEnabled=mode==='areaDebug';c.frontlineOni=mode==='oni';
  c.recordRunAchievements(s);assert.equal(c.readTitleArchive().titles.v3_all_stages_clear,undefined,mode);
 }
});
test('all ten persisted clears award the legendary; legacy saves await newly added stages',()=>{
 for(const legacy of [false,true]){
  const c=stageHarness(allStages);
  if(legacy)c.saved.set('tankGameStageProgressV1',JSON.stringify({cleared:['beginner','frontBeginner','base','front'],indoorCleared:['indoorBeginner','indoor']}));
  c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:{v3_mythic_complete:{count:2,at:'old'},v3_single_0_normal:{count:4}},medals:{old:{count:3}},runs:18}));
  const a=c.readTitleArchive();assert.equal(a.titles.v3_all_stages_clear?.count,legacy?undefined:1);assert.equal(a.titles.v3_mythic_complete.count,2);assert.equal(a.titles.v3_single_0_normal.count,4);assert.equal(a.medals.old.count,3);assert.equal(a.runs,18);assert.equal(c.readTitleArchive().titles.v3_all_stages_clear?.count,legacy?undefined:1);
 }
 const c=stageHarness(allStages);assert.equal(c.readTitleArchive().titles.v3_all_stages_clear.count,1);assert.equal(c.readTitleArchive().runs,0);
});
test('previously earned mythic survives the added legendary requirement',()=>{
 const c=stageHarness();c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:{v3_mythic_complete:{count:1,at:'old'}},runs:32}));
 const a=c.readTitleArchive();assert.equal(a.titles.v3_mythic_complete.at,'old');assert.equal(a.titles.v3_all_stages_clear,undefined);
});

test('debug finalization persists unlocks, high score, achievements and history once across reload',()=>{
 for(const cleared of [true,false]){
  const c=stageHarness();Object.assign(c,{stageMode:'beginner',skill:'throw',SK:[{id:'throw'},{id:'dig'}],highScoreData:null,distanceMeters:n=>Math.round(n/10)});
  vm.runInContext(html.slice(html.indexOf("const SKILL_PROGRESS_KEY="),html.indexOf('function rollSkillChoices()')),c);
  vm.runInContext(html.slice(html.indexOf('function unlockSkillOnClear('),html.indexOf('function skillSelectable(')),c);
  vm.runInContext(html.slice(html.indexOf("const SCORE_KEY="),html.indexOf('function newScoreStats()')),c);
  vm.runInContext(html.slice(html.indexOf("const RUN_HISTORY_KEY="),html.indexOf('function renderTrophyStats()')),c);
  const s=c.scoreStats=Object.assign(c.newScoreStats(),rich,{debugUsed:true,stage:'beginner'});
  c.finalizeScore(cleared);const saved=JSON.stringify([...c.saved]);c.finalizeScore(cleared);assert.equal(JSON.stringify([...c.saved]),saved);
  assert.equal(c.readRunHistory().summary.plays,1);assert.equal(c.readRunHistory().summary.clears,Number(cleared));assert.equal(c.readTitleArchive().runs,1);assert.equal(s.awards.disabled,false);
  assert.equal(c.loadHighScore().score,s.final.total);assert.equal(s.newHigh,true);
  const records=c.readStageRecords().stages.beginner;assert.equal(records.sorties,1);assert.equal(records.successes,Number(cleared));assert.equal(records.bestScore,s.final.total);
  assert.equal(c.readSkillProgress().clears,Number(cleared));assert.equal(c.readSkillProgress().unlocked.includes('dig'),cleared);assert.equal(c.stageSelectable('indoorBeginner'),cleared);
  const restored=stageHarness();for(const [k,v] of c.saved)restored.saved.set(k,v);assert.equal(restored.stageSelectable('indoorBeginner'),cleared);assert.equal(restored.readTitleArchive().runs,1);assert.equal(restored.readStageRecords().stages.beginner.bestScore,s.final.total);
 }
});
test('debug clear of the last normal stage earns the all-stage title in the same result',()=>{
 const c=stageHarness(allStages.slice(0,-1));c.stageMode='decisive';const s=Object.assign(c.scoreStats,{debugUsed:true,final:{cleared:true,total:1000}});c.recordRunAchievements(s);assert.ok(s.awards.newTitles.includes('v3_all_stages_clear'));
});

test('persisted new titles announce the highest new career rank once, while repeats do not promote',()=>{
 const c=harness(),before=c.careerRank();Object.assign(c.scoreStats,rich,{final:{cleared:true,total:1000}});c.recordRunAchievements(c.scoreStats);const after=c.careerRank(),promotion=c.scoreStats.careerPromotion;assert.ok(after.level>before.level);assert.equal(promotion.from,before.name);assert.equal(promotion.name,after.name);assert.equal(promotion.previousLevel,before.level);assert.equal(promotion.level,after.level);
 c.recordRunAchievements(c.scoreStats);assert.equal(c.scoreStats.careerPromotion,promotion);
 const repeat=Object.assign(c.newScoreStats(),rich,{final:{cleared:true,total:1000}});c.recordRunAchievements(repeat);assert.equal(c.careerRank().level,after.level);assert.equal(repeat.careerPromotion,undefined);
});
test('unsaved achievements and area debug never announce a career promotion',()=>{
 for(const debug of [false,true]){const c=harness();c.areaDebugEnabled=debug;if(!debug)c.localStorage.setItem=()=>{throw Error('quota')};Object.assign(c.scoreStats,rich,{final:{cleared:true,total:1000}});c.recordRunAchievements(c.scoreStats);assert.equal(c.scoreStats.careerPromotion,undefined);assert.equal(debug?c.scoreStats.awards.disabled:c.scoreStats.awards.saveFailed,true);}
});
