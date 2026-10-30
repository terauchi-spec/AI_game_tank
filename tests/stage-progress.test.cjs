const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/stage-progress.js'),'utf8');
const order=['beginner','indoorBeginner','frontBeginner','base','indoor','front','decisive'];
function harness(saved){const storage=new Map(saved?[['tankGameStageProgressV1',saved]]:[]),c={isDeveloperMode:()=>true,stageMode:'beginner',frontlineBeginner:false,indoorBeginner:false,areaDebugEnabled:false,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};vm.createContext(c);vm.runInContext(source,c);c.storage=storage;c.ids=()=>order.filter(id=>c.stageSelectable(id));return c;}
function clear(c,id){c.frontlineBeginner=id==='frontBeginner';c.indoorBeginner=id==='indoorBeginner';c.stageMode=c.frontlineBeginner?'front':c.indoorBeginner?'indoor':id;const s={final:{cleared:true}};c.unlockStageOnClear(s);return s;}
function cards(c){const buttons=order.map(id=>({dataset:{stage:id},classList:{toggle(k,v){this[k]=v;}},number:{},target:{},querySelector(sel){return sel==='.stage-target'?this.target:sel==='.stage-number'?this.number:null;},setAttribute(k,v){this[k]=v;}})),nodes={};c.document={querySelectorAll:()=>buttons,getElementById:id=>nodes[id]??={classList:{toggle(k,v){this[k]=v;}},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];}}};return{buttons,nodes};}
test('only 01 starts open and all seven stages unlock exactly in display order',()=>{
 const c=harness();assert.deepEqual(c.ids(),['beginner']);assert.equal(c.stageSelectable('unknown'),false);
 for(let i=0;i<order.length;i++){const s=clear(c,order[i]);assert.equal(s.unlockedStage,order[i+1]);assert.deepEqual(c.ids(),order.slice(0,Math.min(order.length,i+2)));assert.equal(clear(c,order[i]).unlockedStage,undefined);}
 assert.deepEqual(JSON.parse(c.storage.get('tankGameStageProgressV1')),{version:2,cleared:order});
});
test('locked stages, failures, area debug and duplicate finalization cannot advance progress',()=>{
 const c=harness();for(const id of order.slice(1))clear(c,id);assert.equal(c.storage.size,0);
 for(const s of [{final:{cleared:false}}])c.unlockStageOnClear(s);
 c.areaDebugEnabled=true;clear(c,'beginner');assert.deepEqual(c.ids(),['beginner']);c.areaDebugEnabled=false;
 const s=clear(c,'beginner');c.unlockStageOnClear(s);assert.deepEqual(c.ids(),order.slice(0,2));assert.equal(JSON.parse(c.storage.get('tankGameStageProgressV1')).cleared.length,1);
});
test('both infiltration difficulties persist and announce the next stage across reloads',()=>{
 let c=harness();for(let i=0;i<order.length;i++){const s=clear(c,order[i]);assert.equal(s.unlockedStage,order[i+1]);c=harness(c.storage.get('tankGameStageProgressV1'));assert.deepEqual(c.ids(),order.slice(0,Math.min(order.length,i+2)));}
});
test('old destruction/capture clears are retained but cannot bypass missing infiltration prerequisites',()=>{
 const c=harness(JSON.stringify({cleared:['beginner','frontBeginner','base','front']}));assert.deepEqual(c.ids(),order.slice(0,2));
 assert.deepEqual(Array.from(c.readStageProgress().cleared),['beginner','frontBeginner','base','front']);
 assert.equal(clear(c,'indoorBeginner').unlockedStage,'indoor');assert.deepEqual(c.ids(),order.slice(0,5));clear(c,'indoor');assert.deepEqual(c.ids(),order);assert.equal(JSON.parse(c.storage.get('tankGameStageProgressV1')).cleared.length,6);
});
test('legacy independent infiltration clears and their locked status survive migration and later saves',()=>{
 let c=harness(JSON.stringify({cleared:['beginner'],indoorCleared:['indoor']}));assert.deepEqual(c.ids(),order.slice(0,2));assert.ok(c.readStageProgress().cleared.includes('indoor'));clear(c,'indoorBeginner');c=harness(c.storage.get('tankGameStageProgressV1'));assert.ok(c.readStageProgress().cleared.includes('indoor'));assert.equal(c.stageSelectable('indoor'),false);clear(c,'frontBeginner');clear(c,'base');assert.deepEqual(c.ids(),order.slice(0,-1));
});
test('malformed, unknown and incomplete records never bypass prerequisites',()=>{
 for(const saved of ['broken','null','{"cleared":["front","base"]}','{"cleared":"beginner"}','{"version":2,"cleared":["front","unknown"]}','{"version":2,"cleared":{}}'])assert.deepEqual(harness(saved).ids(),['beginner']);
});
test('failed storage writes do not announce a lost unlock for destruction or infiltration',()=>{
 for(const saved of [undefined,JSON.stringify({version:2,cleared:['beginner']})]){const c=harness(saved);c.localStorage.setItem=()=>{throw Error('quota')};const id=saved?'indoorBeginner':'beginner',s=clear(c,id);assert.equal(s.stageUnlockSaveFailed,true);assert.equal(s.unlockedStage,undefined);assert.equal(c.stageSelectable(saved?'frontBeginner':'indoorBeginner'),false);}
});
test('all seven cards show matching locks, prerequisite text, numbers and clear markers',()=>{
 const c=harness(),{buttons,nodes}=cards(c);c.renderStageLocks();assert.deepEqual(buttons.map(b=>b.disabled),[false,true,true,true,true,true,true]);assert.deepEqual(buttons.map(b=>b.number.textContent),['01','02','03','04','05','06','07']);
 assert.equal(buttons[1].title,'破壊（初級）をクリアすると解放');assert.equal(buttons[2].title,'潜入（初級）をクリアすると解放');assert.equal(buttons[4].title,'破壊（上級）をクリアすると解放');
 for(let i=0;i<order.length;i++){const s=clear(c,order[i]);c.renderStageLocks();assert.equal(buttons[i].classList['stage-cleared'],true);assert.match(buttons[i]['aria-label'],/クリア済み/);c.renderStageUnlock(s);if(i<order.length-1){assert.equal(nodes.resStageUnlock.hidden,false);assert.ok(nodes.resStageUnlockName.textContent.startsWith(String(i+2).padStart(2,'0')));assert.ok(nodes.resStageUnlockImage.src.endsWith('.webp'));}else assert.equal(nodes.resStageUnlock.hidden,true);}
});
test('infiltration unlock notices use the correct facility artwork',()=>{
 const c=harness(),{nodes}=cards(c);c.renderStageUnlock(clear(c,'beginner'));assert.equal(nodes.resStageUnlockImage.src,'assets/ui/stages/infiltration_beginner.webp');clear(c,'indoorBeginner');clear(c,'frontBeginner');c.renderStageUnlock(clear(c,'base'));assert.equal(nodes.resStageUnlockImage.src,'assets/ui/stages/infiltration_advanced.webp');
});
test('current stage identity separates both difficulty pairs',()=>{
 const c=harness();for(const id of order){clear(c,id);assert.equal(c.currentStageId(),id);}
});
test('seven HTML selection cards match the canonical unlock order and launch paths enforce it',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),data=[...html.matchAll(/<button[^>]*class="stage-card"[^>]*data-stage="([^"]+)"[^>]*>(.*?)<\/button>/g)];assert.deepEqual(data.map(m=>m[1]),['training','beginner','indoorBeginner','frontBeginner','base','indoor','front','decisive','indoorLab','areaDebug']);
 assert.deepEqual(data.filter(m=>!['areaDebug','indoorLab'].includes(m[1])).map(m=>m[2].match(/class="stage-number"[^>]*>(\d+)/)[1]),['00','01','02','03','04','05','06','07']);assert.match(html,/if\(setSelectedStage\(b.dataset.stage\)\)/);assert.match(html,/!areaDebugEnabled&&!stageAvailableForSelection\(currentStageId\(\)\)/);assert.ok(!html.includes('潜入は初級・上級とも最初から選べます'));
});


test('stage selection only highlights the card; deployment starts the chosen difficulty once confirmed',()=>{
 const c=harness(),{buttons,nodes}=cards(c);let deployments=0;Object.assign(c,{state:'stage',gameBuildQueued:false,selectedSkillId:'throw',skillMenuList:()=>[{id:'throw'}],selectSkillIndex(i,deploy){assert.equal(i,0);assert.equal(deploy,true);deployments++;c.state='preparing';return true;},sfx(){}});
 c.renderStageLocks();assert.equal(nodes.stageDeploy.textContent,'破壊（初級）で出撃');assert.equal(c.setSelectedStage('front'),false);assert.equal(deployments,0);assert.equal(c.state,'stage');
 assert.equal(c.deploySelectedStage(),true);assert.equal(deployments,1);assert.equal(c.stageMode,'beginner');assert.equal(c.deploySelectedStage(),false);
 c.state='stage';clear(c,'beginner');c.state='stage';c.setSelectedStage('indoorBeginner');assert.equal(c.stageMode,'beginner');assert.equal(deployments,1);assert.equal(nodes.stageDeploy.textContent,'潜入（初級）で出撃');c.deploySelectedStage();assert.equal(c.stageMode,'indoor');assert.equal(c.indoorBeginner,true);assert.equal(deployments,2);
});
test('all-stage debug selection retains prerequisites and turning it off restores locks and selection',()=>{
 const c=harness(),{buttons,nodes}=cards(c);vm.runInContext('stageDebugAll=true',c);c.renderStageLocks();assert.ok(buttons.every(b=>!b.disabled));assert.equal(c.stageSelectable('front'),false);assert.equal(c.setSelectedStage('front'),true);assert.equal(nodes.stageDeploy.textContent,'制圧（上級）で出撃');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');c.skillDebugAll=false;vm.runInContext(html.slice(html.indexOf('function newScoreStats()'),html.indexOf('function playerDetectedNow()')),c);const stats=c.newScoreStats();assert.equal(stats.debugUsed,true);stats.final={cleared:true};c.stageMode='front';c.unlockStageOnClear(stats);assert.equal(c.storage.size,0);
 vm.runInContext('stageDebugAll=false',c);c.renderStageLocks();assert.equal(buttons[5].disabled,true);assert.equal(nodes.stageDeploy.textContent,'破壊（初級）で出撃');assert.equal(buttons[0].classList.selected,true);
});
test('area debug opens its picker only after confirmation and cannot grant stage progress',()=>{
 const c=harness(),{buttons,nodes}=cards(c),ex={dataset:{stage:'areaDebug'},classList:{toggle(){}},setAttribute(){}};buttons.push(ex);let deployments=0;Object.assign(c,{state:'stage',gameBuildQueued:false,selectSkillIndex(){deployments++;},sfx(){}});c.renderStageLocks();assert.equal(ex.disabled,false);c.setSelectedStage('areaDebug');assert.equal(c.areaDebugEnabled,false);assert.equal(c.state,'stage');assert.equal(nodes.stageDeploy.textContent,'エリアデバッグへ');c.deploySelectedStage();assert.equal(c.state,'areaPick');assert.equal(c.areaDebugEnabled,true);assert.equal(c.selectedAreaDebug,null);assert.equal(deployments,0);clear(c,'beginner');assert.equal(c.storage.size,0);
});
test('fixed menu, area debug navigation and removed skill toggle are wired to the new screens',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),canyon=fs.readFileSync(path.join(__dirname,'../js/canyon.js'),'utf8');assert.ok(!html.includes('skAreaDebug'));assert.match(html,/<footer class="sk-bottom stage-bottom">/);assert.match(html,/id="stageDebugAll"[^>]*>全ステージを表示/);assert.match(html,/id="stageDeploy"/);assert.match(html,/padding-bottom:calc\(150px \+ env\(safe-area-inset-bottom\)\)/);assert.match(canyon,/state='stage';areaDebugEnabled=false;selectedAreaDebug=null/);
});


test('decisive appears with its artwork and deploys in developer all-stage selection without granting normal progression',()=>{
 const c=harness(),{buttons,nodes}=cards(c),card=buttons.find(b=>b.dataset.stage==='decisive');c.renderStageLocks();assert.equal(card.disabled,true);assert.equal(card.classList['stage-concealed'],true);
 vm.runInContext('stageDebugAll=true',c);c.renderStageLocks();assert.equal(card.disabled,false);assert.equal(card.target.textContent,'移動要塞');assert.equal(card.classList['stage-concealed'],false);assert.equal(c.stageSelectable('decisive'),false);assert.equal(c.setSelectedStage('decisive'),true);assert.equal(nodes.stageDeploy.textContent,'決戦で出撃');
 Object.assign(c,{state:'stage',gameBuildQueued:false,skillDebugAll:false,selectedSkillId:'throw',skillMenuList:()=>[{id:'throw'}],selectSkillIndex:()=>true});assert.equal(c.deploySelectedStage(),true);assert.equal(c.stageMode,'decisive');assert.equal(c.frontlineOni,false);assert.equal(c.currentStageId(),'decisive');assert.equal(c.storage.size,0);
 vm.runInContext('stageDebugAll=false',c);c.renderStageLocks();assert.equal(card.disabled,true);assert.equal(card.classList['stage-concealed'],true);assert.equal(card.target.textContent,'？');assert.equal(nodes.stageDeploy.textContent,'破壊（初級）で出撃');
});
test('Oni is absent from HTML and cannot be selected or deployed even with stale developer state',()=>{
 const c=harness();vm.runInContext('stageDebugAll=true',c);assert.equal(c.stageAvailableForSelection('frontOni'),false);assert.equal(c.setSelectedStage('frontOni'),false);Object.assign(c,{state:'stage',gameBuildQueued:false});vm.runInContext("selectedStageId='frontOni'",c);assert.equal(c.deploySelectedStage(),false);
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.doesNotMatch(html,/data-stage="frontOni"|制圧（鬼/);
});

test('stage records count actual starts once, retain per-stage bests across reloads, and snapshot difficulty',()=>{
 const c=harness();let s={};c.recordStageSortie(s);c.recordStageSortie(s);assert.equal(c.readStageRecords().stages.beginner.sorties,1);
 c.stageMode='front';c.frontlineBeginner=true;s.final={total:5300,rank:'B'};c.recordStageResult(s);c.recordStageResult(s);assert.equal(c.readStageRecords().stages.beginner.bestScore,5300);assert.equal(c.readStageRecords().stages.frontBeginner.bestScore,null);
 c.stageMode='beginner';c.frontlineBeginner=false;s={};c.recordStageSortie(s);s.final={total:1200,rank:'D'};c.recordStageResult(s);let r=c.readStageRecords().stages.beginner;assert.equal(r.sorties,2);assert.equal(r.bestScore,5300);assert.equal(r.bestRank,'B');
 s={};c.recordStageSortie(s);s.final={total:10500,rank:'S'};c.recordStageResult(s);const restored=harness();restored.storage.set('tankGameStageRecordsV1',c.storage.get('tankGameStageRecordsV1'));r=restored.readStageRecords().stages.beginner;assert.equal(r.sorties,3);assert.equal(r.bestScore,10500);assert.equal(r.bestRank,'S');
 for(const id of order){c.frontlineBeginner=id==='frontBeginner';c.indoorBeginner=id==='indoorBeginner';c.stageMode=c.frontlineBeginner?'front':c.indoorBeginner?'indoor':id;const run={};c.recordStageSortie(run);assert.equal(run.stageRecordId,id);}
});
test('stage record counts survive an abandoned run and include debug but exclude area/test and malformed data',()=>{
 const c=harness();c.recordStageSortie({});assert.equal(c.readStageRecords().stages.beginner.sorties,1);assert.equal(c.readStageRecords().stages.beginner.bestRank,null);
 c.recordStageSortie({debugUsed:true});c.recordStageResult({debugUsed:true,final:{total:99999,rank:'S'}});c.areaDebugEnabled=true;c.recordStageSortie({});c.areaDebugEnabled=false;c.stageMode='front';c.frontlineOni=true;c.recordStageSortie({});assert.equal(c.readStageRecords().stages.beginner.sorties,3);
 c.storage.set('tankGameStageRecordsV1','{"stages":{"beginner":{"sorties":-4,"bestScore":"9000","bestRank":"<img>"}}}');let r=c.readStageRecords().stages.beginner;assert.equal(r.sorties,0);assert.equal(r.bestScore,null);assert.equal(r.bestRank,null);
 c.storage.set('tankGameStageRecordsV1','broken');assert.equal(c.readStageRecords().stages.beginner.sorties,0);
 c.frontlineOni=false;c.stageMode='beginner';c.localStorage.setItem=()=>{throw Error('quota');};const s={};c.recordStageSortie(s);assert.equal(s.stageRecordSaveFailed,true);assert.equal(s.stageSortieRecorded,undefined);
});
test('selected stage records open, toggle closed and switch with matching score, rank artwork and sortie count',()=>{
 const c=harness(),{buttons}=cards(c),panels={};
 for(const card of buttons){const entries={};for(const key of ['.stage-record-metrics','.stage-record-note','.stage-record-score','.stage-record-count','.stage-record-rank','img'])entries[key]={removeAttribute(k){delete this[k];}};const panel={hidden:true,entries,querySelector:k=>entries[k]};panels[card.dataset.stage]=panel;card.querySelector=sel=>sel==='.stage-records'?panel:sel==='.stage-target'?card.target:sel==='.stage-number'?card.number:null;}
 c.storage.set('tankGameStageRecordsV1',JSON.stringify({stages:{beginner:{sorties:12,successes:3,bestScore:8000,bestRank:'A'}}}));c.renderStageLocks();assert.equal(panels.beginner.hidden,true);c.setSelectedStage('beginner');let panel=panels.beginner;assert.equal(panel.hidden,false);assert.equal(panel.entries['.stage-record-score'].textContent,'8,000');assert.equal(panel.entries['.stage-record-count'].textContent,'3 / 12回');assert.match(panel.entries.img.src,/rank_a\.webp/);
 c.setSelectedStage('beginner');assert.equal(panel.hidden,true);c.renderStageLocks();assert.equal(panel.hidden,true);clear(c,'beginner');c.setSelectedStage('indoorBeginner');assert.equal(panel.hidden,true);panel=panels.indoorBeginner;assert.equal(panel.hidden,false);assert.equal(panel.entries['.stage-record-score'].textContent,'—');assert.equal(panel.entries.img.hidden,true);assert.equal(panel.entries['.stage-record-count'].textContent,'0 / 0回');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.match(html,/recordStageSortie\(scoreStats\);\s*state='play'/);assert.match(html,/recordStageResult\(scoreStats\)/);assert.match(html,/STAGE_PROGRESS_KEY,STAGE_RECORDS_KEY/);assert.equal((html.match(/class="stage-records" hidden/g)||[]).length,10);
});

test('successes count completed clears once per sortie, preserving old records and including debug clears',()=>{
 const c=harness();c.storage.set('tankGameStageRecordsV1',JSON.stringify({stages:{beginner:{sorties:12,bestScore:8000,bestRank:'A'}}}));
 assert.equal(c.readStageRecords().stages.beginner.successes,0);
 const win={};c.recordStageSortie(win);win.final={cleared:true,total:1000,rank:'C'};c.recordStageResult(win);c.recordStageResult(win);
 let r=c.readStageRecords().stages.beginner;assert.equal(r.successes,1);assert.equal(r.sorties,13);assert.equal(r.bestScore,8000);assert.equal(r.bestRank,'A');
 c.recordStageResult({final:{cleared:false,total:500,rank:'D'}});c.recordStageSortie({});c.recordStageResult({debugUsed:true,final:{cleared:true,total:9000,rank:'S'}});
 const restored=harness();restored.storage.set('tankGameStageRecordsV1',c.storage.get('tankGameStageRecordsV1'));r=restored.readStageRecords().stages.beginner;assert.equal(r.successes,2);assert.equal(r.sorties,16);
 for(const successes of [-1,2.5,'4',999]){c.storage.set('tankGameStageRecordsV1',JSON.stringify({stages:{beginner:{sorties:4,successes}}}));assert.equal(c.readStageRecords().stages.beginner.successes,successes===999?4:0);}
});
test('locked facility names stay unknown until normal unlock, including during all-stage debug selection',()=>{
 const c=harness(),{buttons,nodes}=cards(c);c.renderStageLocks();assert.equal(buttons[0].target.textContent,'軍事衛星施設');assert.equal(buttons[4].target.textContent,'？');assert.equal(buttons[4].classList['stage-concealed'],true);
 vm.runInContext('stageDebugAll=true',c);c.renderStageLocks();assert.equal(buttons[4].disabled,false);assert.equal(buttons[4].target.textContent,'？');assert.equal(buttons[4].classList['stage-concealed'],true);
 vm.runInContext('stageDebugAll=false',c);for(const id of order.slice(0,4))clear(c,id);c.renderStageLocks();assert.equal(buttons[4].target.textContent,'軍需格納庫');assert.equal(buttons[4].classList['stage-concealed'],false);
 c.setSelectedStage('frontBeginner');assert.equal(nodes.stageDeploy.textContent,'制圧（初級）で出撃');
});
test('non-developers cannot bypass unlocks or select area debug and Oni even with stale all-stage flags',()=>{
 const c=harness();c.isDeveloperMode=()=>false;vm.runInContext('stageDebugAll=true',c);assert.equal(c.stageAvailableForSelection('beginner'),true);for(const id of ['front','areaDebug','frontOni','decisive'])assert.equal(c.stageAvailableForSelection(id),false,id);c.isDeveloperMode=()=>true;for(const id of ['front','areaDebug','decisive'])assert.equal(c.stageAvailableForSelection(id),true,id);assert.equal(c.stageAvailableForSelection('frontOni'),false);
});
