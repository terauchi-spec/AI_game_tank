// Test-only scenery: reuse the existing cover physics and spatially culled renderer.
// Images load only after selecting the jungle, leaving normal stage startup unchanged.
const JUNGLE_ASSETS={palm:[6,136,136],fallen_log:[0,190,62],wood_hut_small:[4,160,135],wood_hut_large:[4,220,158],concrete_hut:[3,185,156],watchtower:[3,150,205]};
function loadJungleAssets(){
 for(const key of Object.keys(JUNGLE_ASSETS))if(!COVER_IMG['jungle_'+key])COVER_IMG['jungle_'+key]=makeAssetImage(ASSET_DIR+'jungle/'+key+'.webp');
}
function setupJungleScenery(z){
 loadJungleAssets();
 const add=(key,x,y)=>{const [kd,w,h]=JUNGLE_ASSETS[key];covers.push({kd,x,y,w,h,jungleAsset:key,areaDebug:1});};
 // Broad central lane connects the entire map; alternating clearings expose all six assets.
 add('wood_hut_small',90,z.y1+320);add('wood_hut_large',WW-300,z.y1+760);
 add('concrete_hut',85,z.y1+1230);add('watchtower',WW-245,z.y1+1480);
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
