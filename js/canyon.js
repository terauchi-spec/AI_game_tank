// Wilderness terrain and oasis imagery are cached; only sandstorm dust animates.
const wildernessRockCache=new Map();
let sandIntensity=0,sandDuration=4.5,sandTime=0,sandTravel=0,sandWindSpeed=0;
const SAND_WIND_X=.9537,SAND_WIND_Y=-.3007,tumbleweeds=[];
let tumbleweedZone=null,tumbleweedCache=null,sandWeatherZone=null,sandCloudCache=null;
function clearCanyonTiles(){
 for(const c of wildernessRockCache.values())invalidateStaticRaster(c);wildernessRockCache.clear();sandIntensity=0;sandTime=0;sandTravel=0;sandWindSpeed=0;tumbleweeds.length=0;tumbleweedZone=null;sandWeatherZone=null;
}
function oasisContains(w,x,y,r=0){const rx=w.w/2+r,ry=w.h/2+r;return ((x-w.x-w.w/2)/rx)**2+((y-w.y-w.h/2)/ry)**2<1;}
function wildernessRockSprite(c){
 const im=naturalCoverImage(c,'rock');if(!assetOK(im))return im;
 if(wildernessRockCache.has(im))return wildernessRockCache.get(im);
 const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;const q=gameCanvasContext(canvas);q.drawImage(im,0,0);
 // Preserve the source's illuminated top and shaded sides; a flat tint erased these.
 const pixels=q.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const light=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2],v=Math.max(12,Math.min(225,(light-96)*1.45+112));d[i]=Math.min(255,v*1.15);d[i+1]=v*.72;d[i+2]=v*.40;}q.putImageData(pixels,0,0);
 canvas.complete=true;canvas.naturalWidth=canvas.width;canvas.naturalHeight=canvas.height;wildernessRockCache.set(im,canvas);return canvas;
}
function buildCanyonZones(){
 for(const z of ZONES)if(z.n==='荒野'){
  const top=Math.max(0,z.y1),bottom=Math.min(WH,z.y0),span=bottom-top;z.oasis=null;
  if(R()<.55){
   // Scale both dimensions together so the original shape stays intact.
   const sizeScale=.5+R(),baseW=600+R()*220,baseH=Math.min(440+R()*240,span*.42);
   const w=baseW*sizeScale,h=baseH*sizeScale;
   // Keep large ponds visible, including at the edges of the wilderness zone.
   const rawX=R()*WW,rawY=top+span*(.3+R()*.35);
   const cx=w>=WW-24?WW/2:Math.max(w/2+12,Math.min(WW-w/2-12,rawX));
   const cy=h>=span-40?(top+bottom)/2:Math.max(top+h/2+20,Math.min(bottom-h/2-20,rawY));
   z.oasis={x:cx-w/2,y:cy-h/2,w,h,oasis:true,flowSpeed:0,sizeScale};water.push(z.oasis);
   covers=covers.filter(c=>!oasisContains(z.oasis,c.x+c.w/2,c.y+c.h/2,Math.max(c.w,c.h)/2+8));
   objects=objects.filter(o=>!oasisContains(z.oasis,o.x+o.w/2,o.y+o.h/2,Math.max(o.w,o.h)/2+8));
   bushes=bushes.filter(b=>!oasisContains(z.oasis,b.x+b.w/2,b.y+b.h/2,40));rebuildSpatialGrid();
  }
  // Scattered mesas/inselbergs keep the main trail open and retain rock collision.
  for(let i=0,made=0;i<100&&made<1;i++){
   const w=110+R()*95,h=80+R()*75,x=150+R()*(WW-w-300),y=top+120+R()*Math.max(1,span-h-380),r=Math.max(w,h)*.55;
   if(hitsM(x+w/2,y+h/2,r)||(p&&Math.hypot(x+w/2-p.x,y+h/2-p.y)<200))continue;
   covers.push({kd:8,x,y,w,h,wildernessRock:1});made++;rebuildSpatialGrid();
  }
  const addShrub=(x,y,spinifex=false)=>{
   const baseSize=65+R()*30,w=spinifex?spinifexPlacementSize(baseSize,R()):baseSize,h=spinifex?w:45+R()*20,clearance=spinifex?w/2+8:40;
   if(x<12||x+w>WW-12||y<top+30||y+h>bottom-170||hitsM(x+w/2,y+h/2,clearance)||bushes.some(b=>circleHitsRect(x+w/2,y+h/2,spinifex?clearance:45,b)))return false;
   const b={x,y,w,h,spinifex};if(!spinifex&&R()<.15)b.wildFlowers=Array.from({length:3+(R()*3|0)},()=>({dx:w*(.2+R()*.6),dy:h*(.2+R()*.5),white:R()<.55}));bushes.push(b);rebuildSpatialGrid();return true;
  };
  for(let i=0,made=0;i<80&&made<3;i++)if(addShrub(35+R()*(WW-135),top+70+R()*Math.max(1,span-360),true))made++;
  if(z.oasis){const o=z.oasis;for(let i=0,made=0;i<160&&made<20;i++){const a=R()*Math.PI*2,rx=o.w/2+55+R()*50,ry=o.h/2+55+R()*50;if(addShrub(o.x+o.w/2+Math.cos(a)*rx-40,o.y+o.h/2+Math.sin(a)*ry-25))made++;}}
  initTumbleweeds(z);
 }
 rebuildSpatialGrid();
 // Relocate only patrols invalidated by a new pond or mesa, to a dry short route.
 for(const h of humans||[])if(zoneAt(h.y).n==='荒野'&&(hitsM(h.x,h.y,10)||!pOK(h.path||[h],8,false))){
  const z=zoneAt(h.y),o=z.oasis;let done=false;
  for(const yy of [h.y,o?o.y-90:h.y-100,o?o.y+o.h+110:h.y+100])for(const x of [120,WW-120,WW/2,WW/2-130,WW/2+130]){
   const y=Math.max(z.y1+160,Math.min(z.y0-250,yy)),path=[{x,y},{x,y:y-55}];if(!done&&pOK(path,10,false)){h.x=x;h.y=y;h.path=path;h.loop=false;h.wi=1;h.dir=1;h.stk=0;done=true;}
  }
 }
}
// The water and feathered bank are baked once at the same half resolution as rivers.
const OASIS_PAD=36,OASIS_CACHE_SCALE=.5;
function oasisImage(o){
 if(o.visualCache&&o.visualVersion===riverSurfaceVersion&&o.visualSoilReady===assetOK(TERRAIN_IMG['荒野']))return o.visualCache;
 if(o.visualCache)invalidateStaticRaster(o.visualCache);
 const pad=OASIS_PAD,S=OASIS_CACHE_SCALE,c=document.createElement('canvas');c.width=Math.ceil((o.w+pad*2)*S);c.height=Math.ceil((o.h+pad*2)*S);
 const q=gameCanvasContext(c),cx=o.w/2+pad,cy=o.h/2+pad,rx=o.w/2,ry=o.h/2,phase=riverHash(o,732)*Math.PI*2;
 q.setTransform(S,0,0,S,0,0);q.imageSmoothingEnabled=true;
 // Gentle lobes stay close to the elliptical shallow-water collision boundary.
 const points=Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2,k=.985+.018*Math.sin(a*3+phase)+.012*Math.sin(a*7-phase)+.006*Math.sin(a*13+phase);return{x:Math.cos(a)*rx*k,y:Math.sin(a)*ry*k};});
 const trace=(ctx,f=1)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(cx+p.x*f,cy+p.y*f):ctx.moveTo(cx+p.x*f,cy+p.y*f));ctx.closePath();};
 // Bake a sandy bottom beneath a translucent water layer, rather than a solid cyan tint.
 q.fillStyle='#b0a084';q.fillRect(0,0,o.w+pad*2,o.h+pad*2);
 const soil=TERRAIN_IMG['荒野'];if(assetOK(soil)){const pt=q.createPattern(soil,'repeat');if(pt){if(pt.setTransform&&typeof DOMMatrix!=='undefined')pt.setTransform(new DOMMatrix().scale(.725));q.globalAlpha=.28;q.fillStyle=pt;q.fillRect(0,0,o.w+pad*2,o.h+pad*2);q.globalAlpha=1;}}
 const river=TERRAIN_IMG['川'],wc=document.createElement('canvas');wc.width=c.width;wc.height=c.height;const wq=gameCanvasContext(wc);wq.setTransform(S,0,0,S,0,0);wq.imageSmoothingEnabled=true;wq.fillStyle='#427773';wq.fillRect(0,0,o.w+pad*2,o.h+pad*2);
 if(assetOK(river)){
  const iw=river.naturalWidth||river.width,ih=river.naturalHeight||river.height,ar=o.w/o.h;let sw=iw,sh=ih;
  if(ar>=iw/ih)sh=iw/ar;else sw=ih*ar;
  const sx=(iw-sw)*riverHash(o,977),sy=(ih-sh)*riverHash(o,1421);
  wq.drawImage(river,sx,sy,sw,sh,pad,pad,o.w,o.h);
 }
 // The bed becomes more visible toward the shallow shore; deep water remains subdued.
 wq.globalCompositeOperation='destination-in';wq.save();wq.translate(cx,cy);wq.scale(rx,ry);
 const clarity=wq.createRadialGradient(0,0,0,0,0,1.05);clarity.addColorStop(0,'rgba(255,255,255,.91)');clarity.addColorStop(.55,'rgba(255,255,255,.82)');clarity.addColorStop(.85,'rgba(255,255,255,.62)');clarity.addColorStop(1,'rgba(255,255,255,.39)');wq.fillStyle=clarity;wq.fillRect(-2,-2,4,4);wq.restore();
 q.save();q.setTransform(1,0,0,1,0,0);q.drawImage(wc,0,0);q.restore();
 // Faint submerged stones suggest a visible bottom in the clear shallows.
 for(let i=0;i<22;i++){const a=riverHash(o,7100+i)*Math.PI*2,r=.76+riverHash(o,7200+i)*.13,x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r,sz=1.5+riverHash(o,7300+i)*3;q.fillStyle=i%3?'rgba(168,163,133,.24)':'rgba(50,74,65,.20)';q.beginPath();q.ellipse(x,y,sz*1.5,sz,a,0,Math.PI*2);q.fill();}
 // A stepped alpha mask softens the shore instead of cutting out a crisp ellipse.
 const mask=document.createElement('canvas');mask.width=c.width;mask.height=c.height;const m=gameCanvasContext(mask);m.setTransform(S,0,0,S,0,0);m.fillStyle='#fff';
 for(let i=0;i<8;i++){m.globalAlpha=i===7?1:.12+i*.07;trace(m,1.025-i*.006);m.fill();}
 q.save();q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='destination-in';q.drawImage(mask,0,0);q.restore();
 // Wet clay and sparse moss fade out into the sand behind the water layer.
 q.globalCompositeOperation='destination-over';q.lineJoin='round';q.lineCap='round';
 for(const [width,color,f] of [[30,'rgba(73,59,32,.08)',1.018],[22,'rgba(112,82,41,.12)',1.018],[14,'rgba(98,112,52,.17)',1.016],[7,'rgba(160,145,87,.15)',1.012]]){q.strokeStyle=color;q.lineWidth=width;trace(q,f);q.stroke();}
 q.globalCompositeOperation='source-over';
 for(let i=0;i<52;i++){
  const a=riverHash(o,5100+i)*Math.PI*2,idx=Math.floor(a/Math.PI/2*points.length),p=points[idx],f=1.012+riverHash(o,5200+i)*.018,rr=1+riverHash(o,5300+i)*2;
  q.fillStyle=i%3?'rgba(88,67,39,.22)':'rgba(170,140,85,.20)';q.beginPath();q.ellipse(cx+p.x*f,cy+p.y*f,rr*1.5,rr,a,0,Math.PI*2);q.fill();
 }
 q.save();trace(q,.92);q.clip();q.strokeStyle='rgba(205,230,216,.19)';q.lineWidth=1.3;
 for(let i=0;i<16;i++){const x=pad+riverHash(o,6100+i)*o.w,y=pad+riverHash(o,6200+i)*o.h,len=9+riverHash(o,6300+i)*22;q.beginPath();q.moveTo(x,y);q.quadraticCurveTo(x+len*.5,y+2,x+len,y);q.stroke();}q.restore();
 o.visualCache=c;o.visualVersion=riverSurfaceVersion;o.visualSoilReady=assetOK(soil);return c;
}
function drawCanyonWaterfalls(cx,cy){
 // Historical hook name: still oasis ponds have no river current or waterfall.
 for(const w of water)if(w.oasis&&drawBoundsInView(w.x,w.y,w.w,w.h,cx,cy,OASIS_PAD))drawStaticRaster(oasisImage(w),w.x-OASIS_PAD,w.y-OASIS_PAD,w.w+OASIS_PAD*2,w.h+OASIS_PAD*2);
}
function drawWildernessFlowers(cx,cy){
 for(const b of bushes)if(b.wildFlowers&&drawBoundsInView(b.x,b.y,b.w,b.h,cx,cy,10))for(const f of b.wildFlowers){g.fillStyle=f.white?'#f4e8cb':'#c74732';g.beginPath();g.arc(b.x+f.dx,b.y+f.dy,2.5,0,Math.PI*2);g.fill();g.fillStyle='#d5b655';g.fillRect(b.x+f.dx-.6,b.y+f.dy-.6,1.2,1.2);}
}
function tumbleweedSprite(){
 if(tumbleweedCache)return tumbleweedCache;
 const c=document.createElement('canvas');c.width=c.height=64;const q=gameCanvasContext(c);let seed=87193;
 const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 q.lineJoin='miter';q.lineCap='butt';
 const twig=(pts,width,color)=>{
  const trace=()=>{q.beginPath();pts.forEach((p,i)=>i?q.lineTo(p.x,p.y):q.moveTo(p.x,p.y));};
  trace();q.strokeStyle='#352419';q.lineWidth=width+1.3;q.stroke();
  trace();q.strokeStyle=color;q.lineWidth=width;q.stroke();
 };
 // Airy ball of angular, weathered woody stems: no green foliage or smooth rings.
 for(let i=0;i<13;i++){
  const a=rnd()*Math.PI*2,rx=10+rnd()*13,ry=18+rnd()*7,pts=[];
  for(let k=0;k<=10;k++){const t=k/10*Math.PI*2,r=.83+rnd()*.28,x=Math.cos(t)*rx*r,y=Math.sin(t)*ry*r;pts.push({x:32+x*Math.cos(a)-y*Math.sin(a),y:32+x*Math.sin(a)+y*Math.cos(a)});}
  twig(pts,1.2+rnd()*1.2,i%3?'#926330':'#b4874d');
 }
 for(let i=0;i<22;i++){
  const a=rnd()*Math.PI*2,r1=10+rnd()*15,r2=10+rnd()*15,pts=[{x:32+Math.cos(a)*r1,y:32+Math.sin(a)*r1},{x:24+rnd()*16,y:24+rnd()*16},{x:32-Math.cos(a+.25)*r2,y:32-Math.sin(a+.25)*r2}];
  twig(pts,1+rnd()*1.7,i%4?'#9d703b':'#c09a5b');
  const p=pts[1];twig([p,{x:p.x+3+rnd()*6,y:p.y-3-rnd()*6}],.9,'#ad8148');
 }
 for(let i=0;i<15;i++){
  const a=i/15*Math.PI*2+.12*rnd(),x=32+Math.cos(a)*20,y=32+Math.sin(a)*20,tip={x:32+Math.cos(a)*(26+rnd()*4),y:32+Math.sin(a)*(26+rnd()*4)};
  twig([{x,y},tip,{x:tip.x+Math.cos(a+1)*3,y:tip.y+Math.sin(a+1)*3}],1.2,'#aa7941');
 }
 tumbleweedCache=c;return c;
}
function tumbleweedRockHit(x,y,r){
 for(const c of nearbyCovers(x,y,r+120))if(c.kd===8&&circleHitsRect(x,y,r,coverHitRect(c)||c))return true;
 for(const o of nearbyObjects(x,y,r+100))if(circleHitsRect(x,y,r,objectAABB(o)))return true;
 for(const v of cars||[])if(v.kind!=='fighter'&&Math.hypot(v.x-x,v.y-y)<r+(v.kind==='truck'?32:30))return true;
 if(p?.tank&&p.tank.kind!=='fighter'&&Math.hypot(p.x-x,p.y-y)<r+30)return true;
 return false;
}
function inTumbleweed(o){if(!o)return false;const z=zoneAt(o.y);if(z.n!=='荒野')return false;return(z.tumbleweeds||[]).some(b=>Math.hypot(o.x-b.x,o.y-b.y)<b.r+8);}
function updateTumbleweedStealth(){
 const covered=inTumbleweed(p);if(covered){clearPlayerDetection();for(const o of [...humans,...etanks])if(o._detectCache?.key==='p'){o._detectCache=null;o._nextDetectAt=0;}}return covered;
}
function resetTumbleweed(b,z,i,initial=false){
 const viewX=Math.max(0,Math.min(WW-W,p.x-W/2)),viewY=Math.max(0,Math.min(WH-H,p.y-H*.6));
 const top=initial?z.y1+50:Math.max(z.y1+50,viewY+70),bottom=initial?z.y0-70:Math.min(z.y0-70,viewY+H-70);b.r=i%2?37.5:25;b.rot=b.rot||0;b.avoidT=0;
 for(let tries=0;tries<24;tries++){
  b.seed=((b.seed||571+i*913)*1664525+1013904223)>>>0;const f=b.seed/4294967296;
  b.x=initial?35+(i*179+f*87+tries*71)%(WW-70):viewX-b.r-50;b.y=top+Math.max(1,bottom-top)*((i*.217+f)%1);
  if((!z.oasis||!oasisContains(z.oasis,b.x,b.y,b.r))&&!tumbleweedRockHit(b.x,b.y,b.r))break;
 }
}
function initTumbleweeds(z){
 z.tumbleweeds=[];for(let i=0;i<4;i++){const b={};resetTumbleweed(b,z,i,true);z.tumbleweeds.push(b);}
}
function igniteTumbleweedsByPath(path){
 if(!path||path.length<2)return;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const q of path){minX=Math.min(minX,q.x);maxX=Math.max(maxX,q.x);minY=Math.min(minY,q.y);maxY=Math.max(maxY,q.y);}
 for(const z of ZONES)if(z.n==='荒野')for(const b of z.tumbleweeds||[]){if(b.burnT>0||b.x+b.r<minX-8||b.x-b.r>maxX+8||b.y+b.r<minY-8||b.y-b.r>maxY+8)continue;
  for(let i=1;i<path.length;i++)if(pointSegDistance(b.x,b.y,path[i-1],path[i])<b.r+8){b.burnT=2.2;b.burnSeed=(b.x*13+b.y*7)|0;break;}
 }
}
function updateTumbleweeds(dt,z){
 if(!z.tumbleweeds)initTumbleweeds(z);
 for(let i=z.tumbleweeds.length-1;i>=0;i--){const b=z.tumbleweeds[i];if(b.burnT>0){b.burnT=Math.max(0,b.burnT-dt);if(b.burnT===0){z.tumbleweeds.splice(i,1);const gi=tumbleweeds.indexOf(b);if(gi>=0)tumbleweeds.splice(gi,1);}}}
 if(tumbleweedZone!==z){tumbleweeds.length=0;tumbleweeds.push(...z.tumbleweeds);tumbleweedZone=z;}
 if(sandWindSpeed<=.01)return;
 for(let i=0;i<tumbleweeds.length;i++){
  const b=tumbleweeds[i],travel=sandWindSpeed*(.24+i*.025)*dt,wind=Math.atan2(SAND_WIND_Y,SAND_WIND_X);
  const clear=(x,y)=>!tumbleweedRockHit(x,y,b.r)&&(!z.oasis||!oasisContains(z.oasis,x,y,b.r));
  b.avoidT=Math.max(0,(b.avoidT||0)-dt);let a=b.avoidT>0?b.avoidA:wind,x=b.x+Math.cos(a)*travel,y=b.y+Math.sin(a)*travel;
  if(!clear(x,y)){let found=false;const side=i%2?1:-1;for(const off of [.65,1.1,1.57]){for(const sign of [side,-side]){const aa=wind+off*sign,xx=b.x+Math.cos(aa)*travel,yy=b.y+Math.sin(aa)*travel;if(clear(xx,yy)){a=aa;x=xx;y=yy;b.avoidA=aa;b.avoidT=.4;found=true;break;}}if(found)break;}if(!found)continue;}
  b.x=x;b.y=y;b.rot+=travel/b.r;
  const viewX=Math.max(0,Math.min(WW-W,p.x-W/2)),viewY=Math.max(0,Math.min(WH-H,p.y-H*.6));
  if(b.x-b.r>viewX+W+45||b.y+b.r<viewY-45){resetTumbleweed(b,z,i);}
 }
}
function drawTumbleweeds(cx,cy){
 let im=null;for(const z of ZONES)if(z.n==='荒野')for(const b of z.tumbleweeds||[])if(drawPointInView(b.x,b.y,cx,cy,45)){
  if(!im)im=tumbleweedSprite();g.save();g.translate(b.x,b.y-Math.sin(b.rot*1.7)*2);g.rotate(b.rot);drawStaticRaster(im,-b.r,-b.r,b.r*2,b.r*2);g.restore();
  if(b.burnT>0){const t=performance.now()*.012+(b.burnSeed||0),cx=b.x,cy=b.y;g.save();g.globalCompositeOperation='lighter';for(let j=0;j<3;j++)flameBlob(cx+Math.sin(t+j*2.1)*b.r*.28,cy-b.r*.35+j*3,5+j%2*2,t+j*1.8,.68);g.restore();}
 }
}
function updateSandstorm(dt){
 const z=p&&zoneAt(p.y),arid=z&&z.n==='荒野';
 if(!arid){
  // Keep the remaining dust and existing weeds visible across the area boundary.
  sandIntensity=Math.max(0,sandIntensity-dt/1.2);sandWindSpeed*=Math.max(0,1-dt*5);sandTravel+=sandWindSpeed*dt;
  if(tumbleweedZone&&sandIntensity>0)updateTumbleweeds(dt,tumbleweedZone);
  else sandWindSpeed=0;
  sandWeatherZone=null;if(weather==='sandstorm'){weather='clear';weatherT=0;weatherNext=20+R()*30;}return false;
 }
 if(sandWeatherZone!==z){sandWeatherZone=z;weather='clear';weatherT=0;weatherNext=10;}
 if(weather==='rain'){weather='clear';weatherT=0;weatherNext=10;}
 rainIntensity=0;sandTime+=dt;
 if(weather==='sandstorm'){weatherT=Math.max(0,weatherT-dt);if(weatherT===0){weather='clear';weatherNext=Math.max(0,10-sandDuration);say('砂嵐が収まった');}}
 else{weatherNext-=dt;if(weatherNext<=0){weather='sandstorm';sandDuration=4+R()*4;weatherT=sandDuration;say('砂嵐：視界と索敵距離が低下');}}
 const k=weather==='sandstorm'?Math.max(0,Math.min(1,(sandDuration-weatherT)/.45,weatherT/.75)):0;sandIntensity=k*k*(3-2*k);
 const gust=.70+.30*(.5+.5*Math.sin(sandTime*2.3+Math.sin(sandTime*.71)));
 sandWindSpeed=620*sandIntensity*gust;sandTravel+=sandWindSpeed*dt;updateTumbleweeds(dt,z);return true;
}
function sandCloudSprite(){
 if(sandCloudCache)return sandCloudCache;const c=document.createElement('canvas');c.width=256;c.height=96;const q=gameCanvasContext(c);
 for(let i=0;i<3;i++){q.save();q.translate(60+i*68,48);q.scale(1,.38);const gr=q.createRadialGradient(0,0,4,0,0,90);gr.addColorStop(0,'rgba(226,190,128,.48)');gr.addColorStop(.55,'rgba(205,162,97,.26)');gr.addColorStop(1,'rgba(205,162,97,0)');q.fillStyle=gr;q.fillRect(-100,-100,200,200);q.restore();}sandCloudCache=c;return c;
}
function drawSandstormOverlay(){
 if(sandIntensity<=0)return;const q=gm,s=sandIntensity,t=sandTravel;
 q.save();q.fillStyle='rgba(164,116,62,'+(.58*s)+')';q.fillRect(0,0,W,H);q.lineCap='round';
 // Both displacement and streak tails follow the same wind vector as the weeds.
 const wrap=(v,n)=>(v%n+n)%n;
 const cloud=staticRasterSource(sandCloudSprite());q.globalAlpha=.46*s;
 for(let i=0;i<2;i++){const x=wrap(i*(W+260)*.5+t*SAND_WIND_X*.32,W+260)-130,y=wrap(i*H*.6+t*SAND_WIND_Y*.24,H+220)-110;q.save();q.translate(x,y);q.rotate(Math.atan2(SAND_WIND_Y,SAND_WIND_X));q.drawImage(cloud,-W*.6,-H*.14,W*1.2,H*.28);q.restore();}q.globalAlpha=1;
 for(let i=0;i<32;i++){
  const speed=.72+(i%5)*.13,x=wrap(i*137+t*SAND_WIND_X*speed,W+240)-120,y=wrap(i*173+t*SAND_WIND_Y*speed,H+160)-80,len=35+i%6*13;
  q.strokeStyle='rgba(244,205,147,'+((.16+i%3*.075)*s)+')';q.lineWidth=1+i%3*.65;q.beginPath();q.moveTo(x-SAND_WIND_X*len,y-SAND_WIND_Y*len);q.lineTo(x,y);q.stroke();
 }
 q.restore();
}
let selectedAreaDebug=null;
// Small fixed enemy population uses final-world collision checks and normal AI.
function spawnAreaDebugEnemies(z){
 const placed=[];
 const add=(tank,count)=>{for(let i=0;i<count;i++)for(let tries=0;tries<100;tries++){
  const r=tank?TANK_HIT:8,x=55+R()*(WW-110),y=z.y1+130+R()*(z.y0-z.y1-650),a=R()<.5?0:Math.PI/2,len=40+R()*70;
  const path=[{x,y},{x:x+Math.cos(a)*len,y:y+Math.sin(a)*len}];
  if(path.some(q=>q.x<r+20||q.x>WW-r-20||q.y<z.y1+60||q.y>z.y0-350||hitsM(q.x,q.y,r+2))||!pOK(path,r,false)||Math.hypot(x-p.x,y-p.y)<400||placed.some(q=>Math.hypot(x-q.x,y-q.y)<100))continue;
  const o={x,y,path,loop:false,wi:1,dir:1,stk:0,alive:true,st:0,sus:0,lost:0,target:null,areaDebug:1};
  if(tank)etanks.push({...o,cc:R()*1.5,vc:0,ang:a,body:a,scanTurret:true,scanPhase:R()*Math.PI*2,scanRate:.5});
  else humans.push({...o,cd:R()*1.2,burstLeft:0,face:a,patrolMode:'axis',elite:false});
  placed.push(o);break;
 }};
 add(false,8);add(true,2);
}
function setupSelectedAreaDebugStage(){
 const name=selectedAreaDebug||'草原',z={n:name,y0:WH-40,y1:WH-2440,g:ZONE_STYLE[name].g,p:ZONE_STYLE[name].p.slice(),areaDebug:1};ZONES=[z];
 clearCanyonTiles();clearMazeWallChunks();clearFragmentRenderCache();
 covers=[];objects=[];bushes=[];water=[];bridges=[];mud=[];cars=[];humans=[];etanks=[];items=[];bullets=[];parts=[];waves=[];fx=[];bombs=[];roadBands=[];areaDebugLabels=[];
 base={x:WW/2-COMMAND_BASE_W/2,y:name==='敵司令本部'?z.y1+160:-60000,w:COMMAND_BASE_W,h:COMMAND_BASE_H,hp:30,maxHp:30,deadAt:0};
 p.x=WW/2;p.y=z.y0-170;p.hp=3;p.tank=null;p.body=p.ang=-Math.PI/2;scoreStats.startY=p.y;scoreStats.debugUsed=true;
 base.y/=MAP_SCALE;genCovers();genObjects();base.y*=MAP_SCALE;covers.forEach(c=>c.y*=MAP_SCALE);objects.forEach(o=>o.y*=MAP_SCALE);rebuildSpatialGrid();
 if(name==='湿地')for(let i=0;i<12;i++)mud.push({x:90+R()*650,y:z.y1+160+R()*1700,w:100+R()*120,h:55+R()*40});
 const bushN=name==='草原'?50:name==='湿地'?30:name==='森林'?12:name==='村'?8:name==='荒野'?0:5;
 for(let i=0,made=0;i<bushN*40&&made<bushN;i++){const x=40+R()*(WW-150),y=z.y1+140+R()*1900;if(!hitsM(x+40,y+25,45)&&!bushes.some(b=>circleHitsRect(x+40,y+25,50,b))){bushes.push({x,y,w:85,h:55});made++;}}
 if(name==='荒野')buildCanyonZones();if(name==='草原')setupGrassVegetation();
 // Reserve the full two-row lineup and a walking lane around every tank.
 const clearStart=o=>!circleHitsRect(WW/2,p.y-150,310,o);
 covers=covers.filter(c=>clearStart(coverSpriteRect(c)||c));
 objects=objects.filter(clearStart);bushes=bushes.filter(clearStart);mud=mud.filter(clearStart);
 spawnAreaDebugPlayerTanks();
 weather='clear';weatherT=0;weatherNext=name==='荒野'?10:99999;rainIntensity=0;baseSpawnT=99999;radio=null;airstrike=null;airbombs=[];debugMode=1;debugInvincible=true;
 captureBuildingGroundMarks();rebuildSpatialGrid();spawnAreaDebugEnemies(z);say(name+' テスト：無敵／全' + TYPES.length + '種戦車／弾数・燃料無制限');
}
function syncAreaDebugPicker(){document.body.classList.toggle('area-picker-open',state==='areaPick');}
const areaList=document.getElementById('areaDebugList');
for(const name of AREA_DEBUG_ORDER){const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',()=>{if(state!=='areaPick')return;selectedAreaDebug=name;stageMode='base';const i=skillMenuList().findIndex(k=>k.id===selectedSkillId);selectSkillIndex(i,true);});areaList.append(b);}
document.getElementById('areaDebugBack').addEventListener('click',()=>{if(state==='areaPick'){state='stage';areaDebugEnabled=false;selectedAreaDebug=null;}});
