const {test}=require('node:test'),assert=require('node:assert/strict');
const {touchInputHarness}=require('./helpers/touch-input.cjs');
const key='tankGameControlTypeV1';
function fixture(options={}){
 const h=touchInputHarness(options);Object.assign(h.c,{dPressHandled:false,mdown:true});
 h.run(h.html.slice(h.html.indexOf('const clearInputs=()=>'),h.html.indexOf("const resetBtn=document.getElementById('resetBtn');")));
 h.c.resetBtn={addEventListener(){},focus(){}};h.c.stopGameAudio=()=>{};h.c.finishPartnerOrder=()=>{};h.c.finalizeScore=()=>{throw Error('switching must not end the mission');};h.c.backToTitle=()=>{};h.c.syncMissionFailure=()=>{};
 h.run(h.html.slice(h.html.indexOf("const gameMenu=document.getElementById('gameMenu');"),h.html.indexOf("document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInputs();});")));
 return h;
}
test('normal game defaults to tap buttons with adopted stick; both menu options reflect selection',()=>{
 const h=fixture();assert.equal(h.run('continuousTouchMode'),false);assert.equal(h.nodes.controlType1Btn.getAttribute('aria-pressed'),'true');assert.equal(h.nodes.controlType2Btn.getAttribute('aria-pressed'),'false');assert.ok(h.doc.body.classList.contains('adopted-stick'));
 h.start(h.nodes.stick,1,59,50);assert.ok(!h.c.keys.ArrowRight);h.move(1,62,50);assert.equal(h.c.keys.ArrowRight,true);h.end(1);
 h.start(h.nodes.aBtn,2);assert.equal(h.c.interact,true);h.end(2);assert.equal(h.c.keys.KeyA,false);assert.equal(h.nodes.continuousSurface.events.size,0);
});
test('menu switches both ways while paused, persists the selection, and resumes the same mission',()=>{
 const h=fixture();h.start(h.nodes.stick,1);h.start(h.nodes.aBtn,2);h.c.openGameMenu();assert.equal(h.c.state,'paused');assert.equal(h.c.keys.ArrowRight,false);assert.equal(h.c.interact,false);
 h.nodes.controlType2Btn.emit('click');assert.equal(h.c.state,'paused');assert.equal(h.nodes.gameMenu.open,true);assert.equal(h.storage.get(key),'2');assert.ok(h.doc.body.classList.contains('continuous-input'));assert.equal(h.nodes.controlType2Btn.getAttribute('aria-pressed'),'true');
 h.nodes.gameMenuResume.emit('click');assert.equal(h.c.state,'play');h.start(h.nodes.continuousSurface,3,340,140);h.move(3,240,140);assert.equal(h.c.interact,true);h.move(3,340,140);assert.equal(h.c.keys.KeyA,false);
 h.c.openGameMenu();h.nodes.controlType1Btn.emit('click');assert.equal(h.c.state,'paused');assert.equal(h.storage.get(key),'1');assert.ok(!h.doc.body.classList.contains('continuous-input'));h.nodes.gameMenuResume.emit('click');
 h.c.interact=false;h.start(h.nodes.aBtn,4);assert.equal(h.c.interact,true);h.end(4);assert.equal(h.c.keys.KeyA,false);
});
test('saved setting is restored and takes precedence over the old experiment URL',()=>{
 for(const [saved,expected] of [['1',false],['2',true]]){
  const h=fixture({savedControlType:saved,continuousTouch:true});assert.equal(h.run('continuousTouchMode'),expected);assert.equal(h.doc.body.classList.contains('continuous-input'),expected);
 }
 const h=fixture({savedControlType:'2'});assert.equal(h.run('continuousTouchMode'),true);h.start(h.nodes.continuousSurface,1,340,140);h.move(1,240,140);assert.equal(h.c.interact,true);
 assert.equal(fixture({savedControlType:'invalid'}).run('continuousTouchMode'),false);
});
test('repeated switching installs listeners once and cannot restore old input or fire a tank shot',()=>{
 const h=fixture();h.c.p={tank:{kind:'tank'}};h.c.openGameMenu();h.nodes.controlType2Btn.emit('click');h.c.resumeGameMenu();
 h.start(h.nodes.continuousSurface,1,240,40);assert.equal(h.c.cannonReq,false);h.c.openGameMenu();assert.equal(h.run('continuousStatus.pointer'),null);assert.equal(h.c.cannonReq,false);
 const before=h.nodes.continuousSurface.events.get('touchstart').length;
 for(let i=0;i<10;i++){h.nodes.controlType1Btn.emit('click');h.nodes.controlType2Btn.emit('click');}
 assert.equal(h.nodes.continuousSurface.events.get('touchstart').length,before);assert.equal(h.c.cannonReq,false);assert.equal(h.timers.size,0);assert.equal(h.doc.events.has('touchmove'),false);
 h.nodes.controlType1Btn.emit('click');h.c.resumeGameMenu();h.c.interact=false;h.start(h.nodes.continuousSurface,2,240,140);assert.equal(h.c.interact,false,'hidden obsolete surface cannot activate a button');
});
test('denied storage does not prevent switching; menu actions outside pause do nothing',()=>{
 const h=fixture({storageThrows:true});h.nodes.controlType2Btn.emit('click');assert.equal(h.run('continuousTouchMode'),false);h.c.openGameMenu();h.nodes.controlType2Btn.emit('click');assert.equal(h.run('continuousTouchMode'),true);assert.equal(h.c.state,'paused');h.c.resumeGameMenu();h.nodes.controlType1Btn.emit('click');assert.equal(h.run('continuousTouchMode'),true);
});
