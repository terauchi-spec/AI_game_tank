// Stream the menu track through one media element rather than decoding a full song.
const GAME_BGM_URL='assets/audio/bgm/stahlmarsch_zum_sieg.mp3?v=696964203a01';
const gameBgm={audio:null,gain:null,unlocked:false,finished:false,pending:false,blocked:false,focused:true,resultActive:false,resultWaiting:false};
function gameBgmAllowed(){return typeof state!=='undefined'&&(state==='title'||state==='skill'||state==='stage'||(gameBgm.resultActive&&(state==='win'||state==='lose')));}
function gameBgmVisible(){return gameBgm.focused&&(typeof document==='undefined'||document.visibilityState!=='hidden');}
function gameBgmWanted(){return gameBgmAllowed()&&gameBgmVisible()&&!gameBgm.resultWaiting;}
function beginResultGameBgm(){
 // Called after the result SE is started, once per newly opened result screen.
 gameBgm.resultActive=true;gameBgm.resultWaiting=true;gameBgm.finished=false;
 if(gameBgm.audio){gameBgm.audio.pause();gameBgm.audio.currentTime=0;}
}
function resultGameSePlaying(){
 return typeof gameSe!=='undefined'&&[...gameSe.voices].some(v=>!v.loop&&(v.name==='results'||v.name==='win'||v.name==='lose'));
}
function createGameBgm(){
 if(gameBgm.audio||typeof Audio==='undefined')return gameBgm.audio;
 const audio=new Audio();audio.preload='none';audio.loop=false;audio.volume=.23;
 audio.addEventListener('ended',()=>{gameBgm.finished=true;});
 audio.addEventListener('error',()=>{gameBgm.blocked=true;});
 // Web Audio gain also controls volume on mobile browsers that ignore media.volume.
 try{
  const context=typeof audioCtx!=='undefined'?audioCtx:null;
  if(context&&typeof context.createMediaElementSource==='function'){
   const source=context.createMediaElementSource(audio),gain=context.createGain();
   gain.gain.value=.23;source.connect(gain);gain.connect(context.destination);
   gameBgm.source=source;gameBgm.gain=gain;audio.volume=1;
  }
 }catch(_){}
 audio.src=GAME_BGM_URL;gameBgm.audio=audio;return audio;
}
function updateGameBgm(){
 if(typeof state!=='undefined'&&state!=='win'&&state!=='lose')gameBgm.resultActive=false;
 if(gameBgm.resultWaiting&&!resultGameSePlaying())gameBgm.resultWaiting=false;
 const wanted=gameBgmWanted();
 if(!wanted){if(gameBgm.audio&&!gameBgm.audio.paused)gameBgm.audio.pause();return;}
 if(!gameBgm.unlocked||gameBgm.finished||gameBgm.pending||gameBgm.blocked)return;
 const audio=createGameBgm();if(!audio||!audio.paused)return;
 gameBgm.pending=true;
 try{
  Promise.resolve(audio.play()).then(()=>{
   gameBgm.pending=false;
   if(!gameBgmWanted())audio.pause();
  },()=>{gameBgm.pending=false;gameBgm.blocked=true;});
 }catch(_){gameBgm.pending=false;gameBgm.blocked=true;}
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
