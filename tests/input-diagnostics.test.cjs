const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/input-diagnostics.js'),'utf8');
function harness(search='?inputDebug=1'){
 const nodes=[],events=new Map();let now=1000;
 const forbidden=()=>{throw Error('diagnostics must not schedule, fetch or store');};
 const c={location:{search},URLSearchParams,performance:{now:()=>now},state:'play',GAME_VERSION:'test',keys:{ArrowRight:true,KeyA:false},p:{x:120,y:300},partnerOrder:{},
  document:{createElement(tag){const node={tagName:tag,style:{},setAttribute(){},textContent:''};nodes.push(node);return node;},body:{appendChild(){}},
   addEventListener(type,fn,options){events.set(type,{fn,options});}},setTimeout:forbidden,setInterval:forbidden,requestAnimationFrame:forbidden,fetch:forbidden,localStorage:{setItem:forbidden}};
 vm.createContext(c);vm.runInContext(source+';api=inputDiagnostics;',c);
 return{c,nodes,events,frame(t){now=t;c.api.frame(t);},emit(type,props={}){let prevented=false;const e={type,cancelable:true,preventDefault(){prevented=true;},...props};events.get(type).fn(e);assert.equal(prevented,false,'observation never consumes input');}};
}
test('normal URLs register no observers and allocate no DOM or timers',()=>{
 for(const search of ['', '?inputDebug=0','?other=1']){const h=harness(search);assert.equal(h.c.api,null);assert.equal(h.nodes.length,0);assert.equal(h.events.size,0);}
});
test('diagnostic URL shows delivered touch targets, coordinates, held controls and motion locks',()=>{
 const h=harness(),t={identifier:9,target:{id:'c'},clientX:34,clientY:700};h.c.api.controls=()=> 'stick=なし';
 h.emit('touchstart',{touches:[t],changedTouches:[t],target:t.target});h.emit('pointerdown',{pointerId:8,target:{dataset:{k:'KeyA'}},clientX:300,clientY:720});h.c.p.grappleT=.3;h.frame(1000);
 const text=h.nodes[0].textContent;assert.match(text,/T 開始1/);assert.match(text,/P 開始1/);assert.match(text,/#c 34,700/);assert.match(text,/保持 ArrowRight/);assert.match(text,/stick=なし/);assert.match(text,/気絶操作/);assert.match(text,/位置 120,300/);
 assert.equal(h.nodes[1].style.display,'block');assert.equal(h.nodes[1].style.transform,'translate(22px,688px)');
 h.emit('touchend',{touches:[],changedTouches:[t]});h.frame(1100);assert.equal(h.nodes[1].style.display,'none');
 for(const {options} of h.events.values()){assert.equal(options.passive,true);assert.equal(options.capture,true);}
});
test('diagnostic display is throttled, uses fixed nodes and retains a bounded event history',()=>{
 const h=harness(),t={identifier:1,target:{id:'stick'},clientX:20,clientY:40};h.frame(1000);const first=h.nodes[0].textContent;
 for(let i=0;i<100;i++)h.emit('touchstart',{touches:[t],changedTouches:[t]});h.frame(1050);assert.equal(h.nodes[0].textContent,first);h.frame(1100);
 assert.match(h.nodes[0].textContent,/T 開始100/);assert.equal(h.nodes[0].textContent.split('T開始').length-1,6);assert.equal(h.nodes.length,6);
 h.c.state='paused';h.emit('touchstart',{touches:[t],changedTouches:[t]});h.frame(1200);assert.match(h.nodes[0].textContent,/T 開始100/);assert.equal(h.nodes[1].style.display,'none');
});
