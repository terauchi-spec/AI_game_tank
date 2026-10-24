// Use the SE AudioContext directly: no media element or separate audio session.
const GAME_BGM_URL='assets/audio/bgm/stahlmarsch_zum_sieg.mp3?v=696964203a01';
const gameBgm={buffer:null,pending:null,source:null,gain:null,offset:0,startedAt:0,unlocked:false,finished:false,blocked:false,focused:true,resultActive:false,resultWaiting:false};
function gameBgmContext(){return typeof audioCtx!=='undefined'?audioCtx:null;}
function gameBgmAllowed(){return typeof state!=='undefined'&&(state==='title'||state==='skill'||state==='stage'||(gameBgm.resultActive&&(state==='win'||state==='lose')));}
function gameBgmVisible(){return gameBgm.focused&&(typeof document==='undefined'||document.visibilityState!=='hidden');}
function gameBgmWanted(){return gameBgmAllowed()&&gameBgmVisible()&&!gameBgm.resultWaiting;}
function pauseGameBgm(){
 const source=gameBgm.source;if(!source)return;
 gameBgm.offset=Math.min(gameBgm.buffer.duration,gameBgm.offset+Math.max(0,source.context.currentTime-gameBgm.startedAt));
 gameBgm.source=null;source.onended=null;
 try{source.stop();source.disconnect();}catch(_){}
}
function beginResultGameBgm(){
 // Called after the result SE is started, once per newly opened result screen.
 pauseGameBgm();gameBgm.offset=0;gameBgm.resultActive=true;gameBgm.resultWaiting=true;gameBgm.finished=false;
}
function resultGameSePlaying(){
 return typeof gameSe!=='undefined'&&[...gameSe.voices].some(v=>!v.loop&&(v.name==='results'||v.name==='win'||v.name==='lose'));
}
function loadGameBgm(context){
 if(gameBgm.pending)return gameBgm.pending;
 // One download/decode and one retained music buffer, separate from the SE LRU.
 gameBgm.pending=Promise.resolve().then(async()=>{
  try{
   const response=await fetch(GAME_BGM_URL);if(!response.ok)throw Error('BGM HTTP '+response.status);
   gameBgm.buffer=await context.decodeAudioData(await response.arrayBuffer());
  }catch(_){gameBgm.blocked=true;}
  finally{gameBgm.pending=null;}
  updateGameBgm();
 });
 return gameBgm.pending;
}
function updateGameBgm(){
 if(typeof state!=='undefined'&&state!=='win'&&state!=='lose')gameBgm.resultActive=false;
 if(gameBgm.resultWaiting&&!resultGameSePlaying())gameBgm.resultWaiting=false;
 if(!gameBgmWanted()){pauseGameBgm();return;}
 if(!gameBgm.unlocked||gameBgm.finished||gameBgm.pending||gameBgm.blocked||gameBgm.source)return;
 const context=gameBgmContext();if(!context||context.state!=='running')return;
 if(!gameBgm.buffer){loadGameBgm(context);return;}
 if(gameBgm.offset>=gameBgm.buffer.duration){gameBgm.finished=true;return;}
 try{
  if(!gameBgm.gain){const gain=context.createGain();gain.gain.value=.23;gain.connect(context.destination);gameBgm.gain=gain;}
  const source=context.createBufferSource();source.buffer=gameBgm.buffer;source.loop=false;source.connect(gameBgm.gain);
  source.onended=()=>{
   if(gameBgm.source!==source)return;
   gameBgm.source=null;gameBgm.offset=gameBgm.buffer.duration;gameBgm.finished=true;
   try{source.disconnect();}catch(_){}
  };
  gameBgm.startedAt=context.currentTime;gameBgm.source=source;source.start(0,gameBgm.offset);
 }catch(_){pauseGameBgm();gameBgm.blocked=true;}
}
function unlockGameBgm(event){
 if(event&&event.isTrusted===false)return;
 gameBgm.unlocked=true;gameBgm.blocked=false;
 if(typeof ensureAudio==='function')ensureAudio();
 updateGameBgm();
}
if(typeof addEventListener==='function'){
 addEventListener('pointerdown',unlockGameBgm,{capture:true,passive:true});
 addEventListener('keydown',unlockGameBgm,{capture:true});
 addEventListener('blur',()=>{gameBgm.focused=false;updateGameBgm();});
 addEventListener('focus',()=>{gameBgm.focused=true;updateGameBgm();});
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',updateGameBgm);
