// Opt-in, local-only input trace. No listeners, DOM, storage, networking or timers in normal play.
const inputDiagnostics=(()=>{
 if(new URLSearchParams(location.search).get('inputDebug')!=='1')return null;
 const panel=document.createElement('pre'),dots=[];
 panel.id='inputDiagnostics';panel.setAttribute('aria-hidden','true');
 panel.style.cssText='position:fixed;left:4px;top:max(76px,env(safe-area-inset-top));z-index:120;max-width:calc(100vw - 16px);margin:0;padding:6px;background:#000c;color:#fff;font:10px/1.4 monospace;white-space:pre-wrap;pointer-events:none;user-select:none';
 document.body.appendChild(panel);
 for(let i=0;i<5;i++){
  const dot=document.createElement('div');dot.style.cssText='position:fixed;left:0;top:0;width:24px;height:24px;border:2px solid #00ffff;border-radius:50%;z-index:121;pointer-events:none;box-sizing:border-box;display:none';
  dot.setAttribute('aria-hidden','true');document.body.appendChild(dot);dots.push(dot);
 }
 const counts={touchstart:0,touchmove:0,touchend:0,touchcancel:0,pointerdown:0,pointermove:0,pointerup:0,pointercancel:0},history=[];
 let points=[],lastMove='',lastMoveAt=null,lastFrame=null,lastPaint=-Infinity,maxGap=0;
 const label=target=>{
  for(let el=target,n=0;el&&n<5;el=el.parentElement,n++){
   if(el.id)return '#'+el.id;
   if(el.dataset?.k)return el.dataset.k;
  }
  return target?.tagName||'?';
 };
 const short={touchstart:'T開始',touchend:'T終了',touchcancel:'T取消',pointerdown:'P開始',pointerup:'P終了',pointercancel:'P取消'};
 const record=e=>{
  if(typeof state!=='undefined'&&state!=='play')return;
  counts[e.type]++;
  if(e.touches)points=Array.from(e.touches).slice(0,5).map(t=>({id:t.identifier,x:Math.round(t.clientX),y:Math.round(t.clientY)}));
  const t=e.changedTouches?.[0]||e;
  const text=label(t.target||e.target)+' '+Math.round(t.clientX||0)+','+Math.round(t.clientY||0);
  if(e.type==='touchmove'){lastMove=text;lastMoveAt=performance.now();}
  if(short[e.type]){
   history.push(short[e.type]+' '+text);if(history.length>6)history.shift();
  }
 };
 for(const type of Object.keys(counts))document.addEventListener(type,record,{capture:true,passive:true});
 const api={controls:null,frame(now){
  const active=typeof state!=='undefined'&&state==='play';
  if(active&&lastFrame!==null)maxGap=Math.max(maxGap,now-lastFrame);lastFrame=active?now:null;
  if(now-lastPaint<100)return;lastPaint=now;
  const held=typeof keys!=='undefined'?Object.keys(keys).filter(k=>keys[k]).join(','):'—';
  const player=typeof p!=='undefined'?p:null;
  const blocks=[];
  if(player?.grappleT>0)blocks.push('気絶操作');if(player?.digPrep>0)blocks.push('潜伏準備');
  if(player?.sniperMode||player?.sniperEnterT>0||player?.sniperReadyT>0||player?.sniperExitT>0)blocks.push('狙撃');
  if(player?.blastAirT>0)blocks.push('吹き飛び');
  if(typeof partnerOrder!=='undefined'&&(partnerOrder.pressed||partnerOrder.drawing))blocks.push('相棒指示');
  const controls=api.controls?api.controls():'未初期化';
  panel.textContent='入力診断 '+(typeof GAME_VERSION!=='undefined'?GAME_VERSION:'')+'\n'+
   'T 開始'+counts.touchstart+' 移動'+counts.touchmove+' 終了'+counts.touchend+' 取消'+counts.touchcancel+'\n'+
   'P 開始'+counts.pointerdown+' 移動'+counts.pointermove+' 終了'+counts.pointerup+' 取消'+counts.pointercancel+'\n'+
   '移動通知 '+(lastMove||'—')+(lastMoveAt===null?'':' '+Math.round(now-lastMoveAt)+'ms前')+'\n'+
   '保持 '+(held||'なし')+' / '+controls+'\n'+
   '位置 '+(player?Math.round(player.x||0)+','+Math.round(player.y||0):'—')+'\n'+
   '状態 '+(typeof state!=='undefined'?state:'—')+' 停止理由 '+(blocks.join(',')||'なし')+' 最大間隔 '+Math.round(maxGap)+'ms\n'+history.join('\n');
  dots.forEach((dot,i)=>{
   const point=active&&points[i];dot.style.display=point?'block':'none';
   if(point)dot.style.transform='translate('+(point.x-12)+'px,'+(point.y-12)+'px)';
  });
 }};
 return api;
})();
