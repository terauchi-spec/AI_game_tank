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
const rich={stage:"base",objectiveDamage:1,maxProgress:8500,objectiveAdvance:8500,hiddenObjectiveAdvance:6000,playerKills:20,playerKillPoints:2000,jointObjectiveSeconds:48,jointKills:4,maxUnseenForwardStreak:6000,unseenDist:5000,totalTravel:5000,sniperKills:8,sniperShots:10,rangedKills:8,assaultKills:12,maxKillChain:5,explosiveKills:10,blastMaxOneShot:4,styleDestroyed:60000,vehicleAdvance:3500,vehicleKills:6,decoyLures:5,tacticalStuns:5,allyKills:12};
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
 const c=harness();Object.assign(c.scoreStats,{explosiveKills:2,maxOneShotKills:10});assert.equal(c.metrics()[3],12);c.scoreStats.blastMaxOneShot=4;assert.equal(c.metrics()[3],52);
});
test('new catalogs have unique IDs, correct indices, 36 active titles and 28 active medals',()=>{
 const c=harness();assert.equal(c.get('TITLE_CATALOG.filter(t=>!t.legacy).length'),36);assert.equal(c.get('MEDAL_CATALOG.filter(t=>!t.legacy).length'),28);assert.ok(c.get('new Set(TITLE_CATALOG.map(t=>t.id)).size===TITLE_CATALOG.length'));assert.ok(c.get('new Set(MEDAL_CATALOG.map(t=>t.id)).size===MEDAL_CATALOG.length'));assert.ok(c.get('TITLE_COMBOS.every(t=>t.axes.every(i=>i>=0&&i<8))'));
});
test('every axis can earn its upper title and old titles cannot be awarded anew',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,rich);s.final={cleared:true,total:1000};s.vehicleKinds={tank:true};const result=c.evaluateRunTitles(Array(8).fill(5),c.metrics(),s,s.final,{titles:{},medals:{}});for(let i=0;i<8;i++)assert.ok(result.titles.some(t=>t.id===`v3_single_${i}_elite`));assert.ok(result.titles.every(t=>!t.legacy));
});
test('retired titles are removed permanently while current titles, medals and runs are preserved',()=>{
 const c=harness();const titles=Object.fromEntries(c.get('RETIRED_TITLE_IDS').map(id=>[id,{count:3,at:'old',score:100}]));titles.v2_single_1_elite={count:2,at:'current',score:200};
 c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles,medals:{untouched:{count:2}},runs:8}));
 const a=c.readTitleArchive();assert.equal(Object.keys(a.titles).length,1);assert.equal(a.titles.v2_single_1_elite.count,2);assert.equal(a.medals.untouched.count,2);assert.equal(a.runs,8);
 const persisted=JSON.parse(c.saved.get(c.get('TITLE_ARCHIVE_KEY')));assert.deepEqual(Object.keys(persisted.titles),['v2_single_1_elite']);assert.equal(c.readTitleArchive().titles.v2_legend_1,undefined);
});
test('third upper-title acquisition earns a new legend without double counting a run',()=>{
 const c=harness();for(let n=1;n<=3;n++){const s=c.scoreStats=Object.assign(c.newScoreStats(),rich,{final:{cleared:true,total:1000},vehicleKinds:{tank:true}});c.recordRunAchievements(s);c.recordRunAchievements(s);assert.equal(!!c.readTitleArchive().titles.v3_legend_1,n===3);}assert.equal(c.readTitleArchive().titles.v3_single_1_elite.count,3);assert.equal(c.readTitleArchive().runs,3);
});
test('debug results do not modify achievement storage',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,rich,{debugUsed:true,final:{cleared:true,total:1000}});c.recordRunAchievements(s);assert.equal(c.saved.size,0);assert.equal(s.awards.disabled,true);
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
 const ids=c.evaluateRunTitles(m.map(c.get('resLevel')),m,s,s.final,{titles:{}}).titles.map(t=>t.id);assert.ok(ids.includes('v3_ghost_agent'));
 c.recordRunAchievements(s);assert.ok(s.awards.medals.includes('v3_quiet_recovery'));assert.ok(s.awards.medals.includes('v3_shadow_return'));assert.ok(!s.awards.medals.includes('v3_infantry_hero'));
});
test('infiltration alarm, kills and damage invalidate their respective medals',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,{stage:'indoor',documents:2,documentTotal:2,hiddenDocuments:2,indoorAlarm:true,detections:1,humanKills:1,playerDamage:.2,damageHits:1,final:{cleared:true,total:1000}});c.recordRunAchievements(s);
 for(const id of ['v3_quiet_recovery','v3_shadow_return','v3_untouched'])assert.ok(!s.awards.medals.includes(id));assert.ok(c.metrics()[1]<100);assert.ok(c.metrics()[7]<100);
});
test('cumulative damage survives healing and includes the occupied vehicle',()=>{
 const c=harness(),s=c.scoreStats;c.recordPlayerDamage(1/3);c.p.hp=3;c.p.tank={};c.recordPlayerDamage(.4,true);c.p.tank=null;
 assert.equal(s.damageHits,2);assert.equal(s.playerDamage,1/3);assert.equal(s.vehicleDamage,.4);s.final={cleared:true,total:100};assert.ok(c.metrics()[7]<100);c.recordRunAchievements(s);assert.ok(!s.awards.medals.includes('v3_untouched'));
});
test('stair teleport and repeated approach cannot create advance or stealth points',()=>{
 const c=harness(),s=c.scoreStats;s.stage='indoor';c.mission={index:0,points:[{x:0,y:0,floor:1}]};c.indoorWorld={currentFloor:0};c.p.x=0;c.p.y=1000;c.updateScoreTracking(1,0);c.p.y=0;c.updateScoreTracking(1,0);assert.equal(s.forwardDist,0);assert.equal(s.maxProgress,0);assert.equal(s.maxUnseenForwardStreak,0);assert.equal(s.objectiveAdvance,0);
 c.p.y=1000;c.updateScoreTracking(1,1);c.p.y=500;c.updateScoreTracking(1,500);const n=s.objectiveAdvance;c.p.y=900;c.updateScoreTracking(1,400);c.p.y=500;c.updateScoreTracking(1,400);assert.equal(s.objectiveAdvance,n);assert.equal(n,500);
});
test('new rules preserve all v2 acquisition counts and do not award v2 entries again',()=>{
 const c=harness(),ids=c.get('LEGACY_TITLE_CATALOG.map(t=>t.id)'),titles=Object.fromEntries(ids.map(id=>[id,{count:4,at:'old',score:400}]));c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles,medals:{v2_teamwork:{count:7}},runs:12}));
 const a=c.readTitleArchive();for(const id of ids)assert.equal(a.titles[id].count,4);assert.equal(a.medals.v2_teamwork.count,7);Object.assign(c.scoreStats,rich,{final:{cleared:true,total:1000}});c.recordRunAchievements(c.scoreStats);assert.ok(c.scoreStats.awards.titles.every(id=>id.startsWith('v3_')));for(const id of ids)assert.equal(c.readTitleArchive().titles[id].count,4);
});
test('stage medals require actual participation and correct objective source',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,{stage:'front',objectiveTotal:3,capturePoints:2,captureDefenseKills:5,final:{cleared:true,total:1000}});c.recordRunAchievements(s);assert.ok(!s.awards.medals.includes('v3_capture_leader'));assert.ok(s.awards.medals.includes('v3_capture_defense'));
 const b=Object.assign(c.newScoreStats(),{stage:'base',bombObjectiveDamage:1,bombObjectiveFinish:true,final:{cleared:true,total:1000}});c.recordRunAchievements(b);assert.ok(b.awards.medals.includes('v3_bomb_objective'));assert.equal(c.metrics(b)[3],100);
});
test('vehicle overkill credits only remaining durability and immune hits do not count',()=>{
 const c=harness();c.p.tank={kind:'tank',ch:2.8,t:{armor:3}};c.recordPlayerDamage(1.1/3,true);assert.ok(Math.abs(c.scoreStats.vehicleDamage-1/15)<1e-9);c.p.tank.ch=3;c.recordPlayerDamage(1,true);c.recordPlayerDamage(0,true);assert.equal(c.scoreStats.damageHits,1);
});
