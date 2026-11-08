// Test-only scenery: reuse the existing cover physics and spatially culled renderer.
// Images load only after selecting the jungle, leaving normal stage startup unchanged.
const JUNGLE_ASSETS={palm:[6,136,136],fallen_log:[0,190*1.3,62*1.3],wood_hut_small:[4,160*1.1*1.1,135*1.1*1.1],wood_hut_large:[4,220*1.1*1.1,158*1.1*1.1],concrete_hut:[3,185*1.1*1.1,156*1.1*1.1],watchtower:[3,150*1.1,205*1.1],wood_watchtower:[4,150*1.1*2,150*1.1*2*320/295],broadleaf_tree:[6,166,166],fern_tree:[6,332,332]};
const JUNGLE_PLANTS=['round_leaf','flower_leaf'];
const JUNGLE_BUILDING_BASE={wood_hut_small:[160*1.1,135*1.1],wood_hut_large:[220*1.1,158*1.1],concrete_hut:[185*1.1,156*1.1],wood_watchtower:[150*1.1,150*1.1*320/295]};
function loadJungleAssets(){
 for(const key of [...Object.keys(JUNGLE_ASSETS),...JUNGLE_PLANTS])if(!COVER_IMG['jungle_'+key])COVER_IMG['jungle_'+key]=makeAssetImage(ASSET_DIR+'jungle/'+key+'.webp?v='+GAME_VERSION);
}
// Alpha silhouettes are compiled at build time; collision never reads canvas pixels.
// Each of the 32 rows is a bitset. Query only cells near the actor/projectile.
function jungleMaskIntersects(c,x0,y0,x1,y1,test){
 const rows=c.jungleHitMask||JUNGLE_HIT_MASKS[c.jungleAsset];if(!rows)return false;
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
// Build a rotated collision mask once per log; rendering and fragments share this transform.
function rotateJungleLog(c,angle){
 const [,w,h]=JUNGLE_ASSETS.fallen_log,co=Math.cos(angle),si=Math.sin(angle);
 c.jungleAngle=angle;c.jungleSpriteW=w;c.jungleSpriteH=h;c.w=w*Math.abs(co)+h*Math.abs(si);c.h=w*Math.abs(si)+h*Math.abs(co);
 const source=JUNGLE_HIT_MASKS.fallen_log,rows=new Uint32Array(32);
 for(let row=0;row<32;row++)for(let col=0;col<32;col++)for(const fy of [.25,.75])for(const fx of [.25,.75]){
  const x=(col+fx)*c.w/32-c.w/2,y=(row+fy)*c.h/32-c.h/2,sx=Math.floor((co*x+si*y+w/2)*32/w),sy=Math.floor((-si*x+co*y+h/2)*32/h);
  if(sx>=0&&sx<32&&sy>=0&&sy<32&&(source[sy]&(1<<sx)))rows[row]|=1<<col;
 }
 c.jungleHitMask=rows;
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
  const [kd,assetW,assetH]=JUNGLE_ASSETS[key],[w,h]=JUNGLE_BUILDING_BASE[key]||[assetW,assetH],side=x+w/2>WW/2;
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


 // Match the existing final start-area cleanup before counting the baseline.
 const outsideStart=o=>!circleHitsRect(WW/2,p.y-150,310,o);
 covers=covers.filter(c=>outsideStart(coverSpriteRect(c)||c));bushes=bushes.filter(outsideStart);
 // Repack once at stage creation so triple populations fit without sprite overlap.
 const trees=covers.filter(c=>c.kd===6).length,grass=bushes.filter(b=>!b.junglePlant).length,plants=bushes.filter(b=>b.junglePlant).length;
 const targets={trees:trees*3,grass:grass*3,plants:plants*3},denseCovers=covers.map(c=>JUNGLE_BUILDING_BASE[c.jungleAsset]?{...c,w:JUNGLE_ASSETS[c.jungleAsset][1],h:JUNGLE_ASSETS[c.jungleAsset][2]}:{...c}),denseBushes=bushes.map(b=>({...b}));
 for(let i=0;i<trees*2;i++)denseCovers.push({kd:6,x:0,y:0,w:64,h:64,jungleAsset:i%3===0?'broadleaf_tree':'palm',areaDebug:1});
 for(let i=0;i<plants*2;i++)denseBushes.push({x:0,y:0,w:60,h:60,spinifex:true,junglePlant:JUNGLE_PLANTS[i%JUNGLE_PLANTS.length]});
 for(let i=0;i<grass*2;i++)denseBushes.push({x:0,y:0,w:56,h:36});
 for(const c of denseCovers)if(c.jungleAsset==='fallen_log')rotateJungleLog(c,(R()-.5)*Math.PI/6);
 if(packJunglePopulation(denseCovers,denseBushes,z)){covers=denseCovers;bushes=denseBushes;randomizeJungleVegetation(z);}
 z.jungleDensity={targets,trees:covers.filter(c=>c.kd===6).length,grass:bushes.filter(b=>!b.junglePlant).length,plants:bushes.filter(b=>b.junglePlant).length};
}
// Bounded random corner/order attempts followed by compact fallbacks; stage setup only.
function packJunglePopulation(denseCovers,denseBushes,z){
 const items=[...denseCovers.map(c=>{const r=coverSpriteRect(c)||c;return{o:c,w:r.w+8,h:r.h+8,dx:c.x-r.x,dy:c.y-r.y};}),...denseBushes.map(b=>({o:b,w:b.w+8,h:b.h+8,dx:0,dy:0}))];
 const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const contains=(a,b)=>a.x<=b.x&&a.y<=b.y&&a.x+a.w>=b.x+b.w&&a.y+a.h>=b.y+b.h;
 const split=(free,r)=>{
  const out=[];
  for(const f of free){
   if(!intersects(f,r)){out.push(f);continue;}
   if(r.x>f.x)out.push({x:f.x,y:f.y,w:r.x-f.x,h:f.h});
   if(r.x+r.w<f.x+f.w)out.push({x:r.x+r.w,y:f.y,w:f.x+f.w-r.x-r.w,h:f.h});
   if(r.y>f.y)out.push({x:f.x,y:f.y,w:f.w,h:r.y-f.y});
   if(r.y+r.h<f.y+f.h)out.push({x:f.x,y:r.y+r.h,w:f.w,h:f.y+f.h-r.y-r.h});
  }
  return out.filter((f,i)=>!out.some((q,j)=>i!==j&&contains(q,f)&&(j<i||!contains(f,q))));
 };
 const rank=[a=>a.w*a.h,a=>Math.max(a.w,a.h),a=>a.h,a=>a.w];
 for(let attempt=0;attempt<16;attempt++){
  const score=rank[attempt%rank.length],laneHalf=attempt<12?48:40,random=attempt<8,ordered=items.map(item=>({...item,tie:R()}));
  let free=[{x:12,y:z.y1+40,w:WW/2-12-laneHalf,h:z.y0-z.y1-680},{x:WW/2+laneHalf,y:z.y1+40,w:WW/2-12-laneHalf,h:z.y0-z.y1-680},{x:12,y:z.y0-640,w:150,h:220},{x:WW-162,y:z.y0-640,w:150,h:220}];
  for(const o of objects)free=split(free,objectAABB(o));
  const placements=[];
  for(const item of ordered.sort((a,b)=>score(b)-score(a)||b.w*b.h-a.w*a.h||a.tie-b.tie)){
   let best=null,bestShort=Infinity,bestLong=Infinity;
   for(const f of free)if(item.w<=f.w&&item.h<=f.h){const short=Math.min(f.w-item.w,f.h-item.h),long=Math.max(f.w-item.w,f.h-item.h);if(short<bestShort||short===bestShort&&long<bestLong){best=f;bestShort=short;bestLong=long;}}
   if(!best)break;
   const r={x:best.x+(random&&R()<.5?best.w-item.w:0),y:best.y+(random&&R()<.5?best.h-item.h:0),w:item.w,h:item.h};placements.push({item,r});free=split(free,r);
  }
  if(placements.length===items.length){for(const {item,r} of placements){item.o.x=r.x+item.dx;item.o.y=r.y+item.dy;}z.jungleLaneHalf=laneHalf;return true;}
 }
 return false;
}

// Relocate vegetation into free gaps, including local jitter, without changing its count/size.
function randomizeJungleVegetation(z){
 const laneHalf=z.jungleLaneHalf||48;
 const all=[...covers.map(c=>({o:c,r:coverSpriteRect(c)||c})),...bushes.map(b=>({o:b,r:b}))];
 const overlap=(a,b)=>a.x<b.x+b.w+8&&a.x+a.w+8>b.x&&a.y<b.y+b.h+8&&a.y+a.h+8>b.y;
 const vegetation=all.filter(q=>q.o.kd===6||!('kd' in q.o)).map(q=>({q,order:R()})).sort((a,b)=>a.order-b.order);
 for(let pass=0;pass<2;pass++)for(const {q} of vegetation){
  const old=q.r,dx=q.o.x-old.x,dy=q.o.y-old.y;
  for(let i=0;i<32;i++){
   const r={x:i<12?12+R()*(WW-24-old.w):old.x+(R()-.5)*64,y:i<12?z.y1+40+R()*(z.y0-z.y1-460-old.h):old.y+(R()-.5)*80,w:old.w,h:old.h};
   if(r.x<12||r.x+r.w>WW-12||r.y<z.y1+40||r.y+r.h>z.y0-420||(r.x+r.w>WW/2-laneHalf&&r.x<WW/2+laneHalf)||circleHitsRect(WW/2,p.y-150,310,r))continue;
   if(all.some(other=>other!==q&&overlap(r,other.r))||objects.some(o=>overlap(r,objectAABB(o))))continue;
   q.o.x=r.x+dx;q.o.y=r.y+dy;q.r=r;break;
  }
 }
}
