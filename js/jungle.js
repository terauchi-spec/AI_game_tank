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
function jungleMaskIntersects(c,x0,y0,x1,y1,test,hitScale=1){
 const rows=c.jungleHitMask||JUNGLE_HIT_MASKS[c.jungleAsset];if(!rows)return false;
 const originalW=c.ow0??c.w,originalH=c.oh0??c.h,sw=originalW*hitScale,sh=originalH*hitScale;
 const sx=(c.ox0??c.x)+(originalW-sw)/2,sy=(c.oy0??c.y)+(originalH-sh)/2,dx=sw/32,dy=sh/32;
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
 },c.jungleHitScale??1);
}
function jungleSegmentHit(c,a,b,pad=0){
 return jungleMaskIntersects(c,Math.min(a.x,b.x)-pad,Math.min(a.y,b.y)-pad,Math.max(a.x,b.x)+pad,Math.max(a.y,b.y)+pad,
  (x,y,w,h)=>segmentHitsRect(a,b,{x:x-pad,y:y-pad,w:w+pad*2,h:h+pad*2}),c.jungleHitScale??1);
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
// Allocate before area generation so the five-area stage cannot exceed five buildings.
// Keep source assets (including the retired concrete tower) for existing art/physics data.
const JUNGLE_BUILDING_KEYS=['wood_hut_small','wood_hut_large','concrete_hut','wood_watchtower'];
function planJungleBuildings(zones){
 const shuffled=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 let remaining=5;
 for(const z of shuffled(zones)){
  const count=Math.min(Math.floor(R()*3),remaining);remaining-=count;
  z.jungleBuildingKeys=shuffled(JUNGLE_BUILDING_KEYS).slice(0,count);
 }
}
function setupJungleMud(zones){
 const target=Math.floor(R()*6);
 for(let tries=0;tries<400&&mud.length<target;tries++){
  const z=zones[Math.floor(R()*zones.length)],w=105+R()*155,h=48+R()*58;
  const m={x:18+R()*(WW-w-36),y:z.y1+220+R()*(z.y0-z.y1-h-570),w,h};
  if(circleHitsRect(WW/2,p.y-150,310,m)||z.escapeExit&&circleHitsRect(z.escapeExit.x,z.escapeExit.y,125,m))continue;
  if(water.some(o=>ov2(m,o,50))||bridges.some(o=>ov2(m,o,50))||mud.some(o=>ov2(m,o,10)))continue;
  if(covers.some(c=>ov2(m,coverSpriteRect(c)||c,5))||objects.some(o=>ov2(m,objectAABB(o),5)))continue;
  mud.push(m);
 }
}
function setupJungleScenery(z){
 loadJungleAssets();
 if(!Array.isArray(z.jungleBuildingKeys))planJungleBuildings([z]);
 // A compact seed preserves baseline assets/counts; final placement below replaces
 // its rectangular spacing with visible masks and fills the former center/edge strips.
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
 const buildingSeeds={wood_hut_small:[90,320],wood_hut_large:[WW-300,760],concrete_hut:[85,1230],wood_watchtower:[WW-245,390]};
 for(const key of z.jungleBuildingKeys){const [x,y]=buildingSeeds[key];add(key,x,z.y1+y);}
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
 // Keep normal-sized trees; retain the increased grass population without small tree variants.
 const trees=covers.filter(c=>c.kd===6).length,grass=bushes.filter(b=>!b.junglePlant).length,plants=bushes.filter(b=>b.junglePlant).length;
 const targets={trees:trees*3,grass:grass*3,plants:plants*3},denseCovers=covers.map(c=>JUNGLE_BUILDING_BASE[c.jungleAsset]?{...c,w:JUNGLE_ASSETS[c.jungleAsset][1],h:JUNGLE_ASSETS[c.jungleAsset][2]}:{...c}),denseBushes=bushes.map(b=>({...b}));
 for(let i=0;i<plants*2;i++)denseBushes.push({x:0,y:0,w:60,h:60,spinifex:true,junglePlant:JUNGLE_PLANTS[i%JUNGLE_PLANTS.length]});
 for(let i=0;i<grass*2;i++)denseBushes.push({x:0,y:0,w:56,h:36});
 for(const c of denseCovers){
  if(c.jungleAsset==='fallen_log')rotateJungleLog(c,(R()-.5)*Math.PI/6);
  if(c.kd===6&&!c.jungleAsset)c.jungleTreeArt=stableRand(c,61)<.5?'tree_v2':'tree';
 }
 if(packJunglePopulation(denseCovers,denseBushes,z)){covers=denseCovers;bushes=denseBushes;z.jungleWalkRoute=buildJungleWalkRoute(z,covers);targets.grass=randomizeJungleVegetation(z,targets.trees);}
 for(const c of covers)if(c.kd===6||c.jungleAsset==='fallen_log')c.jungleHitScale=.95;
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

// Decode visual alpha once on demand, independently of the 95% collision outline.
const junglePlacementMaskCache=new Map();
function junglePlacementBits(key){
 if(junglePlacementMaskCache.has(key))return junglePlacementMaskCache.get(key);
 const hex=JUNGLE_PLACEMENT_MASKS[key];if(!hex)return null;
 const data=new Uint8Array(hex.length/2);for(let i=0;i<data.length;i++)data[i]=parseInt(hex.slice(i*2,i*2+2),16);
 junglePlacementMaskCache.set(key,data);return data;
}
// A winding walkable route is protected for hard cover only; grass can cover it.
function buildJungleWalkRoute(z,props){
 const points=[{x:WW/2,y:z.y1}],end=z.y0-420;
 const clear=(a,b)=>{
  const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12);
  for(let i=0;i<=steps;i++){
   const t=steps?i/steps:0,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
   for(const c of props){const r=coverSpriteRect(c)||c;if(x+44<r.x||x-44>r.x+r.w||y+44<r.y||y-44>r.y+r.h)continue;if(circleHitsCover(x,y,44,c))return false;}
  }
  return true;
 };
 for(let y=z.y1+128;y<end+128;y+=128){
  y=Math.min(y,end);const previous=points[points.length-1];let next={x:WW/2,y};
  for(let attempt=0;attempt<12;attempt++){
   const x=Math.max(260,Math.min(WW-260,previous.x+(R()-.5)*128)),candidate={x,y},fallback={x:WW/2,y:Math.min(end,y+128)};
   if(clear(previous,candidate)&&clear(candidate,fallback)){next=candidate;break;}
  }
  points.push(next);if(y===end)break;
 }
 points.push({x:WW/2,y:z.escapeArea===undefined?p.y:Math.min(p.y,z.y0)});return points;
}
function jungleRouteX(z,y){
 const points=z.jungleWalkRoute;if(!points)return WW/2;
 for(let i=0;i<points.length-1;i++)if(y<=points[i+1].y){const a=points[i],b=points[i+1],t=Math.max(0,Math.min(1,(y-a.y)/Math.max(1,b.y-a.y)));return a.x+(b.x-a.x)*t;}
 return points[points.length-1].x;
}
// One-world-pixel occupancy exists only during generation, never during gameplay.
function createJunglePlacement(z,protectRoute=true){
 const width=WW,height=Math.ceil(z.y0-z.y1),grid=new Uint8Array(width*height),cache=new Map(),leftRoute=new Int16Array(height),rightRoute=new Int16Array(height);
 for(let y=0;y<height;y++){const x=jungleRouteX(z,z.y1+y);leftRoute[y]=Math.floor(x-56);rightRoute[y]=Math.ceil(x+56);}
 const cy=p.y-150-z.y1;
 for(let y=Math.max(0,Math.floor(cy-310));y<Math.min(height,Math.ceil(cy+310));y++)grid.fill(1,y*width+Math.max(0,WW/2-310),y*width+Math.min(width,WW/2+310));
 const make=(o,r)=>{
  const key=o.jungleAsset||o.junglePlant||o.jungleTreeArt,angle=o.jungleAngle||0,id=[key||'rect',r.w,r.h,angle].join('|');
  let stamp=cache.get(id);
  if(!stamp){
   const w=Math.ceil(r.w),h=Math.ceil(r.h),pixels=new Uint8Array(w*h),bits=junglePlacementBits(key),co=Math.cos(angle),si=Math.sin(angle);
   const fill=(x0,y0,x1,y1)=>{const left=Math.max(0,Math.floor(x0)),right=Math.min(w,Math.ceil(x1));for(let y=Math.max(0,Math.floor(y0));y<Math.min(h,Math.ceil(y1));y++)pixels.fill(1,y*w+left,y*w+right);};
   if(!bits)fill(0,0,w,h);
   else for(let y=0;y<128;y++){
    if(!angle){
     for(let x=0;x<128;){if(!(bits[y*16+(x>>3)]&(1<<(x&7)))){x++;continue;}const start=x++;while(x<128&&(bits[y*16+(x>>3)]&(1<<(x&7))))x++;fill(start*r.w/128,y*r.h/128,x*r.w/128,(y+1)*r.h/128);}
    }else for(let x=0;x<128;x++)if(bits[y*16+(x>>3)]&(1<<(x&7))){
     const sw=o.jungleSpriteW,sh=o.jungleSpriteH,a=(x+.5)*sw/128-sw/2,b=(y+.5)*sh/128-sh/2;
     const px=co*a-si*b+r.w/2,py=si*a+co*b+r.h/2,ex=(Math.abs(co)*sw+Math.abs(si)*sh)/256,ey=(Math.abs(si)*sw+Math.abs(co)*sh)/256;
     fill(px-ex,py-ey,px+ex,py+ey);
    }
   }
   const runs=[];for(let y=0;y<h;y++)for(let x=0;x<w;){if(!pixels[y*w+x]){x++;continue;}const start=x++;while(x<w&&pixels[y*w+x])x++;runs.push(y,start,x);}
   stamp={w,h,runs};cache.set(id,stamp);
  }
  return{o,r,stamp,x:Math.round(r.x),y:Math.round(r.y-z.y1),dx:o.x-r.x,dy:o.y-r.y};
 };
 const mark=(q,value)=>{for(let i=0;i<q.stamp.runs.length;i+=3){const y=q.y+q.stamp.runs[i];if(y<0||y>=height)continue;const left=Math.max(0,q.x+q.stamp.runs[i+1]),right=Math.min(width,q.x+q.stamp.runs[i+2]);if(right>left)grid.fill(value,y*width+left,y*width+right);}};
 const fits=(q,x,y)=>{
  if(z.escapeArea!==undefined&&((z.escapeArea<4&&y<0)||(z.escapeArea>0&&y+q.stamp.h>height)))return false;
  if(x+q.stamp.w/2<0||x+q.stamp.w/2>width||y+q.stamp.h/2<0||y+q.stamp.h/2>height||(x<WW/2+310&&x+q.stamp.w>WW/2-310&&y<cy+310&&y+q.stamp.h>cy-310))return false;
  for(let i=0;i<q.stamp.runs.length;i+=3){
   const yy=y+q.stamp.runs[i];if(yy<0||yy>=height)continue;
   const left=Math.max(0,x+q.stamp.runs[i+1]),right=Math.min(width,x+q.stamp.runs[i+2]);if(right<=left)continue;
   if(protectRoute&&left<rightRoute[yy]&&right>leftRoute[yy])return false;
   const base=yy*width;for(let j=left;j<right;j++)if(grid[base+j])return false;
  }
  return true;
 };
 const commit=q=>{q.o.x=q.x+q.dx;q.o.y=z.y1+q.y+q.dy;mark(q,1);};
 return{make,mark,fits,commit,grid};
}
// Placement uses unshrunk visible alpha, including internal holes, with no rectangular buffer.
function randomizeJungleVegetation(z,treeTarget){
 const placement=createJunglePlacement(z),all=covers.map(c=>placement.make(c,coverSpriteRect(c)||c));
 for(const q of all){q.startX=q.x;q.startY=q.y;}
 for(const o of objects)placement.mark(placement.make(o,objectAABB(o)),1);
 const trees=all.filter(q=>q.o.kd===6),added=[];
 for(const q of all)if('kd' in q.o)placement.commit(q);
 // Place large crowns before grass, so small foliage does not scatter across every tree gap.
 for(let pass=0;pass<2;pass++)for(const {q} of trees.map(q=>({q,order:R()})).sort((a,b)=>a.order-b.order)){
  const oldX=q.x,oldY=q.y;placement.mark(q,0);
  for(let i=0;i<32;i++){
   const x=Math.round(i<16?R()*WW-q.stamp.w/2:oldX+(R()-.5)*96),y=Math.round(i<16?1+R()*(z.y0-z.y1-2)-q.stamp.h/2:oldY+(R()-.5)*112);
   if(placement.fits(q,x,y)){q.x=x;q.y=y;break;}
  }
  placement.commit(q);
 }
 for(let attempt=0;attempt<1800&&trees.length+added.length<treeTarget;attempt++){
  const key=attempt%3===0?'broadleaf_tree':'palm',[kd,w,h]=JUNGLE_ASSETS[key],c={kd,x:0,y:0,w,h,jungleAsset:key,areaDebug:1},q=placement.make(c,c);
  const x=Math.round(attempt%6===0?-q.stamp.w/2+R()*q.stamp.w*.35:attempt%6===1?WW-q.stamp.w/2-R()*q.stamp.w*.35:R()*WW-q.stamp.w/2),y=Math.round(1+R()*(z.y0-z.y1-2)-q.stamp.h/2);
  if(!placement.fits(q,x,y))continue;q.x=x;q.y=y;placement.commit(q);added.push(q);
 }
 // Grass is not an obstacle for tree placement and never causes trees to be removed.
 for(const q of added)covers.push(q.o);
 return setupOverlappingJungleGrass(z);
}
function setupOverlappingJungleGrass(z){
 const normal=bushes.filter(b=>!b.spinifex),plants=bushes.filter(b=>b.spinifex),target=Math.min(200,Math.ceil(normal.length*2.5)),grown=[],anchors=[];
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const allowed=b=>b.x+b.w/2>=0&&b.x+b.w/2<=WW&&b.y+b.h/2>z.y1&&b.y+b.h/2<=z.y0&&!circleHitsRect(WW/2,p.y-150,310,b);
 for(let i=0;i<target;i++){
  // Match grassland's varied dimensions; share its cached grass sprites.
  const scale=2.2+R()*.3,w=(30+R()*30)*scale,h=(22+R()*22)*scale,b={...(normal[i%normal.length]||{}),w,h};
  for(let tries=0;tries<180;tries++){
   const anchor=i%4!==0&&i%8!==2&&i%8!==6&&tries<20?anchors[anchors.length-1]:null;
   b.x=anchor?anchor.x+(R()-.5)*(anchor.w+w)*.9-w/2:i%8===0?-w/2+R()*w*.35:i%8===4?WW-w/2-R()*w*.35:i%8===2||i%8===6?WW/2-w/2+(R()-.5)*w*.8:R()*WW-w/2;
   b.y=anchor?anchor.y+(R()-.5)*(anchor.h+h)*.9-h/2:z.y1+1+R()*(z.y0-z.y1-2)-h/2;
   if(!allowed(b)||grown.reduce((n,o)=>n+(overlap(b,o)?1:0),0)>=3)continue;
   grown.push(b);if(i%4===0)anchors.push({x:b.x+w/2,y:b.y+h/2,w,h});break;
  }
 }
 for(const b of plants){
  const oldX=b.x,oldY=b.y;
  for(let tries=0;tries<80;tries++){
   const patch=grown.length?grown[Math.floor(R()*grown.length)]:null;
   b.x=patch&&tries<40?patch.x+(R()-.5)*patch.w:R()*WW-b.w/2;
   b.y=patch&&tries<40?patch.y+(R()-.5)*patch.h:z.y1+1+R()*(z.y0-z.y1-2)-b.h/2;
   if(allowed(b))break;
  }
  if(!allowed(b)){b.x=oldX;b.y=oldY;}
 }
 bushes=grown.concat(plants);return target;
}
// Grass stays in front of soldiers; jungle cover is drawn once above it.
function jungleCoverLayerActive(){return ZONES.some(z=>z.n==='密林');}
function jungleCoverHasArt(c){
 if(zoneAt(c.y+c.h/2).n!=='密林')return false;
 if(c.fr||c.jungleAsset||c.playerBuilt)return true;
 if(c.kd===6)return assetOK(naturalCoverImage(c,'tree'));
 if(c.kd===8)return assetOK(naturalCoverImage(c,'rock'));
 return false;
}
function drawJungleCoversAboveGrass(list,cx,cy){
 for(const c of list){
  if(c.buildGroup?.blinkHidden||c.x+c.w<cx-90||c.x>cx+W+90||c.y+c.h<cy-90||c.y>cy+H+90||!jungleCoverHasArt(c))continue;
  if(c.fr)drawCoverFragmentGroup(c);else drawCoverAsset(c);
 }
}
