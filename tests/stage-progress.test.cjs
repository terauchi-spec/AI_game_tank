const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/stage-progress.js'),'utf8');
function harness(saved){const storage=new Map(saved?[['tankGameStageProgressV1',saved]]:[]),c={stageMode:'beginner',frontlineBeginner:false,areaDebugEnabled:false,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};vm.createContext(c);vm.runInContext(source,c);c.storage=storage;c.ids=()=>['beginner','frontBeginner','base','front'].filter(id=>c.stageSelectable(id));return c;}
function clear(c,id){c.stageMode=id==='frontBeginner'?'front':id;c.frontlineBeginner=id==='frontBeginner';const s={final:{cleared:true}};c.unlockStageOnClear(s);return s;}
test('only stage 01 starts open and each distinct sequential clear unlocks exactly the next stage',()=>{const c=harness(),order=['beginner','frontBeginner','base','front'];assert.deepEqual(c.ids(),['beginner']);for(let i=0;i<4;i++){const s=clear(c,order[i]);assert.equal(s.unlockedStage,order[i+1]);assert.deepEqual(c.ids(),order.slice(0,Math.min(4,i+2)));assert.equal(clear(c,order[i]).unlockedStage,undefined);}assert.equal(JSON.parse(c.storage.get('tankGameStageProgressV1')).cleared.length,4);});
test('progress persists across reloads and front difficulties remain distinct',()=>{const c=harness();clear(c,'beginner');clear(c,'frontBeginner');const reloaded=harness(c.storage.get('tankGameStageProgressV1'));assert.deepEqual(reloaded.ids(),['beginner','frontBeginner','base']);assert.equal(clear(reloaded,'front').unlockedStage,undefined);assert.deepEqual(reloaded.ids(),['beginner','frontBeginner','base']);});
test('failures, debug runs and duplicate finalization cannot advance progress',()=>{const c=harness();for(const s of [{final:{cleared:false}},{final:{cleared:true},debugUsed:true}])c.unlockStageOnClear(s);c.areaDebugEnabled=true;clear(c,'beginner');assert.deepEqual(c.ids(),['beginner']);c.areaDebugEnabled=false;const s=clear(c,'beginner');c.unlockStageOnClear(s);assert.deepEqual(c.ids(),['beginner','frontBeginner']);});
test('malformed or out-of-order records never unlock stages',()=>{for(const saved of ['broken','null','{"cleared":["front","base"]}','{"cleared":"beginner"}'])assert.deepEqual(harness(saved).ids(),['beginner']);});
test('failed storage writes do not announce an unlock that would be lost',()=>{const c=harness();c.localStorage.setItem=()=>{throw Error('quota')};const s=clear(c,'beginner');assert.equal(s.stageUnlockSaveFailed,true);assert.equal(s.unlockedStage,undefined);assert.deepEqual(c.ids(),['beginner']);});
test('both indoor difficulties stay selectable without changing the four-stage progression',()=>{
 const c=harness();
 assert.equal(c.stageSelectable('indoor'),true);assert.equal(c.stageSelectable('indoorBeginner'),true);
 clear(c,'indoor');clear(c,'indoorBeginner');assert.deepEqual(c.ids(),['beginner']);assert.equal(c.storage.size,0);
 for(const id of ['beginner','frontBeginner','base','front'])clear(c,id);
 assert.equal(c.stageSelectable('indoor'),true);assert.equal(c.stageSelectable('indoorBeginner'),true);
 assert.deepEqual(JSON.parse(c.storage.get('tankGameStageProgressV1')).cleared,['beginner','frontBeginner','base','front']);
});
test('six selection cards render with distinct playable indoor difficulties',()=>{
 const c=harness();
 const buttons=['beginner','frontBeginner','base','front','indoorBeginner','indoor'].map(id=>({dataset:{stage:id},classList:{toggle(k,v){this[k]=v;}},number:{textContent:''},querySelector(){return this.number;},setAttribute(k,v){this[k]=v;}}));
 c.document={querySelectorAll:()=>buttons};c.renderStageLocks();
 const beginner=buttons[4],advanced=buttons[5];
 assert.equal(beginner.disabled,false);assert.equal(beginner.title,'小型施設・重要資料2箇所を回収');assert.equal(beginner.number.textContent,'02');assert.equal(beginner['aria-label'],'02 潜入（初級）');
 assert.equal(advanced.disabled,false);assert.equal(advanced.number.textContent,'05');assert.equal(advanced['aria-label'],'05 潜入（上級）');
 assert.deepEqual(buttons.slice(0,4).map(b=>b.disabled),[false,true,true,true]);
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.doesNotMatch(html,/<button[^>]*data-stage="indoorBeginner"[^>]*disabled[^>]*>/);
 assert.match(html,/<button[^>]*data-stage="indoor"[^>]*id="stageInfiltrationAdvanced"/);
 assert.equal((html.match(/class="stage-card(?: locked)?" data-stage=/g)||[]).length,6);
});

test('current indoor stage identity separates beginner from advanced',()=>{const c=harness();c.stageMode='indoor';c.indoorBeginner=true;assert.equal(c.currentStageId(),'indoorBeginner');c.indoorBeginner=false;assert.equal(c.currentStageId(),'indoor');});

test('selection order, short labels and unlock notices use the new display numbers without changing saved progress',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),cards=[...html.matchAll(/<button[^>]*class="stage-card"[^>]*data-stage="([^"]+)"[^>]*>(.*?)<\/button>/g)];
 assert.deepEqual(cards.map(m=>[m[1],m[2].match(/class="stage-number"[^>]*>(\d+)/)[1],m[2].match(/<strong>(.*?)<\/strong>/)[1]]),[
  ['beginner','01','破壊（初級）'],['indoorBeginner','02','潜入（初級）'],['frontBeginner','03','制圧（初級）'],['base','04','破壊（上級）'],['indoor','05','潜入（上級）'],['front','06','制圧（上級）']]);
 const c=harness(),buttons=cards.map(m=>({dataset:{stage:m[1]},classList:{toggle(){}},number:{},querySelector(){return this.number;},setAttribute(k,v){this[k]=v;}})),nodes={};
 c.document={querySelectorAll:()=>buttons,getElementById:id=>nodes[id]??={removeAttribute(k){delete this[k];}}};c.renderStageLocks();
 assert.deepEqual(buttons.map(b=>b.number.textContent),['01','02','03','04','05','06']);
 assert.ok(buttons.every(b=>!b['aria-label'].includes('拠点破壊')&&!b['aria-label'].includes('前線制圧')));
 assert.equal(buttons[2].title,'破壊（初級）をクリアすると解放');
 const notice=clear(c,'beginner');c.renderStageUnlock(notice);
 assert.equal(nodes.resStageUnlockName.textContent,'03 制圧（初級）');
 assert.deepEqual(JSON.parse(c.storage.get('tankGameStageProgressV1')).cleared,['beginner']);
});
