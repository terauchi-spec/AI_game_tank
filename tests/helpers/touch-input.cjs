const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
function touchInputHarness({captureWorks=true,source=null,mode=null,deadZone=.12,buttonHold=0,touchRecovery=false,continuousTouch=false,savedControlType=null,storageThrows=false}={}){
 let now=1000,nextTimer=0;const timers=new Map(),storage=new Map(savedControlType===null?[]:[['tankGameControlTypeV1',savedControlType]]);
 const captured=new Map(),touches=new Map(),stats={geometryReads:0,captureCalls:0};
 function node(id){return{
  id,events:new Map(),dataset:{},style:{},attributes:{},classes:new Set(),classList:{add(...keys){for(const key of keys)this.owner.classes.add(key);},remove(...keys){for(const key of keys)this.owner.classes.delete(key);},toggle(key,on){const enabled=on===undefined?!this.owner.classes.has(key):on;if(enabled)this.owner.classes.add(key);else this.owner.classes.delete(key);return enabled;},contains(key){return this.owner.classes.has(key);}},setAttribute(key,value){this.attributes[key]=value;},getAttribute(key){return this.attributes[key];},focus(){},showModal(){this.open=true;},close(){this.open=false;},
  addEventListener(type,fn,options){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push({fn,options});},
  emit(type,props={}){const e={type,cancelable:true,preventDefault(){this.prevented=true;},...props};for(const {fn} of this.events.get(type)||[])fn(e);return e;},
  contains(target){return target===this||target?.parent===this;},clientWidth:100,
  getBoundingClientRect(){stats.geometryReads++;return{left:0,top:0,width:100,height:100};},
  setPointerCapture(id){stats.captureCalls++;if(!captureWorks)throw Error('capture unavailable');captured.set(id,this);},
  hasPointerCapture(id){return captured.get(id)===this;},releasePointerCapture(id){captured.delete(id);}
 };}
 const names=['stick','knob','actionBtn','skillBtn','aBtn','actionGlyph','actionLabel','actionCooldown','actionCooldownText','skillLabel','skillCooldown','skillCooldownText','continuousSurface','continuousWait','controlType1Btn','controlType2Btn','controlTypeHelp','gameMenu','gameMenuResume','gameMenuSound','gameMenuTitle','gameMenuEnd'];
 const nodes=Object.fromEntries(names.map(id=>[id,node(id)])),root=node('window'),doc=node('document');nodes.knob.parent=nodes.stick;
 nodes.skillBtn.dataset.k='KeyS';nodes.aBtn.dataset.k='KeyA';doc.getElementById=id=>nodes[id]||null;doc.querySelectorAll=()=>[nodes.skillBtn,nodes.aBtn];doc.querySelector=()=>nodes.aBtn;doc.body=node('body');
 for(const n of [...Object.values(nodes),root,doc,doc.body])n.classList.owner=n;
 const c={localStorage:{getItem(key){if(storageThrows)throw Error('storage denied');return storage.get(key)??null;},setItem(key,value){if(storageThrows)throw Error('storage denied');storage.set(key,value);}},document:doc,window:{inputTestMode:mode},inputTestDeadZone:deadZone,keys:{},p:null,skill:'throw',state:'play',bombs:[],SKN:{throw:'投擲'},location:{search:'?'+new URLSearchParams({...(buttonHold?{buttonHold}:{}),...(touchRecovery?{touchRecovery:'1'}:{}),...(continuousTouch?{continuousTouch:'1'}:{})})},URLSearchParams,clearTimeout:id=>timers.delete(id),setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,at:now+delay});return id;},performance:{now:()=>now},gameFramePerf:{inputMax:0},
  shiftSniperLens(){},skillGaugeStatus:()=>null,isPartnerDrivenVehicle:()=>false,playerVehicleGunBlocked:()=>false,setInterval(){},addEventListener:root.addEventListener.bind(root),
  bombReq:false,skillReq:false,interact:false,cannonReq:false,touchTurretAngle:null};
 for(const [id,left,top] of [['actionBtn',200,0],['skillBtn',300,0],['aBtn',200,100],['continuousWait',300,100]])nodes[id].getBoundingClientRect=()=>{stats.geometryReads++;return{left,top,width:80,height:80};};
 vm.createContext(c);const run=code=>vm.runInContext(code,c);
 run(source??html.slice(html.indexOf('// iPhone Chrome/Safari: synthetic KeyboardEvent'),html.indexOf('// 古いiOS向けフォールバック')));
 function start(el,id,x=95,y=50,{pointer=true,target=el}={}){
  const t={identifier:id,target,clientX:x,clientY:y};touches.set(id,t);
  if(pointer)el.emit('pointerdown',{pointerId:id+1000,pointerType:'touch',clientX:x,clientY:y});
  el.emit('touchstart',{changedTouches:[t],touches:[...touches.values()]});return t;
 }
 function move(id,x,y,{pointer=true}={}){
  const t=touches.get(id);Object.assign(t,{clientX:x,clientY:y});
  if(pointer){const e={pointerId:id+1000,pointerType:'touch',clientX:x,clientY:y};root.emit('pointermove',e);t.target.emit?.('pointermove',e);}
  const el=Object.values(nodes).find(n=>n.events.has('touchmove')&&n.contains(t.target));
  el?.emit('touchmove',{changedTouches:[t],touches:[...touches.values()]});
 }
 function end(id,{pointer=true,cancel=false}={}){
  const t=touches.get(id);touches.delete(id);
  if(pointer){const type=cancel?'pointercancel':'pointerup',e={pointerId:id+1000,pointerType:'touch',clientX:t.clientX,clientY:t.clientY};root.emit(type,e);t.target.emit?.(type,e);}
  doc.emit(cancel?'touchcancel':'touchend',{changedTouches:[t],touches:[...touches.values()]});
 }
 function advance(ms){const target=now+ms;while(true){const next=[...timers.entries()].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=target;}
 return{c,nodes,root,doc,captured,touches,stats,start,move,end,run,html,advance,timers,storage};
}
module.exports={touchInputHarness};
