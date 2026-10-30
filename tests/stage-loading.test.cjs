const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=html.slice(html.indexOf('const STAGE_PREPARATION_MIN_MS='),html.indexOf('function chooseSkillByNumber('));
function harness(buildTime=0){
 const frames=[],timers=[],c={isDeveloperMode:()=>true,now:0,state:'stage',stageMode:'beginner',areaDebugEnabled:false,hound:null,builds:0,painted:false,
 skillMenuList:()=>[{id:'throw'}],skillSelectable:()=>true,stageAvailableForSelection:()=>true,currentStageId:()=> 'beginner',sfx(){},
 performance:{now:()=>c.now},requestAnimationFrame:fn=>frames.push(fn),setTimeout(fn,delay){timers.push({fn,at:c.now+delay});},
 syncStageScreen(){c.painted=c.state==='preparing';},reset(){assert.equal(c.painted,true);c.builds++;c.now+=buildTime;c.state='play';}};
 vm.createContext(c);vm.runInContext(source,c);c.get=s=>vm.runInContext(s,c);c.frame=()=>{c.now+=16;frames.shift()();};
 c.advance=ms=>{c.now+=ms;for(let i=0;i<timers.length;){if(timers[i].at<=c.now)timers.splice(i,1)[0].fn();else i++;}};c.timers=timers;return c;
}
test('fast generation holds preparation for at least two seconds after the first visible frame',()=>{
 const c=harness(100);assert.equal(c.selectSkillIndex(0,true),true);c.frame();assert.equal(c.builds,0);c.frame();assert.equal(c.builds,1);assert.equal(c.state,'preparing');assert.equal(c.get('gameBuildQueued'),true);
 assert.equal(c.selectSkillIndex(0,true),false);c.advance(1899);assert.equal(c.state,'preparing');c.advance(1);assert.equal(c.state,'briefing');assert.equal(c.get('gameBuildQueued'),false);assert.equal(c.timers.length,0);
});
test('generation longer than two seconds proceeds immediately when finished',()=>{
 const c=harness(2500);c.selectSkillIndex(0,true);c.frame();c.frame();assert.equal(c.state,'briefing');assert.equal(c.timers.length,0);assert.equal(c.builds,1);
});
test('early timer callbacks cannot shorten the minimum display time',()=>{
 const c=harness();c.selectSkillIndex(0,true);c.frame();c.frame();const early=c.timers.shift();c.now+=1999;early.fn();assert.equal(c.state,'preparing');assert.equal(c.timers.length,1);c.advance(1);assert.equal(c.state,'briefing');
});
test('returning to title cancels pending generation and delayed transitions',()=>{
 for(const afterBuild of [false,true]){const c=harness();c.selectSkillIndex(0,true);c.frame();if(afterBuild)c.frame();c.get("gameBuildGeneration++;gameBuildQueued=false;state='title'");if(!afterBuild)c.frame();c.advance(3000);assert.equal(c.state,'title');assert.equal(c.get('gameBuildQueued'),false);assert.equal(c.builds,Number(afterBuild));}
});
test('a stale timer does not change the state or queue of a newer deployment',()=>{
 const c=harness();c.selectSkillIndex(0,true);c.frame();c.frame();c.get("gameBuildGeneration++;gameBuildQueued=false;state='stage'");c.advance(1000);c.selectSkillIndex(0,true);c.frame();c.frame();c.advance(1000);assert.equal(c.state,'preparing');assert.equal(c.get('gameBuildQueued'),true);c.advance(1000);assert.equal(c.state,'briefing');assert.equal(c.builds,2);
});
test('all normal stage types retain briefing transitions, while debug starts play after the minimum',()=>{
 for(const stage of ['beginner','base','front','indoor','decisive','training','debug']){const c=harness();c.stageMode=stage;c.areaDebugEnabled=stage==='debug';c.selectSkillIndex(0,true);c.frame();c.frame();assert.equal(c.state,'preparing');c.advance(2000);assert.equal(c.state,stage==='debug'?'play':'briefing');}
});
test('choosing a skill alone and invalid deployment requests do not generate or wait',()=>{
 const c=harness();assert.equal(c.selectSkillIndex(0),true);assert.equal(c.state,'stage');assert.equal(c.get('gameBuildQueued'),false);assert.equal(c.selectSkillIndex(1,true),false);assert.equal(c.timers.length,0);assert.equal(c.builds,0);
});
