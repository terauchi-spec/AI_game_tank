// Test-only scenery: reuse the existing cover physics and spatially culled renderer.
// Images load only after selecting the jungle, leaving normal stage startup unchanged.
const JUNGLE_ASSETS={palm:[6,136,136],fallen_log:[0,190,62],wood_hut_small:[4,160,135],wood_hut_large:[4,220,158],concrete_hut:[3,185,156],watchtower:[3,150,205],wood_watchtower:[4,150,255],broadleaf_tree:[6,166,166]};
function loadJungleAssets(){
 for(const key of Object.keys(JUNGLE_ASSETS))if(!COVER_IMG['jungle_'+key])COVER_IMG['jungle_'+key]=makeAssetImage(ASSET_DIR+'jungle/'+key+'.webp?v='+GAME_VERSION);
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
 const add=(key,x,y)=>{const [kd,w,h]=JUNGLE_ASSETS[key];covers.push({kd,x,y,w,h,jungleAsset:key,areaDebug:1});};
 // Broad central lane connects the entire map; alternating clearings expose all six assets.
 add('wood_hut_small',90,z.y1+320);add('wood_hut_large',WW-300,z.y1+760);
 add('concrete_hut',85,z.y1+1230);add('watchtower',WW-245,z.y1+1480);
 add('wood_watchtower',WW-245,z.y1+390);
 for(const [x,y] of [[32,980],[WW-210,270],[40,1560]])add('broadleaf_tree',x,z.y1+y);
 for(let row=0;row<9;row++)for(const side of [0,1]){
  const x=side?WW-174:32,y=z.y1+90+row*205;
  if(!covers.some(c=>circleHitsRect(x+68,y+68,85,c)))add('palm',x,y);
 }
 for(const [x,y] of [[210,560],[WW-380,1160],[220,1800]])add('fallen_log',x,z.y1+y);
 // Small rocky outcrops and bushes supplement the supplied tropical vegetation.
 for(const [x,y] of [[230,900],[WW-285,1450],[60,1900]])covers.push({kd:8,x,y:z.y1+y,w:90,h:74,areaDebug:1});
 for(let i=0;i<16;i++){const x=i%2?WW-330:230,y=z.y1+150+i*112;
  if(!covers.some(c=>circleHitsRect(x+35,y+22,42,c)))bushes.push({x,y,w:70,h:45});
 }
}
