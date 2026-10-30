// Stage 00: isolated tutorial state, bounded props and two non-firing guards.
let training=null;
const TRAINING_DONE_KEY='tankGameTrainingCompleteV1';
const TRAINING_LESSONS={
 1:{name:'訓練を始めよう',y:12500,gate:12380,lines:['訓練施設へようこそ！基本操作を一緒に練習しましょう','左スティックで移動します。中央の「停止」に戻すと、指を置いたまま止まれます','ここではダメージを受けません。まずは前へ進んでみましょう']},
 2:{name:'設置爆弾',y:12100,gate:11820,lines:['まずは、設置爆弾の使い方です','ドラム缶に近づいて、爆弾を設置したら（Bボタン）、少し離れて起爆させてみましょう（再度Bボタン）']},
 3:{name:'草むらに隠れる',y:11080,gate:10740,lines:['次は、敵にみつからないように草むらに入ってみましょう','草むらの中は、敵から見つかりにくくなります','見つからずに草むらの中で2秒待てたらクリアです']},
 4:{name:'背後から気絶',y:11080,gate:10740,lines:['それでは、後ろから近づいて2人の敵を気絶させてみましょう（敵近くでA）','前から見つかったり、爆弾で倒してしまったら、この練習をやり直します']},
 5:{name:'戦車に乗って撃つ',y:9120,gate:8750,lines:['最後はこの戦場でもっとも重要な戦車です','戦車に乗り込んで（戦車近くでA）、大砲とマシンガンを撃ってみましょう（B・Sボタン）']},
 6:{name:'砲塔を回して射撃',y:0,gate:0,lines:['戦車の砲塔は回転させることができます','4つのマトを破壊してください（BまたはSを長押ししながら操作）','この練習中は戦車が動きません。砲塔を上下左右に向けて狙いましょう']}
};
const TRAINING_FINALE=['おめでとう！これで訓練は以上です','おっと！スキルについての説明がまだでしたね！','スキルには種類があり、効果は様々です！色々と試してみてください','一人前のこっそり兵士になれるよう、がんばってくださいね！'];
function trainingCompleted(){try{return localStorage.getItem(TRAINING_DONE_KEY)==='1';}catch(_){return false;}}
function trainingClearInput(){
 if(typeof window.trainingClearInputs==='function')window.trainingClearInputs();
 else{for(const k in keys)keys[k]=false;bombReq=false;cannonReq=false;interact=false;skillReq=false;mdown=false;}
}
function trainingTalk(lines,after='active'){
 training.phase='talk';training.lines=lines;training.line=0;training.afterTalk=after;training.hudKey='';trainingClearInput();
}
function trainingAdvanceDialogue(){
 if(stageMode!=='training'||state!=='play'||training?.phase!=='talk')return;
 trainingClearInput();
 if(++training.line<training.lines.length){training.hudKey='';return;}
 if(training.afterTalk==='finish'){finishTraining();return;}
 if(training.step===1){trainingClearLesson();return;}
 training.phase=training.afterTalk;training.hudKey='';
}
function trainingGuard(x,y,face){return{x,y,face,alive:true,elite:false,commander:null,trainingGuard:true,trainingAStun:false,st:0,sus:0,cd:999,path:[{x,y}],wi:0,dir:1,stun:0,walking:false};}
function trainingClearTransient(){
 trainingClearInput();bombs=[];bullets=[];waves=[];fx=[];parts=[];decoy=null;allies=[];partner=null;hound=null;builtWalls=[];burningNatureSet.clear();clearFallenEnemies();p.grappleT=0;p.grappleTarget=null;p.blastAirT=0;p.fireExposure=0;
}
function setupTrainingWorld(){
 skill='throw';
 const z=ZONE_STYLE['敵司令本部'];ZONES=[{n:'敵司令本部',y0:13200,y1:-400,g:z.g,p:z.p.slice()}];
 covers=[];objects=[];bushes=[];humans=[];etanks=[];cars=[];roadBands=[];water=[];bridges=[];mud=[];items=[];tankWrecks=[];radio=null;airstrike=null;airbombs=[];enemyDogs=[];
 base={x:-5000,y:-5000,w:10,h:10,hp:30,maxHp:30,deadAt:0};mission=null;
 Object.assign(p,{x:WW/2,y:12620,hp:3,tank:null,body:-Math.PI/2,ang:-Math.PI/2});
 // No skill use during basic controls; the user's selected skill remains unchanged for subsequent stages.
 training={step:1,phase:'talk',resets:0,hold:0,patrol:Math.PI/2,shots:{c:false,v:false},targets:[],hudKey:'',hudAt:0,gate:12380,checkpoint:{x:WW/2,y:12620},barrelBomb:false,vehicle:null};
 trainingClearTransient();rebuildSpatialGrid();trainingTalk(TRAINING_LESSONS[1].lines);syncTrainingHud();
}
function trainingBushCluster(){
 const y=TRAINING_LESSONS[3].y;
 // Seven overlapping, ordinary-sized bushes form a natural patch without scaling one sprite up.
 return [[0,0,88,68],[-65,0,82,64],[65,0,86,66],[-33,-55,84,64],[33,-55,80,66],[-33,55,86,68],[33,55,82,64]].map(([dx,dy,w,h])=>({x:WW/2+dx-w/2,y:y+dy-h/2,w,h}));
}
function trainingEnterLesson(step){
 const continuing=step===4&&training.step===3;
 const previousBushes=bushes,previousGuards=humans;
 if(continuing)training.stunStart={player:{x:p.x,y:p.y,body:p.body,ang:p.ang},bushes:bushes.map(b=>({...b})),guards:humans.map(h=>({...h})),patrol:training.patrol};
 trainingClearTransient();training.step=step;training.phase='approach';training.hold=0;training.hudKey='';training.arrived=false;
 const lesson=TRAINING_LESSONS[step];training.gate=lesson.gate;
 objects=[];humans=[];bushes=[];cars=[];
 if(step===2){const size=typeof BARREL_SIZE==='number'?BARREL_SIZE:40;training.barrel={kind:'barrel',trainingBarrel:true,x:WW/2-size/2,y:lesson.y-size/2,w:size,h:size};objects=[training.barrel];training.barrelBomb=false;}
 if(step===3){
  training.bushes=trainingBushCluster();bushes=training.bushes;training.bush=bushes[0];training.patrol=Math.PI/2;training.stunStart=null;
  humans=[trainingGuard(WW/2,lesson.y+175,Math.PI),trainingGuard(WW/2,lesson.y-175,0)];
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
  const t=TYPES[0];training.vehicle={x:WW/2,y:lesson.y,t,kind:'tank',hp:t.hp,c:t.cmax,v:t.vmax,f:t.fmax,ch:0,mgHits:0,body:-Math.PI/2};cars=[training.vehicle];training.shots={c:false,v:false};
 }
 if(step===6){
  // If a player dismounted after firing, board the same training vehicle for the stationary drill.
  if(!p.tank){p.tank=training.vehicle;p.x=p.tank.x;p.y=p.tank.y;}
  training.anchor={x:p.x,y:p.y,body:p.body};training.gate=p.y-400;
  const d=Math.max(100,Math.min(180,W*.32,H*.24));
  training.targets=[[0,-d,'上'],[d,0,'右'],[0,d,'下'],[-d,0,'左']].map(([dx,dy,label],i)=>({kind:'crate',trainingTarget:true,targetIndex:i,label,x:p.x+dx-26,y:p.y+dy-26,w:52,h:52,hit:false}));objects=training.targets.slice();
  training.arrived=true;trainingTalk(lesson.lines);
 }
 rebuildSpatialGrid();
}
function trainingResetLesson(reason){
 if(!training||![3,4].includes(training.step))return;
 const step=training.step,resets=training.resets+1,checkpoint={...training.checkpoint};
 p.tank=null;Object.assign(p,checkpoint);p.body=-Math.PI/2;p.ang=p.body;p.hp=3;
 trainingEnterLesson(step);training.resets=resets;training.arrived=true;trainingTalk([reason+'。もう一度やってみましょう',...TRAINING_LESSONS[step].lines]);
}
function trainingClearLesson(){
 if(!training||training.phase==='clear')return;
 training.phase='clear';training.clearT=1.05;training.hudKey='';trainingClearInput();
 if(training.step===4){humans=[];clearFallenEnemies();}
}
function finishTraining(){
 trainingClearInput();training.phase='finished';state='succeeded';successFrameDrawn=false;shake=0;finalizeScore(true);
 try{localStorage.setItem(TRAINING_DONE_KEY,'1');}catch(_){}
 syncTrainingHud();
}
function updateTrainingPresentation(dt){
 if(stageMode!=='training'||!training)return false;
 p.hp=3;weather='clear';rainIntensity=0;weatherNext=1e9;
 if(p.tank){p.tank.c=p.tank.t.cmax;p.tank.v=p.tank.t.vmax;p.tank.f=p.tank.t.fmax;p.tank.ch=0;p.tank.mgHits=0;}
 if(training.phase==='talk'||training.phase==='clear'){
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
 p.x=Math.max(100,Math.min(WW-100,p.x));p.y=Math.max(training.gate+24,Math.min(12720,p.y));
}
function trainingCamera(){
 if(stageMode!=='training'||!training||!p)return null;
 return{x:Math.max(0,Math.min(WW-W,p.x-W/2)),y:training.step===6?p.y-H/2:Math.max(training.gate-220,Math.min(WH-H,p.y-H*.6))};
}
function updateTrainingMission(dt){
 if(!training||stageMode!=='training'||state!=='play')return;
 constrainTrainingMovement();
 if(training.phase==='talk'||training.phase==='clear'||training.phase==='finished')return;
 const lesson=TRAINING_LESSONS[training.step];
 if(!training.arrived&&p.y<=lesson.y+270){training.arrived=true;trainingTalk(lesson.lines);return;}
 if(!training.arrived)return;
 if(training.step===2){if(training.barrelBomb&&!objects.includes(training.barrel))trainingClearLesson();return;}
 if(training.step===3||training.step===4){
  if(training.bushes&&training.bushes.some(b=>!bushes.includes(b)||b.burnT>0)){trainingResetLesson('草むらを残して、隠れてみましょう');return;}
  if(humans.some(h=>!h.alive||(h.stun>0&&!h.trainingAStun))){trainingResetLesson('爆弾ではなく、今回の操作で挑戦してください');return;}
  for(let i=0;i<humans.length;i++){
   const h=humans[i];if(h.stun>0)continue;
   if(training.step===3||training.stunStart){const a=training.patrol+i*Math.PI;h.x=WW/2+Math.cos(a)*175;h.y=lesson.y+Math.sin(a)*175;h.face=a+Math.PI/2;h.walking=true;}
   if(h.st||canDetect(h,p,h.face,'p')){trainingResetLesson('見つかってしまいました');return;}
  }
  training.patrol+=dt*.38;
  if(training.step===3){training.hold=inBush(p)?training.hold+dt:0;if(training.hold>=2)trainingClearLesson();}
  else if(humans.length===2&&humans.every(h=>h.trainingAStun&&h.stun>0))trainingClearLesson();
 }
 if(training.step===5&&training.shots.c&&training.shots.v)trainingClearLesson();
 if(training.step===6&&training.targets.length===4&&training.targets.every(t=>t.hit))trainingClearLesson();
}
function trainingTryStun(h,source){
 if(stageMode!=='training'||!h?.trainingGuard)return true;
 if(training?.step!==4||source!=='player'){trainingResetLesson('今は草むらに隠れる練習です');return false;}
 const angle=Math.abs(angD(Math.atan2(p.y-h.y,p.x-h.x),h.face));
 if(angle<Math.PI*.65){trainingResetLesson('敵の後ろから近づいてください');return false;}
 h.trainingAStun=true;return true;
}
function trainingRecordShot(from,kind){if(stageMode==='training'&&training?.step===5&&training.arrived&&training.phase==='active'&&p.tank&&from==='p'&&(kind==='c'||kind==='v'))training.shots[kind]=true;}
function trainingObjectDamage(o,source){
 if(stageMode!=='training'||!training)return false;
 if(o.trainingBarrel&&['bomb','bombBlast','bombDirect'].includes(source))training.barrelBomb=true;
 if(!o.trainingTarget)return false;
 if(training.step===6&&training.phase==='active'&&['cannonDirect','mg'].includes(source)){
  if(!o.hit){o.hit=true;objects=objects.filter(q=>q!==o);burst(o.x+26,o.y+26,12,'#e9d69e',130);sfx('coverBreak',o);rebuildSpatialGrid();}
 }
 return true;
}
function drawTrainingTarget(o){
 g.save();g.translate(o.x+o.w/2,o.y+o.h/2);g.fillStyle='#dbcfa8';g.strokeStyle='#594a35';g.lineWidth=3;g.fillRect(-26,-26,52,52);g.strokeRect(-26,-26,52,52);
 for(const [r,color] of [[19,'#b7473d'],[12,'#eee3c6'],[5,'#b7473d']]){g.fillStyle=color;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();}
 g.fillStyle='#fff5d6';g.font='bold 14px system-ui';g.textAlign='center';g.fillText(o.label,0,-36);g.restore();
}
function drawTrainingBoundary(){
 if(stageMode!=='training'||!training||training.step===6)return;
 const y=training.gate;g.save();g.strokeStyle='#e2c873';g.lineWidth=4;g.setLineDash([16,10]);g.beginPath();g.moveTo(30,y);g.lineTo(WW-30,y);g.stroke();g.setLineDash([]);g.fillStyle='#eadba9';g.font='bold 16px system-ui';g.textAlign='center';g.fillText('課題をクリアして先へ進もう',WW/2,y-15);g.restore();
}
function syncTrainingHud(){
 const guide=document.getElementById('trainingGuide'),clear=document.getElementById('trainingClear'),advance=document.getElementById('trainingAdvance');
 const active=stageMode==='training'&&state==='play'&&!!training;
 const talking=active&&training.phase==='talk';if(advance.hidden===talking)advance.hidden=!talking;
 if(guide.hidden===active)guide.hidden=!active;const clearVisible=active&&training.phase==='clear';if(clear.hidden===clearVisible)clear.hidden=!clearVisible;if(!active)return;
 const t=training,talk=t.phase==='talk',now=performance.now();
 if(t.hudKey&&now<t.hudAt&&t.hudPhase===t.phase&&t.hudLine===t.line)return;t.hudAt=now+100;t.hudPhase=t.phase;t.hudLine=t.line;
 const task=t.step===2?'ドラム缶を設置爆弾で爆破':t.step===3?'草むらに隠れる '+Math.min(2,t.hold).toFixed(1)+' / 2秒':t.step===4?'背後から気絶 '+humans.filter(h=>h.trainingAStun&&h.stun>0).length+' / 2人':t.step===5?'主砲 '+(t.shots.c?'✓':'—')+'　マシンガン '+(t.shots.v?'✓':'—'):t.step===6?'マト '+t.targets.filter(v=>v.hit).length+' / 4':'左スティックで移動';
 const text=talk?t.lines[t.line]:t.phase==='approach'?'前へ進んで、次の訓練に向かいましょう':task;
 const key=t.step+'|'+t.phase+'|'+text;if(key===t.hudKey)return;t.hudKey=key;
 document.getElementById('trainingText').textContent=text;

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
