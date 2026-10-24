const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function harness({defer=false,reject=false}={}){
 const events={},media=[];let resolvePlay,rejectPlay;
 class Audio{
  constructor(){this.paused=true;this.currentTime=0;this.events={};this.plays=0;media.push(this);}
  addEventListener(n,f){this.events[n]=f;}
  play(){this.plays++;this.paused=false;if(reject){this.paused=true;return Promise.reject(Error('blocked'));}if(defer)return new Promise((resolve,reject)=>{resolvePlay=resolve;rejectPlay=reject;});return Promise.resolve();}
  pause(){this.paused=true;}
 }
 const context={destination:{},createMediaElementSource(){return{connect(){}};},createGain(){return{gain:{value:0},connect(){}};}};
 const c={state:'title',Audio,audioCtx:context,ensureAudio(){},document:{visibilityState:'visible',addEventListener:(n,f)=>events[n]=f},addEventListener:(n,f)=>events[n]=f};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/bgm.js'),'utf8'),c);
 return{c,events,media,get:s=>vm.runInContext(s,c),resolve:()=>resolvePlay(),reject:()=>rejectPlay(Error('blocked'))};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('BGM waits for interaction, streams one element, and continues across title, skill and stage without restart',async()=>{
 const h=harness(),{c}=h;c.updateGameBgm();assert.equal(h.media.length,0);c.unlockGameBgm({isTrusted:false});assert.equal(h.media.length,0);
 h.events.pointerdown({isTrusted:true});await tick();const a=h.media[0];assert.equal(a.loop,false);assert.equal(a.preload,'none');assert.ok(a.src.includes('stahlmarsch_zum_sieg.mp3?v='));assert.equal(h.get('gameBgm.gain.gain.value'),.23);
 a.currentTime=17;for(const s of ['skill','stage','skill','title']){c.state=s;c.updateGameBgm();}assert.equal(a.plays,1);assert.equal(a.currentTime,17);assert.equal(h.media.length,1);
});
test('BGM pauses outside eligible menus and on hidden/blurred pages, resumes position and never repeats after ending',async()=>{
 const h=harness(),{c}=h;c.unlockGameBgm();await tick();const a=h.media[0];a.currentTime=21;
 for(const s of ['preparing','briefing','play','win','awards','help','spec']){c.state=s;c.updateGameBgm();assert.equal(a.paused,true);}
 c.state='title';c.updateGameBgm();await tick();assert.equal(a.currentTime,21);assert.equal(a.paused,false);
 c.document.visibilityState='hidden';h.events.visibilitychange();assert.equal(a.paused,true);c.document.visibilityState='visible';h.events.visibilitychange();await tick();assert.equal(a.paused,false);
 h.events.blur();assert.equal(a.paused,true);h.events.focus();await tick();assert.equal(a.paused,false);
 a.paused=true;a.events.ended();const plays=a.plays;for(const s of ['title','skill','stage','play','title']){c.state=s;c.updateGameBgm();c.unlockGameBgm();}assert.equal(a.plays,plays);
});
test('pending playback cannot continue after deployment and blocked playback does not retry every frame',async()=>{
 const h=harness({defer:true});h.c.unlockGameBgm();for(let i=0;i<20;i++)h.c.updateGameBgm();assert.equal(h.media[0].plays,1);h.c.state='preparing';h.c.updateGameBgm();h.resolve();await tick();assert.equal(h.media[0].paused,true);
 const bad=harness({reject:true});bad.c.unlockGameBgm();await tick();for(let i=0;i<20;i++)bad.c.updateGameBgm();assert.equal(bad.media[0].plays,1);bad.c.unlockGameBgm();await tick();assert.equal(bad.media[0].plays,2);
});
test('BGM asset and main frame integration exist',()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/<script src="js\/bgm.js\?v=/);assert.match(html,/try\{updateGameBgm\(\);\}/);assert.ok(fs.statSync(path.join(root,'assets/audio/bgm/stahlmarsch_zum_sieg.mp3')).size>0);
});
test('success and failure results restart the theme only after all result SE voices finish, then play once',async()=>{
 const h=harness(),{c}=h;c.gameSe={voices:new Set()};c.unlockGameBgm();await tick();const a=h.media[0];a.currentTime=60;a.paused=true;a.events.ended();
 for(const state of ['win','lose']){
  c.state='play';c.updateGameBgm();c.state=state;const result={name:'results',loop:false},outcome={name:state,loop:false};c.gameSe.voices.add(result);c.gameSe.voices.add(outcome);c.beginResultGameBgm();const plays=a.plays;
  c.updateGameBgm();assert.equal(a.currentTime,0);assert.equal(a.paused,true);assert.equal(a.plays,plays);
  c.gameSe.voices.delete(result);c.updateGameBgm();assert.equal(a.plays,plays);
  c.gameSe.voices.delete(outcome);c.updateGameBgm();await tick();assert.equal(a.plays,plays+1);assert.equal(a.loop,false);
  a.currentTime=12;for(let i=0;i<10;i++)c.updateGameBgm();assert.equal(a.currentTime,12);assert.equal(a.plays,plays+1);
  a.paused=true;a.events.ended();c.updateGameBgm();c.unlockGameBgm();assert.equal(a.plays,plays+1);
 }
 assert.equal(h.media.length,1);
});
test('leaving results cancels a late start, unrelated effects do not postpone music, and missing SE cannot hang the wait',async()=>{
 const h=harness(),{c}=h;c.gameSe={voices:new Set([{name:'results',loop:false}])};c.unlockGameBgm();await tick();c.state='win';c.beginResultGameBgm();c.updateGameBgm();const a=h.media[0],plays=a.plays;c.state='play';c.updateGameBgm();c.gameSe.voices.clear();c.updateGameBgm();await tick();assert.equal(a.plays,plays);assert.equal(a.paused,true);
 c.gameSe.voices.add({name:'uiSelect',loop:false});c.state='lose';c.beginResultGameBgm();c.updateGameBgm();await tick();assert.equal(a.plays,plays+1);
 const absent=harness();absent.c.state='win';absent.c.beginResultGameBgm();absent.c.unlockGameBgm();await tick();assert.equal(absent.media[0].plays,1);
});
test('pending menu playback stays paused while result SE is running',async()=>{
 const h=harness({defer:true}),{c}=h;c.unlockGameBgm();c.state='win';c.gameSe={voices:new Set([{name:'results',loop:false}])};c.beginResultGameBgm();c.updateGameBgm();h.resolve();await tick();assert.equal(h.media[0].paused,true);assert.equal(h.media[0].plays,1);
});
