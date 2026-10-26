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
 const list=h.getNode('unlockList').innerHTML;assert.match(list,/新ステージ/);assert.match(list,/新スキル/);assert.match(list,/新称号/);assert.match(list,/隠密兵/);for(let i=0;i<10;i++)c.syncResultScreen();assert.match(h.getNode('unlockInstructor').src,/^assets\/ui\/instructors\/instructor_1\.webp\?v=/);
 h.getNode('unlockEvaluate').handlers.click();assert.ok(h.classes.has('result-open'));assert.equal(h.classes.has('unlock-open'),false);assert.equal(c.renders,1);assert.equal(c.bgmStarts,1);assert.deepEqual(h.sounds,['uiConfirm','results']);for(let i=0;i<10;i++)c.syncResultScreen();assert.equal(c.renders,1);assert.equal(c.bgmStarts,1);
 h.getNode('unlockEvaluate').handlers.click();assert.equal(c.renders,1);
});
test('no unlocks, repeats, invalid IDs and failed saves go directly to evaluation',()=>{
 const values=[{final:{total:10},awards:{newTitles:[],repeatTitles:['v3_stealth']}},{...run(),awards:{disabled:true,newTitles:['v3_stealth']}},{...run(),stageUnlockSaveFailed:true,unlockSaveFailed:true,awards:{saveFailed:true,newTitles:['v3_stealth']}}];
 for(const s of values){const h=harness();h.c.scoreStats=s;h.c.syncResultScreen();assert.ok(h.classes.has('result-open'));assert.equal(h.classes.has('unlock-open'),false);assert.equal(h.getNode('unlockInstructor').src,'');}
 const h=harness();h.c.areaDebugEnabled=true;assert.equal(h.c.collectRunUnlocks(run()).length,0);
});
test('failure results with new titles receive the same interstitial, and another run can show new unlocks',()=>{
 const h=harness(),{c}=h;c.state='lose';c.scoreStats={final:{total:10,cleared:false},awards:{newTitles:['v3_stealth']}};c.syncResultScreen();assert.ok(h.classes.has('unlock-open'));c.acknowledgeRunUnlocks();c.state='play';c.syncResultScreen();assert.equal(h.classes.has('result-open'),false);c.scoreStats=run();c.state='win';c.syncResultScreen();assert.ok(h.classes.has('unlock-open'));assert.match(h.getNode('unlockInstructor').src,/instructor_2/);
});
test('instructor cycle is persistent, advances only once per opening, wraps around and tolerates unavailable storage',()=>{
 const storage=new Map();
 for(let i=0;i<15;i++){const h=harness({storage});h.c.scoreStats=run();h.c.syncResultScreen();assert.match(h.getNode('unlockInstructor').src,new RegExp('instructor_'+([1,2,3,4,5,6,7,8,9,10,11,12,0][i%13])));for(let j=0;j<5;j++)h.c.syncResultScreen();}
 const h=harness({storageFails:true});h.c.scoreStats=run();assert.doesNotThrow(()=>h.c.syncResultScreen());h.c.acknowledgeRunUnlocks();h.c.state='play';h.c.syncResultScreen();h.c.scoreStats=run();h.c.state='win';h.c.syncResultScreen();assert.match(h.getNode('unlockInstructor').src,/instructor_2/);
});
test('Enter, Space and Escape acknowledge rather than skip to skill selection; repeats and stale clicks do not acknowledge',()=>{
 for(const code of ['Enter','Space','Escape']){const h=harness();h.c.scoreStats=run();h.c.syncResultScreen();let stopped=0;h.events.keydown({code,repeat:true,preventDefault(){},stopImmediatePropagation(){stopped++;}});assert.equal(h.c.scoreStats.unlockNoticeAcknowledged,undefined);h.events.keydown({code,repeat:false,preventDefault(){},stopImmediatePropagation(){stopped++;}});assert.equal(stopped,2);assert.equal(h.c.state,'win');assert.ok(h.classes.has('result-open'));}
 const h=harness();h.c.scoreStats=run();h.c.syncResultScreen();h.c.scoreStats=run();h.c.acknowledgeRunUnlocks();assert.equal(h.c.scoreStats.unlockNoticeAcknowledged,undefined);h.c.state='title';h.c.syncResultScreen();assert.equal(h.classes.has('unlock-open'),false);
});
test('cards escape labels and all responsive screen assets exist',()=>{
 const h=harness();const card=h.c.renderUnlockCard({kind:'skill',name:'<script>"&',image:'x" onerror="bad',note:'<>'});assert.doesNotMatch(card,/<script>|src="x" onerror=/);assert.match(card,/&lt;script&gt;/);assert.match(html,/ナイスこっそり！/);assert.match(html,/id="unlockEvaluate" type="button">評価画面/);assert.match(html,/css\/unlocks.css\?v=/);
 const css=fs.readFileSync(path.join(root,'css/unlocks.css'),'utf8');assert.match(css,/safe-area-inset-bottom/);assert.match(css,/--menu-button-font-size/);assert.match(css,/#unlockScreen\[hidden\]/);for(let i=0;i<=12;i++)assert.ok(fs.statSync(path.join(root,'assets/ui/instructors/instructor_'+i+'.webp')).size<100000);
});

test('debug results show all newly persisted unlocks before evaluation',()=>{const h=harness();h.c.scoreStats={...run(),debugUsed:true};h.c.syncResultScreen();assert.ok(h.classes.has('unlock-open'));assert.equal(h.c.renders,0);assert.equal(h.c.scoreStats.unlockNoticeItems.length,3);});
test('a confirmed leaderboard update alone opens the unlock screen and uses success/failure speech',()=>{
 for(const cleared of [true,false]){
  const h=harness();h.c.state=cleared?'win':'lose';h.c.scoreStats={final:{total:12345,cleared},awards:{newTitles:[]},leaderboardUpdates:[{board:'overall',position:3},{board:'indoorBeginner',position:2}]};
  h.c.syncResultScreen();assert.ok(h.classes.has('unlock-open'));const text=h.getNode('unlockList').innerHTML;assert.match(text,/スコアボード更新/);assert.match(text,/12,345点/);assert.match(text,/総合 3位/);assert.match(text,/潜入（初級） 2位/);assert.equal(h.getNode('unlockDialogue').textContent,cleared?'よくやった！すばらしい逃げ足だったぞ':'もっとこっそり進め！はずかしくないのか');
 }
});
test('late confirmed ranking updates append once to an open unlock screen without cycling the instructor',()=>{
 const h=harness();h.c.scoreStats=run();h.c.syncResultScreen();const image=h.getNode('unlockInstructor').src;h.c.scoreStats.leaderboardUpdates=[{board:'overall',position:1}];h.c.syncResultScreen();h.c.syncResultScreen();assert.equal(h.getNode('unlockInstructor').src,image);assert.equal(h.c.scoreStats.unlockNoticeItems.filter(v=>v.kind==='leaderboard').length,1);assert.match(h.getNode('unlockList').innerHTML,/総合 1位/);
});
test('a confirmed update arriving after evaluation opened is shown once and does not repeat prior unlocks',()=>{
 const h=harness();h.c.scoreStats=run();h.c.syncResultScreen();h.c.acknowledgeRunUnlocks();assert.ok(h.classes.has('result-open'));h.c.scoreStats.leaderboardUpdates=[{board:'overall',position:5}];h.c.syncResultScreen();assert.ok(h.classes.has('unlock-open'));assert.deepEqual(Array.from(h.c.scoreStats.unlockNoticeItems,v=>v.kind),['leaderboard']);h.c.acknowledgeRunUnlocks();h.c.syncResultScreen();assert.ok(!h.classes.has('unlock-open'));
});
test('unconfirmed, non-ranking and invalid-position submissions never create scoreboard notices',()=>{
 for(const updates of [undefined,[],[{board:'overall',position:31}],[{board:'unknown',position:1}]]){
  const h=harness(),s={final:{total:100,cleared:false},awards:{newTitles:[]},leaderboardUpdates:updates};assert.equal(h.c.collectRunUnlocks(s).length,0);
 }
});

test('promotion alone opens the unlock screen once and shows old and new rank, including on failure',()=>{
 for(const cleared of [true,false]){
  const h=harness(),s={final:{total:100,cleared},awards:{newTitles:[]},careerPromotion:{from:'伍長',name:'軍曹',previousLevel:4,level:5}};h.c.scoreStats=s;h.c.state=cleared?'win':'lose';h.c.syncResultScreen();assert.ok(h.classes.has('unlock-open'));assert.match(h.getNode('unlockList').innerHTML,/昇級！/);assert.match(h.getNode('unlockList').innerHTML,/軍曹/);assert.match(h.getNode('unlockList').innerHTML,/伍長 → 軍曹/);assert.equal(s.unlockNoticeItems.length,1);h.c.acknowledgeRunUnlocks();h.c.syncResultScreen();assert.ok(h.classes.has('result-open'));assert.ok(!h.classes.has('unlock-open'));
 }
});
test('promotion combines with other unlocks and a late score update does not repeat an acknowledged promotion',()=>{
 const h=harness(),s={...run(),careerPromotion:{from:'二等兵',name:'伍長',previousLevel:1,level:4}};h.c.scoreStats=s;h.c.syncResultScreen();assert.equal(s.unlockNoticeItems.length,4);assert.equal(s.unlockNoticeItems.filter(v=>v.kind==='rank').length,1);h.c.acknowledgeRunUnlocks();s.leaderboardUpdates=[{board:'overall',position:2}];h.c.syncResultScreen();assert.deepEqual(Array.from(s.unlockNoticeItems,v=>v.kind),['leaderboard']);assert.doesNotMatch(h.getNode('unlockList').innerHTML,/昇級/);
});
test('failed saves, unchanged ranks, invalid ranks and debug areas cannot announce promotions',()=>{
 for(const mode of ['failed','same','invalid','area']){
  const h=harness(),s={final:{total:100},awards:{newTitles:[]},careerPromotion:{from:'二等兵',name:'一等兵',previousLevel:1,level:2}};if(mode==='failed')s.awards.saveFailed=true;if(mode==='same')s.careerPromotion.level=1;if(mode==='invalid')s.careerPromotion.level=17;if(mode==='area')h.c.areaDebugEnabled=true;assert.equal(h.c.collectRunUnlocks(s).length,0,mode);
 }
});
test('score update cards use existing gold, silver or bronze WebP medals for the best updated board',()=>{
 for(const [position,color] of [[1,'gold'],[2,'silver'],[3,'bronze'],[30,'bronze']]){
  const h=harness(),s={final:{total:200},awards:{newTitles:[]},leaderboardUpdates:[{board:'overall',position:30},{board:'indoorBeginner',position}]};const item=h.c.collectRunUnlocks(s)[0],card=h.c.renderUnlockCard(item);assert.match(card,new RegExp('assets/ui/leaderboard/medal-'+color+'\\.webp'));assert.doesNotMatch(card,/<svg/);assert.ok(fs.statSync(path.join(root,item.image)).size<10000);
 }
});
