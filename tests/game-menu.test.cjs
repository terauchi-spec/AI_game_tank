const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function menu(){
 const nodes=new Map(),classes=new Set(),calls={clear:0,stop:0,finalize:0,home:0,partner:0};
 const get=id=>{if(!nodes.has(id))nodes.set(id,{events:{},addEventListener(k,f){this.events[k]=f;},focus(){this.focused=true;},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const c={state:'play',resetBtn:get('resetBtn'),document:{getElementById:get,body:{classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}}},clearInputs(){calls.clear++;},stopGameAudio(){calls.stop++;},finishPartnerOrder(confirm){assert.equal(confirm,false);calls.partner++;},backToTitle(){calls.home++;c.state='title';},finalizeScore(success){assert.equal(success,false);calls.finalize++;},sfx(){},syncMissionFailure(){calls.failure=true;}};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf("const gameMenu=document.getElementById('gameMenu');"),html.indexOf("document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInputs();});")),c);return{c,get,calls,classes};
}
test('menu freezes play, releases held controls and partner orders; return and Escape resume without ending the run',()=>{
 const h=menu();h.c.openGameMenu();assert.equal(h.c.state,'paused');assert.equal(h.get('gameMenu').open,true);assert.equal(h.calls.stop,1);assert.equal(h.calls.partner,1);assert.ok(h.classes.has('game-paused'));h.c.openGameMenu();assert.equal(h.calls.clear,1);
 h.get('gameMenuResume').events.click();assert.equal(h.c.state,'play');assert.equal(h.get('gameMenu').open,false);assert.equal(h.calls.clear,2);assert.equal(h.calls.finalize,0);h.c.openGameMenu();let canceled=false;h.get('gameMenu').events.cancel({preventDefault(){canceled=true;}});assert.ok(canceled);assert.equal(h.c.state,'play');
});
test('title abandons the run without scoring; operation end records one failed run and opens evaluation transition',()=>{
 let h=menu();h.c.openGameMenu();h.get('gameMenuTitle').events.click();assert.equal(h.c.state,'title');assert.equal(h.calls.home,1);assert.equal(h.calls.finalize,0);assert.equal(h.get('gameMenu').open,false);
 h=menu();h.c.openGameMenu();h.get('gameMenuEnd').events.click();h.get('gameMenuEnd').events.click();assert.equal(h.c.state,'failed');assert.equal(h.calls.finalize,1);assert.equal(h.calls.failure,true);assert.equal(h.get('gameMenu').open,false);
});
test('paused frames do not advance movement, enemy AI, mission timers or effects, or redraw the frozen canvas',()=>{
 let updates=0,draws=0;
 const c={state:'paused',last:0,prevState:'play',resultAnimT:0,performance:{now:()=>100},assetsLoading:()=>false,update(){updates++;},updateInfiltrationExtraction(){updates++;},updateFrontlineVictory(){updates++;},blastUpdate(){updates++;},dyingUpdate(){updates++;},document:{body:{classList:{contains:()=>false,toggle(){}}}},draw(){draws++;},shouldDrawGameFrame:()=>false,recordGameFrameTiming(){},firstMenuFrame:false,queueNextGameFrame(){},reportGameError:e=>{throw e;}};
 for(const name of ['syncMissionSuccess','syncMissionFailure','syncMissionBriefing','syncStageScreen','syncResultScreen','syncSkillScreen','syncAreaDebugPicker','syncTitleScreen','syncHelpScreen','syncSpecScreen'])c[name]=()=>{};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function loop(n){'),html.indexOf('let gameErrorCount=0;')),c);c.loop(10000);assert.equal(updates,0);assert.equal(draws,0);assert.equal(c.last,10000);
 assert.match(html,/function shouldDrawGameFrame\(now\)\{\s*if\(state==='paused'\)return false/);
});
test('every inline script still compiles',()=>{for(const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(script[1].trim())new vm.Script(script[1]);});
