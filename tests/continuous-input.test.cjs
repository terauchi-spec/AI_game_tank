const {test}=require('node:test'),assert=require('node:assert/strict');
const {touchInputHarness}=require('./helpers/touch-input.cjs');
const wait=[340,140],positions={B:[240,40],S:[340,40],A:[240,140]};
const held=(h,key)=>!!h.c.keys[key];
function fixture(options={}){return touchInputHarness({continuousTouch:true,...options});}
function clearInputs(h){Object.assign(h.c,{dPressHandled:false,mdown:true});h.run(h.html.slice(h.html.indexOf('const clearInputs=()=>'),h.html.indexOf("const resetBtn=document.getElementById('resetBtn');")));h.run('clearInputs()');}
test('both fingers stay on screen through 90 B/S/A actions, and the stick stops at center without lifting',()=>{
 const h=fixture();h.start(h.nodes.stick,1,50,50);h.start(h.nodes.continuousSurface,2,...wait);
 for(let i=0;i<30;i++)for(const [name,key,request] of [['B','KeyD','bombReq'],['S','KeyS','skillReq'],['A','KeyA','interact']]){
  h.c.bombReq=h.c.skillReq=h.c.interact=false;h.move(1,95,50);h.move(2,...positions[name]);assert.equal(held(h,key),true);assert.equal(h.c[request],true);assert.equal(h.touches.size,2);
  h.c[request]=false;h.move(2,...positions[name]);assert.equal(h.c[request],false,'holding a zone does not retrigger');
  h.move(2,...wait);assert.equal(held(h,key),false);assert.equal(h.c.keys.ArrowRight,true);h.move(1,50,50);assert.equal(h.c.keys.ArrowRight,false);
 }
 assert.equal(h.run('continuousStatus.actions'),90);assert.equal(h.run('act'),'touch:1');h.end(2);h.end(1);assert.equal(h.run('continuousStatus.pointer'),null);
});
test('after leaving an action, crossing another button does not activate it until returning to wait',()=>{
 const h=fixture();h.start(h.nodes.continuousSurface,1,...wait);h.move(1,...positions.B);assert.equal(h.c.bombReq,true);
 h.move(1,...positions.A);assert.equal(held(h,'KeyD'),false);assert.equal(h.c.interact,false);h.move(1,...positions.A);assert.equal(h.c.interact,false);
 h.move(1,...wait);h.move(1,...positions.A);assert.equal(h.c.interact,true);assert.equal(h.run('continuousStatus.actions'),2);
});
test('a direct start inside a button is accepted once and a second finger cannot steal the slider',()=>{
 const h=fixture();h.start(h.nodes.continuousSurface,1,...positions.A);assert.equal(h.c.interact,true);h.c.interact=false;
 h.start(h.nodes.continuousSurface,2,...positions.S);assert.equal(h.c.skillReq,false);h.end(2);assert.equal(held(h,'KeyA'),true);h.end(1);assert.equal(held(h,'KeyA'),false);
});
test('MG holds and aims inside S, releases at the edge, and a left-finger release does not cancel it',()=>{
 const h=fixture();h.c.p={tank:{kind:'tank'}};h.start(h.nodes.stick,1);h.start(h.nodes.continuousSurface,2,...wait);h.move(2,...positions.S);assert.equal(held(h,'KeyS'),true);
 h.move(2,360,40);assert.equal(h.c.touchTurretAngle,0);h.end(1);assert.equal(held(h,'KeyS'),true);h.move(2,...wait);assert.equal(held(h,'KeyS'),false);assert.equal(h.run('skillAimPointer'),null);
});
test('tank B fires once when leaving the circle, preserves the last in-zone aim and never fires on cancellation',()=>{
 for(const cancel of [false,true]){
  const h=fixture();h.c.p={tank:{kind:'tank'}};h.start(h.nodes.continuousSurface,1,...wait);h.move(1,...positions.B);h.move(1,260,40);assert.equal(h.c.touchTurretAngle,0);assert.equal(h.c.cannonReq,false);
  if(cancel)h.end(1,{cancel:true});else h.move(1,...wait);
  assert.equal(h.c.cannonReq,!cancel);if(!cancel){assert.equal(h.c.touchTurretAngle,0);h.c.cannonReq=false;h.end(1);assert.equal(h.c.cannonReq,false);}
 }
});
test('partner order starts and finishes once per S slide, and a fresh slide can order again',()=>{
 const h=fixture();h.c.skill='partner';let started=0,finished=0;h.c.startPartnerOrder=()=>started++;h.c.finishPartnerOrder=()=>finished++;
 h.start(h.nodes.continuousSurface,1,...wait);for(let i=0;i<3;i++){h.move(1,...positions.S);h.move(1,345,45);assert.equal(started,i+1);h.move(1,...wait);assert.equal(finished,i+1);}h.end(1);assert.equal(finished,3);
});
test('blur/menu reset clears both controls and cannot fire a pending main-gun shot',()=>{
 const h=fixture();h.c.p={tank:{kind:'tank'}};h.start(h.nodes.stick,1);h.start(h.nodes.continuousSurface,2,...positions.B);clearInputs(h);
 assert.equal(h.c.cannonReq,false);assert.equal(h.run('continuousStatus.pointer'),null);assert.equal(h.run('act'),null);for(const key of ['KeyA','KeyD','KeyS','ArrowRight'])assert.equal(held(h,key),false);
 h.end(2);assert.equal(h.c.cannonReq,false);h.start(h.nodes.continuousSurface,3,...positions.A);assert.equal(h.c.interact,true);
});
test('resize and native cancellation release a continuous action without firing the main gun',()=>{
 for(const cancel of [h=>h.end(1,{cancel:true}),h=>h.root.emit('resize')]){
  const h=fixture();h.c.p={tank:{kind:'tank'}};h.start(h.nodes.continuousSurface,1,...positions.B);cancel(h);assert.equal(h.c.cannonReq,false);assert.equal(h.run('continuousStatus.pointer'),null);assert.equal(h.run('actionPointer'),null);
 }
});
test('mouse drag uses surface capture, retains ownership across zones and supports release outside',()=>{
 const h=fixture();h.nodes.continuousSurface.emit('pointerdown',{pointerId:9,pointerType:'mouse',clientX:340,clientY:140});
 h.root.emit('pointermove',{pointerId:9,pointerType:'mouse',buttons:1,clientX:240,clientY:140});assert.equal(h.c.interact,true);assert.equal(h.captured.get(9),h.nodes.continuousSurface);assert.equal(h.stats.captureCalls,1);
 h.root.emit('pointerup',{pointerId:9,pointerType:'mouse',clientX:500,clientY:500});assert.equal(held(h,'KeyA'),false);assert.equal(h.run('continuousStatus.pointer'),null);
});
test('geometry is cached for each gesture, with no timers or blocking document move listeners',()=>{
 const h=fixture();h.start(h.nodes.continuousSurface,1,...wait);assert.equal(h.stats.geometryReads,4);
 for(let i=0;i<300;i++)h.move(1,...(i%2?positions.A:wait));assert.equal(h.stats.geometryReads,4);assert.equal(h.timers.size,0);assert.equal(h.doc.events.has('touchmove'),false);
});
test('continuous mode has its visible neutral stick zone and disables the unrelated 200ms hold',()=>{
 const h=fixture({buttonHold:200});h.start(h.nodes.stick,1,50,50);h.move(1,59,50);assert.equal(held(h,'ArrowRight'),false);h.move(1,62,50);assert.equal(h.c.keys.ArrowRight,true);
 h.start(h.nodes.continuousSurface,2,...positions.A);h.move(2,...wait);assert.equal(held(h,'KeyA'),false);assert.equal(h.timers.size,0);
 const normal=touchInputHarness();assert.equal(normal.nodes.continuousSurface.events.size,0);normal.start(normal.nodes.stick,1,59,50);assert.equal(normal.c.keys.ArrowRight,true);
});
test('continuous surface cannot start actions outside play',()=>{
 const h=fixture();h.c.state='paused';h.start(h.nodes.continuousSurface,1,...positions.A);assert.equal(h.c.interact,false);assert.equal(h.run('continuousStatus.pointer'),null);
});
