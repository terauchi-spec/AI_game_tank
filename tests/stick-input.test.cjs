const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(captureWorks=true){
 const handlers=()=>({events:new Map(),addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(fn);},emit(type,props={}){const e={type,cancelable:true,preventDefault(){this.prevented=true;},...props};for(const fn of this.events.get(type)||[])fn(e);return e;}});
 const root=handlers(),doc=handlers(),captured=new Set(),knob={style:{}},keys={};
 const pad={...handlers(),clientWidth:100,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),contains:el=>el===pad||el===knob,setPointerCapture(id){if(!captureWorks)throw Error('capture unavailable');captured.add(id);},hasPointerCapture:id=>captured.has(id),releasePointerCapture(id){captured.delete(id);}};
 doc.getElementById=id=>id==='stick'?pad:knob;
 const c={document:doc,window:{},addEventListener:root.addEventListener.bind(root),performance:{now:()=>0},gameFramePerf:{inputMax:0},press:k=>keys[k]=true,release:k=>keys[k]=false,cap:(el,e)=>{try{el.setPointerCapture(e.pointerId);}catch(_){}},keys};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf("const pad=document.getElementById('stick')"),html.indexOf('// 古いiOS向けフォールバック')),c);
 const down=(id=1,extra={})=>pad.emit('pointerdown',{pointerId:id,pointerType:'touch',clientX:95,clientY:50,...extra});
 const touch=id=>({identifier:id,target:pad});
 const start=id=>pad.emit('touchstart',{changedTouches:[touch(id)]});
 const neutral=()=>{for(const k of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])assert.ok(!keys[k],k+' released');assert.equal(knob.style.transform,'');assert.equal(vm.runInContext('act',c),null);};
 return{c,pad,knob,keys,root,doc,captured,down,touch,start,neutral};
}
test('release outside the stick stops movement even when pointer capture fails',()=>{
 const h=harness(false);h.down();assert.equal(h.keys.ArrowRight,true);h.root.emit('pointerup',{pointerId:1});h.neutral();
});
test('a missing pointerup is recovered by touchend while the attack finger remains down',()=>{
 const h=harness();h.down();h.start(41);h.doc.emit('touchend',{touches:[{identifier:42,target:{id:'actionBtn'}}]});h.neutral();assert.equal(h.captured.size,0);
});
test('lifting a different finger preserves a stationary stick hold; lifting its finger stops it',()=>{
 const h=harness();h.down();h.start(41);for(let i=0;i<10;i++)h.doc.emit('touchend',{touches:[h.touch(41)]});assert.equal(h.keys.ArrowRight,true);h.doc.emit('touchend',{touches:[]});h.neutral();
});
test('a fresh touch replaces a stranded pointer and ignores delayed releases from the old pointer',()=>{
 const h=harness();h.down(1);h.start(41);h.down(2,{clientX:5});h.start(42);assert.equal(h.keys.ArrowRight,false);assert.equal(h.keys.ArrowLeft,true);h.root.emit('pointerup',{pointerId:1});assert.equal(h.keys.ArrowLeft,true);h.pad.emit('lostpointercapture',{pointerId:1});assert.equal(h.keys.ArrowLeft,true);h.root.emit('pointerup',{pointerId:2});h.neutral();
});
test('global pointer cancellation and touch cancellation both release the stick',()=>{
 let h=harness();h.down();h.root.emit('pointercancel',{pointerId:1});h.neutral();h=harness();h.down();h.start(41);h.doc.emit('touchcancel',{touches:[]});h.neutral();
});
test('loss of capture stops movement, but a stale loss notification does not stop a recaptured pointer',()=>{
 const h=harness();h.down();h.pad.emit('lostpointercapture',{pointerId:1});assert.equal(h.keys.ArrowRight,true);h.captured.delete(1);h.pad.emit('lostpointercapture',{pointerId:1});h.neutral();
});
test('a new touch elsewhere clears an abandoned stick using the active touch list',()=>{
 const h=harness();h.down();h.start(41);h.doc.emit('touchstart',{touches:[{identifier:42,target:{id:'skillBtn'}}]});h.neutral();
});
test('global movement updates only the active pointer, and mouse movement with no button releases it',()=>{
 const h=harness(false);h.down(1,{pointerType:'mouse'});h.root.emit('pointermove',{pointerId:2,buttons:1,clientX:5,clientY:50});assert.equal(h.keys.ArrowRight,true);h.root.emit('pointermove',{pointerId:1,buttons:1,clientX:5,clientY:50});assert.equal(h.keys.ArrowLeft,true);h.root.emit('pointermove',{pointerId:1,buttons:0});h.neutral();
});
test('touchend without a preceding touchstart still releases, without confusing other touches',()=>{
 const h=harness();h.down();h.doc.emit('touchend',{touches:[{identifier:99,target:{id:'actionBtn'}}]});h.neutral();
});
test('hiding the browser or losing focus clears capture, movement and pending actions, then accepts a new stick',()=>{
 for(const event of ['visibilitychange','blur']){
  const h=harness();h.doc.querySelectorAll=()=>[];
  vm.runInContext("const buttonPointers=new Map();const actionBtn={classList:{remove(){}}};let actionPointer=null,actionKey=null,actionAimPointer=null,skillAimPointer=null,touchTurretAngle=null,dPressHandled=false,bombReq=true,cannonReq=true,interact=true,skillReq=true,mdown=true;",h.c);
  vm.runInContext(html.slice(html.indexOf('const clearInputs=()=>'),html.indexOf("const resetBtn=document.getElementById('resetBtn');")),h.c);
  vm.runInContext("document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInputs();});addEventListener('blur',clearInputs);",h.c);
  h.down();h.start(41);h.doc.hidden=true;(event==='blur'?h.root:h.doc).emit(event);h.neutral();assert.equal(h.captured.size,0);assert.equal(vm.runInContext('bombReq||cannonReq||interact||skillReq||mdown',h.c),false);h.down(2);assert.equal(h.keys.ArrowRight,true);
 }
});
