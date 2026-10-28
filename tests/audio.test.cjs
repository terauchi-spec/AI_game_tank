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
test('all 60 active manifest MP3s match the explicitly uploaded files, without requesting unprovided effects',()=>{
 const {c}=harness(),defs=c.get('GAME_SE_FILES'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/se-installed.json')));
 assert.equal(Object.keys(defs).length,60);assert.deepEqual(Object.values(defs).map(n=>'assets/audio/se/'+n+'.mp3').sort(),manifest.files.sort());for(const file of manifest.files)assert.ok(fs.statSync(path.join(__dirname,'..',file)).size>0);
 assert.equal(c.gameSeName('sniperLens'),'sniperLens');assert.equal(c.playGameSe('pickup'),false);
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
 const c={state:'play',gameSoundEnabled:true,ensureAudio(){},playGameSe(n){played.push(n);return false;},legacySfx:n=>fallback.push(n)};vm.createContext(c);vm.runInContext(line,c);c.sfx('skill');assert.equal(played.pop(),'legacySkill');assert.equal(fallback.pop(),'skill');c.state='stage';c.sfx('skill');assert.equal(played.pop(),'uiSelect');c.sfx('bombExplosion');assert.equal(fallback.pop(),'explosion');c.playGameSe=()=>{throw Error('audio failure');};c.sfx('mg');assert.equal(fallback.pop(),'mg');
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
 const h=harness(),{c}=h;await c.loadGameSe('cannon');const versions=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/se-revisions.json')));assert.equal(h.requests[0],'assets/audio/se/se_025_tank_cannon_fire.mp3?v='+versions.se_025_tank_cannon_fire);assert.equal(Object.keys(versions).length,60);
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

function incomingBulletHarness({kind='r',vehicle='tank',id='t34',hit=true}={}){
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a))),sounds=[];
 const c={p:{x:0,y:0,hp:3,tank:vehicle?{kind:vehicle,t:{id,armor:2},ch:0,hp:8}:null},scoreStats:{damageHits:0},bullets:[{x:-40,y:hit?0:100,vx:1000,vy:0,life:1,from:'e',k:kind}],humans:[],etanks:[],allies:[],partner:null,hound:null,decoy:null,TANK_HIT:28,FIGHTER_TYPE:{hp:8},stageMode:'base',shake:0,sfx:n=>sounds.push(n),burst(){},cannonImpact(){},segmentBaseImpact:()=>null,objectsInBox:()=>[],coversInBox:()=>[],wreck(){c.wrecked=true;},triggerPlayerDeath(){c.died=true;},D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)};
 vm.createContext(c);vm.runInContext(section('function recordPlayerDamage(','function trackObjectiveMovement('),c);vm.runInContext(section('function enemyPlayerBulletImpact(','function pointSegDist('),c);
 vm.runInContext('function incoming(dt){'+section(' for(let i=bullets.length-1;i>=0;i--){const b=bullets[i],ox=b.x',' for(const w of waves){w.r+=260*dt')+'}',c);c.incoming(.05);return{c,sounds};
}
test('infantry bullets ping every player tank with the existing armor-hit SE, without damage or score penalties',()=>{
 for(const id of ['t34','tiger','type10','m1','sherman','churchill','kingtiger']){
  const h=incomingBulletHarness({id});assert.deepEqual(h.sounds,['vehicleHit']);assert.equal(h.c.p.tank.ch,0);assert.equal(h.c.scoreStats.damageHits,0);assert.equal(h.c.p.hp,3);assert.equal(h.c.bullets.length,0);assert.equal(h.c.wrecked,undefined);
 }
});
test('tank machine guns keep the same armor-hit SE; misses and on-foot hits retain their existing behavior',()=>{
 const mg=incomingBulletHarness({kind:'v'});assert.deepEqual(mg.sounds,['vehicleHit']);assert.equal(mg.c.p.tank.ch,.066);assert.equal(mg.c.scoreStats.damageHits,1);
 const miss=incomingBulletHarness({hit:false});assert.deepEqual(miss.sounds,[]);assert.equal(miss.c.bullets.length,1);
 const foot=incomingBulletHarness({vehicle:null});assert.deepEqual(foot.sounds,['playerHit']);assert.equal(foot.c.p.hp,2);
 const armored=incomingBulletHarness({id:'armored'});assert.deepEqual(armored.sounds,['vehicleHit']);assert.ok(armored.c.p.tank.ch>0);
});

 test('footsteps select dirt or grass and stay silent when stopped, aboard, hiding, indoors or in water',async()=>{
 const h=harness(),{c}=h;await c.loadGameSe('dirtStep');await c.loadGameSe('grassStep');
 c.updateGameAudio();c.now+=120;c.p.x+=10;c.updateGameAudio();assert.equal(c.get('[...gameSe.voices].at(-1).name'),'dirtStep');
 c.get('gameSe.grassAt=0');c.inBush=()=>true;c.now+=120;c.p.x+=10;c.updateGameAudio();assert.equal(c.get('[...gameSe.voices].at(-1).name'),'grassStep');
 for(const mode of ['stop','tank','hide','prep','indoor','water']){
 c.p.tank=mode==='tank'?{kind:'tank'}:null;c.p.dig=mode==='hide'?1:0;c.p.digPrep=mode==='prep'?1:0;c.stageMode=mode==='indoor'?'indoor':'base';c.inWaterAt=()=>mode==='water';
 c.get('gameSe.grassAt=0');const count=h.sources.length;c.now+=120;if(mode!=='stop')c.p.x+=10;c.updateGameAudio();assert.equal(h.sources.slice(count).filter(x=>!x.loop).length,0,mode);
 }
 });
 test('new one-shot effects download once and respect the shared voice cap',async()=>{
 const h=harness(),{c}=h;for(const n of ['firework','objectiveDestroyed','sniperLens']){await c.loadGameSe(n);c.playGameSe(n);c.now+=100;c.playGameSe(n);}
 assert.equal(h.requests.length,3);assert.equal(c.get('gameSe.voices.size'),3);
 });
test('objective destruction plays once at the lethal hit and fireworks follow animation starts only on success',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),sounds=[],b={hp:2,maxHp:30},c={ensureBaseState:()=>b,scoreStats:null,riverHash:()=>0,carveBaseFragments:()=>0,burst(){},shake:0,performance:{now:()=>100},state:'play',winSeq(){},sfx:n=>sounds.push(n)};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function damageBase('),html.indexOf('function baseFragmentAliveAt(')),c);
 c.damageBase(1,0,0);assert.deepEqual(sounds,[]);c.damageBase(1,0,0);c.damageBase(1,0,0);assert.deepEqual(sounds,['objectiveDestroyed']);
 let listener;c.document={getElementById:()=>({addEventListener:(name,fn)=>listener=fn})};
 const a=html.indexOf("document.getElementById('missionSuccess').addEventListener('animationstart'");vm.runInContext(html.slice(a,html.indexOf("document.getElementById('missionSuccessEvaluate').addEventListener",a)),c);
 c.state='succeeded';listener({animationName:'missionBriefingPop'});listener({animationName:'missionFireworkBurst'});c.state='win';listener({animationName:'missionFireworkBurst'});assert.deepEqual(sounds,['objectiveDestroyed','firework']);
});

test('counterattack warning has no audio download or playback',async()=>{
 const h=harness();assert.equal(h.c.playGameSe('counterattack'),false);await h.c.loadGameSe('counterattack');assert.equal(h.requests.length,0);assert.equal(h.sources.length,0);
});

test('all seven player and partner tank cannons pass distinct uploaded sound keys without changing their shots',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),types={};vm.createContext(types);vm.runInContext(html.slice(html.indexOf('const PLAYER_TANK_FUEL_SCALE='),html.indexOf('const ARMORED_TYPE='))+';this.tanks=TYPES;',types);
 const defs=harness().c.get('GAME_SE_FILES'),keys=new Set(),partnerSource=fs.readFileSync(path.join(__dirname,'../js/partner.js'),'utf8');
 const shot=html.split('\n').find(line=>line.includes("if(!isPartnerDrivenVehicle()&&t.id!=='armored'&&dAttack"));
 for(const [i,t] of types.tanks.entries()){
  const number={t34:7,tiger:2,type10:1,m1:4,sherman:5,churchill:6,kingtiger:3}[t.id],key=number===1?'cannon':'cannon'+number;assert.equal(t.cannonSe,key);keys.add(key);assert.equal(defs[key],'se_025_tank_cannon_fire'+(number===1?'':'_'+number));
  const calls=[],c={t,p:{x:0,y:0,ang:0,cc:0,tank:{c:2}},dAttack:true,areaDebugInfiniteAmmo:false,isPartnerDrivenVehicle:()=>false,fire:(...args)=>calls.push(args),burst(){}};
  vm.createContext(c);vm.runInContext(shot,c);assert.equal(calls[0][8],key);assert.equal(c.p.tank.c,1);assert.equal(c.p.cc,t.ccd);
  c.humans=[];c.etanks=[{x:100,y:0,alive:true}];c.D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);c.los=()=>true;
  vm.runInContext(partnerSource.slice(partnerSource.indexOf('function partnerVehicleAttack('),partnerSource.indexOf('// S short press:')),c);
  c.partnerVehicleAttack({x:0,y:0,face:0,vehicle:{kind:'tank',t,c:2,v:0}},.1);assert.equal(calls[1][8],key);assert.equal(calls[1][3],'ally');
 }
 assert.equal(keys.size,7);
});
test('each cannon variant keeps the cannon gain and synthesized fallback until ready',async()=>{
 const h=harness(),{c}=h;for(let i=2;i<=7;i++){const name='cannon'+i;await c.loadGameSe(name);assert.equal(c.playGameSe(name),true);assert.equal(c.get('[...gameSe.voices].at(-1).gain.gain.value'),.45);}
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),fallback=[],ctx={gameSoundEnabled:true,ensureAudio(){},playGameSe:()=>false,legacySfx:n=>fallback.push(n)};
 vm.createContext(ctx);vm.runInContext(html.split('\n').find(l=>l.startsWith('function sfx(n,position=')),ctx);for(let i=2;i<=7;i++)ctx.sfx('cannon'+i);assert.deepEqual(fallback,Array(6).fill('cannon'));
});
test('boarding preloads only the selected cannon variant and does not preload all six additions',async()=>{
 const h=harness(),{c}=h;c.p.tank={kind:'tank',t:{id:'kingtiger',cannonSe:'cannon3'}};c.updateGameAudio();await settle();const cannonRequests=()=>h.requests.filter(url=>url.includes('se_025_tank_cannon_fire'));assert.equal(cannonRequests().length,1);assert.match(cannonRequests()[0],/se_025_tank_cannon_fire_3\.mp3/);
 c.now+=120;c.updateGameAudio();await settle();assert.equal(cannonRequests().length,1);c.p.tank=null;c.now+=120;c.updateGameAudio();c.p.tank={kind:'tank',t:{id:'type10',cannonSe:'cannon'}};c.now+=120;c.updateGameAudio();await settle();assert.equal(cannonRequests().length,2);assert.match(cannonRequests()[1],/se_025_tank_cannon_fire\.mp3/);
});
test('truck and armored car movement use the updated wheel clip and stop when stationary',async()=>{
 for(const [kind,id] of [['truck','truck'],['tank','armored']]){
  const h=harness(),{c}=h;c.p.tank={kind,t:{id}};await c.loadGameSe('wheelMove');c.updateGameAudio();c.now+=120;c.p.x+=15;c.updateGameAudio();await settle();assert.equal(c.get('gameSe.loops.get("vehicle").name'),'wheelMove');c.now+=120;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("vehicle")'),false);
 }
});
test('all seven cannon clips and the refreshed wheels carry their actual Git blob content revisions',()=>{
 const crypto=require('node:crypto'),{c}=harness(),defs=c.get('GAME_SE_FILES'),revisions=c.get('GAME_SE_REVISIONS');
 for(const name of Object.values(defs).filter(name=>name.startsWith('se_025_')||name==='se_043_wheeled_vehicle_loop')){const data=fs.readFileSync(path.join(__dirname,'../assets/audio/se',name+'.mp3')),sha=crypto.createHash('sha1').update(Buffer.from('blob '+data.length+'\0')).update(data).digest('hex');assert.equal(revisions[name],sha.slice(0,12),name);}
});

test('dirt and grass footsteps stop on the first stationary frame, preserve gunshots and resume immediately',async()=>{
 for(const grass of [false,true]){
  const h=harness(),{c}=h;await c.loadGameSe(grass?'grassStep':'dirtStep');await c.loadGameSe('cannon');c.inBush=()=>grass;c.updateGameAudio();c.now+=120;c.p.x+=10;c.updateGameAudio();const foot=c.get('gameSe.footstep');assert.ok(foot);assert.equal(foot.name,grass?'grassStep':'dirtStep');c.playGameSe('cannon');const gun=c.get('[...gameSe.voices].find(v=>v.name==="cannon")');
  c.now+=16;c.updateGameAudio();assert.equal(foot.source.stopped,true);assert.equal(c.get('gameSe.footstep'),null);assert.equal(gun.source.stopped,undefined);
  c.now+=16;c.p.x+=5;c.updateGameAudio();assert.ok(c.get('gameSe.footstep'));assert.notEqual(c.get('gameSe.footstep'),foot);
 }
});
test('footstep transitions keep one voice and delayed old completion cannot clear the new step',async()=>{
 const h=harness(),{c}=h;await c.loadGameSe('dirtStep');await c.loadGameSe('grassStep');c.updateGameAudio();c.now+=120;c.p.x+=10;c.updateGameAudio();const old=c.get('gameSe.footstep');c.inBush=()=>true;for(let i=0;i<3;i++){c.now+=120;c.p.x+=10;c.updateGameAudio();}const current=c.get('gameSe.footstep');assert.equal(current.name,'grassStep');assert.equal(old.source.stopped,true);assert.equal(c.get('[...gameSe.voices].filter(v=>v.name==="dirtStep"||v.name==="grassStep").length'),1);old.source.onended();assert.equal(c.get('gameSe.footstep'),current);
});
test('boarding, hiding, water, indoors and leaving play stop already-playing footsteps',async()=>{
 for(const mode of ['tank','dig','prep','water','indoor','pause','result','missingPlayer']){
  const h=harness(),{c}=h;await c.loadGameSe('dirtStep');c.updateGameAudio();c.now+=120;c.p.x+=10;c.updateGameAudio();const foot=c.get('gameSe.footstep');assert.ok(foot);c.now+=16;c.p.x+=5;
  if(mode==='tank')c.p.tank={kind:'truck',t:{id:'truck'}};if(mode==='dig')c.p.dig=1;if(mode==='prep')c.p.digPrep=1;if(mode==='water')c.inWaterAt=()=>true;if(mode==='indoor')c.stageMode='indoor';if(mode==='pause')c.state='paused';if(mode==='result')c.state='win';if(mode==='missingPlayer')c.p=null;
  c.updateGameAudio();assert.equal(foot.source.stopped,true,mode);assert.equal(c.get('gameSe.footstep'),null,mode);
 }
});
test('a footstep completing its download after stopping never starts late',async()=>{
 const h=harness({defer:true}),{c}=h,loaded=c.loadGameSe('dirtStep');c.updateGameAudio();c.now+=120;c.p.x+=10;c.updateGameAudio();c.now+=16;c.updateGameAudio();h.waiting.shift()();await loaded;await settle();assert.equal(h.sources.length,0);assert.equal(c.get('gameSe.footstep'),null);
});

test('tank, armored and truck loops stop and restart before the next environment scan',async()=>{
 for(const [kind,id,name] of [['tank','t34','tankMove'],['tank','armored','wheelMove'],['truck','truck','wheelMove']]){
  const h=harness(),{c}=h;await c.loadGameSe(name);c.p.tank={kind,t:{id}};c.updateGameAudio();c.now+=16;c.p.x+=5;c.updateGameAudio();await settle();const first=c.get('gameSe.loops.get("vehicle").voice');assert.ok(first,id);
  c.now+=16;c.updateGameAudio();assert.equal(first.source.stopped,true,id);assert.equal(c.get('gameSe.loops.has("vehicle")'),false,id);
  c.now+=16;c.p.x+=5;c.updateGameAudio();await settle();assert.ok(c.get('gameSe.loops.get("vehicle").voice'),id);assert.notEqual(c.get('gameSe.loops.get("vehicle").voice'),first,id);
 }
});
test('dismount, loss of player and switching to aircraft stop an already playing vehicle loop immediately',async()=>{
 for(const mode of ['dismount','missing','aircraft']){
  const h=harness(),{c}=h;await c.loadGameSe('tankMove');c.p.tank={kind:'tank',t:{id:'t34'}};c.updateGameAudio();c.now+=16;c.p.x+=5;c.updateGameAudio();await settle();const voice=c.get('gameSe.loops.get("vehicle").voice');assert.ok(voice);c.now+=16;c.p.x+=5;
  if(mode==='missing')c.p=null;else c.p.tank=mode==='aircraft'?{kind:'fighter',t:{id:'fighter'}}:null;c.updateGameAudio();assert.equal(voice.source.stopped,true);assert.equal(c.get('gameSe.loops.has("vehicle")'),false);
 }
});
test('stopping before a vehicle loop download finishes prevents a late restart',async()=>{
 const h=harness({defer:true}),{c}=h,loaded=c.loadGameSe('tankMove');c.p.tank={kind:'tank',t:{id:'t34'}};c.updateGameAudio();c.now+=16;c.p.x+=5;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("vehicle")'),true);c.now+=16;c.updateGameAudio();assert.equal(c.get('gameSe.loops.has("vehicle")'),false);h.waiting.shift()();await loaded;await settle();assert.equal(h.sources.length,0);assert.equal(c.get('gameSe.loops.has("vehicle")'),false);
});
test('continuous driving retains the existing 10Hz gain and speed update bound',async()=>{
 const h=harness(),{c}=h;await c.loadGameSe('tankMove');c.p.tank={kind:'tank',t:{id:'t34'}};c.updateGameAudio();c.now+=16;c.p.x+=5;c.updateGameAudio();await settle();const voice=c.get('gameSe.loops.get("vehicle").voice');let gains=0,rates=0;voice.gain.gain.setTargetAtTime=()=>gains++;voice.source.playbackRate.setTargetAtTime=()=>rates++;
 for(let i=0;i<4;i++){c.now+=16;c.p.x+=5;c.updateGameAudio();}assert.equal(gains,0);assert.equal(rates,0);c.now+=32;c.p.x+=5;c.updateGameAudio();assert.equal(gains,1);assert.equal(rates,1);
});

test('unlock and fainting SE use the supplied revisions and cached decoded buffers',async()=>{
 const crypto=require('node:crypto'),h=harness(),{c}=h;
 for(const [name,file] of [['unlockCard','se_unlock_card'],['fainting','se_fainting']]){
  const data=fs.readFileSync(path.join(__dirname,'../assets/audio/se',file+'.mp3')),hash=crypto.createHash('sha1').update(Buffer.from('blob '+data.length+'\0')).update(data).digest('hex').slice(0,12);
  await c.loadGameSe(name);assert.ok(h.requests.includes('assets/audio/se/'+file+'.mp3?v='+hash));
  for(let i=0;i<3;i++){c.now+=600;c.playGameSe(name);}
  assert.equal(h.requests.filter(url=>url.includes(file+'.mp3')).length,1);assert.ok(h.sources.some(s=>s.started));
 }
 c.gameSoundEnabled=false;const count=h.sources.length;c.now+=600;c.playGameSe('unlockCard');c.playGameSe('fainting');assert.equal(h.sources.length,count);
});

test('player fainting sound fires only after a successful new stun and preserves score attribution',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),line=html.split('\n').find(l=>l.startsWith('function stunHuman(')),sounds=[];
 const c={scoreStats:{stuns:0,tacticalStuns:0,stealthStuns:0},sfx:(name,position)=>sounds.push({name,position}),say(){},recordSupportResult(){}};vm.createContext(c);vm.runInContext(line,c);
 const enemy={alive:true,x:10,y:20,st:0};assert.equal(c.stunHuman(enemy),true);assert.equal(sounds[0].name,'fainting');assert.equal(sounds[0].position,enemy);assert.equal(c.scoreStats.stuns,1);assert.equal(c.scoreStats.tacticalStuns,1);assert.equal(c.scoreStats.stealthStuns,1);
 assert.equal(c.stunHuman(enemy),false);assert.equal(c.stunHuman({alive:false}),false);assert.equal(c.stunHuman(null),false);assert.equal(sounds.length,1);
 c.stunHuman({alive:true},'ally');assert.equal(sounds[1].name,'skill');assert.equal(c.scoreStats.tacticalStuns,1);
});
