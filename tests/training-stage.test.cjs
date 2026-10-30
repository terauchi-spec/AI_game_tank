const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs'),root=path.join(__dirname,'..');
function fixture(options){const h=createGameEngine(root,options);h.run("stageMode='training';areaDebugEnabled=false;reset(false)");h.tick=(seconds,dt=.05)=>{for(let t=0;t<seconds-1e-8;t+=dt)h.run(`update(${Math.min(dt,seconds-t)})`);};h.talk=()=>h.run("while(training.phase==='talk')trainingAdvanceDialogue()");h.lesson=step=>{h.run(`trainingEnterLesson(${step});training.arrived=true;trainingTalk(TRAINING_LESSONS[${step}].lines)`);h.talk();};return h;}
test('00 is always selectable without entering progression or changing 01..07 locks',()=>{
 const h=fixture();assert.equal(h.run("stageDisplayNumber('training')"),'00');assert.equal(h.run("stageSelectable('training')"),true);assert.equal(h.run("stageAvailableForSelection('training')"),true);assert.equal(h.run("stageSelectable('beginner')"),true);assert.equal(h.run("stageSelectable('indoorBeginner')"),false);assert.equal(h.run('STAGE_ORDER.length'),7);
 assert.equal(h.run("STAGE_ORDER.some(s=>s.id==='training')"),false);h.run('renderStageLocks()');assert.equal(h.run('selectedStageId'),'training');
 h.run("selectedStageId='training';state='stage';selectedSkillId='throw';deploySelectedStage()");assert.equal(h.run('stageMode'),'training');
});
test('training starts with HQ tiles, no threats, no active skill and a sequential assistant introduction',()=>{
 const h=fixture();assert.equal(h.run('ZONES.length'),1);assert.equal(h.run('ZONES[0].n'),'敵司令本部');assert.equal(h.run('humans.length+etanks.length+enemyDogs.length'),0);assert.equal(h.run('training.step'),1);const y=h.run('p.y');h.run("keys.ArrowUp=true;update(1);updateHQSpawn(100)");assert.equal(h.run('p.y'),y);assert.equal(h.run('humans.length'),0);
 h.talk();assert.equal(h.run('training.phase'),'active');assert.equal(h.run('training.step'),2);assert.equal(h.run('training.arrived'),true);assert.equal(h.run('objects[0].kind'),'barrel');
});
test('barrel exercise requires an actual bomb hit and explosion; walking or unrelated removal cannot clear it',()=>{
 const h=fixture();h.lesson(2);h.run('objects=[];updateTrainingMission(.1)');assert.equal(h.run('training.phase'),'active');h.lesson(2);
 h.run('p.x=training.barrel.x+training.barrel.w/2+42;p.y=training.barrel.y+training.barrel.h/2;bombReq=true;update(.01)');assert.equal(h.run('bombs.length'),1);
 h.run('p.x+=90;bombReq=true;update(.01)');assert.equal(h.run('training.barrelBomb'),true);for(let i=0;i<80&&h.run('training.phase')==='active';i++)h.run('update(.05)');assert.equal(h.run('training.phase'),'clearPending');assert.equal(h.run('p.hp'),3);assert.equal(h.run('state'),'play');
});
test('natural bush cluster counts only two uninterrupted hidden seconds and gates northward travel until clear',()=>{
 const h=fixture();h.lesson(3);h.run('p.x=WW/2;p.y=TRAINING_LESSONS[3].y;updateTrainingMission(1)');assert.equal(h.run('training.hold'),1);
 h.run('p.x=100;p.y=12500;updateTrainingMission(.1)');assert.equal(h.run('training.hold'),0);
 h.run('p.x=WW/2;p.y=TRAINING_LESSONS[3].y;updateTrainingMission(1.9)');assert.equal(h.run('training.phase'),'active');h.run('updateTrainingMission(.1)');assert.equal(h.run('training.phase'),'clearPending');
 h.lesson(3);h.run('p.y=0;constrainTrainingMovement()');assert.equal(h.run('p.y'),h.run('training.gate+24'));assert.ok(h.run('trainingCamera().y')>=h.run('training.gate-220'));
 assert.equal(h.run('bushes.length'),7);assert.ok(h.run('bushes.every(b=>b.w<=94&&b.h<=72&&!b.trainingRound)'));h.run('p.x=WW/2+125;p.y=TRAINING_LESSONS[3].y+120');assert.equal(h.run('inBush(p)'),false,'outside the natural patch is exposed');
});
test('being seen or killing a guard resets only the current bush/stun lesson and clears transient attacks',()=>{
 const h=fixture();for(const step of [3,4]){
  h.lesson(step);h.run('humans[0].st=1;updateTrainingMission(.01)');assert.equal(h.run('training.step'),step);assert.equal(h.run('training.phase'),'reacting');h.tick(1.2);assert.equal(h.run('training.phase'),'talk');assert.equal(h.run('humans.length'),2);assert.equal(h.run('humans.every(h=>h.alive&&!h.stun)'),true);assert.equal(h.run('training.hold'),0);
  h.talk();h.run('humans[0].alive=false;bullets.push({});bombs.push({});updateTrainingMission(.01)');assert.equal(h.run('training.step'),step);assert.equal(h.run('training.phase'),'talk');assert.equal(h.run('bullets.length+bombs.length+fallenEnemies.length'),0);
 }
});
test('two back A interactions clear stun training; a frontal interaction restarts it without counting a stun',()=>{
 const h=fixture();h.lesson(4);h.run('p.x=humans[0].x;p.y=humans[0].y-25;stunHuman(humans[0])');assert.equal(h.run('training.phase'),'talk');assert.equal(h.run('humans.every(h=>!h.stun)'),true);
 h.talk();h.run('p.x=humans[0].x;p.y=humans[0].y+25;interact=true;update(.01)');assert.equal(h.run('humans[0].trainingAStun'),true);assert.equal(h.run('training.phase'),'active');
 h.tick(.35);h.run('p.x=humans[1].x;p.y=humans[1].y+25;interact=true;update(.01)');assert.equal(h.run('training.phase'),'clearPending');assert.equal(h.run('humans.length'),2);h.tick(2);assert.equal(h.run('humans.length'),0);
});
test('boarding a real tank and firing both weapons is required before the four stationary targets',()=>{
 const h=fixture();h.lesson(5);h.run('p.x=training.vehicle.x;p.y=training.vehicle.y+40;interact=true;update(.01)');assert.equal(h.run('p.tank===training.vehicle'),true);
 h.run('keys.KeyD=true;update(.01);keys.KeyD=false');assert.equal(h.run('training.shots.c'),true);assert.equal(h.run('training.phase'),'active');for(let count=1;count<=3;count++){h.run('keys.KeyS=true;update(.01);keys.KeyS=false');assert.equal(h.run('training.shots.v'),count);assert.equal(h.run('training.phase'),count<3?'active':'clearPending');if(count<3)h.tick(.2);}
 const y=h.run('p.y');
 h.tick(3.1);assert.equal(h.run('training.step'),6);assert.equal(h.run('objects.length'),4);assert.equal(h.run('p.y'),y);h.talk();h.run('keys.ArrowUp=true;keys.ArrowLeft=true;update(.5)');assert.equal(h.run('p.y'),y);assert.equal(h.run('p.x'),h.run('training.anchor.x'));assert.equal(h.run('p.body'),h.run('training.anchor.body'));
});
test('actual tank projectiles destroy all four targets; blast radius and bombs cannot skip them',()=>{
 const h=fixture();h.lesson(5);h.run('p.tank=training.vehicle;p.x=training.vehicle.x;p.y=training.vehicle.y;trainingEnterLesson(6)');h.talk();
 h.run("for(const o of objects.slice())damageObject(o,'bombDirect')");assert.equal(h.run('objects.length'),4);
 for(let i=0;i<4;i++){
  h.run(`var target=training.targets[${i}],angle=Math.atan2(target.y+26-p.y,target.x+26-p.x);fire(p.x+Math.cos(angle)*44,p.y+Math.sin(angle)*44,angle,'p',${i%2?"'v'":"'c'"},630,700,3)`);
  h.tick(.35);assert.equal(h.run(`training.targets[${i}].hit`),true);
 }
 assert.equal(h.run('training.phase'),'clearPending');h.tick(3.1);assert.equal(h.run('training.phase'),'talk');assert.equal(h.run('training.afterTalk'),'finish');assert.equal(h.run('training.lines.length'),4);h.talk();assert.equal(h.run('state'),'succeeded');
});
test('completion goes through success and empty unlock screen, skips evaluation and never changes skills, ranks or records',()=>{
 const h=fixture();const before=new Map(h.storage);h.run("trainingTalk(TRAINING_FINALE,'finish')");h.talk();assert.equal(h.run('scoreStats.training'),true);assert.equal(h.run('scoreStats.final.cleared'),true);assert.equal(h.run('scoreStats.unlockedSkill'),undefined);
 h.run('state=\'win\';syncResultScreen()');assert.equal(h.nodes.get('unlockEvaluate').textContent,'ステージ選択');assert.match(h.nodes.get('unlockList').innerHTML,/新しいアンロックはありません/);assert.doesNotMatch(h.nodes.get('unlockList').innerHTML,/評価画面/);assert.equal(h.run('scoreStats.unlockNoticeItems.length'),0);
 h.run('acknowledgeRunUnlocks()');assert.equal(h.run('state'),'stage');assert.equal(h.run('selectedStageId'),'beginner');assert.equal(h.run('stageMode'),'beginner');
 const allowed='tankGameTrainingCompleteV1';for(const key of ['tankGameSkillProgressV1','tankGameStageProgressV1','tankGameStageRecordsV1',h.run('RUN_HISTORY_KEY'),h.run('TITLE_ARCHIVE_KEY'),h.run('SCORE_KEY')])assert.equal(h.storage.get(key),before.get(key),key+' unchanged');assert.equal(h.storage.get(allowed),'1');
});
test('damage, supply exhaustion and infantry skills cannot break training; normal stages retain their behavior',()=>{
 const h=fixture();h.lesson(2);h.run('damagePlayerByOwnBomb();triggerPlayerDeath();recordPlayerDamage(1);beginBlastFlight(p,p.x,p.y,95,60,8,5)');assert.equal(h.run('p.hp'),3);assert.equal(h.run('state'),'play');assert.ok(!h.run('p.blastAirT'));assert.equal(h.run('scoreStats.damageHits'),0);
 h.run('skillReq=true;keys.KeyS=true;update(.01)');assert.equal(h.run('bombs.length'),0);
 h.lesson(5);h.run('p.tank=training.vehicle;p.tank.c=0;p.tank.v=0;p.tank.f=0;updateTrainingPresentation(.01);wreck()');assert.ok(h.run('p.tank.c>0&&p.tank.v>0&&p.tank.f>0'));assert.equal(h.run('p.tank'),h.run('training.vehicle'));
 h.run("stageMode='beginner';reset(false);damagePlayerByOwnBomb()");assert.equal(h.run('p.hp'),2);
});
test('burnt bush resets safely, all lesson views draw, and the final tank drill cannot be dismounted',()=>{
 const h=fixture();for(let step=1;step<=5;step++){if(step>1)h.lesson(step);h.run('draw(null);drawMission()');}
 h.lesson(3);h.run('training.bush.burnT=1;updateTrainingMission(.01)');assert.equal(h.run('training.phase'),'talk');assert.equal(h.run('bushes.length'),7);assert.ok(!h.run('training.bush.burnT'));
 h.lesson(5);h.run('p.tank=training.vehicle;p.x=training.vehicle.x;p.y=training.vehicle.y;trainingEnterLesson(6)');h.talk();h.run('interact=true;update(.01);draw(null);drawMission()');assert.equal(h.run('p.tank===training.vehicle'),true);
});

test('hiding flows directly into stuns with the same player, bushes and patrol; failures restore that checkpoint',()=>{
 const h=fixture();h.lesson(3);h.run('p.x=WW/2;p.y=TRAINING_LESSONS[3].y;updateTrainingMission(2)');assert.equal(h.run('training.phase'),'clearPending');
 h.run('var savedBushes=bushes,savedGuards=humans,savedPlayer={x:p.x,y:p.y},savedGuardState=humans.map(h=>({x:h.x,y:h.y,face:h.face}));');
 h.tick(3.1);assert.equal(h.run('training.step'),4);assert.equal(h.run('training.phase'),'talk');assert.equal(h.run('training.arrived'),true);
 assert.equal(h.run('bushes===savedBushes&&humans===savedGuards'),true);assert.equal(h.run('p.x===savedPlayer.x&&p.y===savedPlayer.y'),true);assert.equal(h.run('humans.every((h,i)=>h.x===savedGuardState[i].x&&h.y===savedGuardState[i].y&&h.face===savedGuardState[i].face)'),true);
 h.talk();h.run('updateTrainingMission(.01)');assert.equal(h.run('training.phase'),'active');
 h.run('humans[0].alive=false;trainingResetLesson("発見")');assert.equal(h.run('training.step'),4);assert.equal(h.run('training.phase'),'talk');assert.equal(h.run('p.x===savedPlayer.x&&p.y===savedPlayer.y'),true);assert.equal(h.run('humans.every((h,i)=>h.alive&&!h.stun&&h.x===savedGuardState[i].x&&h.y===savedGuardState[i].y)'),true);assert.equal(h.run('bushes.length'),7);
 h.talk();h.run('training.bushes[2].burnT=1;updateTrainingMission(.01)');assert.equal(h.run('training.phase'),'talk');assert.equal(h.run('bushes.every(b=>!b.burnT)'),true);
 // Real A interactions still work against the continued patrol, without replacing the guards.
 h.talk();for(let i=0;i<2;i++){h.run(`var guard=humans[${i}];p.x=guard.x-Math.cos(guard.face)*25;p.y=guard.y-Math.sin(guard.face)*25;interact=true;update(.01)`);if(i===0)h.tick(.35);}
 assert.equal(h.run('training.phase'),'clearPending');assert.equal(h.run('humans.length'),2);h.tick(2);assert.equal(h.run('humans.length'),0);
});
test('full-screen conversation taps advance once, clear controls, and do not advance during drills or pause',()=>{
 const h=fixture();let prevented=0,stopped=0;h.c.tapEvent={type:'click',preventDefault(){prevented++},stopPropagation(){stopped++}};
 h.run('training.typed=training.lines[0].length;keys.ArrowUp=true;bombReq=true;trainingScreenAdvance(tapEvent)');assert.equal(h.run('training.line'),1);assert.equal(h.run('keys.ArrowUp||bombReq'),false);assert.equal(prevented,1);assert.equal(stopped,1);
 h.run("state='paused';trainingScreenAdvance(tapEvent)");assert.equal(h.run('training.line'),1);h.run("state='play';while(training.phase==='talk')trainingScreenAdvance(tapEvent)");assert.equal(h.run('training.phase'),'active');assert.equal(h.run('training.step'),2);assert.equal(h.nodes.get('trainingAdvance').hidden,true);
 const line=h.run('training.line');h.run('trainingScreenAdvance(tapEvent)');assert.equal(h.run('training.line'),line);
 h.lesson(2);assert.equal(h.run('training.phase'),'active');h.run('trainingScreenAdvance(tapEvent)');assert.equal(h.run('training.phase'),'active');
});

test('assistant types at instructor speed, reveals a line before advancing, and shows the triangle only when ready',()=>{
 const h=fixture();h.storage.set('tankGamePlayerNameV1','テスト');h.run('trainingTalk(TRAINING_LESSONS[1].lines);syncTrainingHud()');assert.equal(h.run('training.lines[0]'),'こっそり訓練施設にようこそ！');assert.equal(h.run('training.lines[1]'),'ここでは戦場の基本を、テストさんに学んでもらいます');
 assert.equal(h.nodes.get('trainingText').textContent,'こ');assert.equal(h.nodes.get('trainingContinue').hidden,true);
 h.tick(.12,.04);h.run('syncTrainingHud()');assert.equal(h.run('training.typed'),4);assert.equal(h.nodes.get('trainingText').textContent,'こっそり');
 h.run('trainingAdvanceDialogue();syncTrainingHud()');assert.equal(h.run('training.line'),0);assert.equal(h.nodes.get('trainingContinue').hidden,false);assert.equal(h.nodes.get('trainingText').textContent,h.run('training.lines[0]'));
 h.run('trainingAdvanceDialogue();syncTrainingHud()');assert.equal(h.run('training.line'),1);assert.equal(h.nodes.get('trainingContinue').hidden,true);
 const typed=h.run('training.typed');h.run("state='paused';update(1);syncTrainingHud()");assert.equal(h.run('training.typed'),typed);assert.equal(h.nodes.get('trainingAdvance').hidden,true);assert.equal(h.nodes.get('trainingContinue').hidden,true);
 h.run("state='play';update(.08);syncTrainingHud()");assert.equal(h.run('training.typed'),typed+2);assert.equal(h.nodes.get('trainingAdvance').hidden,false);
 h.tick(3);h.run('syncTrainingHud()');assert.equal(h.nodes.get('trainingContinue').hidden,false);
 h.c.matchMedia=()=>({matches:true});h.run('trainingTalk(["動きを減らす設定"]);syncTrainingHud()');assert.equal(h.nodes.get('trainingText').textContent,'動きを減らす設定');assert.equal(h.nodes.get('trainingContinue').hidden,false);
});

test('objective text uses its own panel and every lesson waits two seconds before the clear banner',()=>{
 const h=fixture();for(let step=2;step<=6;step++){
  if(step===6){h.lesson(5);h.run('p.tank=training.vehicle;p.x=training.vehicle.x;p.y=training.vehicle.y;trainingEnterLesson(6)');h.talk();}else if(step>1)h.lesson(step);else h.talk();
  if(step>1)h.run('trainingClearLesson()');h.run('syncTrainingHud()');assert.equal(h.run('training.phase'),'clearPending');assert.equal(h.nodes.get('trainingClear').hidden,true);assert.equal(h.nodes.get('trainingGuide').hidden,true);assert.equal(h.nodes.get('trainingTask').hidden,false);
  h.run('keys.ArrowUp=true;bombReq=true');const y=h.run('p.y');h.tick(1.95);h.run('syncTrainingHud()');assert.equal(h.run('training.phase'),'clearPending');assert.equal(h.nodes.get('trainingClear').hidden,true);assert.equal(h.run('p.y'),y);assert.equal(h.run('bombs.length'),0);
  h.run("state='paused';update(4);syncTrainingHud()");assert.equal(h.run('training.phase'),'clearPending');assert.equal(h.nodes.get('trainingTask').hidden,true);
  h.run("state='play';update(.05);syncTrainingHud()");assert.equal(h.run('training.phase'),'clear');assert.equal(h.nodes.get('trainingClear').hidden,false);assert.equal(h.nodes.get('trainingTask').hidden,true);
 }
 h.lesson(2);h.run('syncTrainingHud()');assert.equal(h.nodes.get('trainingGuide').hidden,true);assert.equal(h.nodes.get('trainingTask').textContent,'ドラム缶を設置爆弾で爆破');
 h.run('trainingTalk(TRAINING_LESSONS[2].lines);syncTrainingHud()');assert.equal(h.nodes.get('trainingGuide').hidden,false);assert.equal(h.nodes.get('trainingTask').hidden,true);
});
test('guards start on either side and discovery shows the real found-mode reaction before resetting',()=>{
 const h=fixture();h.lesson(3);assert.equal(h.run('training.patrol'),0);assert.equal(h.run('humans[0].x'),h.run('WW/2+175'));assert.equal(h.run('humans[1].x'),h.run('WW/2-175'));assert.equal(h.run('humans.every(h=>h.y===TRAINING_LESSONS[3].y)'),true);
 // Stand in the first guard's actual field of view; no synthetic discovery flag.
 h.run('p.x=humans[0].x;p.y=humans[0].y+70;updateTrainingMission(.01);syncTrainingHud()');assert.equal(h.run('training.phase'),'reacting');assert.equal(h.run('humans[0].st'),1);assert.equal(h.run('humans[0].target'),'p');assert.ok(h.run('humans[0].foundPause>0'));assert.equal(h.run('humans[0].walking'),false);assert.equal(h.nodes.get('trainingTask').textContent,'敵に発見されました');
 const resets=h.run('training.resets');h.tick(1.15);assert.equal(h.run('training.phase'),'reacting');assert.equal(h.run('training.resets'),resets);h.run("state='paused';update(2)");assert.equal(h.run('training.phase'),'reacting');h.run("state='play';update(.05)");assert.equal(h.run('training.phase'),'talk');assert.equal(h.run('training.resets'),resets+1);assert.equal(h.run('humans.every(h=>!h.st)'),true);assert.equal(h.run('humans[0].x'),h.run('WW/2+175'));assert.equal(h.run('p.hp'),3);
});

test('waiting for the side patrol then walking into the real bush patch completes hiding without discovery',()=>{
 const h=fixture();h.lesson(3);h.run('p.x=WW/2;p.y=11430');h.tick(4,.02);
 for(let i=0;i<400&&h.run("training.phase==='active'");i++)h.run('keys.ArrowUp=p.y>11080;update(.02)');
 assert.equal(h.run('training.phase'),'clearPending');assert.equal(h.run('training.resets'),0);assert.ok(h.run('training.hold>=2'));
});

test('intro goes straight to bomb instruction without a walking task or clear banner; the tank is close to the stun area',()=>{
 const h=fixture();const y=h.run('p.y');h.run("training.line=training.lines.length-1;training.typed=training.lines[training.line].length;trainingAdvanceDialogue();syncTrainingHud()");assert.equal(h.run('training.step'),2);assert.equal(h.run('training.phase'),'talk');assert.match(h.run('training.lines[0]'),/^ドラム缶に近づいて/);assert.equal(h.run('training.arrived'),true);assert.equal(h.run('p.y'),y);assert.equal(h.nodes.get('trainingClear').hidden,true);
 h.talk();assert.equal(h.run('training.phase'),'active');assert.equal(h.run('training.step'),2);assert.equal(h.run('TRAINING_LESSONS[1].lines.length'),3);assert.equal(h.run('TRAINING_LESSONS[1].lines[2]'),'左スティックで移動します。まずは前へ進んでみましょう');assert.equal(h.run('TRAINING_LESSONS[2].lines.length'),1);
 // Enter vehicle practice from the same location after stunning guards, then walk and actually board.
 h.lesson(4);h.run('p.x=WW/2;p.y=TRAINING_LESSONS[4].y;trainingClearLesson()');h.tick(3.1);assert.equal(h.run('training.step'),5);const distance=h.run('p.y-training.vehicle.y');assert.ok(distance>=200&&distance<=450);assert.ok(h.run('training.vehicle.y>TRAINING_LESSONS[4].gate-100'));
 for(let i=0;i<300&&!h.run('training.phase==="talk"');i++)h.run('keys.ArrowUp=true;update(.02)');assert.equal(h.run('training.phase'),'talk');h.talk();
 for(let i=0;i<400&&h.run('p.y>training.vehicle.y+35');i++)h.run('keys.ArrowUp=true;update(.02)');h.run('keys.ArrowUp=false;interact=true;update(.01)');assert.equal(h.run('p.tank===training.vehicle'),true);
});

test('intro-to-bomb transition preserves world and screen position on short and tall viewports',()=>{
 for(const height of [720,1440,1800]){
  const h=fixture(height===720?undefined:{width:480,height,touch:true});assert.equal(h.run('H'),height);const before=h.run('({x:p.x,y:p.y,screenX:p.x-trainingCamera().x,screenY:p.y-trainingCamera().y})');
  h.run('training.line=training.lines.length-1;training.typed=training.lines[training.line].length;trainingAdvanceDialogue()');assert.equal(h.run('training.step'),2);
  const after=h.run('({x:p.x,y:p.y,screenX:p.x-trainingCamera().x,screenY:p.y-trainingCamera().y})');assert.deepEqual(after,before);
  h.talk();h.tick(.1);assert.equal(h.run('p.y-trainingCamera().y'),before.screenY);assert.equal(h.run('p.y'),before.y);
 }
});
test('each lesson plays the existing capture sound once when the delayed clear banner appears',()=>{
 const h=fixture();h.c.clearSounds=[];h.run('sfx=(name)=>clearSounds.push(name)');
 for(const step of [2,3,4,5,6]){
  if(step===6){h.lesson(5);h.run('p.tank=training.vehicle;trainingEnterLesson(6)');h.talk();}else h.lesson(step);
  h.run('trainingClearLesson()');const count=h.c.clearSounds.filter(n=>n==='capture').length;h.tick(1.95);assert.equal(h.c.clearSounds.filter(n=>n==='capture').length,count);h.tick(.05);assert.equal(h.c.clearSounds.filter(n=>n==='capture').length,count+1);h.tick(.5);assert.equal(h.c.clearSounds.filter(n=>n==='capture').length,count+1);
 }
 assert.equal(h.run('TRAINING_LESSONS[5].lines[0]'),'最後はこの戦場でもっとも重要な戦車の訓練です');
});

test('shot counters use red circles only after a real cannon shot and at least three actual MG rounds',()=>{
 const h=fixture();h.lesson(5);h.run('p.tank=training.vehicle;syncTrainingHud()');assert.equal(h.nodes.get('trainingTask').textContent,'主砲 —　マシンガン — 0 / 3発');
 h.run("fire(p.x,p.y,0,'ally','v',630,700,1)");assert.equal(h.run('training.shots.v'),0);
 h.run("fire(p.x,p.y,0,'p','c',630,700,3);training.hudKey='';syncTrainingHud()");assert.match(h.nodes.get('trainingTask').textContent,/主砲 🔴/);
 for(let n=1;n<=3;n++){h.run("fire(p.x,p.y,0,'p','v',630,700,1);training.hudKey='';syncTrainingHud();updateTrainingMission(.01)");assert.equal(h.run('training.shots.v'),n);assert.equal(h.run('training.phase'),n<3?'active':'clearPending');assert.ok(h.nodes.get('trainingTask').textContent.includes('マシンガン '+(n<3?'—':'🔴')+' '+n+' / 3発'));}
});
test('a direct cannon hit on a target uses the standard explosion once, while MG hits keep their smaller effect',()=>{
 const h=fixture();h.lesson(5);h.run('p.tank=training.vehicle;p.x=training.vehicle.x;p.y=training.vehicle.y;trainingEnterLesson(6)');h.talk();h.c.targetSounds=[];h.run('sfx=(name)=>targetSounds.push(name)');
 h.run("var target=training.targets[0],angle=-Math.PI/2;fire(p.x,p.y-44,angle,'p','c',630,700,3)");h.tick(.35);assert.equal(h.run('training.targets[0].hit'),true);assert.equal(h.c.targetSounds.filter(n=>n==='shellExplosion').length,1);assert.ok(h.run('fx.length>0'));assert.ok(h.run('flash>0'));assert.equal(h.run('training.targets.filter(t=>t.hit).length'),1);
 h.run("var target=training.targets[1],angle=0;fire(p.x+44,p.y,angle,'p','v',630,700,1)");h.tick(.35);assert.equal(h.run('training.targets[1].hit'),true);assert.equal(h.c.targetSounds.filter(n=>n==='shellExplosion').length,1);assert.ok(h.c.targetSounds.includes('coverBreak'));
 h.run('draw(null);drawMission()');assert.equal(h.run('training.targets.every(t=>!("label" in t))'),true);
});
