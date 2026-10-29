const {test}=require('node:test'),assert=require('node:assert/strict');
const {touchInputHarness}=require('./helpers/touch-input.cjs');
for(const [id,key] of [['actionBtn','KeyD'],['skillBtn','KeyS'],['aBtn','KeyA']]){
 test(`${id}: quick tap stays down until 200ms from press, without owning the released finger`,()=>{
  const h=touchInputHarness({buttonHold:200});h.start(h.nodes[id],1);h.advance(20);h.end(1);
  assert.equal(h.c.keys[key],true);h.start(h.nodes.stick,2);assert.equal(h.c.keys.ArrowRight,true);
  h.advance(179);assert.equal(h.c.keys[key],true);h.advance(1);assert.equal(h.c.keys[key],false);assert.equal(h.c.keys.ArrowRight,true);assert.equal(h.timers.size,0);
 });
 test(`${id}: long hold releases immediately and cancel never waits`,()=>{
  const h=touchInputHarness({buttonHold:200});h.start(h.nodes[id],1);h.advance(250);h.end(1);assert.equal(h.c.keys[key],false);assert.equal(h.timers.size,0);
  h.start(h.nodes[id],2);h.end(2,{cancel:true});assert.equal(h.c.keys[key],false);assert.equal(h.timers.size,0);
 });
 test(`${id}: rapid re-tap accepts a new action and replaces the pending release`,()=>{
  const h=touchInputHarness({buttonHold:200});h.start(h.nodes[id],1);h.advance(10);h.end(1);h.advance(40);
  h.c.bombReq=h.c.skillReq=h.c.interact=false;h.start(h.nodes[id],2);assert.equal(h.c.bombReq||h.c.skillReq||h.c.interact,true);
  h.advance(10);h.end(2);assert.equal(h.timers.size,1);h.advance(140);assert.equal(h.c.keys[key],true);h.advance(50);assert.equal(h.c.keys[key],false);
 });
}
test('tank main gun waits until minimum hold completes, aims immediately, and never fires after cancellation',()=>{
 const h=touchInputHarness({buttonHold:200});h.c.p={tank:{kind:'tank'}};h.start(h.nodes.actionBtn,1,30,30);h.move(1,60,30);assert.equal(h.c.touchTurretAngle,0);
 h.advance(20);h.end(1);assert.equal(h.c.cannonReq,false);assert.equal(h.run('actionPointer'),null);h.advance(180);assert.equal(h.c.cannonReq,true);
 h.c.cannonReq=false;h.start(h.nodes.actionBtn,2);h.end(2,{cancel:true});h.advance(200);assert.equal(h.c.cannonReq,false);
});
test('independent B/S/A pending releases and blur reset do not leave keys or delayed shots',()=>{
 const h=touchInputHarness({buttonHold:200});Object.assign(h.c,{dPressHandled:false,mdown:true});h.run(h.html.slice(h.html.indexOf('const clearInputs=()=>'),h.html.indexOf("const resetBtn=document.getElementById('resetBtn');")));
 for(const [i,id] of ['actionBtn','skillBtn','aBtn'].entries()){h.start(h.nodes[id],i);h.end(i);}
 assert.equal(h.timers.size,3);h.run('clearInputs()');h.advance(500);for(const k of ['KeyD','KeyS','KeyA'])assert.equal(h.c.keys[k],false);assert.equal(h.timers.size,0);
 h.c.p={tank:{kind:'tank'}};h.start(h.nodes.actionBtn,9);h.end(9);h.run('clearInputs()');h.advance(500);assert.equal(h.c.cannonReq,false);
});
test('normal URLs and mouse input retain immediate release and create no timers',()=>{
 const normal=touchInputHarness();normal.start(normal.nodes.aBtn,1);normal.end(1);assert.equal(normal.c.keys.KeyA,false);assert.equal(normal.timers.size,0);
 const mouse=touchInputHarness({buttonHold:200});mouse.nodes.aBtn.emit('pointerdown',{pointerId:1,pointerType:'mouse'});mouse.root.emit('pointerup',{pointerId:1});assert.equal(mouse.c.keys.KeyA,false);assert.equal(mouse.timers.size,0);
});
test('pending tank shot does not fire after changing vehicle or leaving play',()=>{
 for(const change of [h=>h.c.p.tank={kind:'tank'},h=>h.c.state='paused']){
  const h=touchInputHarness({buttonHold:200});h.c.p={tank:{kind:'tank'}};h.start(h.nodes.actionBtn,1);h.end(1);change(h);h.advance(200);assert.equal(h.c.cannonReq,false);
 }
});
