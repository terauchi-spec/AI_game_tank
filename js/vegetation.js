// Static vegetation sprites/flowers are shared; blast debris uses the bounded parts pool.
const flowerBushSprites=new Map();
let matchedGreenSpinifex=null,matchedGreenSource=null;
function spinifexPlacementSize(base,variation){return base*1.3*.7*(1+variation*.5);}
function sizeGrassSpinifex(b,z){
 const cx=b.x+b.w/2,cy=b.y+b.h/2,size=spinifexPlacementSize(65+stableRand(b,743)*30,stableRand(b,751));
 b.w=b.h=size;b.x=Math.max(12,Math.min(WW-size-12,cx-size/2));b.y=Math.max(z.y1+12,Math.min(z.y0-size-12,cy-size/2));
}
function setupGrassVegetation(){
 for(const z of ZONES)if(z.n==='草原'){
  const bs=bushes.filter(b=>b.y+b.h/2>z.y1&&b.y+b.h/2<=z.y0);let plants=0;
  for(const b of bs){if(stableRand(b,701)<.06){b.spinifex=true;b.spinifexGreen=true;sizeGrassSpinifex(b,z);plants++;}else if(stableRand(b,713)<.1)b.grassFlowers=true;}
  if(!plants&&bs.length){const b=bs[0];b.spinifex=true;b.spinifexGreen=true;b.grassFlowers=false;sizeGrassSpinifex(b,z);}
 }
}
function invalidateSpinifexVegetation(){
 if(matchedGreenSpinifex)invalidateStaticRaster(matchedGreenSpinifex);matchedGreenSpinifex=null;matchedGreenSource=null;
 for(const chunks of grassBushChunkCache.values())for(const ch of chunks)ch.dirty=true;
}
function spinifexSprite(b){
 if(!b.spinifexGreen)return COVER_IMG.spinifex;const im=COVER_IMG.spinifex_green;if(!assetOK(im))return im;
 if(matchedGreenSpinifex&&matchedGreenSource===im)return matchedGreenSpinifex;
 const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const q=gameCanvasContext(c);q.drawImage(im,0,0);
 const pixels=q.getImageData(0,0,c.width,c.height),d=pixels.data;
 // Match the nearby bush's cool medium green without sharpening or resizing the source.
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const v=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];d[i]=v*.43+8;d[i+1]=v*.70+37;d[i+2]=v*.46+7;}q.putImageData(pixels,0,0);
 c.complete=true;c.naturalWidth=c.width;c.naturalHeight=c.height;matchedGreenSpinifex=c;matchedGreenSource=im;return c;
}
function floweringBushSprite(base,variant){
 if(flowerBushSprites.has(variant))return flowerBushSprites.get(variant);
 const c=document.createElement('canvas');c.width=base.width;c.height=base.height;const q=gameCanvasContext(c);q.drawImage(base,0,0);
 for(let i=0;i<5;i++){const x=20+(i*29+variant*7)%88,y=18+(i*17+variant*11)%57;q.fillStyle=i%2?'#fff5e9':'#ed4540';for(let k=0;k<5;k++){const a=k*Math.PI*2/5;q.beginPath();q.ellipse(x+Math.cos(a)*2.3,y+Math.sin(a)*2.3,2.7,1.9,a,0,Math.PI*2);q.fill();}q.fillStyle='#f4cf55';q.beginPath();q.arc(x,y,1.35,0,Math.PI*2);q.fill();}
 flowerBushSprites.set(variant,c);return c;
}
const spinifexScatters=[];
function clearSpinifexScatters(){spinifexScatters.length=0;}
function drawSpinifexTopLayer(cx,cy){
 for(const b of nearbyBushes(cx+W/2,cy+H/2,Math.max(W,H)*.8+140))if(b.spinifex&&drawBoundsInView(b.x,b.y,b.w,b.h,cx,cy,16))drawBushCached(b);
}
function scatterSpinifexAt(x,y,r){
 const dead=new Set();let budget=6;
 for(const b of nearbyBushes(x,y,r+140))if(b.spinifex&&circleHitsRect(x,y,r,b)){
  dead.add(b);markGrassBushChunkDirty(b);burningNatureSet.delete(b);
  if(budget-->0){if(spinifexScatters.length>=6)spinifexScatters.shift();spinifexScatters.push({b:{...b},t:0,away:Math.atan2(b.y+b.h/2-y,b.x+b.w/2-x)});}
 }
 if(!dead.size)return;let w=0;for(const b of bushes)if(!dead.has(b))bushes[w++]=b;bushes.length=w;
}
function updateSpinifexScatters(dt){let w=0;for(const f of spinifexScatters){f.t+=dt;if(f.t<.95)spinifexScatters[w++]=f;}spinifexScatters.length=w;}
function drawSpinifexScatters(cx,cy){
 for(const f of spinifexScatters){const b=f.b,im=spinifexSprite(b);if(!assetOK(im)||!drawBoundsInView(b.x-130,b.y-130,b.w+260,b.h+260,cx,cy,20))continue;
  const t=f.t,iw=im.naturalWidth/2,ih=im.naturalHeight/2;g.save();g.imageSmoothingEnabled=true;g.globalAlpha=Math.min(1,(.95-t)*2.2);
  for(let i=0;i<4;i++){const a=f.away+(i-1.5)*.65,travel=(70+i*16)*t,sz=Math.max(14,b.w*.32)*(1-t*.25);g.save();g.translate(b.x+b.w/2+Math.cos(a)*travel,b.y+b.h/2+Math.sin(a)*travel-Math.sin(Math.PI*t/.95)*24);g.rotate(a+t*(i%2?3:-3));g.drawImage(im,(i%2)*iw,(i>>1)*ih,iw,ih,-sz/2,-sz/2,sz,sz);g.restore();}g.restore();
 }
}
