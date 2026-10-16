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
 c.metrics=s=>Array.from(c.resultMetrics(s||c.scoreStats,{cleared:false}));
 return c;
}
const rich={maxUnseenForwardStreak:5000,unseenDist:5000,totalTravel:5000,sniperKills:8,sniperShots:10,rangedKills:8,assaultKills:12,maxKillChain:5,explosiveKills:10,blastMaxOneShot:4,styleDestroyed:60000,vehicleAdvance:3500,vehicleKills:6,decoyLures:5,tacticalStuns:5,allyKills:12};
test('idle, empty shots, skill spam and parked vehicles earn no style points',()=>{
 const c=harness();Object.assign(c.scoreStats,{shots:999,cannonShots:999,bombBlasts:999,skillUses:999,vehicleTime:999,totalTravel:0});assert.deepEqual(c.metrics(),Array(8).fill(0));
});
test('eight distinct labels and all maximum levels are reachable',()=>{
 const c=harness();assert.equal(c.get('RES_AXES.join("/")'),'隠密/精密/強襲/爆破/破壊/機動/戦術/連携');Object.assign(c.scoreStats,rich);assert.deepEqual(c.metrics(),Array(8).fill(100));assert.deepEqual(c.metrics().map(c.get('resLevel')),Array(8).fill(5));
});
test('each action family affects its own axis',()=>{
 const examples=[{maxUnseenForwardStreak:1500,unseenDist:1500,totalTravel:1500},{sniperKills:5,sniperShots:5},{assaultKills:6},{explosiveKills:5},{styleDestroyed:30000},{vehicleAdvance:1500},{wallBlocks:6},{allyStuns:6}];
 examples.forEach((data,i)=>{const c=harness();Object.assign(c.scoreStats,data);c.metrics().forEach((n,j)=>assert.equal(n>0,j===i,`axis ${i} leaked into ${j}`));});
});
test('weapon-specific efficiency handles MG bursts and sniper shots separately',()=>{
 const c=harness(),s=c.scoreStats;s.mgKills=8;s.mgShots=64;const mg=c.metrics()[1];s.mgKills=0;s.sniperKills=8;s.sniperShots=10;assert.equal(c.metrics()[1],mg);s.sniperShots=100;assert.ok(c.metrics()[1]<mg);
});
test('sniper multikills cannot boost explosion efficiency',()=>{
 const c=harness();Object.assign(c.scoreStats,{explosiveKills:2,maxOneShotKills:10});assert.equal(c.metrics()[3],15);c.scoreStats.blastMaxOneShot=4;assert.equal(c.metrics()[3],40);
});
test('new catalogs have unique IDs, correct indices, 40 titles and 22 medals',()=>{
 const c=harness();assert.equal(c.get('TITLE_CATALOG.filter(t=>!t.legacy).length'),40);assert.equal(c.get('MEDAL_CATALOG.length'),22);assert.ok(c.get('new Set(TITLE_CATALOG.map(t=>t.id)).size===TITLE_CATALOG.length'));assert.ok(c.get('new Set(MEDAL_CATALOG.map(t=>t.id)).size===MEDAL_CATALOG.length'));assert.ok(c.get('TITLE_COMBOS.every(t=>t.axes.every(i=>i>=0&&i<8))'));
});
test('every axis can earn its upper title and old titles cannot be awarded anew',()=>{
 const c=harness(),s=Object.assign(c.scoreStats,rich);s.final={cleared:true,total:1000};s.vehicleKinds={tank:true};const result=c.evaluateRunTitles(Array(8).fill(5),c.metrics(),s,s.final,{titles:{},medals:{}});for(let i=0;i<8;i++)assert.ok(result.titles.some(t=>t.id===`v2_single_${i}_elite`));assert.ok(result.titles.every(t=>!t.legacy));
});
test('old earned titles, medals and counts survive without becoming new titles',()=>{
 const c=harness();c.saved.set(c.get('TITLE_ARCHIVE_KEY'),JSON.stringify({titles:{single_1_elite:{count:3,at:'old',score:100}},medals:{untouched:{count:2}},runs:8}));const a=c.readTitleArchive();assert.equal(a.titles.single_1_elite.count,3);assert.ok(a.titles.legend_1);assert.equal(a.titles.v2_single_1_elite,undefined);assert.equal(a.titles.v2_legend_1,undefined);assert.equal(a.medals.untouched.count,2);assert.equal(a.runs,8);
});
test('third upper-title acquisition earns a new legend without double counting a run',()=>{
 const c=harness();for(let n=1;n<=3;n++){const s=c.scoreStats=Object.assign(c.newScoreStats(),rich,{final:{cleared:true,total:1000},vehicleKinds:{tank:true}});c.recordRunAchievements(s);c.recordRunAchievements(s);assert.equal(!!c.readTitleArchive().titles.v2_legend_1,n===3);}assert.equal(c.readTitleArchive().titles.v2_single_1_elite.count,3);assert.equal(c.readTitleArchive().runs,3);
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
 const c=harness();c.p.tank={kind:'tank'};c.partner={passengerVehicle:c.p.tank,down:false};c.recordSupportResult();c.recordSupportResult('stun','hound');c.recordSupportResult('rescue','partner');assert.equal(c.scoreStats.allyKills,1);assert.equal(c.scoreStats.allyStuns,1);assert.equal(c.scoreStats.partnerRescues,1);assert.equal(c.scoreStats.jointKills,1);assert.equal(c.get("teamworkSuccesses(scoreStats)"),3);assert.equal(c.scoreStats.rangedKills,0);assert.equal(c.scoreStats.assaultKills,0);
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
