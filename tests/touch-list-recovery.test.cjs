const {test}=require('node:test'),assert=require('node:assert/strict');
const {touchInputHarness}=require('./helpers/touch-input.cjs');
function fixture(){
 const h=touchInputHarness({touchRecovery:true});
 h.press=(el,id,x=95,y=50)=>{const t=h.start(el,id,x,y);h.doc.emit('touchstart',{touches:[...h.touches.values()],changedTouches:[t]});return t;};
 h.unannounced=(el,id,x=95,y=50)=>{const t={identifier:id,target:el,clientX:x,clientY:y};h.touches.set(id,t);return t;};
 h.statsOf=()=>h.run('({...touchListStats})');return h;
}
for(const old of ['actionBtn','skillBtn','aBtn'])test(`${old} release recovers a missing stick start from the surviving touches list`,()=>{
 const h=fixture();h.press(h.nodes[old],1);h.unannounced(h.nodes.stick,2,50,40);h.end(1);
 assert.equal(h.c.keys.ArrowUp,true);assert.equal(h.run('act'),'touch:2');assert.equal(h.statsOf().missing,1);assert.equal(h.statsOf().recovered,1);
 h.move(2,5,50);assert.equal(h.c.keys.ArrowLeft,true);h.end(2);assert.equal(h.c.keys.ArrowLeft,false);assert.equal(h.run('act'),null);
});
for(const [button,key,request] of [['actionBtn','KeyD','bombReq'],['skillBtn','KeyS','skillReq'],['aBtn','KeyA','interact']])test(`stick release recovers ${button}, once per touch, without delaying the action`,()=>{
 const h=fixture();h.press(h.nodes.stick,1);h.unannounced(h.nodes[button],2);h.end(1);
 assert.equal(h.c.keys.ArrowRight,false);assert.equal(h.c.keys[key],true);assert.equal(h.c[request],true);h.c[request]=false;
 for(let i=0;i<50;i++)h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});
 assert.equal(h.c[request],false);assert.equal(h.statsOf().recovered,1);h.end(2);assert.equal(h.c.keys[key],false);
});
test('normal delivered starts, child targets and reordered lists never duplicate an action',()=>{
 const h=fixture();h.press(h.nodes.stick,1);h.press(h.nodes.aBtn,2);h.c.interact=false;
 h.doc.emit('touchmove',{touches:[...h.touches.values()].reverse(),changedTouches:[]});assert.equal(h.c.interact,false);assert.equal(h.statsOf().missing,0);h.end(2);assert.equal(h.c.keys.ArrowRight,true);
 h.unannounced({parent:h.nodes.aBtn},3);h.end(1);assert.equal(h.c.interact,true);assert.equal(h.statsOf().recovered,1);h.end(3);
});
test('a whole absent touch sequence cannot be inferred and never produces guessed movement',()=>{
 const h=fixture();h.press(h.nodes.aBtn,1);h.end(1);assert.equal(h.run('act'),null);assert.equal(h.statsOf().recovered,0);assert.equal(h.statsOf().listed,0);
});
test('outside touches, cancellation and non-play states never start actions',()=>{
 const h=fixture();h.unannounced({},1);h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});assert.equal(h.statsOf().missing,0);
 h.unannounced(h.nodes.aBtn,2);h.doc.emit('touchcancel',{touches:[...h.touches.values()],changedTouches:[]});assert.equal(h.c.interact,false);
 h.c.state='paused';h.unannounced(h.nodes.stick,3);h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});h.c.state='play';h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});assert.equal(h.run('act'),null);
});
test('unknown touches never steal an occupied control or become fresh presses when its owner leaves',()=>{
 const h=fixture();h.press(h.nodes.stick,1);h.unannounced(h.nodes.stick,2,5,50);
 h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});assert.equal(h.c.keys.ArrowRight,true);assert.equal(h.statsOf().recovered,0);
 h.end(1);assert.equal(h.run('act'),null);assert.ok(!h.c.keys.ArrowLeft);h.end(2);
});
test('input reset does not resurrect a still-held finger; a new gesture can recover afterwards',()=>{
 const h=fixture();Object.assign(h.c,{dPressHandled:false,mdown:true});h.run(h.html.slice(h.html.indexOf('const clearInputs=()=>'),h.html.indexOf("const resetBtn=document.getElementById('resetBtn');")));
 h.unannounced(h.nodes.stick,1);h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});assert.equal(h.c.keys.ArrowRight,true);h.run('clearInputs()');
 h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});assert.equal(h.run('act'),null);h.end(1);
 h.unannounced(h.nodes.stick,2);h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});assert.equal(h.c.keys.ArrowRight,true);
});
test('recovered tank aim fires once on release and never on cancellation',()=>{
 for(const cancel of [false,true]){
  const h=fixture();h.c.p={tank:{kind:'tank'}};h.press(h.nodes.stick,1);h.unannounced(h.nodes.actionBtn,2,30,30);h.end(1);assert.equal(h.c.cannonReq,false);
  h.move(2,60,30);assert.equal(h.c.touchTurretAngle,0);h.end(2,{cancel});assert.equal(h.c.cannonReq,!cancel);
 }
});
test('recovery observers are passive, create no timers and read layout only on recovered stick start',()=>{
 const h=fixture();h.unannounced(h.nodes.stick,1);const e=h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});assert.ok(!e.prevented);assert.equal(h.stats.geometryReads,1);
 for(let i=0;i<300;i++)h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});assert.equal(h.stats.geometryReads,1);assert.equal(h.timers.size,0);
 for(const {options} of h.doc.events.get('touchmove'))assert.equal(options.passive,true);
 const normal=touchInputHarness();assert.equal(normal.doc.events.has('touchmove'),false);
});
test('recovery and the older hold experiment are independent',()=>{
 const h=fixture();h.unannounced(h.nodes.aBtn,1);h.doc.emit('touchmove',{touches:[...h.touches.values()],changedTouches:[]});h.end(1);assert.equal(h.c.keys.KeyA,false);assert.equal(h.timers.size,0);
});
