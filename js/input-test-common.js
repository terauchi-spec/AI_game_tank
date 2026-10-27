// Minimal dependencies for the real input-handler snapshots. No game engine or assets are loaded.
var inputTestParams=new URLSearchParams(location.search);
var inputTestMode=inputTestParams.get('mode')==='pointer'?'pointer':'touch';
var inputTestDeadZone=inputTestParams.get('zone')==='30'?.3:.12;
var keys={},p=null,skill='throw',state='play',bombs=[],SKN={throw:'Sテスト'},gameFramePerf={inputMax:0};
var bombReq=false,cannonReq=false,skillReq=false,interact=false,touchTurretAngle=null;
function shiftSniperLens(){}function skillGaugeStatus(){return null;}
function isPartnerDrivenVehicle(){return false;}function playerVehicleGunBlocked(){return false;}
function say(){}
(function(){
 const zone=String(Math.round(inputTestDeadZone*100));
 for(const mode of ['pointer','touch']){
  const a=document.getElementById(mode+'Mode');a.href='?mode='+mode+'&zone='+zone;
  if(mode===inputTestMode)a.setAttribute('aria-current','page');
 }
 const select=document.getElementById('zone');select.value=zone;
 select.addEventListener('change',()=>{location.search='?mode='+inputTestMode+'&zone='+select.value;});
 const metrics=document.getElementById('metrics'),trace=document.getElementById('trace'),counts={touchstart:0,touchmove:0,touchend:0,touchcancel:0,pointerdown:0,pointermove:0,pointerup:0,pointercancel:0};
 const actions={B:0,S:0,A:0},history=[],dots=[];let lastTarget='—',started=performance.now();
 for(let i=0;i<4;i++){const dot=document.createElement('div');dot.className='touch-dot';document.body.appendChild(dot);dots.push(dot);}
 const label=target=>{for(let el=target;el;el=el.parentElement){if(el.id)return '#'+el.id;if(el.dataset?.k)return el.dataset.k;}return '?';};
 window.inputTestRefresh=()=>{
  const api=window.inputTestAdapter;if(!api)return;
  const requests=api.take();actions.B+=Number(requests.B);actions.S+=Number(requests.S);actions.A+=Number(requests.A);
  const held=api.read(),directions=[['ArrowUp','↑'],['ArrowDown','↓'],['ArrowLeft','←'],['ArrowRight','→']].filter(([k])=>keys[k]).map(([,arrow])=>arrow).join('');
  metrics.textContent=(inputTestMode==='pointer'?'① 変更前：Pointer Events':'② 現在：Touch Events')+' / 感度 '+zone+'% / 表示v2\n'+
   'T 開始'+counts.touchstart+' 移動'+counts.touchmove+' 終了'+counts.touchend+' 取消'+counts.touchcancel+'\n'+
   'P 開始'+counts.pointerdown+' 移動'+counts.pointermove+' 終了'+counts.pointerup+' 取消'+counts.pointercancel+'\n'+
   '方向 '+(directions||'なし')+' / stick '+(held.stick?'保持中':'なし')+'\n'+
   '受付回数 B '+actions.B+' / S '+actions.S+' / A '+actions.A+'\n'+
   '最後の入力先 '+lastTarget;
  trace.textContent=history.join('\n');
 };
 for(const type of Object.keys(counts))document.addEventListener(type,e=>{
  if(!e.target.closest?.('#pad,#c'))return;
  counts[type]++;const t=e.changedTouches?.[0]||e;lastTarget=label(t.target||e.target);
  if(type!=='touchmove'&&type!=='pointermove'){
   history.push(((performance.now()-started)/1000).toFixed(2)+'s '+type+' '+lastTarget+' '+Math.round(t.clientX||0)+','+Math.round(t.clientY||0));
   if(history.length>5)history.shift();
  }
  if(e.touches)dots.forEach((dot,i)=>{const point=e.touches[i];dot.style.display=point?'block':'none';if(point)dot.style.transform='translate('+(point.clientX-10)+'px,'+(point.clientY-10)+'px)';});
 },{capture:true,passive:true});
 // Read accepted state only after capture/target input handlers have finished.
 // A microtask queued by the capture observer can run between native listeners.
 for(const type of Object.keys(counts))document.addEventListener(type,e=>{
  if(e.target.closest?.('#pad,#c'))window.inputTestRefresh();
 },{passive:true});
 document.getElementById('clearLog').addEventListener('click',()=>{for(const k in counts)counts[k]=0;for(const k in actions)actions[k]=0;history.length=0;lastTarget='—';started=performance.now();window.inputTestRefresh();});
 // The same zoom guards are used for both snapshots; only the input implementation changes.
 for(const el of [document.getElementById('stick'),document.getElementById('c')])el.addEventListener('touchstart',e=>{if(e.touches.length>1&&e.cancelable)e.preventDefault();},{capture:true,passive:false});
 for(const type of ['gesturestart','gesturechange','gestureend','dblclick'])document.addEventListener(type,e=>{if(e.cancelable)e.preventDefault();},{capture:true,passive:false});
 document.addEventListener('contextmenu',e=>e.preventDefault());
})();
