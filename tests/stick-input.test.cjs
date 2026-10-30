const {test}=require('node:test'),assert=require('node:assert/strict');
const {touchInputHarness}=require('./helpers/touch-input.cjs');
function neutral(h){for(const k of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])assert.ok(!h.c.keys[k],k+' released');assert.equal(h.nodes.knob.style.transform,'');assert.equal(h.run('act'),null);}
test('mouse release outside the stick stops movement even when pointer capture fails',()=>{
 const h=touchInputHarness({captureWorks:false});h.nodes.stick.emit('pointerdown',{pointerId:1,pointerType:'mouse',clientX:95,clientY:50});assert.equal(h.c.keys.ArrowRight,true);h.root.emit('pointerup',{pointerId:1});neutral(h);
});
test('native touch release needs no pointer capture or pointerup',()=>{
 const h=touchInputHarness({captureWorks:false});h.start(h.nodes.stick,41,95,50,{pointer:false});assert.equal(h.c.keys.ArrowRight,true);assert.equal(h.captured.size,0);h.end(41,{pointer:false});neutral(h);
});
test('a stationary native stick survives repeated taps by another finger',()=>{
 const h=touchInputHarness();h.start(h.nodes.stick,41);for(let i=0;i<20;i++){h.start(h.nodes.aBtn,100+i);h.end(100+i);assert.equal(h.c.keys.ArrowRight,true);}h.end(41);neutral(h);
});
test('a second finger on the stick does not steal ownership from the first',()=>{
 const h=touchInputHarness();h.start(h.nodes.stick,1);h.start(h.nodes.stick,2,5,50);assert.equal(h.c.keys.ArrowRight,true);h.end(2);assert.equal(h.c.keys.ArrowRight,true);h.end(1);neutral(h);
});
test('touch cancellation stops movement; delayed pointer events do not cancel a fresh touch',()=>{
 const h=touchInputHarness();h.start(h.nodes.stick,1);h.end(1,{cancel:true});neutral(h);h.start(h.nodes.stick,2,5,50);h.root.emit('pointerup',{pointerId:1001});h.nodes.stick.emit('lostpointercapture',{pointerId:1001});assert.equal(h.c.keys.ArrowLeft,true);h.end(2);neutral(h);
});
test('mouse capture loss stops movement and unrelated pointer motion is ignored',()=>{
 const h=touchInputHarness();h.nodes.stick.emit('pointerdown',{pointerId:1,pointerType:'mouse',clientX:95,clientY:50});h.root.emit('pointermove',{pointerId:2,clientX:5,clientY:50});assert.equal(h.c.keys.ArrowRight,true);
 h.captured.delete(1);h.nodes.stick.emit('lostpointercapture',{pointerId:1});neutral(h);
});
test('touchmove follows a finger outside the stick and a missing end is reconciled from remaining touches',()=>{
 const h=touchInputHarness();h.start(h.nodes.stick,1);h.move(1,-50,50);assert.equal(h.c.keys.ArrowLeft,true);h.doc.emit('touchend',{changedTouches:[],touches:[{identifier:2,target:h.nodes.aBtn}]});neutral(h);
});
test('hiding the browser or losing focus clears inputs and accepts a new touch',()=>{
 for(const type of ['visibilitychange','blur']){
  const h=touchInputHarness();Object.assign(h.c,{dPressHandled:false,mdown:true});h.run(h.html.slice(h.html.indexOf('const clearInputs=()=>'),h.html.indexOf("const resetBtn=document.getElementById('resetBtn');")));
  h.run("document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInputs();});addEventListener('blur',clearInputs);");
  h.start(h.nodes.stick,1);h.start(h.nodes.aBtn,2);h.doc.hidden=true;(type==='blur'?h.root:h.doc).emit(type);neutral(h);assert.equal(h.c.interact,false);assert.equal(h.c.keys.KeyA,false);
  h.start(h.nodes.stick,3);assert.equal(h.c.keys.ArrowRight,true);h.end(3);neutral(h);
 }
});

test('short touch swipes leave the adopted dead zone without requiring the old 30 percent travel',()=>{
 const h=touchInputHarness();h.start(h.nodes.stick,1,50,50);assert.ok(!h.c.keys.ArrowUp);
 h.move(1,50,38);assert.equal(h.c.keys.ArrowUp,true,'24 percent of radius now responds; formerly ignored');
 h.move(1,50,50);assert.equal(h.c.keys.ArrowUp,false);h.end(1);neutral(h);
});
test('minor thumb jitter stays neutral, and mouse retains its original dead zone',()=>{
 const h=touchInputHarness();h.start(h.nodes.stick,1,50,50);h.move(1,52,47);for(const k of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])assert.ok(!h.c.keys[k]);h.end(1);
 h.nodes.stick.emit('pointerdown',{pointerId:7,pointerType:'mouse',clientX:50,clientY:38});assert.ok(!h.c.keys.ArrowUp);h.root.emit('pointerup',{pointerId:7});neutral(h);
});
test('A to a small stick swipe responds immediately across repeated handoffs',()=>{
 const h=touchInputHarness();for(let i=0;i<100;i++){
  h.start(h.nodes.aBtn,i*2,50,50);h.end(i*2);h.start(h.nodes.stick,i*2+1,50,50);
  h.move(i*2+1,50,38);assert.equal(h.c.keys.ArrowUp,true);h.end(i*2+1);neutral(h);
 }
});
