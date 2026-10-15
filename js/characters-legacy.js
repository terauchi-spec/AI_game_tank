// Archived original character rendering from commit 4141005.
// Not loaded by the game. The same original functions remain as live fallbacks
// in index.html; this archive protects the exact original poses and equipment.

function legacy_soldier(x,y,face,isP,alert,moving,elite=false,commander='',weaponVisible=alert,playerStripe=isP){
 const sw=moving?Math.sin(performance.now()/110)*3:0,armSw=!isP&&weaponVisible?0:sw;
 const uni=isP?'#6f8a55':elite?'#f2f1e9':alert?'#a8463c':'#56628a',dk=isP?'#4a6038':elite?'#b9bab5':alert?'#6e2a24':'#3c4566',hel=isP?'#587044':elite?'#dedfd9':alert?'#7a2e28':'#444f70';
 g.save();g.translate(x,y);
 g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(1,2,8,10,0,0,6.28);g.fill();
 g.rotate(face);g.scale(1.3,1.3);
 g.fillStyle='#0c0c0c';g.fillRect(sw-3.5,-6,6.5,4.5);g.fillRect(-sw-3.5,1.5,6.5,4.5);
 g.fillStyle='#4a3a2a';g.fillRect(sw-2.5,-5,4.5,2.5);g.fillRect(-sw-2.5,2.5,4.5,2.5);
 g.fillStyle='#0c0c0c';g.fillRect(-10,-5.5,6,11);g.fillStyle=dk;g.fillRect(-9,-4.5,4,9);
 if(!isP&&commander==='blue'){
  // 背面の無線機と長いアンテナ。徒歩アニメーションから独立した装備。
  g.fillStyle='#101713';g.fillRect(-15,-6.5,9,13);
  g.fillStyle='#637357';g.fillRect(-14,-5.5,7,11);
  g.fillStyle='#25342b';g.fillRect(-13,-3.5,4,4);
  g.fillStyle='#c6c9a6';g.fillRect(-13,2,2,2);g.fillRect(-10,2,2,2);
  g.strokeStyle='#111813';g.lineWidth=2.4;g.beginPath();g.moveTo(-12,-5);g.lineTo(-15,-19);g.stroke();
  g.strokeStyle='#bac4af';g.lineWidth=1;g.beginPath();g.moveTo(-12,-5);g.lineTo(-15,-19);g.stroke();
 }
 g.fillStyle='#0c0c0c';g.beginPath();g.ellipse(0,0,6.5,9.5,0,0,6.28);g.fill();g.fillStyle=uni;g.beginPath();g.ellipse(0,0,5.3,8.3,0,0,6.28);g.fill();
 if(!isP){
  if(weaponVisible){if(commander==='blue'){g.fillStyle='#0c0c0c';g.fillRect(-4,-4,31,8);g.fillStyle='#6f7853';g.fillRect(-3,-3,29,6);g.fillStyle='#1c2419';g.fillRect(22,-4,5,8);g.fillStyle='#d2c79e';g.fillRect(1,-3,4,6);}else{g.fillStyle='#0c0c0c';g.fillRect(2,-2.5,commander==='white'?32:18,5);g.fillStyle='#3a3a42';g.fillRect(4,-1.5,commander==='white'?29:15,3);g.fillStyle='#7a5a3a';g.fillRect(2,-2,6,4);if(commander==='white'){g.fillStyle='#b5bcbd';g.fillRect(11,-4.5,6,2);}}}
  g.fillStyle='#0c0c0c';g.fillRect(-2+armSw,-9,11,4.5);g.fillRect(-2-armSw,4.5,9,4.5);g.fillStyle=uni;g.fillRect(-1+armSw,-8,9,2.5);g.fillRect(-1-armSw,5.5,7,2.5);
  g.fillStyle='#e0b890';g.fillRect(7+armSw,-3.5,3,2);g.fillRect(5-armSw,3,3,2);
 }else{
  g.fillStyle='#0c0c0c';g.fillRect(-3+sw,-10.5,10,4.5);g.fillRect(-3-sw,6,10,4.5);g.fillStyle=uni;g.fillRect(-2+armSw,-9.5,8,2.5);g.fillRect(-2-armSw,7,8,2.5);
  g.fillStyle='#e0b890';g.fillRect(5+sw,-9.5,2.5,2.5);g.fillRect(5-armSw,7,2.5,2.5);
 }
 g.fillStyle='#0c0c0c';g.beginPath();g.arc(1,0,6,0,6.28);g.fill();
 g.fillStyle='#e0b890';g.beginPath();g.arc(1.6,0,4.9,0,6.28);g.fill();
 g.fillStyle=hel;g.beginPath();g.arc(-0.2,0,4.7,0,6.28);g.fill();
 g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.arc(-1.6,-1.8,1.8,0,6.28);g.fill();
 if(!isP&&commander==='white'){
  g.save();g.beginPath();g.arc(-.2,0,4.7,0,6.28);g.clip();
  g.fillStyle='#4a241f';g.fillRect(-5,-2.4,10,4.8);
  g.fillStyle='#ac4937';g.fillRect(-5,-1.7,10,3.4);g.restore();
 }
 if(isP&&playerStripe){g.fillStyle=playerStripe==='blue'?'#399bff':'#d94a3a';g.fillRect(-4.6,-1,9.4,2);}
 g.restore();}

function legacy_soldierBushOutline(x,y,face,isP,alert=false,elite=false){
 // 草むらの世界観を壊さない低コントラスト輪郭。敵兵だけ少し視認性を上げる。
 const col=isP?'rgba(169,190,139,.78)':elite?'rgba(204,176,102,.88)':alert?'rgba(188,120,100,.83)':'rgba(174,185,164,.79)';
 g.save();g.translate(x,y);g.rotate(face);g.scale(1.3,1.3);g.lineCap='round';g.lineJoin='round';
 const path=()=>{
  g.beginPath();
  g.ellipse(0,0,6.4,9.3,0,0,6.28);
  if(!isP){g.moveTo(3,0);g.lineTo(18,0);}
  else{g.moveTo(-1,-7.5);g.lineTo(6,-8.3);g.moveTo(-1,7.5);g.lineTo(6,8.3);}
 };
 g.strokeStyle=isP?'rgba(28,42,25,.62)':'rgba(24,35,23,.70)';g.lineWidth=isP?2.2:2.35;path();g.stroke();
 g.strokeStyle=col;g.lineWidth=isP?1.0:1.12;path();g.stroke();
 g.restore();
}

function legacy_drawSniperSetupPlayer(){
 if(!p)return;
 const deploying=p.sniperEnterT>0;
 // 狙撃準備中は、通常プレイヤーと同じ配色の「伏せてライフルを覗く姿」を最初から表示する。
 // 立ち姿からの変形・クロスフェードは行わず、違和感の少ないシンプルな専用ポーズに固定。
 g.save();g.translate(p.x,p.y);g.rotate(p.body);
 g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(-3,3,21,7,0,0,6.28);g.fill();
 // 脚・胴体は通常プレイヤーの配色に合わせる。
 g.fillStyle='#0c0c0c';g.fillRect(-21,-6,14,5);g.fillRect(-21,2,14,5);
 g.fillStyle='#4a6038';g.fillRect(-19,-5,12,3);g.fillRect(-19,3,12,3);
 g.fillStyle='#0c0c0c';g.beginPath();g.ellipse(-5,0,13,7,0,0,6.28);g.fill();
 g.fillStyle='#6f8a55';g.beginPath();g.ellipse(-5,0,11.5,5.7,0,0,6.28);g.fill();
 // 肩・腕。伏せたままライフルを支える。
 g.fillStyle='#0c0c0c';g.fillRect(0,-8,14,5);g.fillRect(0,3,14,5);
 g.fillStyle='#6f8a55';g.fillRect(1,-7,12,3);g.fillRect(1,4,12,3);
 g.fillStyle='#e0b890';g.fillRect(11,-6.5,3,2.5);g.fillRect(11,4,3,2.5);
 // 頭・ヘルメット。銃床に頬を寄せて照準している位置。
 g.fillStyle='#0c0c0c';g.beginPath();g.arc(8,0,6.2,0,6.28);g.fill();
 g.fillStyle='#e0b890';g.beginPath();g.arc(9,0,4.6,0,6.28);g.fill();
 g.fillStyle='#587044';g.beginPath();g.arc(7.5,0,5.4,-1.7,1.7);g.fill();
 // ライフル。展開時間中も姿勢は変えず、銃身だけごくわずかに前へ出す。
 const k=deploying?Math.max(0,Math.min(1,1-p.sniperEnterT/SNIPER_DEPLOY_TIME)):1,tip=42+4*k;
 g.fillStyle='#0c0c0c';g.fillRect(8,-3,21,6);g.fillStyle='#4b3526';g.fillRect(10,-2,12,4);
 g.fillStyle='#2d3230';g.fillRect(22,-2,tip-22,4);g.fillStyle='#aeb4ae';g.fillRect(29,-.8,tip-25,1.6);
 g.fillStyle='#111';g.fillRect(18,-5,9,2.5);g.fillRect(21,-7,4,2);
 g.restore();
 // 伏せ完了後の1秒は完全静止。小さなゲージだけで待機時間を示す。
 if(!deploying&&p.sniperReadyT>0){g.save();g.fillStyle='rgba(0,0,0,.58)';g.fillRect(p.x-22,p.y-27,44,5);g.fillStyle='#dce7b8';g.fillRect(p.x-22,p.y-27,44*(1-p.sniperReadyT/SNIPER_SETTLE_TIME),5);g.restore();}
}

function legacy_drawSniperScopedHuman(it,pr,viewRange,cy,R){
 const elite=it.kind==='elite',o=it.o||{};
 // 従来の24〜68pxの線形補間では接近しても差が小さいため、距離に反比例して拡大。
 const hh=sniperHumanHeight(pr.d,R),ww=hh*.43,top=pr.y-hh*.52;
 const falling=!o.alive&&o.sniperFallT>0;
 const fallK=falling?1-o.sniperFallT/Math.max(.01,o.sniperFallMax||.72):0;
 const uniform=elite?'#ecf0f2':'#367fc0',helmet=elite?'#f8fafb':'#428fd1';
 const shade=elite?'#abb6bf':'#205486',trim=elite?'#d3dce2':'#8abbe4';
 const outline=elite?'#58656a':'#132e49';
 g.save();
 if(falling){const anchorY=pr.y+hh*.48;g.translate(pr.x,anchorY);g.translate(fallK*ww*.35,fallK*hh*.16);g.rotate((o.sniperFallA&&Math.sin(o.sniperFallA)<0?-1:1)*fallK*1.18);g.translate(-pr.x,-anchorY);g.globalAlpha=Math.max(.28,1-fallK*.42);}
 // 両脚・両腕。軍服と同じ青/白で、輪郭だけ暗めにして背景から分離する。
 g.fillStyle=shade;g.strokeStyle=outline;g.lineWidth=Math.max(.9,hh*.021);
 for(const sx of [-1,1]){
  const legX=pr.x+sx*ww*.20-ww*.11;
  g.fillRect(legX,top+hh*.64,ww*.22,hh*.32);g.strokeRect(legX,top+hh*.64,ww*.22,hh*.32);
  const armX=pr.x+sx*ww*.38-ww*.10;
  g.fillStyle=uniform;g.fillRect(armX,top+hh*.31,ww*.22,hh*.34);g.strokeRect(armX,top+hh*.31,ww*.22,hh*.34);g.fillStyle=shade;
 }
 // 胴体 / ベスト / 肩。通常兵は青、エリート兵は白。
 g.fillStyle=uniform;g.fillRect(pr.x-ww*.34,top+hh*.29,ww*.68,hh*.40);g.strokeRect(pr.x-ww*.34,top+hh*.29,ww*.68,hh*.40);
 g.fillStyle=trim;g.fillRect(pr.x-ww*.28,top+hh*.32,ww*.15,hh*.26);g.fillRect(pr.x+ww*.13,top+hh*.32,ww*.15,hh*.26);
 g.fillStyle=shade;g.fillRect(pr.x-ww*.31,top+hh*.56,ww*.62,Math.max(1.5,hh*.055));
 // 肌の見える顔と、その上に着用する青/白のヘルメット。
 const headR=ww*.265,headY=top+hh*.16;
 g.fillStyle='#e6b894';g.strokeStyle=outline;g.beginPath();g.arc(pr.x,headY,headR,0,Math.PI*2);g.fill();g.stroke();
 g.fillStyle=helmet;g.beginPath();g.arc(pr.x,headY-headR*.10,headR*1.07,Math.PI,Math.PI*2);g.lineTo(pr.x+headR*1.07,headY+headR*.02);g.lineTo(pr.x-headR*1.07,headY+headR*.02);g.closePath();g.fill();g.stroke();
 g.fillStyle=shade;g.fillRect(pr.x-headR*1.17,headY,headR*2.34,Math.max(1.6,hh*.035));
 if(o.commander){g.fillStyle='#ffd56a';g.strokeStyle='#3a2a10';g.beginPath();g.arc(pr.x+headR*.9,headY-headR*.3,Math.max(1.5,headR*.28),0,Math.PI*2);g.fill();g.stroke();}
 // エリートはヘルメット前面に控えめな銀の徽章を付ける。
 if(elite){g.fillStyle='#576670';g.beginPath();g.arc(pr.x,headY-headR*.35,Math.max(1.2,ww*.055),0,Math.PI*2);g.fill();}
 g.restore();
 const distM=Math.max(1,distanceMeters(pr.d));
 g.textAlign='center';g.font='bold '+Math.max(10,Math.min(13,hh*.16))+'px system-ui';g.fillStyle='#eef3e8';
 g.fillText(distM+'m',pr.x,Math.min(cy+R-10,top+hh+15));
 if(!falling)drawSniperStatusIcon(pr.x,Math.max(cy-R+15,top-14),o);
}
