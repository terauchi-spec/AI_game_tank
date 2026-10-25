const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/unlocks.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness({storage=new Map(),storageFails=false}={}){
 const nodes=new Map(),classes=new Set(),events={},sounds=[],getNode=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,innerHTML:'',src:'',scrollTop:99,handlers:{},addEventListener(n,f){this.handlers[n]=f;},focus(){this.focused=true;}});return nodes.get(id);};
 const c={state:'win',scoreStats:null,areaDebugEnabled:false,STAGE_ORDER:[{id:'indoorBeginner',name:'潜入（初級）',image:'infiltration_beginner'}],SK:[{id:'dig',n:'潜伏'}],TITLE_CATALOG:[{id:'v3_stealth',name:'隠密兵',type:'単独実績'}],stageDisplayNumber:()=> '02',skillCardIconSrc:id=>'assets/ui/skills/'+id+'.webp',awardIcon:t=>'<img src="assets/ui/titles/'+t.id+'.webp">',
 document:{body:{classList:{contains:n=>classes.has(n),add:n=>classes.add(n),remove:n=>classes.delete(n)}},getElementById:getNode},localStorage:{getItem(k){if(storageFails)throw Error('storage');return storage.get(k)??null;},setItem(k,v){if(storageFails)throw Error('storage');storage.set(k,v);}},addEventListener:(n,f)=>events[n]=f,sfx:n=>sounds.push(n),renderResultScreen(){c.renders++;},renders:0,animateResultScore(){c.animations++;},animations:0,beginResultGameBgm(){c.bgmStarts++;},bgmStarts:0,resultScoreAnimId:0};
 vm.createContext(c);vm.runInContext(source,c);const start=html.indexOf('function syncResultScreen(){');vm.runInContext(html.slice(start,html.indexOf("document.getElementById('resRetry')",start)),c);
 return{c,nodes,classes,events,sounds,storage,getNode,get:s=>vm.runInContext(s,c)};
}
const run=()=>({final:{total:100,cleared:true},unlockedStage:'indoorBeginner',unlockedSkill:'dig',awards:{newTitles:['v3_stealth'],repeatTitles:['old']}});
test('stage, skill and only newly acquired current titles are collected once without changing progression',()=>{
 const h=harness(),s=run();s.awards.newTitles.push('v3_stealth','unknown');const before=JSON.stringify(s),items=h.c.collectRunUnlocks(s);assert.deepEqual(Array.from(items,i=>i.kind),['stage','skill','title']);assert.equal(items[0].name,'02 潜入（初級）');assert.equal(items[1].name,'「潜伏」');assert.equal(JSON.stringify(s),before);assert.equal(h.storage.size,0);
 s.awards.newTitles=[];assert.equal(h.c.collectRunUnlocks(s).length,2);
});
test('real result transition shows combined unlocks before result rendering, SE and BGM; acknowledgement opens results once',()=>{
 const h=harness(),{c}=h;c.scoreStats=run();c.syncResultScreen();assert.ok(h.classes.has('unlock-open'));assert.equal(h.classes.has('result-open'),false);assert.equal(c.renders,0);assert.equal(h.sounds.length,0);assert.equal(c.bgmStarts,0);assert.equal(h.getNode('unlockScreen').scrollTop,0);assert.equal(h.getNode('unlockEvaluate').focused,true);
 const list=h.getNode('unlockList').innerHTML;assert.match(list,/新ステージ解放/);assert.match(list,/新スキル解放/);assert.match(list,/新称号獲得/);assert.match(list,/隠密兵/);for(let i=0;i<10;i++)c.syncResultScreen();assert.equal(h.getNode('unlockInstructor').src,'assets/ui/instructors/instructor_1.webp');
 h.getNode('unlockEvaluate').handlers.click();assert.ok(h.classes.has('result-open'));assert.equal(h.classes.has('unlock-open'),false);assert.equal(c.renders,1);assert.equal(c.bgmStarts,1);assert.deepEqual(h.sounds,['uiConfirm','results']);for(let i=0;i<10;i++)c.syncResultScreen();assert.equal(c.renders,1);assert.equal(c.bgmStarts,1);
 h.getNode('unlockEvaluate').handlers.click();assert.equal(c.renders,1);
});
test('no unlocks, repeats, invalid IDs, debug and failed saves go directly to evaluation',()=>{
 const values=[{final:{total:10},awards:{newTitles:[],repeatTitles:['v3_stealth']}},{...run(),debugUsed:true},{...run(),awards:{disabled:true,newTitles:['v3_stealth']}},{...run(),stageUnlockSaveFailed:true,unlockSaveFailed:true,awards:{saveFailed:true,newTitles:['v3_stealth']}}];
 for(const s of values){const h=harness();h.c.scoreStats=s;h.c.syncResultScreen();assert.ok(h.classes.has('result-open'));assert.equal(h.classes.has('unlock-open'),false);assert.equal(h.getNode('unlockInstructor').src,'');}
 const h=harness();h.c.areaDebugEnabled=true;assert.equal(h.c.collectRunUnlocks(run()).length,0);
});
test('failure results with new titles receive the same interstitial, and another run can show new unlocks',()=>{
 const h=harness(),{c}=h;c.state='lose';c.scoreStats={final:{total:10,cleared:false},awards:{newTitles:['v3_stealth']}};c.syncResultScreen();assert.ok(h.classes.has('unlock-open'));c.acknowledgeRunUnlocks();c.state='play';c.syncResultScreen();assert.equal(h.classes.has('result-open'),false);c.scoreStats=run();c.state='win';c.syncResultScreen();assert.ok(h.classes.has('unlock-open'));assert.match(h.getNode('unlockInstructor').src,/instructor_2/);
});
test('instructor cycle is persistent, advances only once per opening, wraps around and tolerates unavailable storage',()=>{
 const storage=new Map();
 for(let i=0;i<5;i++){const h=harness({storage});h.c.scoreStats=run();h.c.syncResultScreen();assert.match(h.getNode('unlockInstructor').src,new RegExp('instructor_'+(i%3+1)));for(let j=0;j<5;j++)h.c.syncResultScreen();}
 const h=harness({storageFails:true});h.c.scoreStats=run();assert.doesNotThrow(()=>h.c.syncResultScreen());h.c.acknowledgeRunUnlocks();h.c.state='play';h.c.syncResultScreen();h.c.scoreStats=run();h.c.state='win';h.c.syncResultScreen();assert.match(h.getNode('unlockInstructor').src,/instructor_2/);
});
test('Enter, Space and Escape acknowledge rather than skip to skill selection; repeats and stale clicks do not acknowledge',()=>{
 for(const code of ['Enter','Space','Escape']){const h=harness();h.c.scoreStats=run();h.c.syncResultScreen();let stopped=0;h.events.keydown({code,repeat:true,preventDefault(){},stopImmediatePropagation(){stopped++;}});assert.equal(h.c.scoreStats.unlockNoticeAcknowledged,undefined);h.events.keydown({code,repeat:false,preventDefault(){},stopImmediatePropagation(){stopped++;}});assert.equal(stopped,2);assert.equal(h.c.state,'win');assert.ok(h.classes.has('result-open'));}
 const h=harness();h.c.scoreStats=run();h.c.syncResultScreen();h.c.scoreStats=run();h.c.acknowledgeRunUnlocks();assert.equal(h.c.scoreStats.unlockNoticeAcknowledged,undefined);h.c.state='title';h.c.syncResultScreen();assert.equal(h.classes.has('unlock-open'),false);
});
test('cards escape labels and all responsive screen assets exist',()=>{
 const h=harness();const card=h.c.renderUnlockCard({kind:'skill',name:'<script>"&',image:'x" onerror="bad',note:'<>'});assert.doesNotMatch(card,/<script>|src="x" onerror=/);assert.match(card,/&lt;script&gt;/);assert.match(html,/ナイスこっそり！/);assert.match(html,/id="unlockEvaluate" type="button">評価画面/);assert.match(html,/css\/unlocks.css\?v=/);
 const css=fs.readFileSync(path.join(root,'css/unlocks.css'),'utf8');assert.match(css,/safe-area-inset-bottom/);assert.match(css,/--menu-button-font-size/);assert.match(css,/#unlockScreen\[hidden\]/);for(let i=1;i<=3;i++)assert.ok(fs.statSync(path.join(root,'assets/ui/instructors/instructor_'+i+'.webp')).size<100000);
});
