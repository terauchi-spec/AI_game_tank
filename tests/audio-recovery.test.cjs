const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/audio-recovery.js'),'utf8');
const settle=()=>new Promise(r=>setImmediate(r));
function harness({state='running',enabled=true,defer=false}={}){
 const events={},timers=new Map(),waiting=[];let id=0,created=0,stopped=0,paused=0,bgmUpdates=0,seUpdates=0;
 function context(state){return{state,currentTime:4,resumes:0,suspends:0,resume(){this.resumes++;if(defer)return new Promise(resolve=>waiting.push(()=>{this.state='running';resolve();}));this.state='running';return Promise.resolve();},suspend(){this.suspends++;this.state='suspended';return Promise.resolve();}};}
 const original=state===null?null:context(state),cache=new Map([['mg',{buffer:{}}]]),buffer={duration:50};
 const c={audioCtx:original,gameAudioOutput:{old:true},gameSoundEnabled:enabled,gameSe:{focused:false,master:{old:true},cache},gameBgm:{focused:false,gain:{old:true},buffer,offset:12},window:{AudioContext:function(){created++;return context('suspended');}},document:{visibilityState:'visible',addEventListener(n,f){(events[n]??=[]).push(f);}},addEventListener(n,f){(events[n]??=[]).push(f);},setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(n){timers.delete(n);},stopGameAudio(){stopped++;},pauseGameBgm(){paused++;},updateGameBgm(){bgmUpdates++;},updateGameAudio(){seUpdates++;}};
 vm.createContext(c);vm.runInContext(source,c);return{c,original,cache,buffer,timers,waiting,get:s=>vm.runInContext(s,c),emit(n,e){for(const f of events[n]||[])f(e);},probe(){for(const [n,f]of [...timers]){timers.delete(n);f();}},counts:()=>({created,stopped,paused,bgmUpdates,seUpdates})};
}
test('interrupted and suspended contexts resume and notify BGM and SE only after running',async()=>{
 for(const state of ['interrupted','suspended']){const h=harness({state}),{c,original}=h;await c.recoverGameAudio();assert.equal(original.state,'running');assert.equal(original.resumes,1);assert.equal(original.suspends,state==='interrupted'?1:0);assert.equal(h.counts().bgmUpdates,1);assert.equal(h.counts().seUpdates,1);assert.equal(h.counts().created,0);}
});
test('visibility, focus and BFCache pageshow recover while preserving ON and decoded buffers',async()=>{
 const h=harness(),{c,original}=h;for(const type of ['visibilitychange','focus','pageshow']){
  c.document.visibilityState='hidden';h.emit('pagehide');original.state='interrupted';assert.equal(h.timers.size,0);
  c.document.visibilityState='visible';h.emit(type);await settle();assert.equal(original.state,'running');assert.equal(c.gameSoundEnabled,true);assert.equal(c.gameSe.focused,true);assert.equal(c.gameBgm.focused,true);assert.equal(c.gameSe.cache,h.cache);assert.equal(c.gameBgm.buffer,h.buffer);assert.equal(c.gameBgm.offset,12);assert.equal(h.counts().created,0);
 }
});
test('OFF and unused pages never create or resume audio during restoration',async()=>{
 for(const state of [null,'interrupted']){const h=harness({state,enabled:false});h.emit('focus');h.emit('pageshow');h.emit('pointerdown',{isTrusted:true});await settle();assert.equal(h.counts().created,0);assert.equal(h.original?.resumes||0,0);assert.equal(h.timers.size,0);}
 const h=harness({state:null});h.emit('pageshow');assert.equal(h.counts().created,0);await h.c.recoverGameAudio({isTrusted:true});assert.equal(h.counts().created,1);
});
test('pending resume is bounded, but a fresh trusted touch can retry without reload',async()=>{
 const h=harness({state:'suspended',defer:true}),event={isTrusted:true};h.c.recoverGameAudio();for(let i=0;i<50;i++)h.c.recoverGameAudio();assert.equal(h.original.resumes,1);
 h.emit('touchstart',event);h.emit('pointerdown',event);assert.equal(h.original.resumes,2);h.waiting.at(-1)();await settle();assert.equal(h.counts().bgmUpdates,1);
 h.c.recoverGameAudio({isTrusted:false});assert.equal(h.original.resumes,2);
});
test('rejected automatic resumes leave the next gesture able to retry',async()=>{
 const h=harness({state:'suspended'});h.original.resume=()=>Promise.reject(Error('autoplay blocked'));await h.c.recoverGameAudio();assert.equal(h.get('gameAudioRecovery.pending'),null);
 h.original.resume=function(){this.state='running';this.resumes++;return Promise.resolve();};h.emit('keydown',{isTrusted:true});await settle();assert.equal(h.original.state,'running');assert.equal(h.counts().bgmUpdates,1);
});
test('one foreground clock check cycles frozen running audio without any interval',async()=>{
 const h=harness();h.emit('focus');h.emit('pageshow');assert.equal(h.timers.size,1);assert.equal(h.original.resumes,0);h.probe();await settle();assert.equal(h.original.suspends,1);assert.equal(h.original.resumes,1);assert.equal(h.timers.size,0);assert.equal(h.counts().created,0);
 const healthy=harness();healthy.emit('focus');healthy.original.currentTime+=.3;healthy.probe();await settle();assert.equal(healthy.original.resumes,0);assert.equal(healthy.original.suspends,0);
});
test('backgrounding and muting cancel late recovery playback and clock checks',async()=>{
 const h=harness({state:'suspended',defer:true});h.emit('focus');h.emit('blur');assert.equal(h.timers.size,0);h.waiting[0]();await settle();assert.equal(h.counts().bgmUpdates,0);assert.equal(h.counts().seUpdates,0);
 const muted=harness({state:'suspended',defer:true});muted.emit('focus');muted.c.gameSoundEnabled=false;muted.waiting[0]();await settle();muted.probe();assert.equal(muted.counts().bgmUpdates,0);assert.equal(muted.original.resumes,1);
});
test('closed contexts replace only their nodes, retaining BGM progress and SE buffers',async()=>{
 const h=harness({state:'closed'});await h.c.recoverGameAudio({isTrusted:true});assert.notEqual(h.c.audioCtx,h.original);assert.equal(h.counts().created,1);assert.equal(h.c.gameAudioOutput,null);assert.equal(h.c.gameSe.master,null);assert.equal(h.c.gameBgm.gain,null);assert.equal(h.c.gameSe.cache,h.cache);assert.equal(h.c.gameBgm.buffer,h.buffer);assert.equal(h.c.gameBgm.offset,12);
});
test('ensureAudio routes through recovery and recovery loads with a versioned script',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/js\/audio-recovery\.js\?v=\d{4}/);
 const entry=html.split('\n').find(s=>s.startsWith('function ensureAudio(')),calls=[];const c={recoverGameAudio:e=>calls.push(e)};vm.runInNewContext(entry,c);const e={isTrusted:true};c.ensureAudio(e);assert.equal(calls[0],e);
});
