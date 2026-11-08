// Test-only scenery: reuse the existing cover physics and spatially culled renderer.
// Images load only after selecting the jungle, leaving normal stage startup unchanged.
const JUNGLE_ASSETS={palm:[6,136,136],fallen_log:[0,190*1.3,62*1.3],wood_hut_small:[4,160*1.1,135*1.1],wood_hut_large:[4,220*1.1,158*1.1],concrete_hut:[3,185*1.1,156*1.1],watchtower:[3,150*1.1,205*1.1],wood_watchtower:[4,150*1.1,150*1.1*320/295],broadleaf_tree:[6,166,166],fern_tree:[6,332,332]};
const JUNGLE_PLANTS=['round_leaf','flower_leaf'];
function loadJungleAssets(){
 for(const key of [...Object.keys(JUNGLE_ASSETS),...JUNGLE_PLANTS])if(!COVER_IMG['jungle_'+key])COVER_IMG['jungle_'+key]=makeAssetImage(ASSET_DIR+'jungle/'+key+'.webp?v='+GAME_VERSION);
}
// Alpha silhouettes are compiled at build time; collision never reads canvas pixels.
// Each of the 32 rows is a bitset. Query only cells near the actor/projectile.
function jungleMaskIntersects(c,x0,y0,x1,y1,test){
 const rows=JUNGLE_HIT_MASKS[c.jungleAsset];if(!rows)return false;
 const sx=c.ox0??c.x,sy=c.oy0??c.y,sw=c.ow0??c.w,sh=c.oh0??c.h,dx=sw/32,dy=sh/32;
 const left=Math.max(x0,c.x,sx),top=Math.max(y0,c.y,sy),right=Math.min(x1,c.x+c.w,sx+sw),bottom=Math.min(y1,c.y+c.h,sy+sh);
 if(right<left||bottom<top)return false;
 const col0=Math.max(0,Math.floor((left-sx)/dx)),col1=Math.min(31,Math.floor((right-sx)/dx));
 const row0=Math.max(0,Math.floor((top-sy)/dy)),row1=Math.min(31,Math.floor((bottom-sy)/dy));
 for(let row=row0;row<=row1;row++)for(let col=col0;col<=col1;col++)if(rows[row]&(1<<col)){
  const x=Math.max(c.x,sx+col*dx),y=Math.max(c.y,sy+row*dy),w=Math.min(c.x+c.w,sx+(col+1)*dx)-x,h=Math.min(c.y+c.h,sy+(row+1)*dy)-y;
  if(w>0&&h>0&&test(x,y,w,h))return true;
 }
 return false;
}
function jungleCircleHit(c,x,y,r=0){
 return jungleMaskIntersects(c,x-r,y-r,x+r,y+r,(a,b,w,h)=>{
  const dx=Math.max(a-x,0,x-a-w),dy=Math.max(b-y,0,y-b-h);return dx*dx+dy*dy<=r*r;
 });
}
function jungleSegmentHit(c,a,b,pad=0){
 return jungleMaskIntersects(c,Math.min(a.x,b.x)-pad,Math.min(a.y,b.y)-pad,Math.max(a.x,b.x)+pad,Math.max(a.y,b.y)+pad,
  (x,y,w,h)=>segmentHitsRect(a,b,{x:x-pad,y:y-pad,w:w+pad*2,h:h+pad*2}));
}
function setupJungleScenery(z){
 loadJungleAssets();
 // Placement-only rectangle checks reserve the full sprite, including transparent edges.
 // Leave a 128px central lane and the tank lineup clear; no new per-frame work.
 const free=r=>r.x>=12&&r.x+r.w<=WW-12&&r.y>=z.y1+40&&r.y+r.h<=z.y0-420&&
  (r.x+r.w<=WW/2-64||r.x>=WW/2+64)&&!circleHitsRect(WW/2,p.y-150,310,r)&&
  !covers.some(c=>overlap(r,coverSpriteRect(c)||c))&&!bushes.some(b=>overlap(r,b))&&!objects.some(o=>overlap(r,objectAABB(o)));
 const overlap=(a,b)=>a.x<b.x+b.w+8&&a.x+a.w+8>b.x&&a.y<b.y+b.h+8&&a.y+a.h+8>b.y;
 const add=(key,x,y)=>{
  const [kd,w,h]=JUNGLE_ASSETS[key],side=x+w/2>WW/2;
  x=side?Math.max(WW/2+64,Math.min(WW-w-12,x)):Math.max(12,Math.min(WW/2-64-w,x));
  // Bounded search relocates a conflicting prop instead of overlapping or dropping it.
  for(let i=0;i<121;i++)for(let col=0;col<3;col++){
   const dy=i===0?0:Math.ceil(i/2)*32*(i%2?1:-1),px=col===0?x:side?(col===1?WW/2+64:WW-w-12):(col===1?12:WW/2-64-w),r={x:px,y:y+dy,w,h};
   if(free(r)){covers.push({kd,...r,jungleAsset:key,areaDebug:1});return true;}
  }
  return false;
 };
 add('wood_hut_small',90,z.y1+320);add('wood_hut_large',WW-300,z.y1+760);
 add('concrete_hut',85,z.y1+1230);add('watchtower',WW-245,z.y1+1480);
 add('wood_watchtower',WW-245,z.y1+390);
 for(const [x,y] of [[20,640],[WW-352,1810]])add('fern_tree',x,z.y1+y);
 for(const [x,y] of [[210,560],[WW-380,1160],[220,1800]])add('fallen_log',x,z.y1+y);
 for(const [x,y] of [[32,980],[WW-210,270],[40,1560],[200,120],[WW-210,1000]])add('broadleaf_tree',x,z.y1+y);
 // Cap palms at 4; reuse the same images, collision grid and offscreen culling.
 for(let row=0;row<2;row++)for(const side of [0,1])add('palm',side?WW-174:32,z.y1+90+row*205);
 for(const [x,y] of [[230,900],[WW-285,1450],[60,1900]]){
  const r={x,y:z.y1+y,w:90,h:74};if(free(r))covers.push({kd:8,...r,areaDebug:1});
 }
 // Use the wilderness spinifex size and behavior, with jungle-only lazy-loaded art.
 // Six plants maximum; alternate both supplied variants and keep the central lane open.
 for(let i=0,made=0;i<320&&made<6;i++){
  const size=spinifexPlacementSize(65+R()*30,R()),side=i%2;
  const x=side?WW/2+90+R()*Math.max(1,WW/2-size-110):20+R()*Math.max(1,WW/2-size-110);
  const y=z.y1+80+R()*Math.max(1,z.y0-z.y1-size-650);
  if(!free({x,y,w:size,h:size}))continue;
  if(covers.some(c=>circleHitsRect(x+size/2,y+size/2,size/2+8,c))||objects.some(o=>circleHitsRect(x+size/2,y+size/2,size/2+8,objectAABB(o))))continue;
  if(bushes.some(b=>circleHitsRect(x+size/2,y+size/2,size/2+8,b)))continue;
  bushes.push({x,y,w:size,h:size,spinifex:true,junglePlant:JUNGLE_PLANTS[made%JUNGLE_PLANTS.length]});made++;
 }
 // Maximum 24 bushes, with bounded attempts only during stage creation.
 for(let i=0,made=0;i<320&&made<24;i++){
  const w=70,h=45,side=i%2,x=side?WW/2+64+R()*(WW/2-76-w):12+R()*(WW/2-76-w);
  const r={x,y:z.y1+50+R()*(z.y0-z.y1-h-520),w,h};
  if(free(r)){bushes.push(r);made++;}
 }

}
