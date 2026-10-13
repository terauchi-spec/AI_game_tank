// Static vegetation sprites/flowers are shared; blast debris uses the bounded parts pool.
let greenSpinifexCanvas=null,greenSpinifexSource=null;
const flowerBushSprites=new Map();
function setupGrassVegetation(){
 for(const z of ZONES)if(z.n==='草原'){
  const bs=bushes.filter(b=>b.y+b.h/2>z.y1&&b.y+b.h/2<=z.y0);let plants=0;
  for(const b of bs){if(stableRand(b,701)<.06){b.spinifex=true;b.spinifexGreen=true;plants++;}else if(stableRand(b,713)<.1)b.grassFlowers=true;}
  if(!plants&&bs.length){const b=bs[0];b.spinifex=true;b.spinifexGreen=true;b.grassFlowers=false;}
 }
}
function invalidateSpinifexVegetation(){
 if(greenSpinifexCanvas)invalidateStaticRaster(greenSpinifexCanvas);greenSpinifexCanvas=null;greenSpinifexSource=null;
 for(const chunks of grassBushChunkCache.values())for(const ch of chunks)ch.dirty=true;
}
function spinifexSprite(b){
 const im=COVER_IMG.spinifex;if(!b.spinifexGreen||!assetOK(im))return im;
 if(greenSpinifexCanvas&&greenSpinifexSource===im)return greenSpinifexCanvas;
 const c=document.createElement('canvas');c.width=c.height=128;const q=gameCanvasContext(c);q.drawImage(im,0,0,128,128);
 const pixels=q.getImageData(0,0,128,128),d=pixels.data;
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const v=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];d[i]=v*.46;d[i+1]=Math.min(255,v*1.05+18);d[i+2]=v*.31;}
 q.putImageData(pixels,0,0);c.complete=true;c.naturalWidth=c.naturalHeight=128;greenSpinifexCanvas=c;greenSpinifexSource=im;return c;
}
function floweringBushSprite(base,variant){
 if(flowerBushSprites.has(variant))return flowerBushSprites.get(variant);
 const c=document.createElement('canvas');c.width=base.width;c.height=base.height;const q=gameCanvasContext(c);q.drawImage(base,0,0);
 for(let i=0;i<5;i++){const x=20+(i*29+variant*7)%88,y=18+(i*17+variant*11)%57;q.fillStyle=i%2?'#f3eee0':'#cd4038';q.beginPath();q.arc(x,y,2.7,0,Math.PI*2);q.fill();q.fillStyle='#dfc569';q.fillRect(x-.6,y-.6,1.2,1.2);}
 flowerBushSprites.set(variant,c);return c;
}
function scatterSpinifexAt(x,y,r){
 const dead=new Set();let budget=36;
 for(const b of nearbyBushes(x,y,r+140))if(b.spinifex&&circleHitsRect(x,y,r,b)){
  dead.add(b);markGrassBushChunkDirty(b);burningNatureSet.delete(b);
  const n=Math.min(6,budget);budget-=n;if(!n)continue;trimParts(n);const cx=b.x+b.w/2,cy=b.y+b.h/2,away=Math.atan2(cy-y,cx-x);
  for(let i=0;i<n;i++){const a=away+(stableRand(b,820+i)-.5)*2.4,speed=95+stableRand(b,850+i)*80;parts.push({x:cx+(stableRand(b,880+i)-.5)*b.w*.4,y:cy+(stableRand(b,910+i)-.5)*b.h*.4,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.45+stableRand(b,940+i)*.18,col:b.spinifexGreen?'#6f9e3c':'#b98b48',sz:3+stableRand(b,970+i)*4,arcFrag:true,z:0,vz:65,g:240,rot:a,vr:3});}
 }
 if(!dead.size)return;let w=0;for(const b of bushes)if(!dead.has(b))bushes[w++]=b;bushes.length=w;
}
