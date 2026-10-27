const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
function touchInputHarness({captureWorks=true,source=null,mode=null,deadZone=.12}={}){
 const captured=new Map(),touches=new Map(),stats={geometryReads:0,captureCalls:0};
 function node(id){return{
  id,events:new Map(),dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},
  addEventListener(type,fn,options){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push({fn,options});},
  emit(type,props={}){const e={type,cancelable:true,preventDefault(){this.prevented=true;},...props};for(const {fn} of this.events.get(type)||[])fn(e);return e;},
  contains(target){return target===this||target?.parent===this;},clientWidth:100,
  getBoundingClientRect(){stats.geometryReads++;return{left:0,top:0,width:100,height:100};},
  setPointerCapture(id){stats.captureCalls++;if(!captureWorks)throw Error('capture unavailable');captured.set(id,this);},
  hasPointerCapture(id){return captured.get(id)===this;},releasePointerCapture(id){captured.delete(id);}
 };}
 const names=['stick','knob','actionBtn','skillBtn','aBtn','actionGlyph','actionLabel','actionCooldown','actionCooldownText','skillLabel','skillCooldown','skillCooldownText'];
 const nodes=Object.fromEntries(names.map(id=>[id,node(id)])),root=node('window'),doc=node('document');nodes.knob.parent=nodes.stick;
 nodes.skillBtn.dataset.k='KeyS';nodes.aBtn.dataset.k='KeyA';doc.getElementById=id=>nodes[id]||null;doc.querySelectorAll=()=>[nodes.skillBtn,nodes.aBtn];
 const c={document:doc,window:{inputTestMode:mode},inputTestDeadZone:deadZone,keys:{},p:null,skill:'throw',state:'play',bombs:[],SKN:{throw:'投擲'},performance:{now:()=>1000},gameFramePerf:{inputMax:0},
  shiftSniperLens(){},skillGaugeStatus:()=>null,isPartnerDrivenVehicle:()=>false,playerVehicleGunBlocked:()=>false,setInterval(){},addEventListener:root.addEventListener.bind(root),
  bombReq:false,skillReq:false,interact:false,cannonReq:false,touchTurretAngle:null};
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
 return{c,nodes,root,doc,captured,touches,stats,start,move,end,run,html};
}
module.exports={touchInputHarness};
