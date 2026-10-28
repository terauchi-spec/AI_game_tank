// Uploaded MP3 effects. One shared AudioContext, bounded decoding/cache/voices, no audio elements per shot.
const GAME_SE_FILES=Object.freeze({
 bushEnter:'se_bush_enter',unlockCard:'se_unlock_card',fainting:'se_fainting',firework:'se_008_success_firework',dirtStep:'se_013_footstep_dirt',objectiveDestroyed:'se_039_objective_destroyed',sniperLens:'se_069_sniper_zoom',enemyTankMove:'se_00_enemy_tank_movement_loop',drillContact:'se_063_drill_contact',skillActivate:'se_skills',uiSelect:'se_001_ui_select',uiConfirm:'se_002_ui_confirm',unavailable:'se_005_ui_unavailable',win:'se_006_mission_success',lose:'se_007_mission_failure',results:'se_009_results_reveal',grassStep:'se_014_footstep_grass',splash:'se_017_water_splash',playerHit:'se_018_player_hit',deathHit:'se_019_player_down',mg:'se_023_machine_gun_fire',enemyGun:'se_024_enemy_rifle_fire',cannon:'se_025_tank_cannon_fire',cannon2:'se_025_tank_cannon_fire_2',cannon3:'se_025_tank_cannon_fire_3',cannon4:'se_025_tank_cannon_fire_4',cannon5:'se_025_tank_cannon_fire_5',cannon6:'se_025_tank_cannon_fire_6',cannon7:'se_025_tank_cannon_fire_7',enemyCannon:'se_026_enemy_cannon_fire',bazooka:'se_027_commander_bazooka_fire',sniper:'se_028_sniper_fire',soldierHit:'se_029_bullet_hit_soldier',vehicleHit:'se_030_bullet_hit_armor',empty:'se_032_weapon_empty',bombPlace:'se_033_bomb_place',bombExplosion:'se_035_bomb_explosion',shellExplosion:'se_036_shell_explosion',propExplosion:'se_037_prop_explosion',vehicleDestroyed:'se_038_vehicle_destroyed',coverBreak:'se_040_cover_break',enter:'se_041_vehicle_board_exit',tankMove:'se_042_tank_movement_loop',wheelMove:'se_043_wheeled_vehicle_loop',aircraft:'se_048_aircraft_flyby',airExplosion:'se_050_air_bomb_explosion',airWarning:'se_051_air_raid_warning',decoy:'se_058_decoy_signal',flameLoop:'se_066_flamethrower_loop',dogBark:'se_072_dog_bark',suspicion:'se_074_enemy_suspicious',detected:'se_075_enemy_detected',whistle:'se_077_commander_whistle',indoorTick:'se_079_indoor_alert_tick',indoorAlarm:'se_080_indoor_alarm_loop',door:'se_081_automatic_door',document:'se_084_document_collected',allDocuments:'se_085_all_documents_collected',capture:'se_089_capture_complete',rainLoop:'se_093_rain_loop',fireLoop:'se_096_fire_loop'
});
const GAME_SE_REVISIONS=Object.freeze({"se_001_ui_select":"ee000221d89e","se_002_ui_confirm":"10aa97fd022f","se_005_ui_unavailable":"9dbd035dc5a6","se_006_mission_success":"8db028079563","se_007_mission_failure":"cab0b6c58aab","se_009_results_reveal":"5ce51b40ae50","se_014_footstep_grass":"ef998fa26411","se_017_water_splash":"060d58e9183e","se_018_player_hit":"e7c032173a68","se_019_player_down":"04d3afb2fa7c","se_023_machine_gun_fire":"92aa01150c76","se_024_enemy_rifle_fire":"d915e3c4b23a","se_025_tank_cannon_fire":"e914434de026","se_026_enemy_cannon_fire":"2f4aa6354fc6","se_027_commander_bazooka_fire":"976be4ac41ff","se_028_sniper_fire":"0644e51c4b43","se_029_bullet_hit_soldier":"a2aa7a01dbca","se_030_bullet_hit_armor":"dd805e774206","se_032_weapon_empty":"722b26bbf394","se_033_bomb_place":"79f7e8978374","se_035_bomb_explosion":"5e9f8608e792","se_036_shell_explosion":"82bc60efc3dd","se_037_prop_explosion":"457ad5c0a87f","se_038_vehicle_destroyed":"a08301badd19","se_040_cover_break":"17ffe9c3ea22","se_041_vehicle_board_exit":"d3d3e4f26657","se_042_tank_movement_loop":"c66ba82d1935","se_043_wheeled_vehicle_loop":"4a9788d09067","se_048_aircraft_flyby":"667ec0d2671f","se_050_air_bomb_explosion":"6f114287d521","se_051_air_raid_warning":"fef9bf6c1c83","se_058_decoy_signal":"0424608dff9d","se_066_flamethrower_loop":"518a83cc77fa","se_072_dog_bark":"7dfc88177fe3","se_074_enemy_suspicious":"6140c900c867","se_075_enemy_detected":"d01086221d3e","se_077_commander_whistle":"6643a5db679d","se_079_indoor_alert_tick":"d83061a7d6d2","se_080_indoor_alarm_loop":"b89fa361fe88","se_081_automatic_door":"fb27077eeeea","se_084_document_collected":"4f40e8367e28","se_085_all_documents_collected":"61a5a83b5f28","se_089_capture_complete":"706c76fd7c57","se_093_rain_loop":"85ade4968d5d","se_096_fire_loop":"44821f0ff381","se_skills":"3ff9b5665ed7","se_063_drill_contact":"b02869a743a7","se_00_enemy_tank_movement_loop":"6123e8135d29","se_008_success_firework":"8c94379f84ff","se_013_footstep_dirt":"800537edae85","se_039_objective_destroyed":"b36ba89e7389","se_069_sniper_zoom":"77cff57ef27b","se_025_tank_cannon_fire_2":"b80fe420ab3e","se_025_tank_cannon_fire_3":"cf406bcd4ebe","se_025_tank_cannon_fire_4":"7599148d49e4","se_025_tank_cannon_fire_5":"de397f08c742","se_025_tank_cannon_fire_6":"6723413af6d0","se_025_tank_cannon_fire_7":"bf8e99b17b79","se_unlock_card":"77b9ffa8d2da","se_fainting":"8329c2734859","se_bush_enter":"fc96dad3addf"});
const GAME_SE_ALIASES=Object.freeze({bombThrow:'skillActivate',hide:'skillActivate',decoyPlace:'skillActivate',reinforcement:'skillActivate',drillStart:'skillActivate',build:'skillActivate',flameStart:'skillActivate',sniperDeploy:'skillActivate',houndCommand:'skillActivate',partnerCommand:'skillActivate',skill:'uiSelect',explosion:'shellExplosion',sniperHit:'soldierHit',drillBreak:'coverBreak',rain:'rainLoop'});
const gameSe={cache:new Map(),pending:new Map(),failed:new Set(),queue:[],decoding:0,bytes:0,maxBytes:32*1024*1024,voices:new Set(),loops:new Map(),last:new Map(),epoch:0,scanAt:0,previous:null,enemyPositions:new WeakMap(),grassAt:0,footstep:null,preloaded:false,loadedScene:null};
function gameSeContext(){return typeof audioCtx!=='undefined'?audioCtx:null;}
function gameSeReady(name){return gameSe.cache.has(gameSeName(name));}
function gameSeName(name){return GAME_SE_ALIASES[name]||name;}
function gameSeVisible(){return (typeof gameSoundEnabled==='undefined'||gameSoundEnabled)&&gameSe.focused!==false&&(typeof document==='undefined'||document.visibilityState!=='hidden');}
function gameSeMaster(context){
 if(gameSe.master&&gameSe.master.context===context)return gameSe.master;
 const gain=context.createGain(),limiter=context.createDynamicsCompressor();gain.gain.value=.65;
 limiter.threshold.value=-8;limiter.knee.value=8;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.12;
 gain.connect(limiter);limiter.connect(typeof gameAudioDestination==='function'?gameAudioDestination(context):context.destination);gameSe.master=gain;return gain;
}
function gameSeTrim(){
 if(gameSe.bytes<=gameSe.maxBytes)return;
 for(const [name,entry] of gameSe.cache){
  if([...gameSe.voices].some(v=>v.name===name))continue;
  gameSe.cache.delete(name);gameSe.bytes-=entry.bytes;
  if(gameSe.bytes<=gameSe.maxBytes)break;
 }
}
function loadGameSe(name,urgent=false){
 name=gameSeName(name);const cached=gameSe.cache.get(name);
 if(cached){gameSe.cache.delete(name);gameSe.cache.set(name,cached);return Promise.resolve(cached.buffer);}
 if(!GAME_SE_FILES[name]||gameSe.failed.has(name))return Promise.resolve(null);
 if(gameSe.pending.has(name)){
  if(urgent){const at=gameSe.queue.findIndex(q=>q.name===name);if(at>0)gameSe.queue.unshift(gameSe.queue.splice(at,1)[0]);}
  return gameSe.pending.get(name);
 }
 let resolve;const promise=new Promise(r=>resolve=r);gameSe.pending.set(name,promise);
 const job={name,resolve};urgent?gameSe.queue.unshift(job):gameSe.queue.push(job);pumpGameSeLoads();return promise;
}
function pumpGameSeLoads(){
 const context=gameSeContext();if(!context)return;
 while(gameSe.decoding<2&&gameSe.queue.length){
  const job=gameSe.queue.shift();gameSe.decoding++;
  (async()=>{
   try{
    const response=await fetch('assets/audio/se/'+GAME_SE_FILES[job.name]+'.mp3?v='+GAME_SE_REVISIONS[GAME_SE_FILES[job.name]]);if(!response.ok)throw Error('SE HTTP '+response.status);
    const buffer=await context.decodeAudioData(await response.arrayBuffer());
    const bytes=buffer.length*buffer.numberOfChannels*4;gameSe.cache.set(job.name,{buffer,bytes});gameSe.bytes+=bytes;gameSeTrim();job.resolve(buffer);
   }catch(_){gameSe.failed.add(job.name);job.resolve(null);}
   finally{gameSe.pending.delete(job.name);gameSe.decoding--;pumpGameSeLoads();}
  })();
 }
}
function gameSeDistance(position){
 if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.y)||typeof p==='undefined'||!p)return 1;
 if(typeof indoorWorld!=='undefined'&&typeof stageMode!=='undefined'&&stageMode==='indoor'&&position.indoorFloor&&position.indoorFloor!==indoorWorld?.currentFloor+1)return 0;
 const distance=Math.hypot(position.x-p.x,position.y-p.y);return distance>=1200?0:1/(1+(distance/330)**2);
}
function stopGameSeVoice(voice,fade=.025){
 if(!gameSe.voices.has(voice))return;gameSe.voices.delete(voice);
 try{const t=voice.source.context.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(0,t,.008);voice.source.stop(t+fade);}catch(_){}
}
// 足音だけを短くフェードして停止し、銃声・環境音などの再生は維持する。
function stopGameFootsteps(){
 const voice=gameSe.footstep;if(!voice)return;
 gameSe.footstep=null;stopGameSeVoice(voice);gameSe.grassAt=0;
 gameSe.last.delete('grassStep');gameSe.last.delete('dirtStep');
}
function startGameSeVoice(name,buffer,volume,loop=false,rate=1){
 const context=gameSeContext();if(!context||context.state!=='running'||!gameSeVisible()||volume<=0)return null;
 const footstep=name==='grassStep'||name==='dirtStep';
 if(footstep&&gameSe.footstep)stopGameSeVoice(gameSe.footstep);
 const critical=['win','lose','detected','airWarning','indoorTick','capture','results'].includes(name);
 const same=[...gameSe.voices].filter(v=>v.name===name&&!v.loop);
 const perSound=['mg','enemyGun','soldierHit','vehicleHit','shellExplosion','propExplosion','airExplosion'].includes(name)?2:1;
 if(!loop&&same.length>=perSound)stopGameSeVoice(same[0]);
 if(gameSe.voices.size>=16){const victim=[...gameSe.voices].find(v=>!v.loop&&!v.critical);if(victim)stopGameSeVoice(victim);else if(!critical)return null;else stopGameSeVoice(gameSe.voices.values().next().value);}
 const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=loop;source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain);gain.connect(gameSeMaster(context));
 const voice={name,source,gain,loop,critical};gameSe.voices.add(voice);if(footstep)gameSe.footstep=voice;
 source.onended=()=>{gameSe.voices.delete(voice);if(gameSe.footstep===voice)gameSe.footstep=null;try{source.disconnect();gain.disconnect();}catch(_){}gameSeTrim();};source.start();return voice;
}
function playGameSe(name,position=null){
 if(name==='rain')return !gameSe.failed.has('rainLoop');
 name=gameSeName(name);if(!GAME_SE_FILES[name]||gameSe.failed.has(name))return false;
 if(!gameSeVisible())return true;
 const context=gameSeContext();if(!context)return true;
 const volume=gameSeDistance(position);if(volume<.025)return true;
 const time=performance.now();const gap=({mg:55,enemyGun:90,soldierHit:65,vehicleHit:80,shellExplosion:100,propExplosion:100,airExplosion:100,suspicion:900,detected:1000,door:250,grassStep:340,dirtStep:340,empty:400,unavailable:450,indoorTick:200})[name]||65;
 if(time-(gameSe.last.get(name)??-Infinity)<gap)return true;gameSe.last.set(name,time);
 const volumes={bushEnter:.18,mg:.22,enemyGun:.14,cannon:.45,cannon2:.45,cannon3:.45,cannon4:.45,cannon5:.45,cannon6:.45,cannon7:.45,enemyCannon:.34,sniper:.38,bazooka:.35,grassStep:.105,dirtStep:.105,firework:.22,objectiveDestroyed:.4,sniperLens:.16,airExplosion:.23,shellExplosion:.28,propExplosion:.22,bombExplosion:.36,vehicleDestroyed:.32,win:.42,lose:.4,results:.3,door:.32,suspicion:.25,detected:.34};
 const cached=gameSe.cache.get(name);
 if(!cached){gameSe.last.delete(name);loadGameSe(name,true);return false;} // Use the existing synthesized effect until the MP3 is ready; never replay a late shot.
 gameSe.cache.delete(name);gameSe.cache.set(name,cached);
 startGameSeVoice(name,cached.buffer,volume*(volumes[name]??.25));
 return true;
}
function setGameSeLoop(key,name,volume,rate=1){
 const previous=gameSe.loops.get(key);
 if(!name||volume<.01||!gameSeVisible()){
  if(previous){gameSe.loops.delete(key);if(previous.voice)stopGameSeVoice(previous.voice);}return;
 }
 if(previous?.name===name){previous.volume=volume;previous.rate=rate;if(previous.voice){const t=previous.voice.source.context.currentTime;previous.voice.gain.gain.setTargetAtTime(volume,t,.06);previous.voice.source.playbackRate.setTargetAtTime(rate,t,.06);}return;}
 if(previous){gameSe.loops.delete(key);if(previous.voice)stopGameSeVoice(previous.voice);}
 const record={name,volume,rate,voice:null};gameSe.loops.set(key,record);
 loadGameSe(name).then(buffer=>{if(!buffer||gameSe.loops.get(key)!==record||!gameSeVisible())return;try{record.voice=startGameSeVoice(name,buffer,record.volume,true,record.rate);}catch(_){}if(!record.voice)gameSe.loops.delete(key);});
}
function stopGameAudio(){
 stopGameFootsteps();
 gameSe.epoch++;gameSe.loops.clear();for(const voice of [...gameSe.voices])stopGameSeVoice(voice);gameSe.previous=null;gameSe.enemyPositions=new WeakMap();gameSe.last.clear();gameSe.loadedScene=null;gameSe.vehicleCannon=null;
}
function preloadGameSe(){
 if(typeof gameSoundEnabled!=='undefined'&&!gameSoundEnabled)return;
 if(!gameSeContext())return;
 if(!gameSe.preloaded){gameSe.preloaded=true;for(const name of ['uiSelect','uiConfirm','unavailable'])loadGameSe(name);}
 if(typeof state!=='undefined'&&state==='preparing'&&gameSe.loadedScene!==stageMode){
  gameSe.loadedScene=stageMode;
  const list=['bushEnter','unlockCard','fainting','firework','dirtStep','grassStep','objectiveDestroyed','enemyTankMove','win','lose','results','playerHit','deathHit','mg','enemyGun','cannon','enemyCannon','bazooka','sniper','soldierHit','vehicleHit','empty','bombPlace','bombExplosion','shellExplosion','propExplosion','vehicleDestroyed','coverBreak','enter','suspicion','detected','whistle'];
  if(stageMode==='indoor')list.push('indoorTick','indoorAlarm','door','document','allDocuments');
  if(stageMode==='front')list.push('airWarning','capture','aircraft','airExplosion');
  if(stageMode==='decisive')list.push('capture');
  const skillSounds={throw:['bombThrow'],dig:['hide','splash'],decoy:['decoyPlace','decoy'],buddy:['reinforcement'],drill:['drillStart','drillContact'],build:['build'],flame:['flameStart','flameLoop'],sniper:['sniperDeploy','sniperLens'],hound:['houndCommand','dogBark'],partner:['partnerCommand']};
  list.push(...(skillSounds[typeof skill!=='undefined'?skill:'']||[]));for(const name of list)loadGameSe(name);
 }
 pumpGameSeLoads();
}
// One shared loop represents the loudest moving enemy tank, bounding mixing cost.
function updateEnemyTankAudio(now){
 let loudest=0;
 for(const tank of (typeof etanks!=='undefined'?etanks:[])||[]){
  if(!tank.alive)continue;
  const prior=gameSe.enemyPositions.get(tank);
  gameSe.enemyPositions.set(tank,{x:tank.x,y:tank.y,at:now});
  if(!prior)continue;
  const dt=(now-prior.at)/1000,moved=Math.hypot(tank.x-prior.x,tank.y-prior.y);
  if(dt<=0||dt>.3||moved<=.15||moved/dt>=1200)continue;
  loudest=Math.max(loudest,.13*gameSeDistance(tank));
 }
 setGameSeLoop('enemyTanks',loudest>0?'enemyTankMove':null,loudest);
}
function updateGameAudio(){
 if(!gameSeContext())return;
 preloadGameSe();
 const active=typeof state!=='undefined'&&state==='play'&&gameSeVisible();
 if(!active){stopGameFootsteps();for(const key of [...gameSe.loops.keys()])setGameSeLoop(key,null,0);gameSe.previous=null;gameSe.enemyPositions=new WeakMap();return;}
 if(typeof p==='undefined'||!p){stopGameFootsteps();setGameSeLoop('vehicle',null,0);return;}
 const now=performance.now(),prior=gameSe.previous,moved=prior?Math.hypot(p.x-prior.x,p.y-prior.y):0,dt=prior?Math.max(.001,(now-prior.at)/1000):1;
 // Reuse the last bush result while stationary and share the lookup with footsteps.
 const bush=stageMode!=='indoor'&&(prior&&moved===0?prior.bush:typeof inBush==='function'&&inBush(p));
 gameSe.previous={x:p.x,y:p.y,at:now,bush};
 const speed=moved/dt,moving=dt<.3&&moved>.15&&speed<1200;
 if(moving&&prior&&!prior.bush&&bush&&!(p.dig>0)&&!(p.digPrep>0)&&(!p.tank||p.tank.kind!=='fighter'))playGameSe('bushEnter');
 const walking=moving&&!p.tank&&!(p.dig>0)&&!(p.digPrep>0)&&stageMode!=='indoor'&&!(typeof inWaterAt==='function'&&inWaterAt(p.x,p.y,7));
 // 10Hzの環境音更新を待たず、静止を検出したフレームで再生中の足音も止める。
 if(!walking)stopGameFootsteps();
 else if(now-gameSe.grassAt>350){gameSe.grassAt=now;playGameSe(bush?'grassStep':'dirtStep');}
 const vehicle=p.tank,groundVehicle=vehicle&&vehicle.kind!=='fighter';
 const vehicleSound=groundVehicle&&moving?(vehicle.kind==='tank'&&vehicle.t?.id!=='armored'?'tankMove':'wheelMove'):null;
 // 足音と同様、静止・降車は検出したフレームで停止。発進・車両切替も待たずに反映する。
 // 走行中の音量・速度調整は従来の10Hzを維持し、毎フレームのAudioParam更新は増やさない。
 if(!vehicleSound||now>=gameSe.scanAt||gameSe.loops.get('vehicle')?.name!==vehicleSound)setGameSeLoop('vehicle',vehicleSound,.11,Math.min(1.3,Math.max(.8,speed/160)));
 if(now<gameSe.scanAt)return;gameSe.scanAt=now+100;
 updateEnemyTankAudio(now);
 // 乗車した車種の主砲音だけ先読みし、6本の追加SEを一括デコードしない。
 const cannon=groundVehicle&&vehicle.kind==='tank'&&vehicle.t?.id!=='armored'?(vehicle.t?.cannonSe||'cannon'):null;
 if(gameSe.vehicleCannon!==cannon){gameSe.vehicleCannon=cannon;if(cannon)loadGameSe(cannon,true);}
 setGameSeLoop('drillContact',p.drill>0&&p.drillContact?'drillContact':null,.15);
 setGameSeLoop('flame',p.flameActive?'flameLoop':null,.13);
 setGameSeLoop('rain',typeof weather!=='undefined'&&weather==='rain'&&stageMode!=='indoor'?'rainLoop':null,.30*(typeof rainIntensity==='number'?rainIntensity:1));
 setGameSeLoop('alarm',typeof indoorWorld!=='undefined'&&stageMode==='indoor'&&indoorWorld?.alarm?.active?'indoorAlarm':null,.09);
 const plane=typeof airstrike!=='undefined'&&airstrike?airstrike:typeof mission!=='undefined'&&mission?.enemyAirRaid?.phase==='flight'?mission.enemyAirRaid.plane:null;
 setGameSeLoop('aircraft',plane?'aircraft':null,.14*gameSeDistance(plane));
 const hot=typeof burningAt==='function'&&burningAt(p.x,p.y,160);setGameSeLoop('fire',hot?'fireLoop':null,.06);
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(!gameSeVisible())stopGameAudio();});
if(typeof addEventListener==='function'){addEventListener('blur',()=>{gameSe.focused=false;stopGameAudio();});addEventListener('focus',()=>{gameSe.focused=true;});}
