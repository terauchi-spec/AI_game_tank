const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function harness({defer=false,fail=false,decodeFail=false}={}){
 const events={},sources=[],requests=[],waiting=[];let decodes=0;
 const context={state:'running',currentTime:0,destination:{},createGain(){return{gain:{value:0},connect(){}};},createBufferSource(){const s={context,connect(){},disconnect(){},start(...args){s.args=args;s.started=true;},stop(){s.stopped=true;s.onended?.();}};sources.push(s);return s;},async decodeAudioData(){decodes++;if(decodeFail)throw Error('decode');return{duration:60,numberOfChannels:2,length:2646000};}};
 const c={state:'title',audioCtx:context,gameSe:{voices:new Set()},ensureAudio(){},Audio:class{constructor(){throw Error('HTML Audio must not be used');}},document:{visibilityState:'visible',addEventListener:(n,f)=>events[n]=f},addEventListener:(n,f)=>events[n]=f,
 fetch(url){requests.push(url);if(fail)return Promise.reject(Error('network'));const response={ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};return defer?new Promise(resolve=>waiting.push(()=>resolve(response))):Promise.resolve(response);}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/bgm.js'),'utf8'),c);
 return{c,context,events,sources,requests,waiting,get:s=>vm.runInContext(s,c),decodes:()=>decodes};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('BGM uses the SE AudioContext, waits for interaction, and decodes once across menu transitions',async()=>{
 const h=harness(),{c}=h;c.updateGameBgm();c.unlockGameBgm({isTrusted:false});assert.equal(h.requests.length,0);h.events.pointerdown({isTrusted:true});await tick();assert.equal(h.requests.length,1);assert.equal(h.decodes(),1);const source=h.sources[0];assert.equal(source.context,h.context);assert.equal(source.loop,false);assert.deepEqual(source.args,[0,0]);assert.equal(h.get('gameBgm.gain.gain.value'),.115);
 h.context.currentTime=17;for(const state of ['skill','stage','skill','title']){c.state=state;c.updateGameBgm();}assert.equal(h.sources.length,1);assert.equal(source.stopped,undefined);assert.equal(h.requests.length,1);
});
test('BGM pauses outside eligible menus and resumes its exact position on return, visibility and focus changes',async()=>{
 const h=harness(),{c}=h;c.unlockGameBgm();await tick();h.context.currentTime=21;c.state='preparing';c.updateGameBgm();assert.equal(h.sources[0].stopped,true);assert.equal(h.get('gameBgm.offset'),21);assert.equal(h.get('gameBgm.finished'),false);
 for(const state of ['briefing','play','win','lose','help','spec']){c.state=state;c.updateGameBgm();}assert.equal(h.sources.length,1);
 h.context.currentTime=30;c.state='title';c.updateGameBgm();assert.deepEqual(h.sources.at(-1).args,[0,21]);
 h.context.currentTime=32;c.document.visibilityState='hidden';h.events.visibilitychange();assert.equal(h.get('gameBgm.source'),null);c.document.visibilityState='visible';h.events.visibilitychange();assert.deepEqual(h.sources.at(-1).args,[0,23]);
 h.context.currentTime=34;h.events.blur();assert.equal(h.get('gameBgm.source'),null);h.events.focus();assert.deepEqual(h.sources.at(-1).args,[0,25]);assert.equal(h.decodes(),1);
});
test('natural ending never repeats even after user gestures or returning to title',async()=>{
 const h=harness(),{c}=h;c.unlockGameBgm();await tick();h.sources[0].onended();for(const state of ['title','skill','stage','play','title']){c.state=state;c.updateGameBgm();c.unlockGameBgm();}assert.equal(h.sources.length,1);assert.equal(h.get('gameBgm.finished'),true);
});
test('success and failure results reset the theme and wait for outcome and result SE before playing once',async()=>{
 const h=harness(),{c}=h;c.unlockGameBgm();await tick();h.sources[0].onended();
 for(const state of ['win','lose']){
  c.state='play';c.updateGameBgm();c.state=state;const result={name:'results'},outcome={name:state};c.gameSe.voices.add(result);c.gameSe.voices.add(outcome);c.beginResultGameBgm();const count=h.sources.length;c.updateGameBgm();assert.equal(h.sources.length,count);assert.equal(h.get('gameBgm.offset'),0);
  c.gameSe.voices.delete(result);c.updateGameBgm();assert.equal(h.sources.length,count);c.gameSe.voices.delete(outcome);c.updateGameBgm();assert.equal(h.sources.length,count+1);assert.deepEqual(h.sources.at(-1).args,[0,0]);for(let i=0;i<10;i++)c.updateGameBgm();assert.equal(h.sources.length,count+1);h.sources.at(-1).onended();c.updateGameBgm();assert.equal(h.sources.length,count+1);
 }
 assert.equal(h.requests.length,1);assert.equal(h.decodes(),1);
});
test('a late download cannot start during gameplay or while result SE is playing; fetch/decode are deduplicated',async()=>{
 for(const state of ['play','win']){
  const h=harness({defer:true}),{c}=h;c.unlockGameBgm();for(let i=0;i<20;i++)c.updateGameBgm();await tick();assert.equal(h.requests.length,1);c.state=state;if(state==='win'){c.gameSe.voices.add({name:'results'});c.beginResultGameBgm();}c.updateGameBgm();h.waiting[0]();await tick();assert.equal(h.sources.length,0);
  if(state==='win'){c.gameSe.voices.clear();c.updateGameBgm();assert.equal(h.sources.length,1);}else{c.state='title';c.updateGameBgm();assert.equal(h.sources.length,1);}
 }
});
test('network or decode failure does not block gameplay or retry on every frame',async()=>{
 for(const options of [{fail:true},{decodeFail:true}]){
  const h=harness(options),{c}=h;c.unlockGameBgm();await tick();for(let i=0;i<20;i++)c.updateGameBgm();assert.equal(h.requests.length,1);assert.equal(h.sources.length,0);assert.equal(h.get('gameBgm.pending'),null);c.unlockGameBgm();await tick();assert.equal(h.requests.length,2);
 }
});
test('suspended context waits for resume and absent result SE does not hang BGM',async()=>{
 const h=harness(),{c}=h;h.context.state='suspended';c.unlockGameBgm();assert.equal(h.requests.length,0);h.context.state='running';c.updateGameBgm();await tick();assert.equal(h.sources.length,1);c.state='lose';c.beginResultGameBgm();c.gameSe.voices.add({name:'uiSelect'});c.updateGameBgm();assert.equal(h.sources.length,2);assert.deepEqual(h.sources.at(-1).args,[0,0]);
});
test('main frame and result opening retain their BGM hooks and asset',()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/<script src="js\/bgm.js\?v=/);assert.match(html,/try\{updateGameBgm\(\);\}/);assert.match(html,/if\(show&&!open\)\{sfx\('results'\);if\(typeof beginResultGameBgm==='function'\)beginResultGameBgm\(\);/);assert.ok(fs.statSync(path.join(root,'assets/audio/bgm/stahlmarsch_zum_sieg.mp3')).size>0);
});
