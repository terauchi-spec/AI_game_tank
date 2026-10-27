const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const {test}=require('node:test'),path=require('node:path');const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){
 function node(id){return{id,events:new Map(),dataset:{},style:{},setAttribute(){},classList:{add(){},remove(){},toggle(){}},addEventListener(t,f){if(!this.events.has(t))this.events.set(t,[]);this.events.get(t).push(f)},emit(t,x={}){let e={cancelable:true,preventDefault(){},...x};for(const f of this.events.get(t)||[])f(e)},setPointerCapture(){},hasPointerCapture(){return true},releasePointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100}},clientWidth:100,contains(x){return x===this}}}
 const names=['stick','knob','actionBtn','skillBtn','aBtn','actionGlyph','actionLabel','actionCooldown','actionCooldownText','skillLabel','skillCooldown','skillCooldownText'];const ns=Object.fromEntries(names.map(n=>[n,node(n)]));ns.skillBtn.dataset.k='KeyS';ns.aBtn.dataset.k='KeyA';const root=node('root'),doc=node('doc');doc.getElementById=id=>ns[id]||null;doc.querySelectorAll=()=>[ns.skillBtn,ns.aBtn];const c={document:doc,window:{},keys:{},p:null,skill:'throw',state:'play',bombs:[],SKN:{throw:'throw'},performance:{now:()=>1000},gameFramePerf:{inputMax:0},shiftSniperLens(){},skillGaugeStatus:()=>null,isPartnerDrivenVehicle:()=>false,playerVehicleGunBlocked:()=>false,setInterval(){},addEventListener:root.addEventListener.bind(root),bombReq:false,skillReq:false,interact:false,cannonReq:false};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('// iPhone Chrome/Safari: synthetic KeyboardEvent'),html.indexOf('// 古いiOS向けフォールバック')),c);return{ns,root,doc,c,read:s=>vm.runInContext(s,c)};
}

for(const btn of ['actionBtn','skillBtn','aBtn'])for(const first of ['stick','button'])test(`${btn}: ${first} first preserves independent movement and action`,()=>{
 const h=harness(),s={pointerId:1,pointerType:'touch',clientX:95,clientY:50},b={pointerId:2,pointerType:'touch',clientX:250,clientY:50};
 const sd=()=>{h.ns.stick.emit('pointerdown',s);h.ns.stick.emit('touchstart',{changedTouches:[{identifier:41,target:h.ns.stick}]})},bd=()=>{h.ns[btn].emit('pointerdown',b);h.ns[btn].emit('touchstart',{changedTouches:[{identifier:42,target:h.ns[btn]}]})};
 first==='stick'?(sd(),bd()):(bd(),sd());assert.equal(h.c.keys.ArrowRight,true);assert.equal(btn==='actionBtn'?h.c.bombReq:btn==='skillBtn'?h.c.skillReq:h.c.interact,true);
 h.doc.emit('touchend',{touches:[{identifier:41,target:h.ns.stick},{identifier:42,target:h.ns[btn]}]});assert.equal(h.c.keys.ArrowRight,true);assert.equal(h.read(btn==='actionBtn'?'actionPointer':'buttonPointers.get(document.getElementById("'+btn+'"))'),2);
 h.root.emit('pointerup',b);h.doc.emit('touchend',{touches:[{identifier:41,target:h.ns.stick}]});assert.equal(h.c.keys.ArrowRight,true);assert.ok(!(h.c.keys.KeyD||h.c.keys.KeyS||h.c.keys.KeyA));
 h.root.emit('pointerup',s);assert.equal(h.c.keys.ArrowRight,false);
});
for(const btn of ['actionBtn','skillBtn','aBtn'])test(`${btn}: missing pointerup recovers from touchend and accepts next press`,()=>{
 const h=harness();h.ns[btn].emit('pointerdown',{pointerId:2,pointerType:'touch'});h.ns[btn].emit('touchstart',{changedTouches:[{identifier:42,target:h.ns[btn]}]});
 h.doc.emit('touchend',{touches:[]});assert.equal(h.read(btn==='actionBtn'?'actionPointer!==null':`buttonPointers.has(document.getElementById('${btn}'))`),false);
 h.c.bombReq=h.c.skillReq=h.c.interact=false;h.ns[btn].emit('pointerdown',{pointerId:3,pointerType:'touch'});assert.equal(h.c.bombReq||h.c.skillReq||h.c.interact,true);
});
test('tank aim fires exactly once on global pointerup; missing pointerup cancels without a phantom shot',()=>{
 for(const missing of [false,true]){
  const h=harness();h.c.p={tank:{kind:'tank'}};const e={pointerId:7,pointerType:'touch',clientX:200,clientY:300};h.ns.actionBtn.emit('pointerdown',e);h.ns.actionBtn.emit('touchstart',{changedTouches:[{identifier:77,target:h.ns.actionBtn}]});assert.equal(h.c.cannonReq,false);
  if(missing)h.doc.emit('touchend',{touches:[]});else h.root.emit('pointerup',e);
  assert.equal(h.c.cannonReq,!missing);assert.equal(h.read('actionPointer'),null);h.c.cannonReq=false;h.ns.actionBtn.emit('pointerup',e);assert.equal(h.c.cannonReq,false);
 }
});
test('MG aim and held key clear on touch cancellation without affecting another button',()=>{
 const h=harness();h.c.p={tank:{kind:'tank'}};h.ns.skillBtn.emit('pointerdown',{pointerId:2,pointerType:'touch'});h.ns.skillBtn.emit('touchstart',{changedTouches:[{identifier:42,target:h.ns.skillBtn}]});h.ns.aBtn.emit('pointerdown',{pointerId:3,pointerType:'touch'});h.ns.aBtn.emit('touchstart',{changedTouches:[{identifier:43,target:h.ns.aBtn}]});
 h.doc.emit('touchcancel',{touches:[{identifier:43,target:h.ns.aBtn}]});assert.equal(h.c.keys.KeyS,false);assert.equal(h.read('skillAimPointer'),null);assert.equal(h.c.keys.KeyA,true);
});

test('unrelated touchend does not clear a mouse-held action',()=>{
 const h=harness();h.ns.actionBtn.emit('pointerdown',{pointerId:8,pointerType:'mouse'});h.doc.emit('touchend',{touches:[]});assert.equal(h.read('actionPointer'),8);h.root.emit('pointerup',{pointerId:8});assert.equal(h.read('actionPointer'),null);
});
