const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/developer.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness(){
 const nodes=new Map(),classes=new Set(),requests=[],make=()=>({hidden:true,value:'',textContent:'',disabled:false,events:{},addEventListener(k,f){this.events[k]=f;},focus(){this.focused=true;},blur(){}}),get=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);};
 const c={state:'title',skillDebugAll:true,stageDebugAll:true,areaDebugEnabled:true,selectedAreaDebug:'草原',debugMode:3,debugInvincible:true,patrolRoutesVisible:true,debugRenderDiagnostic:{},skillMenuDirty:false,selectedStageId:'areaDebug',leaderboardPending:{beginner:{}},leaderboardRequest:0,saveLeaderboardPending(){c.saved=true;},updateDebugBadge(){},resetMazeComparison(){},confirm:()=>true,sfx(){},AbortController,setTimeout:()=>1,clearTimeout(){},addEventListener(){},document:{body:{classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}},getElementById:get},fetch:async(url,options)=>{requests.push({url,options});return{ok:true,json:async()=>({active:true,ok:true})};}};
 vm.createContext(c);vm.runInContext(source,c);return{c,get,classes,requests};
}
test('three title-credit taps open a password login, wrong format stays closed, server success enables the purple developer entry',async()=>{
 const h=harness();assert.equal(h.c.isDeveloperMode(),false);await h.c.developerCreditTap();await h.c.developerCreditTap();assert.equal(h.c.state,'title');await h.c.developerCreditTap();assert.equal(h.c.state,'developerPass');assert.equal(h.get('developerLogin').hidden,false);assert.equal(h.get('developerPin').focused,true);
 const submit=()=>h.get('developerLoginForm').events.submit({preventDefault(){}});h.get('developerPin').value='123';await submit();assert.equal(h.requests.length,0);assert.equal(h.c.isDeveloperMode(),false);h.get('developerPin').value='test-only-password-2026';await submit();assert.equal(h.requests.length,1);assert.equal(JSON.parse(h.requests[0].options.body).password,'test-only-password-2026');assert.equal(h.c.state,'title');assert.equal(h.c.isDeveloperMode(),true);assert.ok(h.classes.has('developer-mode'));assert.equal(h.get('titleDeveloper').hidden,false);
});
test('failed server authentication never enables developer controls',async()=>{
 const h=harness();h.c.fetch=async()=>({ok:false,status:401,json:async()=>({error:'incorrect_pin'})});for(let i=0;i<3;i++)await h.c.developerCreditTap();h.get('developerPin').value='wrong-password-2026';await h.get('developerLoginForm').events.submit({preventDefault(){}});assert.equal(h.c.isDeveloperMode(),false);assert.equal(h.c.state,'developerPass');assert.match(h.get('developerLoginStatus').textContent,/違います/);
});
test('three more title-credit taps revoke developer mode and clear all debug overrides',async()=>{
 const h=harness();h.c.setDeveloperMode(true);for(let i=0;i<3;i++)await h.c.developerCreditTap();assert.equal(h.c.isDeveloperMode(),false);assert.equal(h.get('titleDeveloper').hidden,true);for(const key of ['skillDebugAll','stageDebugAll','areaDebugEnabled','debugInvincible','patrolRoutesVisible'])assert.equal(h.c[key],false,key);assert.equal(h.c.debugMode,0);assert.equal(h.c.selectedStageId,null);assert.equal(h.requests[0].url,'/api/developer/logout');
});
test('developer page reset requires active mode and explicit confirmation; successful reset clears unsent local scoreboard entries',async()=>{
 const h=harness(),open=()=>h.get('titleDeveloper').events.click(),reset=()=>h.get('developerResetScores').events.click();open();assert.equal(h.c.state,'title');h.c.setDeveloperMode(true);open();assert.equal(h.c.state,'developer');h.c.confirm=()=>false;await reset();assert.equal(h.requests.length,0);h.c.confirm=()=>true;await reset();assert.equal(h.requests[0].url,'/api/developer/reset-scoreboard');assert.equal(Object.keys(h.c.leaderboardPending).length,0);assert.equal(h.c.saved,true);assert.match(h.get('developerStatus').textContent,/リセットしました/);
});
test('public mode blocks debug entry functions and keyboard routes, even if stale debug flags were left behind',()=>{
 const c={state:'play',debugMode:0,p:{x:0,y:0},cars:[],isDeveloperMode:()=>false};vm.createContext(c);
 for(const [start,end] of [['function toggleDebugInvincible(){','function triggerPlayerDeath(){'],['function spawnAreaDebugTankAhead(){','function freeSpot(']]){
  const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a);vm.runInContext(html.slice(a,b),c);
 }
 c.toggleDebugInvincible();c.spawnAreaDebugTankAhead();assert.equal(c.debugMode,0);assert.equal(c.cars.length,0);
 for(const key of ['P','O','L'])assert.ok(html.includes("if(code==='Key"+key+"'&&isDeveloperMode()&&state==='play'"));
 const css=fs.readFileSync(path.join(root,'css/developer.css'),'utf8');for(const id of ['skDebugAll','stageDebugAll','debugToggleBtn'])assert.ok(css.includes('body:not(.developer-mode) #'+id));assert.ok(!source.includes('5555'));
});
test('non-developers cannot reveal or select locked skills through stale all-skill flags',()=>{
 const c={SK:[{id:'throw'},{id:'sniper'}],skillChoices:['throw'],skillDebugAll:true,areaDebugEnabled:true,isDeveloperMode:()=>false,readSkillProgress:()=>({unlocked:['throw']})};vm.createContext(c);for(const name of ['skillMenuList','skillSelectable'])vm.runInContext(html.split('\n').find(line=>line.startsWith('function '+name+'(')),c);
 assert.deepEqual(Array.from(c.skillMenuList(),v=>v.id),['throw']);assert.equal(c.skillSelectable('sniper'),false);c.isDeveloperMode=()=>true;assert.equal(c.skillMenuList().length,2);assert.equal(c.skillSelectable('sniper'),true);
});

test('developer scoreboard entry opens only from the authenticated developer screen and is blocked while busy',()=>{
 const h=harness(),opened=[];h.c.openLeaderboard=mode=>opened.push(mode);const click=()=>h.get('developerLeaderboard').events.click();h.c.state='developer';click();assert.equal(opened.length,0);h.c.setDeveloperMode(true);h.c.state='title';click();assert.equal(opened.length,0);h.c.state='developer';click();assert.deepEqual(opened,[true]);vm.runInContext('developerBusy=true',h.c);click();assert.equal(opened.length,1);assert.match(html,/id="developerLeaderboard" type="button">開発者用スコアボード/);
});
