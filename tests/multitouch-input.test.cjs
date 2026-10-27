const {test}=require('node:test'),assert=require('node:assert/strict');
const {touchInputHarness}=require('./helpers/touch-input.cjs');
for(const btn of ['actionBtn','skillBtn','aBtn'])for(const first of ['stick','button'])test(`${btn}: ${first} first preserves movement while the other finger taps`,()=>{
 const h=touchInputHarness(),s=()=>h.start(h.nodes.stick,1),b=()=>h.start(h.nodes[btn],2);
 first==='stick'?(s(),b()):(b(),s());assert.equal(h.c.keys.ArrowRight,true);
 assert.equal(btn==='actionBtn'?h.c.bombReq:btn==='skillBtn'?h.c.skillReq:h.c.interact,true);
 h.end(2);assert.equal(h.c.keys.ArrowRight,true);h.move(1,5,50);assert.equal(h.c.keys.ArrowLeft,true);
 h.end(1);assert.equal(h.c.keys.ArrowLeft,false);assert.ok(!(h.c.keys.KeyA||h.c.keys.KeyS||h.c.keys.KeyD));
});
for(const btn of ['actionBtn','skillBtn','aBtn'])test(`${btn}: missing pointerup never strands a native touch or blocks the next press`,()=>{
 const h=touchInputHarness();h.start(h.nodes[btn],1);h.end(1,{pointer:false});
 h.c.bombReq=h.c.skillReq=h.c.interact=false;h.start(h.nodes[btn],2);assert.equal(h.c.bombReq||h.c.skillReq||h.c.interact,true);
});
for(const btn of ['aBtn','actionBtn','skillBtn'])test(`${btn} then stick accepts 100 rapid alternations even without stick pointer events`,()=>{
 const h=touchInputHarness();
 for(let i=0;i<100;i++){
  h.start(h.nodes[btn],i*2);h.end(i*2);
  h.start(h.nodes.stick,i*2+1,95,50,{pointer:false});assert.equal(h.c.keys.ArrowRight,true);
  h.move(i*2+1,5,50,{pointer:false});assert.equal(h.c.keys.ArrowLeft,true);h.end(i*2+1,{pointer:false});assert.equal(h.c.keys.ArrowLeft,false);
 }
});
test('late pointerdown and pointerup cannot reset or replace an active native stick',()=>{
 const h=touchInputHarness();h.start(h.nodes.stick,1,95,50,{pointer:false});
 h.nodes.stick.emit('pointerdown',{pointerId:71,pointerType:'touch',clientX:5,clientY:50});h.root.emit('pointerup',{pointerId:71});
 assert.equal(h.c.keys.ArrowRight,true);h.move(1,5,50);assert.equal(h.c.keys.ArrowLeft,true);h.end(1);assert.equal(h.c.keys.ArrowLeft,false);
});
test('the first touchmove recovers a missing start, but touching outside controls never starts movement',()=>{
 const h=touchInputHarness();const t={identifier:7,target:h.nodes.stick,clientX:95,clientY:50};
 h.nodes.stick.emit('touchmove',{changedTouches:[t],touches:[t]});assert.equal(h.c.keys.ArrowRight,true);
 h.doc.emit('touchend',{changedTouches:[t],touches:[]});assert.equal(h.c.keys.ArrowRight,false);
 const outside={...t,identifier:8,target:{}};h.doc.emit('touchmove',{changedTouches:[outside],touches:[outside]});assert.equal(h.c.keys.ArrowRight,false);
});
test('reversed touch list order and one finger leaving never confuse the remaining controls',()=>{
 const h=touchInputHarness();h.start(h.nodes.aBtn,41);h.start(h.nodes.stick,42);
 h.doc.emit('touchmove',{changedTouches:[],touches:[...h.touches.values()].reverse()});h.end(41,{pointer:false});
 assert.equal(h.c.keys.ArrowRight,true);assert.equal(h.c.keys.KeyA,false);h.end(42);assert.equal(h.c.keys.ArrowRight,false);
});
test('tank aim fires once on real touchend and never fires on cancellation or stale pointerup',()=>{
 for(const cancel of [false,true]){
  const h=touchInputHarness();h.c.p={tank:{kind:'tank'}};h.start(h.nodes.actionBtn,1,30,30);h.move(1,60,30);
  assert.equal(h.c.cannonReq,false);assert.equal(h.c.touchTurretAngle,0);h.end(1,{cancel});assert.equal(h.c.cannonReq,!cancel);
  h.c.cannonReq=false;h.nodes.actionBtn.emit('pointerup',{pointerId:1001});assert.equal(h.c.cannonReq,false);
 }
});
test('MG cancellation clears aim and held fire without clearing the A finger',()=>{
 const h=touchInputHarness();h.c.p={tank:{kind:'tank'}};h.start(h.nodes.skillBtn,1);h.start(h.nodes.aBtn,2);h.end(1,{cancel:true});
 assert.equal(h.c.keys.KeyS,false);assert.equal(h.run('skillAimPointer'),null);assert.equal(h.c.keys.KeyA,true);
});
test('unrelated touchend does not clear a mouse-held action',()=>{
 const h=touchInputHarness();h.nodes.actionBtn.emit('pointerdown',{pointerId:8,pointerType:'mouse'});
 h.doc.emit('touchend',{touches:[],changedTouches:[]});assert.equal(h.run('actionPointer'),8);h.root.emit('pointerup',{pointerId:8});assert.equal(h.run('actionPointer'),null);
});
test('native and pointer notifications never execute a skill twice',()=>{
 const h=touchInputHarness();h.c.skill='partner';let starts=0,finishes=0;h.c.startPartnerOrder=()=>starts++;h.c.finishPartnerOrder=()=>finishes++;
 h.start(h.nodes.skillBtn,1);assert.equal(starts,1);h.end(1);assert.equal(finishes,1);
});
test('new touches do not start controls outside play',()=>{
 const h=touchInputHarness();h.c.state='paused';h.start(h.nodes.stick,1);h.start(h.nodes.actionBtn,2);assert.ok(!h.c.keys.ArrowRight);assert.equal(h.c.bombReq,false);
});

test('continuous touch handling is scoped to controls and never adds a blocking document touchmove listener',()=>{
 const h=touchInputHarness();assert.equal(h.doc.events.has('touchmove'),false);
 for(const id of ['stick','actionBtn','skillBtn','aBtn'])assert.ok(h.nodes[id].events.has('touchmove'));
});

test('native drags read layout once per gesture and never call pointer capture',()=>{
 const h=touchInputHarness();h.start(h.nodes.stick,1);
 for(let i=0;i<300;i++)h.move(1,i%2?5:95,50);
 assert.equal(h.stats.geometryReads,1);assert.equal(h.stats.captureCalls,0);h.end(1);
});
