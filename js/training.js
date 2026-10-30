// Stage 00: isolated tutorial state, bounded props and two non-firing guards.
let training=null;
// Load only when training is entered; reuse the decoded WebP and pattern across runs.
const trainingArtwork={target:null},trainingWallPatterns=new WeakMap();
let trainingWallTile=null;
function trainingArtworkImage(){
 if(!trainingArtwork.target){
  const image=new Image();image.decoding='async';image.src='assets/ui/training/target.webp';
  trainingArtwork.target=image;
 }
 return trainingArtwork.target;
}
function trainingConcretePattern(){
 const image=COVER_IMG.concrete_block;if(!assetOK(image))return null;
 let pattern=trainingWallPatterns.get(g);if(pattern)return pattern;
 if(!trainingWallTile){
  // One vertical block, cached once; repeat only the visible wall strip.
  const tile=document.createElement('canvas');tile.width=60;tile.height=112;
  const q=gameCanvasContext(tile);q.translate(30,56);q.rotate(Math.PI/2);
  q.drawImage(image,-56,-30,112,60);trainingWallTile=tile;
 }
 pattern=g.createPattern(trainingWallTile,'repeat');if(pattern)trainingWallPatterns.set(g,pattern);
 return pattern;
}
const TRAINING_DONE_KEY='tankGameTrainingCompleteV1';
const TRAINING_LEFT=220,TRAINING_RIGHT=740;
const TRAINING_LESSONS={
 1:{name:'訓練を始めよう',y:12500,gate:11820,lines:['こっそり訓練施設にようこそ！','ここでは戦場の基本を、{こっそりネーム}さんに学んでもらうわ','左スティックで移動するのよ。まずは前へ進んでみましょうか']},
 2:{name:'設置爆弾',y:12100,gate:11820,lines:['木箱に近づいて、爆弾を設置したら（Bボタン）、少し離れて起爆させてみましょうか（再度Bボタン）','実戦では、自分の爆弾でもダメージを受けるから、しっかり離れてね']},
 3:{name:'草むらに隠れる',y:11080,gate:10740,lines:['次は、敵にみつからないように草むらに入ってみましょうか','草むらの中は、敵から見つかりにくくなるわ','青い兵士の視界に入らないように、こっそり移動するのがポイントよ','見つからずに草むらの中で3秒待てたらクリアよ']},
 4:{name:'背後から気絶',y:11080,gate:10740,lines:['じゃあ、後ろから近づいて2人の敵を気絶させてみましょうか（敵近くでA）','前から見つかったり、爆弾で倒してしまったら、この練習をやり直すわね']},
 5:{name:'戦車に乗って撃つ',y:10200,gate:9830,lines:['最後はこの戦場でもっとも重要な戦車の訓練よ','戦車に乗り込んで（戦車近くでA）、大砲を1発、マシンガンを3発以上撃ってみましょうか（B・Sボタン）']},
 6:{name:'砲塔を回して射撃',y:0,gate:0,lines:['戦車の砲塔は回転させることができるのよ','4つのマトを破壊してね（BまたはSを長押ししながら操作）','この練習中は戦車が動かないわ。砲塔を上下左右に向けて狙いましょうか']}
};
const TRAINING_FINALE=['おめでとう！これで訓練は以上よ','おっと！スキル（Sボタン）についての説明がまだだったわね！','スキルには種類があって、効果は様々よ！実戦で色々と試してみてね','一人前のこっそり兵士になれるよう、がんばってね！'];
function trainingCompleted(){try{return localStorage.getItem(TRAINING_DONE_KEY)==='1';}catch(_){return false;}}
function trainingClearInput(){
 if(typeof window.trainingClearInputs==='function')window.trainingClearInputs();
 else{for(const k in keys)keys[k]=false;bombReq=false;cannonReq=false;interact=false;skillReq=false;mdown=false;}
}
function trainingStartTyping(){
 const t=training,text=t.lines[t.line];t.typed=matchMedia('(prefers-reduced-motion: reduce)').matches?text.length:1;t.typeElapsed=0;t.hudKey='';t.speechCuePending=true;
}
function updateTrainingTyping(dt){
 const t=training,text=t.lines[t.line];if(t.speechCuePending){t.speechCuePending=false;sfx('uiSelect');}if(t.typed>=text.length)return;
 t.typeElapsed+=dt;const count=Math.floor((t.typeElapsed+1e-8)/.04);if(!count)return;
 t.typeElapsed-=count*.04;t.typed=Math.min(text.length,t.typed+count);t.hudKey='';
}
function trainingTalk(lines,after='active'){
 training.phase='talk';training.lines=lines.map(line=>line.replace('{こっそりネーム}',readIntroName()||'こっそり兵士'));training.line=0;training.afterTalk=after;trainingStartTyping();trainingClearInput();
}
function trainingAdvanceDialogue(){
 if(stageMode!=='training'||state!=='play'||training?.phase!=='talk')return;
 trainingClearInput();
 if(training.typed<training.lines[training.line].length){training.typed=training.lines[training.line].length;training.hudKey='';return;}
 if(++training.line<training.lines.length){trainingStartTyping();return;}
 if(training.afterTalk==='finish'){finishTraining();return;}
 if(training.step===1){trainingEnterLesson(2);training.arrived=true;trainingTalk(TRAINING_LESSONS[2].lines);return;}
 training.phase=training.afterTalk;training.hudKey='';
}
function trainingGuard(x,y,face){return{x,y,face,alive:true,elite:false,commander:null,trainingGuard:true,trainingAStun:false,st:0,sus:0,cd:999,path:[{x,y}],wi:0,dir:1,stun:0,walking:false};}
function trainingClearTransient(){
 trainingClearInput();bombs=[];bullets=[];waves=[];fx=[];parts=[];decoy=null;allies=[];partner=null;hound=null;builtWalls=[];burningNatureSet.clear();clearFallenEnemies();p.grappleT=0;p.grappleTarget=null;p.blastAirT=0;p.fireExposure=0;
}
function setupTrainingWorld(){
 trainingArtworkImage();
 skill='throw';
 const z=ZONE_STYLE['村'];ZONES=[{n:'村',y0:13200,y1:-400,g:z.g,p:z.p.slice()}];
 covers=[{kd:-1,trainingWall:true,x:0,y:0,w:TRAINING_LEFT,h:WH},{kd:-1,trainingWall:true,x:TRAINING_RIGHT,y:0,w:WW-TRAINING_RIGHT,h:WH},{kd:7,trainingShelter:true,x:WW/2-70,y:TRAINING_LESSONS[3].y+202,w:140,h:36}];objects=[];bushes=[];humans=[];etanks=[];cars=[];roadBands=[];water=[];bridges=[];mud=[];items=[];tankWrecks=[];radio=null;airstrike=null;airbombs=[];enemyDogs=[];
 base={x:-5000,y:-5000,w:10,h:10,hp:30,maxHp:30,deadAt:0};mission=null;
 Object.assign(p,{x:WW/2,y:12620,hp:3,tank:null,body:-Math.PI/2,ang:-Math.PI/2});
 // No skill use during basic controls; the user's selected skill remains unchanged for subsequent stages.
 training={step:1,phase:'talk',resets:0,hold:0,patrol:Math.PI/2,shots:{c:false,v:0},targets:[],hudKey:'',hudAt:0,gate:TRAINING_LESSONS[1].gate,checkpoint:{x:WW/2,y:12620},crateBomb:false,vehicle:null};
 trainingClearTransient();rebuildSpatialGrid();trainingTalk(TRAINING_LESSONS[1].lines);syncTrainingHud();
}
function trainingBushCluster(){
 const y=TRAINING_LESSONS[3].y;
 // Seven overlapping, ordinary-sized bushes form a natural patch without scaling one sprite up.
 return [[0,0,88,68],[-65,0,82,64],[65,0,86,66],[-33,-55,84,64],[33,-55,80,66],[-33,55,86,68],[33,55,82,64]].map(([dx,dy,w,h])=>({x:WW/2+dx-w/2,y:y+dy-h/2,w,h}));
}
function trainingEnterLesson(step){
 const continuing=step===4&&training.step===3;
 const enteringVehicle=step===5&&training.step===4;
 const previousCamera=enteringVehicle?trainingCamera():null;
 const previousBushes=bushes,previousGuards=humans;
 if(continuing)training.stunStart={player:{x:p.x,y:p.y,body:p.body,ang:p.ang},bushes:bushes.map(b=>({...b})),guards:humans.map(h=>({...h})),patrol:training.patrol};
 trainingClearTransient();training.step=step;training.phase='approach';training.hold=0;training.hudKey='';training.arrived=false;
 const lesson=TRAINING_LESSONS[step];training.gate=lesson.gate;
 objects=[];humans=[];bushes=step>=5?previousBushes:[];cars=[];
 if(step===2){const w=CRATE_W,h=CRATE_H;training.crate={kind:'crate',trainingCrate:true,x:WW/2-w/2,y:lesson.y-h/2,w,h};objects=[training.crate];training.crateBomb=false;}
 if(step===3){
  training.bushes=trainingBushCluster();bushes=training.bushes;training.bush=bushes[0];training.patrol=0;training.stunStart=null;
  humans=[trainingGuard(WW/2+175,lesson.y,Math.PI/2),trainingGuard(WW/2-175,lesson.y,Math.PI*1.5)];
  training.checkpoint={x:WW/2,y:lesson.y+350};
 }
 if(step===4){
  if(training.stunStart){
   const start=training.stunStart;
   bushes=continuing?previousBushes:start.bushes.map(b=>({...b}));humans=continuing?previousGuards:start.guards.map(h=>({...h}));
   training.bushes=bushes;training.bush=bushes[0];training.patrol=start.patrol;training.checkpoint={...start.player};
   if(!continuing)Object.assign(p,start.player);
  }else{humans=[trainingGuard(WW/2-70,lesson.y,-Math.PI/2),trainingGuard(WW/2+70,lesson.y,-Math.PI/2)];training.checkpoint={x:WW/2,y:lesson.y+220};}
  training.arrived=true;trainingTalk(lesson.lines);
 }
 if(step===5){
  training.vehicleCameraOffset=previousCamera?previousCamera.y-(p.y-H*.6):0;
  const t=TYPES[Math.floor(R()*TYPES.length)];training.vehicle={x:WW/2,y:lesson.y,t,kind:'tank',hp:t.hp,c:t.cmax,v:t.vmax,f:t.fmax,ch:0,mgHits:0,body:-Math.PI/2};cars=[training.vehicle];training.shots={c:false,v:0};
 }
 if(step===6){
  // If a player dismounted after firing, board the same training vehicle for the stationary drill.
  if(!p.tank){p.tank=training.vehicle;p.x=p.tank.x;p.y=p.tank.y;}
  const d=Math.max(100,Math.min(180,W*.32,H*.24,(TRAINING_RIGHT-TRAINING_LEFT)/2-34));
  // Keep all four stationary targets inside the walls, even after driving to an edge.
  p.x=Math.max(TRAINING_LEFT+d+34,Math.min(TRAINING_RIGHT-d-34,p.x));p.tank.x=p.x;
  training.anchor={x:p.x,y:p.y,body:p.body};training.gate=p.y-400;
  training.targets=[[0,-d],[d,0],[0,d],[-d,0]].map(([dx,dy],i)=>({kind:'crate',trainingTarget:true,targetIndex:i,x:p.x+dx-26,y:p.y+dy-26,w:52,h:52,hit:false}));objects=training.targets.slice();
  training.arrived=true;trainingTalk(lesson.lines);
 }
 rebuildSpatialGrid();
}
function trainingResetLesson(reason){
 if(!training||![3,4].includes(training.step))return;
 const step=training.step,resets=training.resets+1,checkpoint={...training.checkpoint};
 p.tank=null;Object.assign(p,checkpoint);p.body=-Math.PI/2;p.ang=p.body;p.hp=3;
 trainingEnterLesson(step);training.resets=resets;training.arrived=true;trainingTalk([reason+'。もう一度やってみましょうか',...TRAINING_LESSONS[step].lines]);
}
function trainingClearLesson(){
 if(!training||training.phase==='clear'||training.phase==='clearPending')return;
 training.phase='clearPending';training.clearDelay=2;training.clearT=1.05;training.hudKey='';trainingClearInput();
}
function trainingReactToDetection(h){
 enterHumanFound(h,'p',null,true);h.face=Math.atan2(p.y-h.y,p.x-h.x);h.walking=false;
 training.phase='reacting';training.reactionT=1.2;training.hudKey='';trainingClearInput();
}
function finishTraining(){
 trainingClearInput();training.phase='finished';state='succeeded';successFrameDrawn=false;shake=0;finalizeScore(true);
 try{localStorage.setItem(TRAINING_DONE_KEY,'1');}catch(_){}
 syncTrainingHud();
}
function updateTrainingPresentation(dt){
 if(stageMode!=='training'||!training)return false;
 if(state!=='play')return true;
 p.hp=3;weather='clear';rainIntensity=0;weatherNext=1e9;
 if(p.tank){p.tank.c=p.tank.t.cmax;p.tank.v=p.tank.t.vmax;p.tank.f=p.tank.t.fmax;p.tank.ch=0;p.tank.mgHits=0;}
 if(training.phase==='reacting'){
  training.reactionT-=dt;
  if(training.reactionT<=1e-8)trainingResetLesson('見つかっちゃったわね');
  return true;
 }
 if(training.phase==='clearPending'){
  // Held controls were released once on entry; suppress new requests without repeated DOM writes.
  for(const key in keys)keys[key]=false;bombReq=false;cannonReq=false;interact=false;skillReq=false;mdown=false;training.clearDelay-=dt;
  if(training.clearDelay<=1e-8){training.phase='clear';training.hudKey='';sfx('capture');if(training.step===4){humans=[];clearFallenEnemies();}return true;}
  // Let the real explosion, fragments and stun aftermath play before the clear banner.
  return false;
 }
 if(training.phase==='talk'||training.phase==='clear'){
  if(training.phase==='talk')updateTrainingTyping(dt);
  if(training.phase==='clear'){
   training.clearT-=dt;
   if(training.clearT<=0){if(training.step===6)trainingTalk(TRAINING_FINALE,'finish');else trainingEnterLesson(training.step+1);}
  }
  return true;
 }
 // Infantry S is deliberately reserved for the final explanation; vehicle S remains real MG fire.
 if(!p.tank){skillReq=false;keys.KeyS=false;}
 if(training.step===6)interact=false;
 return false;
}
function constrainTrainingMovement(){
 if(stageMode!=='training'||!training||!p)return;
 p.hp=3;
 if(training.step===6&&training.anchor){p.x=training.anchor.x;p.y=training.anchor.y;p.body=training.anchor.body;return;}
 const radius=p.tank?TANK_HIT:10;p.x=Math.max(TRAINING_LEFT+radius,Math.min(TRAINING_RIGHT-radius,p.x));p.y=Math.max(training.gate+24,Math.min(12720,p.y));
}
function trainingCamera(){
 if(stageMode!=='training'||!training||!p)return null;
 return{x:Math.max(0,Math.min(WW-W,p.x-W/2)),y:training.step===6?p.y-H/2:Math.max(training.gate-220,Math.min(WH-H,p.y-H*.6+(training.step===5?(training.vehicleCameraOffset||0):0)))};
}
function updateTrainingMission(dt){
 if(!training||stageMode!=='training'||state!=='play')return;
 constrainTrainingMovement();
 if(!['active','approach'].includes(training.phase))return;
 const lesson=TRAINING_LESSONS[training.step];
 if(!training.arrived&&p.y<=lesson.y+270){training.arrived=true;trainingTalk(lesson.lines);return;}
 if(!training.arrived)return;
 if(training.step===2){if(training.crateBomb&&!objects.includes(training.crate))trainingClearLesson();return;}
 if(training.step===3||training.step===4){
  if(training.bushes&&training.bushes.some(b=>!bushes.includes(b)||b.burnT>0)){trainingResetLesson('草むらを残して、隠れてみましょうか');return;}
  if(humans.some(h=>!h.alive||(h.stun>0&&!h.trainingAStun))){trainingResetLesson('爆弾ではなく、今回の操作で挑戦してね');return;}
  for(let i=0;i<humans.length;i++){
   const h=humans[i];if(h.stun>0)continue;
   if(training.step===3||training.stunStart){const a=training.patrol+i*Math.PI;h.x=WW/2+Math.cos(a)*175;h.y=lesson.y+Math.sin(a)*175;h.face=a+Math.PI/2;h.walking=true;}
   if(h.st||canDetect(h,p,h.face,'p')){trainingReactToDetection(h);return;}
  }
  training.patrol+=dt*.38;
  if(training.step===3){training.hold=inBush(p)?training.hold+dt:0;if(training.hold>=3)trainingClearLesson();}
  else if(humans.length===2&&humans.every(h=>h.trainingAStun&&h.stun>0))trainingClearLesson();
 }
 if(training.step===5&&training.shots.c&&training.shots.v>=3)trainingClearLesson();
 if(training.step===6&&training.targets.length===4&&training.targets.every(t=>t.hit))trainingClearLesson();
}
function trainingTryStun(h,source){
 if(stageMode!=='training'||!h?.trainingGuard)return true;
 if(training?.step!==4||source!=='player'){trainingResetLesson('今は草むらに隠れる練習よ');return false;}
 const angle=Math.abs(angD(Math.atan2(p.y-h.y,p.x-h.x),h.face));
 if(angle<Math.PI*.65){trainingResetLesson('敵の後ろから近づいてね');return false;}
 h.trainingAStun=true;return true;
}
function trainingRecordShot(from,kind){if(stageMode==='training'&&training?.step===5&&training.arrived&&training.phase==='active'&&p.tank&&from==='p'&&(kind==='c'||kind==='v'))training.shots[kind]=kind==='v'?training.shots.v+1:true;}
function trainingObjectDamage(o,source){
 if(stageMode!=='training'||!training)return false;
 if(o.trainingCrate&&['bomb','bombBlast','bombDirect'].includes(source))training.crateBomb=true;
 if(!o.trainingTarget)return false;
 if(training.step===6&&training.phase==='active'&&['cannonDirect','mg'].includes(source)){
  if(!o.hit){o.hit=true;objects=objects.filter(q=>q!==o);if(source==='cannonDirect')cannonImpact(o.x+26,o.y+26,'p');else{burst(o.x+26,o.y+26,12,'#e9d69e',130);sfx('coverBreak',o);}rebuildSpatialGrid();}
 }
 return true;
}
function drawTrainingWall(c,cy){
 const top=Math.max(0,cy-2),bottom=Math.min(WH,cy+H+2),x=c.x===0?TRAINING_LEFT-60:TRAINING_RIGHT;
 g.save();g.translate(x,0);g.fillStyle=trainingConcretePattern()||'#b8bbb2';
 g.fillRect(0,top,60,bottom-top);g.restore();
}
function drawTrainingTarget(o){
 g.save();g.translate(o.x+o.w/2,o.y+o.h/2);
 const image=trainingArtworkImage('target');
 if(assetOK(image)){
  // Keep the circular board centered on the unchanged 52px hitbox; the stand extends below.
  const w=64,h=w*image.naturalHeight/image.naturalWidth;
  g.drawImage(image,-w/2,-h*.365,w,h);g.restore();return;
 }
 // While the sprite loads, retain the same readable circular target.
 // The pole and foot sit behind an ordinary circular bullseye.
 g.strokeStyle='#594a35';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(0,18);g.lineTo(0,42);g.moveTo(-12,42);g.lineTo(12,42);g.stroke();
 g.fillStyle='#dbcfa8';g.lineWidth=3;g.beginPath();g.arc(0,0,24,0,Math.PI*2);g.fill();g.stroke();
 for(const [r,color] of [[19,'#b7473d'],[12,'#eee3c6'],[5,'#b7473d']]){g.fillStyle=color;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();}
 g.restore();
}
function syncTrainingHud(){
 const guide=document.getElementById('trainingGuide'),clear=document.getElementById('trainingClear'),advance=document.getElementById('trainingAdvance'),taskPanel=document.getElementById('trainingTask');
 const active=stageMode==='training'&&state==='play'&&!!training;
 const talking=active&&training.phase==='talk';if(advance.hidden===talking)advance.hidden=!talking;
 const arrow=document.getElementById('trainingContinue'),ready=talking&&training.typed>=training.lines[training.line].length;if(arrow.hidden===ready)arrow.hidden=!ready;
 if(guide.hidden===talking)guide.hidden=!talking;const taskVisible=active&&!talking&&training.phase!=='clear';if(taskPanel.hidden===taskVisible)taskPanel.hidden=!taskVisible;const clearVisible=active&&training.phase==='clear';if(clear.hidden===clearVisible)clear.hidden=!clearVisible;if(!active)return;
 const t=training,talk=t.phase==='talk',now=performance.now();
 if(t.hudKey&&now<t.hudAt&&t.hudPhase===t.phase&&t.hudLine===t.line)return;t.hudAt=now+100;t.hudPhase=t.phase;t.hudLine=t.line;
 const task=t.step===2?'木箱を設置爆弾で爆破':t.step===3?'草むらに隠れる '+Math.min(3,t.hold).toFixed(1)+' / 3秒':t.step===4?'背後から気絶 '+humans.filter(h=>h.trainingAStun&&h.stun>0).length+' / 2人':t.step===5?'主砲 '+(t.shots.c?'🔴':'—')+'　マシンガン '+(t.shots.v>=3?'🔴':'—')+' '+Math.min(3,t.shots.v)+' / 3発':t.step===6?'マト '+t.targets.filter(v=>v.hit).length+' / 4':'左スティックで移動';
 const text=talk?t.lines[t.line].slice(0,t.typed):t.phase==='reacting'?'敵に発見されました':t.phase==='approach'?'前へ進んで、次の訓練に向かいましょう':task;
 const key=t.step+'|'+t.phase+'|'+text;if(key===t.hudKey)return;t.hudKey=key;
 if(talk)document.getElementById('trainingText').textContent=text;else taskPanel.textContent=text;

}
function trainingScreenAdvance(event){
 if(stageMode!=='training'||state!=='play'||training?.phase!=='talk')return;
 if(event.type==='keydown'&&event.key!=='Enter'&&event.key!==' ')return;
 if(event.repeat)return;
 event.preventDefault();event.stopPropagation();trainingAdvanceDialogue();syncTrainingHud();
}
const trainingAdvanceSurface=document.getElementById('trainingAdvance');
trainingAdvanceSurface.addEventListener('click',trainingScreenAdvance);
trainingAdvanceSurface.addEventListener('keydown',trainingScreenAdvance);
