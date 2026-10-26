const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function sound(saved){
 const storage=new Map(saved?[['tankGameSoundEnabledV1',saved]]:[]),button={setAttribute(k,v){this[k]=v;}},gains=[];let stopped=0,paused=0,oscillators=0;
 const audio={state:'running',currentTime:1,destination:{},createGain(){const g={gain:{value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v;}},connect(to){this.to=to;}};gains.push(g);return g;},createOscillator(){oscillators++;throw Error('muted tone should not start');}};
 const c={localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},window:{AudioContext:function(){return audio;}},document:{getElementById:()=>button},stopGameAudio(){stopped++;},pauseGameBgm(){paused++;}};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('let audioCtx=null,'),html.indexOf('function legacySfx(')),c);
 return{c,button,gains,audio,storage,stopped:()=>stopped,paused:()=>paused,oscillators:()=>oscillators};
}
test('OFF immediately mutes the shared output, stops BGM and SE, persists, and ON restores the same output',()=>{
 const h=sound();h.c.ensureAudio();const output=h.c.gameAudioDestination(h.audio);assert.equal(output.gain.value,1);h.c.setGameSoundEnabled(false);assert.equal(output.gain.value,0);assert.equal(h.stopped(),1);assert.equal(h.paused(),1);assert.equal(h.button.textContent,'🔇 OFF');assert.equal(h.storage.get('tankGameSoundEnabledV1'),'off');h.c.tone();h.c.noise();assert.equal(h.oscillators(),0);h.c.setGameSoundEnabled(true);assert.equal(output.gain.value,1);assert.equal(h.c.gameAudioDestination(h.audio),output);assert.equal(h.gains.length,1);assert.equal(h.button['aria-pressed'],'true');
});
test('saved OFF starts silent without creating an AudioContext; BGM and uploaded effects remain silent',()=>{
 const h=sound('off');h.c.ensureAudio();assert.equal(vm.runInContext('audioCtx',h.c),null);h.c.syncSoundButton();assert.equal(h.button.textContent,'🔇 OFF');
 h.c.state='title';h.c.document.visibilityState='visible';h.c.document.addEventListener=()=>{};
 vm.runInContext(fs.readFileSync(path.join(root,'js/audio.js'),'utf8'),h.c);vm.runInContext(fs.readFileSync(path.join(root,'js/bgm.js'),'utf8'),h.c);
 assert.equal(h.c.gameBgmWanted(),false);assert.equal(h.c.gameSeVisible(),false);h.c.updateGameBgm();assert.equal(h.c.playGameSe('cannon'),true);assert.equal(vm.runInContext('gameSe.voices.size',h.c),0);
});
