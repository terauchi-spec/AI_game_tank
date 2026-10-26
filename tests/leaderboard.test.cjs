const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/leaderboard.js'),'utf8');
function harness(){
 const nodes=new Map(),saved=new Map(),timers=[],sent=[],classes=new Set(),events={};
 const make=()=>({hidden:true,children:[],options:[],textContent:'',value:'',handlers:{},appendChild(el){this.children.push(el);if(el.value)this.options.push(el);},replaceChildren(...v){this.children=v;},addEventListener(n,f){this.handlers[n]=f;},focus(){}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);};
 const c={state:'win',areaDebugEnabled:false,skill:'throw',STAGE_ORDER:[{id:'beginner',name:'破壊（初級）'},{id:'indoor',name:'潜入（上級）'}],TITLE_CATALOG:[{id:'v3_single_1',name:'隠密兵'}],SK:[{id:'throw',n:'遠投'}],currentStageId:()=>c.stage,stage:'beginner',readIntroName:()=>c.name,name:'タンコ',document:{getElementById:get,createElement:make,createDocumentFragment:make,body:{classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}}},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},setTimeout:fn=>{timers.push(fn);return fn;},clearTimeout(){},AbortController,sfx(){},awardIcon:()=>'<svg></svg>',addEventListener:(n,fn)=>events[n]=fn,fetch:async(url,options)=>{sent.push({url,options});return{ok:true,json:async()=>options?.method==='POST'?{ok:true}:{entries:[]}};}};
 vm.createContext(c);vm.runInContext(source,c);return {c,get,saved,timers,sent,classes,events,value:s=>vm.runInContext(s,c)};
}
const run=(score=100)=>({final:{total:score,rank:'A'},awards:{primary:'v3_single_1',titles:['v3_single_1']},debugUsed:false});
test('finished runs capture name, stage, skill and earned titles together without network work in the scoring frame',async()=>{
 const h=harness(),s=run();h.c.queueLeaderboardScore(s);assert.equal(h.sent.length,0);const entry=JSON.parse(h.saved.get('tankGameLeaderboardPendingV1')).beginner;assert.equal(entry.name,'タンコ');assert.equal(entry.score,100);assert.deepEqual(entry.titles,['v3_single_1']);h.c.name='別名';h.c.skill='sniper';await h.c.flushLeaderboardScores();const posted=JSON.parse(h.sent[0].options.body);assert.equal(posted.name,'タンコ');assert.equal(posted.skill,'throw');assert.equal(h.value('Object.keys(leaderboardPending).length'),0);h.c.queueLeaderboardScore(s);assert.equal(h.sent.length,1);
});
test('area debug, debug-used, unnamed and test-stage runs never queue or upload',()=>{
 for(const mode of ['area','debug','name','test']){const h=harness(),s=run();if(mode==='area')h.c.areaDebugEnabled=true;if(mode==='debug')s.debugUsed=true;if(mode==='name')h.c.name='';if(mode==='test')h.c.stage='frontOni';h.c.queueLeaderboardScore(s);assert.equal(h.saved.size,0);assert.equal(h.sent.length,0);}
});
test('offline scores retain only the best per stage, retry later and never send while gameplay is active',async()=>{
 const h=harness();h.c.fetch=async()=>{throw Error('offline');};h.c.queueLeaderboardScore(run(100));h.c.queueLeaderboardScore(run(50));h.c.stage='indoor';h.c.queueLeaderboardScore(run(80));await h.c.flushLeaderboardScores();assert.equal(h.value('leaderboardPending.beginner.score'),100);assert.equal(h.value('Object.keys(leaderboardPending).length'),2);
 let count=0;h.c.fetch=async()=>{count++;return{ok:true,json:async()=>({ok:true})};};h.c.state='play';await h.c.flushLeaderboardScores();assert.equal(count,0);h.c.state='win';await h.c.flushLeaderboardScores();assert.equal(count,2);assert.equal(h.value('Object.keys(leaderboardPending).length'),0);
});
test('scoreboard opens from title and handles unavailable service, close and late responses safely',async()=>{
 const h=harness();h.c.state='title';h.c.fetch=async()=>{throw Error('offline');};h.c.openLeaderboard();await new Promise(r=>setImmediate(r));assert.equal(h.c.state,'leaderboard');assert.ok(h.classes.has('leaderboard-open'));assert.equal(h.get('leaderboardSelect').options.length,3);assert.match(h.get('leaderboardStatus').textContent,/取得できません/);h.c.closeLeaderboard();assert.equal(h.c.state,'title');assert.equal(h.get('leaderboardScreen').hidden,true);
});
test('names are rendered as plain text and only known title IDs create trusted artwork',()=>{
 const h=harness();h.c.renderLeaderboardRows([{name:'<img onerror=bad>',score:500,rank:'A',skill:'throw',titles:['<script>','v3_single_1']}]);const row=h.get('leaderboardList').children[0].children[0],body=row.children[1];assert.equal(body.children[0].textContent,'<img onerror=bad>');assert.equal(body.children[0].innerHTML,undefined);assert.equal(body.children[2].children.length,1);
});
test('server-confirmed board changes notify the matching run only; failures and unchanged scores do not announce updates',async()=>{
 for(const mode of ['updated','same','failed','stale']){
  const h=harness(),s=run();h.c.scoreStats=mode==='stale'?run():s;let opened=0;h.c.syncResultScreen=()=>opened++;h.c.fetch=async()=>{if(mode==='failed')throw Error('offline');return{ok:true,json:async()=>({ok:true,updated:mode==='same'?[]:[{board:'overall',position:4}]})};};
  h.c.queueLeaderboardScore(s);await h.c.flushLeaderboardScores();assert.equal(opened,mode==='updated'?1:0,mode);assert.equal(!!s.leaderboardUpdates,mode==='updated'||mode==='stale',mode);
 }
});
test('the first three rows use gold, silver and bronze WebP medals; fourth place retains a numeric position',()=>{
 const h=harness();h.c.renderLeaderboardRows(Array.from({length:4},(_,i)=>({name:'たんく'+i,score:100-i,rank:'A',skill:'throw',titles:[]})));
 const rows=h.get('leaderboardList').children[0].children;
 for(const [i,color] of ['gold','silver','bronze'].entries()){
  const medal=rows[i].children[0].children[0];assert.match(medal.src,new RegExp('medal-'+color+'\\.webp\\?v='));assert.match(medal.alt,new RegExp('^'+(i+1)+'位'));assert.ok(fs.statSync(require('node:path').join(__dirname,'../assets/ui/leaderboard/medal-'+color+'.webp')).size<10000);
 }
 assert.equal(rows[3].children[0].textContent,'04');assert.equal(rows[3].children[0].children.length,0);
});

test('developer board requires active mode, shows only top 30, switches stages and returns to developer on Escape',async()=>{
 const h=harness();h.c.state='developer';h.c.isDeveloperMode=()=>false;h.c.openLeaderboard(true);assert.equal(h.c.state,'developer');assert.equal(h.sent.length,0);
 h.c.isDeveloperMode=()=>true;h.c.fetch=async(url,options)=>{h.sent.push({url,options});return{ok:true,json:async()=>({entries:Array.from({length:40},(_,i)=>({name:'たんく'+i,score:1000-i,rank:'A',skill:'throw',titles:[]}))})};};
 h.c.openLeaderboard(true);await new Promise(r=>setImmediate(r));assert.equal(h.c.state,'leaderboard');assert.equal(h.get('developerScreen').hidden,true);assert.equal(h.get('leaderboardHeading').textContent,'開発者用スコアボード');assert.equal(h.get('leaderboardHome').textContent,'開発者画面');assert.equal(h.get('leaderboardList').children[0].children.length,30);assert.equal(h.get('leaderboardList').children[0].children[29].children[0].textContent,'30');
 h.get('leaderboardSelect').handlers.change({target:{value:'indoor'}});await new Promise(r=>setImmediate(r));assert.equal(h.sent.at(-1).url,'/api/leaderboard?board=indoor');assert.equal(h.get('leaderboardList').children[0].children.length,30);
 let prevented=false;h.events.keydown({key:'Escape',preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(h.c.state,'developer');assert.equal(h.get('developerScreen').hidden,false);assert.equal(h.get('leaderboardScreen').hidden,true);
 h.c.state='title';h.c.openLeaderboard();await new Promise(r=>setImmediate(r));assert.equal(h.get('leaderboardHeading').textContent,'スコアボード');assert.equal(h.get('leaderboardHome').textContent,'タイトル');h.c.closeLeaderboard();assert.equal(h.c.state,'title');
});
test('a late developer board response cannot paint over the closed developer menu',async()=>{
 const h=harness();h.c.state='developer';h.c.isDeveloperMode=()=>true;let resolve;h.c.fetch=()=>new Promise(r=>resolve=r);h.c.openLeaderboard(true);await new Promise(r=>setImmediate(r));h.c.closeLeaderboard();resolve({ok:true,json:async()=>({entries:[{name:'遅延',score:100,rank:'A',skill:'throw',titles:[]}]})});await new Promise(r=>setImmediate(r));assert.equal(h.c.state,'developer');assert.equal(h.get('leaderboardList').children.length,0);
});
test('skill labels use an emphasized usage prefix and remain plain text for unknown skills',()=>{
 const h=harness();h.c.renderLeaderboardRows([{name:'タンコ',score:100,rank:'A',skill:'throw',titles:[]},{name:'タンコ2',score:90,rank:'B',skill:'<script>',titles:[]}]);
 const rows=h.get('leaderboardList').children[0].children;
 assert.equal(rows[0].children[1].children[1].children[2].textContent,'使用スキル：遠投');assert.equal(rows[1].children[1].children[1].children[2].textContent,'使用スキル：—');
});
