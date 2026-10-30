const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 const nodes=new Map(),intervals=[],messages=[];
 const get=id=>{if(!nodes.has(id))nodes.set(id,{events:{},style:{},classList:{toggle(k,v){this[k]=v;}},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this.events[k]=fn;}});return nodes.get(id);};
 const c={state:'play',developer:true,isDeveloperMode:()=>c.developer,patrolRoutesVisible:false,scoreStats:{debugUsed:false},say:text=>messages.push(text),debugMode:0,toggleDebugInvincible(){c.debugMode++;},document:{getElementById:get},setInterval(fn,ms){assert.equal(ms,250);intervals.push(fn);}};vm.createContext(c);
 vm.runInContext(html.split('\n').find(line=>line.startsWith('function togglePatrolRoutes(')),c);
 const a=html.indexOf("const debugToggleBtn=document.getElementById('debugToggleBtn')");vm.runInContext(html.slice(a,html.indexOf('const CONTROL_TYPE_KEY=',a)),c);
 const event=()=>({prevented:0,stopped:0,preventDefault(){this.prevented++;},stopPropagation(){this.stopped++;}});
 return{c,get,intervals,messages,click(){const e=event();get('debugRoutesBtn').events.click(e);return e;},down(){const e=event();get('debugRoutesBtn').events.pointerdown(e);return e;}};
}
test('mobile L toggles the same patrol routes as the keyboard and retains debug scoring flags',()=>{
 const h=harness(),button=h.get('debugRoutesBtn');assert.equal(button['aria-pressed'],'false');h.click();assert.equal(h.c.patrolRoutesVisible,true);assert.equal(button['aria-pressed'],'true');assert.equal(button.classList.on,true);assert.equal(h.c.scoreStats.debugUsed,true);assert.match(h.messages[0],/ON/);h.click();assert.equal(h.c.patrolRoutesVisible,false);assert.equal(button['aria-pressed'],'false');assert.equal(h.c.scoreStats.debugUsed,true);
 h.c.code='KeyL';h.c.first=true;h.c.e={repeat:false};const line=html.split('\n').find(line=>line.includes("if(code==='KeyL'&&"));vm.runInContext(line,h.c);h.intervals[0]();assert.equal(h.c.patrolRoutesVisible,true);assert.equal(button['aria-pressed'],'true');h.c.e.repeat=true;vm.runInContext(line,h.c);assert.equal(h.c.patrolRoutesVisible,true);
});
test('public, paused and result states reject both touch and direct route toggles',()=>{
 for(const state of ['play','paused','win','title'])for(const developer of [false,true]){
  if(state==='play'&&developer)continue;const h=harness();h.c.state=state;h.c.developer=developer;h.click();h.c.togglePatrolRoutes();assert.equal(h.c.patrolRoutesVisible,false);assert.equal(h.messages.length,0);assert.equal(h.c.scoreStats.debugUsed,false);
 }
});
test('touch events are contained and L synchronization shares the existing P timer',()=>{
 const h=harness();const down=h.down();assert.equal(down.prevented,1);assert.equal(down.stopped,1);assert.equal(h.c.patrolRoutesVisible,false);const click=h.click();assert.equal(click.prevented,1);assert.equal(click.stopped,1);assert.equal(h.intervals.length,1);assert.equal(h.c.debugMode,0);h.c.state='paused';h.intervals[0]();assert.equal(h.get('debugRoutesBtn').disabled,true);h.c.state='play';h.intervals[0]();assert.equal(h.get('debugRoutesBtn').disabled,false);h.get('debugToggleBtn').events.click({preventDefault(){},stopPropagation(){}});assert.equal(h.c.debugMode,1);assert.equal(h.c.patrolRoutesVisible,true);
});
