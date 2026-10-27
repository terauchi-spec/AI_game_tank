// Input-handler snapshot from c93572abd610faab2f957c601be83486f0295ea7 (index.html).
// Only the dead-zone constant is parameterized so both modes use identical sensitivity.
if(window.inputTestMode==='pointer')(function(){
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
const cap=(el,e)=>{try{el.setPointerCapture(e.pointerId);}catch(_){}};
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
document.querySelectorAll('[data-k]').forEach(el=>{const c=el.dataset.k;
 const down=e=>{e.preventDefault();if(buttonPointers.has(el))return;buttonPointers.set(el,e.pointerId);cap(el,e);el.classList.add('on');press(c);};
 const up=e=>{if(!buttonPointers.has(el)||(e&&buttonPointers.get(el)!==e.pointerId))return;if(e)e.preventDefault();buttonPointers.delete(el);el.classList.remove('on');release(c);};
 el.addEventListener('pointerdown',down,{passive:false});
 el.addEventListener('pointerup',up,{passive:false});
 el.addEventListener('pointercancel',up,{passive:false});
 el.addEventListener('lostpointercapture',up,{passive:false});
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
 actionPointer=null;if(e)e.preventDefault();
 const wasTankAim=actionAimPointer!==null&&(!e||e.pointerId===actionAimPointer);
 if(wasTankAim&&e)updateTouchTurretAim(e,actionAimStartX,actionAimStartY);
 if(wasTankAim&&fireTank&&p&&p.tank&&p.tank.kind==='tank')cannonReq=true;
 actionAimPointer=null;actionBtn.classList.remove('on');if(actionKey)release(actionKey);actionKey=null;
};
actionBtn.addEventListener('pointerdown',actionDown,{passive:false});
actionBtn.addEventListener('pointermove',e=>{if(actionAimPointer===e.pointerId){e.preventDefault();updateTouchTurretAim(e,actionAimStartX,actionAimStartY);}},{passive:false});
actionBtn.addEventListener('pointerup',e=>finishAction(e,true),{passive:false});
actionBtn.addEventListener('pointercancel',e=>finishAction(e,false),{passive:false});
actionBtn.addEventListener('lostpointercapture',e=>finishAction(e,false),{passive:false});
// スマホ戦車: SはMGを押下中ずっと発射。ドラッグ中は射撃しながら砲塔を旋回する。
skillBtn.addEventListener('pointerdown',e=>{if(buttonPointers.get(skillBtn)!==e.pointerId)return;if(p&&p.tank&&p.tank.kind==='tank'){skillAimPointer=e.pointerId;skillAimStartX=e.clientX;skillAimStartY=e.clientY;}},{passive:false});
skillBtn.addEventListener('pointermove',e=>{if(skillAimPointer===e.pointerId){e.preventDefault();updateTouchTurretAim(e,skillAimStartX,skillAimStartY);}},{passive:false});
const finishSkillAim=e=>{if(skillAimPointer!==null&&(!e||e.pointerId===skillAimPointer))skillAimPointer=null;};
skillBtn.addEventListener('pointerup',finishSkillAim,{passive:false});skillBtn.addEventListener('pointercancel',finishSkillAim,{passive:false});skillBtn.addEventListener('lostpointercapture',finishSkillAim,{passive:false});
syncActionButton();setInterval(syncActionButton,50);

const pad=document.getElementById('stick'),knob=document.getElementById('knob'),st={ArrowUp:0,ArrowDown:0,ArrowLeft:0,ArrowRight:0};let act=null,stickPointerType='',stickTouchId=null;
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
 const previous=act;act=null;stickPointerType='';stickTouchId=null;
 knob.style.transform='';setDir(0,0);
 try{if(pad.hasPointerCapture(previous))pad.releasePointerCapture(previous);}catch(_){}
};
pad.addEventListener('pointerdown',e=>{
 e.preventDefault();if(act!==null)end();
 act=e.pointerId;stickPointerType=e.pointerType||'';cap(pad,e);refreshStickGeometry();mvp(e);
},{passive:false});
// キャプチャ取得失敗・要素外での指離れにも対応。移動処理は1イベントにつき1回だけ行う。
addEventListener('pointermove',e=>{if(act!==e.pointerId)return;if(stickPointerType==='mouse'&&e.buttons===0){end(e);return;}if(e.cancelable)e.preventDefault();mvp(e);},{capture:true,passive:false});
addEventListener('pointerup',end,{capture:true,passive:false});
addEventListener('pointercancel',end,{capture:true,passive:false});
pad.addEventListener('lostpointercapture',e=>{if(!pad.hasPointerCapture(e.pointerId))end(e);},{passive:false});
// iOSでPointer Eventsの終了通知が欠落した場合も、実際のタッチ一覧で解放を確認する。
// 静止した長押しを時間切れにせず、別の指で攻撃中でもスティックの指だけを追跡する。
pad.addEventListener('touchstart',e=>{
 if(act===null||stickPointerType!=='touch')return;
 for(const touch of e.changedTouches)if(pad.contains(touch.target))stickTouchId=touch.identifier;
},{passive:true});
const reconcileStickTouches=e=>{
 if(act===null||stickPointerType!=='touch')return;
 for(const touch of e.touches){
  if(stickTouchId!==null?touch.identifier===stickTouchId:pad.contains(touch.target))return;
 }
 end();
};
document.addEventListener('touchend',reconcileStickTouches,{capture:true,passive:true});
document.addEventListener('touchcancel',reconcileStickTouches,{capture:true,passive:true});
document.addEventListener('touchstart',e=>{if(stickTouchId!==null)reconcileStickTouches(e);},{capture:true,passive:true});


window.inputTestAdapter={read:()=>({stick:act!==null}),take:()=>{const requests={B:bombReq,S:skillReq,A:interact};bombReq=false;skillReq=false;interact=false;return requests;}};
})();
