// Input-handler snapshot from 3ace2ea577989510c805256d89766186326b09ef (index.html).
// Only the dead-zone constant is parameterized so both modes use identical sensitivity.
if(window.inputTestMode==='touch')(function(){
// iPhone Chrome/Safari: synthetic KeyboardEvent に依存せず、ゲーム内部の入力状態を直接更新する。
const press=(c)=>{
 if(keys[c]) return;
 keys[c]=true;
 if(c==='ArrowUp'||c==='ArrowDown')shiftSniperLens(c==='ArrowUp'?1:-1);
 if(c==='KeyD'){if(p&&p.tank)cannonReq=true;else bombReq=true;}
 if(c==='KeyA')interact=true;
 if(c==='KeyS'&&!(p&&p.tank)){if(skill==='partner'&&state==='play')startPartnerOrder();else skillReq=true;}
};
const release=(c)=>{if(c==='KeyS'&&skill==='partner')finishPartnerOrder(true);keys[c]=false;};
const cap=(el,e)=>{if(typeof e.pointerId!=='number')return;try{el.setPointerCapture(e.pointerId);}catch(_){}};
const debugToggleBtn=document.getElementById('debugToggleBtn'),debugRoutesBtn=document.getElementById('debugRoutesBtn');
const debugModeLabel=()=>debugMode===1?'無敵モード':debugMode===2?'無敵＋索敵解除':debugMode===3?'無敵＋戦闘機∞燃料':debugMode===4?'描画診断（30秒）':'無敵モード OFF';
if(debugToggleBtn){
 let lastDebugButtonState='';
 const syncDebugToggleButton=()=>{
  const snapshot=debugMode+'|'+state+'|'+patrolRoutesVisible;if(snapshot===lastDebugButtonState)return;lastDebugButtonState=snapshot;
  const active=debugMode>0,playable=state==='play';
  debugToggleBtn.classList.toggle('on',active);
  debugToggleBtn.setAttribute('aria-pressed',active?'true':'false');
  debugToggleBtn.setAttribute('aria-label',playable?('Pキー相当：'+debugModeLabel()):'無敵モード切替（プレイ中のみ）');
  debugToggleBtn.title=playable?('Pキー相当：'+debugModeLabel()):'無敵モード切替（プレイ中のみ）';
  debugToggleBtn.style.opacity=playable?'1':'.5';
  if(debugRoutesBtn){const enabled=!!patrolRoutesVisible;debugRoutesBtn.classList.toggle('on',enabled);debugRoutesBtn.setAttribute('aria-pressed',String(enabled));debugRoutesBtn.setAttribute('aria-label','Lキー相当：巡回ルート表示 '+(enabled?'ON':'OFF'));debugRoutesBtn.title='Lキー相当：巡回ルート表示 '+(enabled?'ON':'OFF');debugRoutesBtn.disabled=!playable;}
 };
 debugToggleBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
 debugToggleBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(state!=='play'||!isDeveloperMode())return;toggleDebugInvincible();syncDebugToggleButton();});
 if(debugRoutesBtn){
  debugRoutesBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
  debugRoutesBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();togglePatrolRoutes();syncDebugToggleButton();});
 }
 syncDebugToggleButton();
 setInterval(syncDebugToggleButton,250);
}

const buttonPointers=new Map();
// 指の操作はTouch.identifierで統一し、Pointer Eventsとの二重処理を避ける。
// 開始通知が欠けても、操作部から始まったtouchmoveで復帰できる。定期監視はしない。
const touchControls=new Map();
const touchId=t=>'touch:'+t.identifier;
const touchInput=(t,e)=>({pointerId:touchId(t),pointerType:'touch',clientX:t.clientX,clientY:t.clientY,
 cancelable:e.cancelable,preventDefault:()=>{if(e.cancelable)e.preventDefault();}});
function releaseControlCapture(el,id){if(typeof id!=='number')return;try{if(el.hasPointerCapture(id))el.releasePointerCapture(id);}catch(_){} }
function bindTouchControl(el,pointer,down,move,up,cancel){
 const control={pointer,down,move,up,cancel};touchControls.set(el,control);
 el.addEventListener('touchstart',e=>{
  if(state!=='play'||pointer()!==null)return;
  for(const t of e.changedTouches)if(el.contains(t.target)){down(touchInput(t,e));break;}
 },{passive:false});
 // Touch Eventsは指が領域外へ動いても開始要素へ届く。ページ全体のスクロールを同期処理で待たせない。
 el.addEventListener('touchmove',e=>{
  if(state!=='play')return;
  for(const t of e.changedTouches){
   if(pointer()===null&&el.contains(t.target))down(touchInput(t,e));
   if(pointer()===touchId(t)){if(e.cancelable)e.preventDefault();if(move)move(touchInput(t,e));break;}
  }
 },{passive:false});
}
function finishControlTouches(e,cancelled){
 for(const c of touchControls.values()){
  const id=c.pointer();if(typeof id!=='string')continue;
  let ended=false;
  for(const t of e.changedTouches||[])if(id===touchId(t)){(cancelled?c.cancel:c.up)(touchInput(t,e));ended=true;break;}
  if(ended)continue;
  let present=false;for(const t of e.touches)if(id===touchId(t)){present=true;break;}
  if(!present)c.cancel();
 }
}
document.addEventListener('touchend',e=>finishControlTouches(e,false),{capture:true,passive:false});
document.addEventListener('touchcancel',e=>finishControlTouches(e,true),{capture:true,passive:false});
document.querySelectorAll('[data-k]').forEach(el=>{const c=el.dataset.k;
 const down=e=>{e.preventDefault();if(buttonPointers.has(el))return;buttonPointers.set(el,e.pointerId);cap(el,e);el.classList.add('on');press(c);};
 const up=e=>{if(!buttonPointers.has(el)||(e&&buttonPointers.get(el)!==e.pointerId))return;if(e&&e.cancelable)e.preventDefault();const id=buttonPointers.get(el);buttonPointers.delete(el);el.classList.remove('on');release(c);if(el.id==='skillBtn')finishSkillAim();releaseControlCapture(el,id);};
 el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')down(e);},{passive:false});
 el.addEventListener('pointerup',up,{passive:false});
 el.addEventListener('pointercancel',up,{passive:false});
 el.addEventListener('lostpointercapture',up,{passive:false});
 addEventListener('pointerup',up,{capture:true,passive:false});
 addEventListener('pointercancel',up,{capture:true,passive:false});
 bindTouchControl(el,()=>buttonPointers.get(el)??null,e=>{down(e);if(el.id==='skillBtn')beginSkillAim(e);},el.id==='skillBtn'?e=>moveSkillAim(e):null,up,up);
});

// D/S/E操作: D=爆弾/主砲/爆撃、S=スキル/MG、E=搭乗/降車。
const actionBtn=document.getElementById('actionBtn'),actionGlyph=document.getElementById('actionGlyph'),actionLabel=document.getElementById('actionLabel'),actionCooldown=document.getElementById('actionCooldown'),actionCooldownText=document.getElementById('actionCooldownText');
const skillBtn=document.getElementById('skillBtn'),skillLabel=document.getElementById('skillLabel'),skillCooldown=document.getElementById('skillCooldown'),skillCooldownText=document.getElementById('skillCooldownText');
let actionKey=null,lastActionMode='',lastActionUiFrame=0,lastActionLabel='',lastSkillLabel='';
const paintRing=(el,rem,max,color='#ffd27a')=>{const ratio=Math.max(0,Math.min(1,rem/Math.max(.01,max))),deg=Math.round(ratio*360),active=rem>.02,key=deg+'|'+color+'|'+active;if(el._ringPaintKey===key)return;el._ringPaintKey=key;el.style.background='conic-gradient('+color+' '+deg+'deg, rgba(255,255,255,.13) '+deg+'deg)';el.classList.toggle('on',active);};
const syncActionButton=()=>{
 const now=performance.now();if(now-lastActionUiFrame<45)return;lastActionUiFrame=now;
 const armoredMode=!!(p&&p.tank&&p.tank.t.id==='armored');
 const truckMode=!!(p&&p.tank&&p.tank.kind==='truck'),fighterMode=!!(p&&p.tank&&p.tank.kind==='fighter'),tankMode=!!(p&&p.tank&&p.tank.kind==='tank'),sniperMode=!!(p&&p.sniperMode),planted=!!(p&&!p.tank&&bombs&&bombs.some(b=>b.own==='p'&&!(b.fly>0))),mode=armoredMode?'armored':sniperMode?'sniper':truckMode?'truck':fighterMode?'fighter':tankMode?'tank':planted?'detonate':'human';
 if(mode!==lastActionMode){lastActionMode=mode;actionGlyph.textContent=truckMode||sniperMode?'×':'B';actionBtn.setAttribute('aria-label',sniperMode?'狙撃中は使用不可':truckMode?'攻撃不可':fighterMode?'爆撃':armoredMode?'SMG':tankMode?'主砲':planted?'起爆':'爆弾');}
 const specialSkillGauge=!p?.tank?skillGaugeStatus():null;
 const nextActionLabel=isPartnerDrivenVehicle()?(armoredMode?'SMG':'相棒操作'):playerVehicleGunBlocked()&&armoredMode?'相棒操作':sniperMode?'使用不可':truckMode?'攻撃不可':fighterMode?'爆撃':armoredMode?'SMG':tankMode?'主砲':planted?'起爆':'爆弾',nextSkillLabel=playerVehicleGunBlocked()?'相棒担当':sniperMode&&p?.sniperExitT>0?'収納中':armoredMode?'SMG':tankMode?'MG':fighterMode||truckMode?'—':specialSkillGauge?specialSkillGauge.touch:(p&&p.drill>0?'突貫':SKN[skill]);
 if(nextActionLabel!==lastActionLabel){lastActionLabel=nextActionLabel;actionLabel.textContent=nextActionLabel;actionBtn.setAttribute('aria-label',nextActionLabel);}
 if(nextSkillLabel!==lastSkillLabel){lastSkillLabel=nextSkillLabel;skillLabel.textContent=nextSkillLabel;}
 if(armoredMode)paintRing(actionCooldown,Math.max(0,p.vc),p.tank.t.vcd);else if((tankMode||fighterMode)&&p&&p.tank)paintRing(actionCooldown,Math.max(0,p.cc),p.tank.t.ccd);else paintRing(actionCooldown,0,1);
 if(tankMode&&p&&p.tank)paintRing(skillCooldown,Math.max(0,p.vc),Math.max(.01,p.tank.t.vcd));
 else if(specialSkillGauge)paintRing(skillCooldown,specialSkillGauge.rem,specialSkillGauge.max,specialSkillGauge.color);
 else if(!p?.tank){if(skill==='flame')paintRing(skillCooldown,Math.max(0,3-(p?.flameFuel||0)),3);else paintRing(skillCooldown,Math.max(0,p?.scd||0),Math.max(.01,p?.scdMax||1));}
 else paintRing(skillCooldown,0,1);
};
let actionPointer=null,actionAimPointer=null,actionAimStartX=0,actionAimStartY=0,skillAimPointer=null,skillAimStartX=0,skillAimStartY=0;
const updateTouchTurretAim=(e,sx,sy)=>{
 if(!p||!p.tank||p.tank.kind!=='tank')return false;
 const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.hypot(dx,dy)<7)return false;
 touchTurretAngle=Math.atan2(dy,dx);p.ang=touchTurretAngle;return true;
};
const actionDown=e=>{
 e.preventDefault();if(actionPointer!==null)return;actionPointer=e.pointerId;cap(actionBtn,e);actionBtn.classList.add('on');
 if(p&&p.sniperMode){say('狙撃中：Sで発射 / Aで解除');actionKey=null;return;}
 if(p&&p.tank&&p.tank.kind==='truck'){say('トラックは攻撃できない');actionKey=null;return;}
 if(p&&p.tank&&p.tank.kind==='tank'){
  // スマホ戦車: Dは照準スティック。ドラッグで砲塔旋回し、指を離した時だけ主砲を発射する。
  actionAimPointer=e.pointerId;actionAimStartX=e.clientX;actionAimStartY=e.clientY;actionKey=null;return;
 }
 actionKey='KeyD';press(actionKey);
};
const finishAction=(e,fireTank)=>{
 if(actionPointer===null||(e&&e.pointerId!==actionPointer))return;
 const pointer=actionPointer;actionPointer=null;if(e&&e.cancelable)e.preventDefault();
 const wasTankAim=actionAimPointer!==null&&(!e||e.pointerId===actionAimPointer);
 if(wasTankAim&&e)updateTouchTurretAim(e,actionAimStartX,actionAimStartY);
 if(wasTankAim&&fireTank&&p&&p.tank&&p.tank.kind==='tank')cannonReq=true;
 actionAimPointer=null;actionBtn.classList.remove('on');if(actionKey)release(actionKey);actionKey=null;releaseControlCapture(actionBtn,pointer);
};
actionBtn.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')actionDown(e);},{passive:false});
const moveActionAim=e=>{if(actionAimPointer===e.pointerId){e.preventDefault();updateTouchTurretAim(e,actionAimStartX,actionAimStartY);}};
actionBtn.addEventListener('pointermove',moveActionAim,{passive:false});
actionBtn.addEventListener('pointerup',e=>finishAction(e,true),{passive:false});
actionBtn.addEventListener('pointercancel',e=>finishAction(e,false),{passive:false});
actionBtn.addEventListener('lostpointercapture',e=>finishAction(e,false),{passive:false});
addEventListener('pointerup',e=>finishAction(e,true),{capture:true,passive:false});
addEventListener('pointercancel',e=>finishAction(e,false),{capture:true,passive:false});
bindTouchControl(actionBtn,()=>actionPointer,actionDown,moveActionAim,e=>finishAction(e,true),e=>finishAction(e,false));
// スマホ戦車: SはMGを押下中ずっと発射。ドラッグ中は射撃しながら砲塔を旋回する。
const beginSkillAim=e=>{if(buttonPointers.get(skillBtn)!==e.pointerId)return;if(p&&p.tank&&p.tank.kind==='tank'){skillAimPointer=e.pointerId;skillAimStartX=e.clientX;skillAimStartY=e.clientY;}};
skillBtn.addEventListener('pointerdown',beginSkillAim,{passive:false});
const moveSkillAim=e=>{if(skillAimPointer===e.pointerId){e.preventDefault();updateTouchTurretAim(e,skillAimStartX,skillAimStartY);}};
skillBtn.addEventListener('pointermove',moveSkillAim,{passive:false});
const finishSkillAim=e=>{if(skillAimPointer!==null&&(!e||e.pointerId===skillAimPointer))skillAimPointer=null;};
skillBtn.addEventListener('pointerup',finishSkillAim,{passive:false});skillBtn.addEventListener('pointercancel',finishSkillAim,{passive:false});skillBtn.addEventListener('lostpointercapture',finishSkillAim,{passive:false});
syncActionButton();setInterval(syncActionButton,50);

const pad=document.getElementById('stick'),knob=document.getElementById('knob'),st={ArrowUp:0,ArrowDown:0,ArrowLeft:0,ArrowRight:0};let act=null,stickPointerType='';
// タッチは小さなスワイプでも応答させる。従来の30%（約20px）は切替直後の短い操作を無入力にしていた。
function setDir(x,y){const m=inputTestDeadZone,n={ArrowLeft:x<-m,ArrowRight:x>m,ArrowUp:y<-m,ArrowDown:y>m};for(const k in n)if(!!st[k]!==n[k]){st[k]=n[k]?1:0;n[k]?press(k):release(k);}}
// 指を動かすたびのレイアウト読み戻しを避け、押下時の幾何情報を再利用する。
let stickGeometry=null;
function refreshStickGeometry(){const r=pad.getBoundingClientRect();stickGeometry={left:r.left,top:r.top,width:r.width,height:r.height,travel:pad.clientWidth*.3};}
function mvp(e){
 const began=performance.now();if(!stickGeometry)refreshStickGeometry();const r=stickGeometry;
 let dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}
 knob.style.transform='translate('+dx*r.travel+'px,'+dy*r.travel+'px)';setDir(dx,dy);
 gameFramePerf.inputMax=Math.max(gameFramePerf.inputMax,performance.now()-began);
}
addEventListener('resize',()=>{stickGeometry=null;});
if(window.visualViewport){visualViewport.addEventListener('resize',()=>{stickGeometry=null;});visualViewport.addEventListener('scroll',()=>{stickGeometry=null;});}
// 終了イベントを取りこぼしても、新しい押下で古い操作IDを置き換えて復帰する。
const end=e=>{
 if(act===null||(e&&e.pointerId!==act))return;
 if(e&&e.cancelable)e.preventDefault();
 const previous=act;act=null;stickPointerType='';
 knob.style.transform='';setDir(0,0);
 releaseControlCapture(pad,previous);
};
const beginStick=e=>{
 e.preventDefault();if(act!==null)end();
 act=e.pointerId;stickPointerType=e.pointerType||'';cap(pad,e);refreshStickGeometry();mvp(e);
};
pad.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')beginStick(e);},{passive:false});
// キャプチャ取得失敗・要素外での指離れにも対応。移動処理は1イベントにつき1回だけ行う。
addEventListener('pointermove',e=>{if(act!==e.pointerId)return;if(stickPointerType==='mouse'&&e.buttons===0){end(e);return;}if(e.cancelable)e.preventDefault();mvp(e);},{capture:true,passive:false});
addEventListener('pointerup',end,{capture:true,passive:false});
addEventListener('pointercancel',end,{capture:true,passive:false});
pad.addEventListener('lostpointercapture',e=>{if(!pad.hasPointerCapture(e.pointerId))end(e);},{passive:false});
// タッチの開始・移動・終了を同じTouch.identifierで追跡する。別の指の終了では解除しない。
bindTouchControl(pad,()=>act,beginStick,mvp,end,end);
if(typeof inputDiagnostics!=='undefined'&&inputDiagnostics)inputDiagnostics.controls=()=>
 'stick='+(act??'なし')+' dir='+Object.keys(st).filter(k=>st[k]).map(k=>k.replace('Arrow','')).join('/')+' B='+(actionPointer??'なし')+' S='+(buttonPointers.get(skillBtn)??'なし')+' A='+(buttonPointers.get(document.querySelector('[data-k="KeyA"]'))??'なし');


window.inputTestAdapter={read:()=>({stick:act!==null}),take:()=>{const requests={B:bombReq,S:skillReq,A:interact};bombReq=false;skillReq=false;interact=false;return requests;}};
})();
