const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/input-test-common.js'),'utf8');
function harness(){
 const nodes=new Map(),events=new Map(),microtasks=[];let held=false;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,style:{},textContent:'',dataset:{},setAttribute(){},addEventListener(){},closest:()=>true});return nodes.get(id);};
 const c={location:{search:'?mode=touch&zone=12'},URLSearchParams,performance:{now:()=>1000},queueMicrotask:fn=>microtasks.push(fn),
  document:{getElementById:node,createElement:()=>({style:{}}),body:{appendChild(){}},addEventListener(type,fn,options={}){if(!events.has(type))events.set(type,[]);events.get(type).push({fn,capture:!!options.capture});}}};
 c.window=c;vm.createContext(c);vm.runInContext(source,c);
 c.inputTestAdapter={read:()=>({stick:held}),take:()=>{const r={A:c.interact,B:false,S:false};c.interact=false;return r;}};
 const flush=()=>{while(microtasks.length)microtasks.shift()();};
 function emit(type,handle){
  const t={identifier:7,target:node('stick'),clientX:50,clientY:40},e={type,target:t.target,changedTouches:[t],touches:type==='touchend'?[]:[t]};
  for(const h of events.get(type)||[])if(h.capture)h.fn(e);
  // Native dispatch can checkpoint between callbacks. Observation must wait for bubble,
  // rather than assuming a queued microtask waits for every input listener.
  flush();handle();
  for(const h of events.get(type)||[])if(!h.capture)h.fn(e);flush();
 }
 return{c,node,emit,hold(value){held=value;c.keys.ArrowUp=value;}};
}
test('display observes accepted input after the control handler, not before it',()=>{
 const h=harness();h.emit('touchstart',()=>h.hold(true));assert.match(h.node('metrics').textContent,/方向 ↑ \/ stick 保持中/);
 h.emit('touchend',()=>h.hold(false));assert.match(h.node('metrics').textContent,/方向 なし \/ stick なし/);assert.match(h.node('metrics').textContent,/T 開始1 移動0 終了1/);
});
test('accepted action counts update on the same event and do not require a following touch',()=>{
 const h=harness();h.emit('touchstart',()=>{h.c.interact=true;});assert.match(h.node('metrics').textContent,/受付回数 B 0 \/ S 0 \/ A 1/);
 h.emit('touchend',()=>{});assert.match(h.node('metrics').textContent,/受付回数 B 0 \/ S 0 \/ A 1/);
});
