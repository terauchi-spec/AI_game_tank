// Event-driven recovery: reuse decoded audio, never poll or rebuild a healthy context.
const gameAudioRecovery={pending:null,foreground:true,epoch:0,probe:null};
function gameAudioForeground(){return gameAudioRecovery.foreground&&(typeof document==='undefined'||document.visibilityState!=='hidden');}
function gameAudioResumed(context,epoch){
 if(context!==audioCtx||epoch!==gameAudioRecovery.epoch||context.state!=='running'||!gameSoundEnabled||!gameAudioForeground())return;
 if(typeof updateGameBgm==='function')updateGameBgm();
 if(typeof updateGameAudio==='function')updateGameAudio();
}
function recoverGameAudio(event,cycle=false){
 if(!gameSoundEnabled||!gameAudioForeground()||event?.isTrusted===false)return;
 try{
  if(!audioCtx||audioCtx.state==='closed'){
   if(audioCtx){
    if(typeof stopGameAudio==='function')stopGameAudio();
    if(typeof pauseGameBgm==='function')pauseGameBgm();
    gameAudioOutput=null;
    if(typeof gameSe!=='undefined')gameSe.master=null;
    if(typeof gameBgm!=='undefined')gameBgm.gain=null;
   }
   audioCtx=new (window.AudioContext||window.webkitAudioContext)();
   gameAudioRecovery.pending=null;
  }
  const context=audioCtx,prior=gameAudioRecovery.pending;
  if(context.state==='running'&&!cycle)return;
  // A pending automatic resume may require a fresh user activation on iOS.
  // Deduplicate frame/sound calls, but allow the next real gesture to retry.
  if(prior?.context===context&&(!event?.isTrusted||prior.event===event))return prior.promise;
  const record={context,event,epoch:gameAudioRecovery.epoch,promise:null};gameAudioRecovery.pending=record;
  if(cycle||context.state==='interrupted'){
   // Queue both calls synchronously so a user's activation is preserved.
   if(typeof stopGameAudio==='function')stopGameAudio();
   if(typeof pauseGameBgm==='function')pauseGameBgm();
   Promise.resolve(context.suspend()).catch(()=>{});
  }
  record.promise=Promise.resolve(context.resume()).then(()=>gameAudioResumed(context,record.epoch)).catch(()=>{}).finally(()=>{
   if(gameAudioRecovery.pending===record)gameAudioRecovery.pending=null;
  });
  return record.promise;
 }catch(_){gameAudioRecovery.pending=null;}
}
function hideGameAudio(){
 gameAudioRecovery.foreground=false;gameAudioRecovery.epoch++;gameAudioRecovery.pending=null;
 if(gameAudioRecovery.probe!==null)clearTimeout(gameAudioRecovery.probe);gameAudioRecovery.probe=null;
 if(typeof stopGameAudio==='function')stopGameAudio();
 if(typeof pauseGameBgm==='function')pauseGameBgm();
}
function restoreGameAudio(){
 if(typeof document!=='undefined'&&document.visibilityState==='hidden')return;
 gameAudioRecovery.foreground=true;
 if(typeof gameSe!=='undefined')gameSe.focused=true;
 if(typeof gameBgm!=='undefined')gameBgm.focused=true;
 // Returning to an unused/muted page must not create or unlock audio.
 if(!gameSoundEnabled||!audioCtx)return;
 recoverGameAudio();
 if(audioCtx.state==='running'&&!gameAudioRecovery.pending)gameAudioResumed(audioCtx,gameAudioRecovery.epoch);
 if(gameAudioRecovery.probe!==null)clearTimeout(gameAudioRecovery.probe);
 const context=audioCtx,time=context.currentTime,epoch=gameAudioRecovery.epoch;
 // Some WebKit versions report running while the audio clock is frozen.
 // Check once after foregrounding; no interval or gameplay-frame work.
 gameAudioRecovery.probe=setTimeout(()=>{
  gameAudioRecovery.probe=null;
  if(context!==audioCtx||epoch!==gameAudioRecovery.epoch||!gameAudioForeground()||!gameSoundEnabled)return;
  if(context.state==='running'&&context.currentTime===time)recoverGameAudio(undefined,true);
 },300);
}
if(typeof addEventListener==='function'){
 addEventListener('blur',hideGameAudio);
 addEventListener('pagehide',hideGameAudio);
 addEventListener('focus',restoreGameAudio);
 addEventListener('pageshow',restoreGameAudio);
 // Capture touch as well: the game's touch controls may stop propagation.
 addEventListener('touchstart',event=>recoverGameAudio(event),{capture:true,passive:true});
 addEventListener('pointerdown',event=>recoverGameAudio(event),{capture:true,passive:true});
 addEventListener('keydown',event=>recoverGameAudio(event),{capture:true});
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden')hideGameAudio();else restoreGameAudio();
});
