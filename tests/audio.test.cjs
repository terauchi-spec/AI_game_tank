const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/audio.js'),'utf8');
function harness({defer=false,fail=false}={}){
 const events={},requests=[],waiting=[],sources=[];const param=()=>({value:0,setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const context={state:'running',currentTime:0,destination:{},createGain(){return{context,gain:param(),connect(){},disconnect(){}};},createDynamicsCompressor(){return{threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}};},createBufferSource(){const s={context,playbackRate:param(),connect(){},disconnect(){},start(){s.started=true;},stop(){s.stopped=true;s.onended?.();}};sources.push(s);return s;},async decodeAudioData(){return{length:44100,numberOfChannels:1,duration:1};}};
 const c={audioCtx:context,now:1000,state:'play',stageMode:'beginner',skill:'throw',p:{x:0,y:0,tank:null},weather:'clear',rainIntensity:1,indoorWorld:null,airstrike:null,mission:null,inBush:()=>false,burningAt:()=>false,performance:{now:()=>c.now},document:{visibilityState:'visible',addEventListener:(n,fn)=>events[n]=fn},addEventListener:(n,fn)=>events[n]=fn,
 fetch(url){requests.push(url);if(fail)return Promise.reject(Error('missing'));const response={ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};return defer?new Promise(r=>waiting.push(()=>r(response))):Promise.resolve(response);}};
 vm.createContext(c);vm.runInContext(source,c);c.get=s=>vm.runInContext(s,c);return{c,context,events,requests,waiting,sources};
}
const settle=()=>new Promise(r=>setImmediate(r));
test('enemy tank movement uses supplied audio, attenuates by distance, and stops when stationary, destroyed or distant',async()=>{
 const h=harness(),{c}=h,tank={alive:true,x:100,y:0};c.etanks=[tank];await c.loadGameSe('enemyTankMove');c.updateGameAudio();await settle();assert.equal(c.get('gameSe.loops.has("enemyTanks")'),false);
 c.now+=120;tank.x+=5;c.updateGameAudio();await settle();const voice=c.get('gameSe.loops.get("enemyTanks").voice');assert.ok(voice);assert.ok(h.requests.some(u=>u.includes('se_00_enemy_tank_movement_loop.mp3?v=')));const near=voice.gain.gain.value;
 c.p.x=-400;c.now+=120;tank.x+=5;c.updateGameAudio();assert.ok(voice.gain.gain.value<near);assert.equal(c.get('gameSe.loops.get("enemyTanks").voice'),voice);
 c.now+=120;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("enemyTanks")'),false);
 c.now+=120;tank.x+=5;c.updateGameAudio();await settle();tank.alive=false;c.now+=120;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("enemyTanks")'),false);
 tank.alive=true;c.p.x=-1500;c.now+=120;tank.x+=5;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("enemyTanks")'),false);
});
test('enemy tanks share one loop, use movement rather than turret rotation, and clear stale samples across menus and reset',async()=>{
 const h=harness(),{c}=h;c.etanks=Array.from({length:20},(_,i)=>({alive:true,x:100+i*10,y:0}));await c.loadGameSe('enemyTankMove');c.updateGameAudio();c.now+=120;for(const t of c.etanks)t.ang=1;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("enemyTanks")'),false);
 c.now+=120;for(const t of c.etanks)t.x+=5;c.updateGameAudio();await settle();assert.equal(c.get('[...gameSe.voices].filter(v=>v.name==="enemyTankMove").length'),1);
 c.state='results';c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("enemyTanks")'),false);c.state='play';c.now+=120;for(const t of c.etanks)t.x+=5;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("enemyTanks")'),false);
 c.now+=120;for(const t of c.etanks)t.x+=5;c.updateGameAudio();await settle();assert.equal(c.get('gameSe.loops.has("enemyTanks")'),true);c.stopGameAudio();c.now+=120;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("enemyTanks")'),false);
});
test('all 49 active manifest MP3s match the explicitly uploaded files, without requesting unprovided effects',()=>{
 const {c}=harness(),defs=c.get('GAME_SE_FILES'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/se-installed.json')));
 assert.equal(Object.keys(defs).length,49);assert.deepEqual(Object.values(defs).map(n=>'assets/audio/se/'+n+'.mp3').sort(),manifest.files.sort());for(const file of manifest.files)assert.ok(fs.statSync(path.join(__dirname,'..',file)).size>0);
 assert.equal(c.playGameSe('sniperLens'),false);assert.equal(c.playGameSe('pickup'),false);
});
test('MP3s decode once and cached effects play immediately; loading never replays a late shot',async()=>{
 const h=harness(),{c}=h;assert.equal(c.playGameSe('cannon'),false);await settle();assert.equal(h.sources.length,0);assert.equal(c.playGameSe('cannon'),true);assert.equal(h.sources.length,1);c.now+=200;assert.equal(c.playGameSe('cannon'),true);assert.equal(h.requests.length,1);
});
test('concurrent requests for one sound share a single download and decode',async()=>{
 const h=harness({defer:true}),{c}=h;const a=c.loadGameSe('mg'),b=c.loadGameSe('mg');assert.equal(a,b);assert.equal(h.requests.length,1);h.waiting.shift()();await a;assert.equal(c.get('gameSe.cache.size'),1);
});
test('decoder concurrency is bounded to two and corrupt/missing audio falls back without retry storms',async()=>{
 const h=harness({defer:true}),{c}=h;for(const n of ['mg','cannon','sniper','enemyGun'])c.loadGameSe(n);assert.equal(h.requests.length,2);h.waiting.shift()();await settle();assert.equal(h.requests.length,3);
 const bad=harness({fail:true});bad.c.playGameSe('cannon');await settle();assert.equal(bad.c.playGameSe('cannon'),false);assert.equal(bad.requests.length,1);
});
test('distant or other-floor events are culled; repeated alerts and shots are throttled',async()=>{
 const h=harness(),{c}=h;assert.equal(c.playGameSe('mg',{x:2000,y:0}),true);assert.equal(h.requests.length,0);
 c.stageMode='indoor';c.indoorWorld={currentFloor:0};c.playGameSe('mg',{x:0,y:0,indoorFloor:2});assert.equal(h.requests.length,0);
 await c.loadGameSe('detected');c.playGameSe('detected');c.now+=10;c.playGameSe('detected');assert.equal(h.sources.length,1);c.now+=1000;c.playGameSe('detected');assert.equal(h.sources.length,2);assert.equal(h.sources[0].stopped,true);
});
test('voice count stays bounded under gunfire and explosions',async()=>{
 const h=harness(),{c}=h;for(const name of ['mg','enemyGun','shellExplosion','propExplosion','airExplosion','cannon','sniper','dogBark','whistle','win','lose','results'])await c.loadGameSe(name);
 for(let i=0;i<80;i++){c.now+=200;for(const name of ['mg','enemyGun','shellExplosion','propExplosion','airExplosion','cannon','sniper','dogBark','whistle','win','lose','results'])c.playGameSe(name);assert.ok(c.get('gameSe.voices.size')<=16);}
 assert.ok(h.sources.some(s=>s.stopped));
});
test('stopped loops cannot restart after their async download completes',async()=>{
 const h=harness({defer:true}),{c}=h;c.setGameSeLoop('vehicle','tankMove',.1);c.setGameSeLoop('vehicle',null,0);h.waiting.shift()();await settle();assert.equal(h.sources.length,0);assert.equal(c.get('gameSe.loops.size'),0);
});
test('loops reuse their source, update gain and rate, and stop on visibility and focus changes',async()=>{
 const h=harness(),{c}=h;await c.loadGameSe('tankMove');c.setGameSeLoop('vehicle','tankMove',.1);await settle();c.setGameSeLoop('vehicle','tankMove',.2,1.2);assert.equal(h.sources.length,1);assert.equal(h.sources[0].playbackRate.value,1.2);
 c.document.visibilityState='hidden';h.events.visibilitychange();assert.equal(c.get('gameSe.loops.size'),0);assert.equal(h.sources[0].stopped,true);c.document.visibilityState='visible';h.events.blur();c.setGameSeLoop('vehicle','tankMove',.1);await settle();assert.equal(h.sources.length,1);h.events.focus();c.setGameSeLoop('vehicle','tankMove',.1);await settle();assert.equal(h.sources.length,2);
});
test('vehicle motion drives loops while stopping and menu transitions silence them',async()=>{
 const h=harness(),{c}=h;await c.loadGameSe('tankMove');c.p.tank={kind:'tank',t:{id:'t34'}};c.updateGameAudio();c.now+=120;c.p.x+=20;c.updateGameAudio();await settle();assert.equal(c.get('gameSe.loops.get("vehicle").name'),'tankMove');c.now+=120;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("vehicle")'),false);
 c.now+=120;c.p.x+=20;c.updateGameAudio();await settle();c.state='title';c.updateGameAudio();assert.equal(c.get('gameSe.loops.size'),0);
});
test('cache eviction obeys the decoded buffer budget and never downloads the whole library at title',async()=>{
 const h=harness(),{c}=h;c.state='title';c.preloadGameSe();await settle();assert.equal(h.requests.length,3);
 c.get('gameSe.maxBytes=44100*4');await c.loadGameSe('cannon');assert.ok(c.get('gameSe.bytes<=gameSe.maxBytes'));assert.equal(c.get('gameSe.cache.size'),1);
});
test('uploaded loops are attached to flame, rain, indoor alarms, aircraft and nearby fire',async()=>{
 const h=harness(),{c}=h;for(const n of ['flameLoop','rainLoop','indoorAlarm','aircraft','fireLoop'])await c.loadGameSe(n);
 c.p.flameActive=true;c.weather='rain';c.airstrike={x:0,y:0};c.burningAt=()=>true;c.updateGameAudio();await settle();for(const k of ['flame','rain','aircraft','fire'])assert.equal(c.get('gameSe.loops.has("'+k+'")'),true);
 c.now+=120;c.stageMode='indoor';c.indoorWorld={currentFloor:0,alarm:{active:true}};c.updateGameAudio();await settle();assert.equal(c.get('gameSe.loops.has("rain")'),false);assert.equal(c.get('gameSe.loops.has("alarm")'),true);
});
test('the legacy wrapper keeps unavailable effects and gameplay skill tones, while menu actions use uploaded UI audio',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),line=html.split('\n').find(l=>l.startsWith('function sfx(n,position=')),played=[],fallback=[];
 const c={state:'play',ensureAudio(){},playGameSe(n){played.push(n);return false;},legacySfx:n=>fallback.push(n)};vm.createContext(c);vm.runInContext(line,c);c.sfx('skill');assert.equal(played.pop(),'legacySkill');assert.equal(fallback.pop(),'skill');c.state='stage';c.sfx('skill');assert.equal(played.pop(),'uiSelect');c.sfx('bombExplosion');assert.equal(fallback.pop(),'explosion');c.playGameSe=()=>{throw Error('audio failure');};c.sfx('mg');assert.equal(fallback.pop(),'mg');
});

test('all ten skill activation aliases reuse se_skills with one download, decode and cache entry',async()=>{
 const h=harness(),{c}=h,names=['bombThrow','hide','decoyPlace','reinforcement','drillStart','build','flameStart','sniperDeploy','houndCommand','partnerCommand'];
 await Promise.all(names.map(n=>c.loadGameSe(n)));assert.equal(h.requests.length,1);assert.ok(h.requests[0].includes('/se_skills.mp3?v='));assert.equal(c.get('gameSe.cache.size'),1);
 for(const n of names){c.now+=100;assert.equal(c.playGameSe(n),true);assert.equal(c.get('Array.from(gameSe.voices)[0].name'),'skillActivate');}
 assert.equal(h.requests.length,1);assert.equal(c.get('gameSe.voices.size'),1);
 for(const n of ['decoy','flameLoop','dogBark','sniper'])assert.notEqual(c.gameSeName(n),'skillActivate');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.ok(html.includes("sfx('hide');say(digUsesWaterFx"));
});

test('each active MP3 request includes its verified content revision',async()=>{
 const h=harness(),{c}=h;await c.loadGameSe('cannon');const versions=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/se-revisions.json')));assert.equal(h.requests[0],'assets/audio/se/se_025_tank_cannon_fire.mp3?v='+versions.se_025_tank_cannon_fire);assert.equal(Object.keys(versions).length,49);
});
test('drill contact loops only during actual contact and stops on release, expiry or menus',async()=>{
 const h=harness(),{c}=h;await c.loadGameSe('drillContact');c.p.drill=5;c.p.drillContact=false;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("drillContact")'),false);
 c.now+=120;c.p.drillContact=true;c.updateGameAudio();await settle();assert.equal(c.get('gameSe.loops.get("drillContact").name'),'drillContact');c.now+=120;c.p.drillContact=false;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("drillContact")'),false);
 c.now+=120;c.p.drillContact=true;c.p.drill=0;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("drillContact")'),false);
 c.now+=120;c.p.drill=5;c.updateGameAudio();await settle();c.state='title';c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("drillContact")'),false);
});
test('actual drill collision logic reports contact for cover, objects, targets and tanks, and clears on cancellation',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),a=html.indexOf('function updateDrill(dt){'),body=html.slice(a,html.indexOf('// 入水時',a));
 for(const kind of ['cover','object','base','tank','none']){
  const target={alive:true,x:30,y:0,st:0,static:false},c={p:{drill:5,drillSfx:1,drillHit:0,drillTankHit:0},humans:[],etanks:kind==='tank'?[target]:[],base:kind==='base'?{hp:10}:null,TANK_HIT:28,DRILL_RECHARGE:6,shake:0,drillGeom:()=>({a:{x:0,y:0},b:{x:50,y:0},r:11}),coversInBox:()=>kind==='cover'?[target]:[],objectsInBox:()=>kind==='object'?[target]:[],segmentHitsCover:()=>true,segmentHitsObject:()=>true,segmentBaseImpact:()=>({x:30,y:0}),pointSegDist:()=>0,R:()=>.5,burst(){},sfx(){},setSkillCooldown(){},say(){}};
  vm.createContext(c);vm.runInContext(body,c);c.updateDrill(.1);assert.equal(c.p.drillContact,kind!=='none',kind);c.p.drill=0;c.updateDrill(.1);assert.equal(c.p.drillContact,false);c.p.drill=5;c.p.drillContact=true;c.p.tank={};c.updateDrill(.1);assert.equal(c.p.drillContact,false);
 }
});
