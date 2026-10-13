// Cache only maze wall artwork. Collision and destruction continue to use covers.
const MAZE_WALL_CHUNK_H=256,MAZE_WALL_CACHE_LIMIT=8;
const mazeWallChunks=new Map();
let mazeWallCoverRef=null,mazeWallCoverLen=-1,mazeWallCacheClock=0;
function evictMazeWallChunk(chunk){
 if(!chunk.canvas)return;
 invalidateStaticRaster(chunk.canvas);chunk.canvas.width=1;chunk.canvas.height=1;chunk.canvas=null;chunk.dirty=true;
}
function clearMazeWallChunks(){
 for(const chunk of mazeWallChunks.values())evictMazeWallChunk(chunk);
 mazeWallChunks.clear();mazeWallCoverRef=null;mazeWallCoverLen=-1;mazeWallCacheClock=0;
}
function mazeWallBands(c){
 const rc=coverSpriteRect(c),pad=c.fr?2:3;
 return [Math.max(0,Math.floor((rc.y-pad)/MAZE_WALL_CHUNK_H)),Math.min(Math.ceil(WH/MAZE_WALL_CHUNK_H)-1,Math.floor((rc.y+rc.h+pad)/MAZE_WALL_CHUNK_H))];
}
function markMazeWallChunkDirty(c){
 if(!c||!c.mazeWall)return;
 const [first,last]=mazeWallBands(c);
 for(let i=first;i<=last;i++){const chunk=mazeWallChunks.get(i);if(chunk)chunk.dirty=true;}
}
function syncMazeWallChunks(){
 if(mazeWallCoverRef===covers&&mazeWallCoverLen===covers.length)return;
 const members=new Map();
 for(const c of covers)if(c.mazeWall){
  const [first,last]=mazeWallBands(c);
  for(let i=first;i<=last;i++){let list=members.get(i);if(!list)members.set(i,list=[]);list.push(c);}
 }
 for(const [i,chunk] of mazeWallChunks)if(!members.has(i)){evictMazeWallChunk(chunk);mazeWallChunks.delete(i);}
 for(const [i,list] of members){
  let chunk=mazeWallChunks.get(i);
  if(!chunk){chunk={y:i*MAZE_WALL_CHUNK_H,h:Math.min(MAZE_WALL_CHUNK_H,WH-i*MAZE_WALL_CHUNK_H),members:[],canvas:null,dirty:true,assets:-1,used:0};mazeWallChunks.set(i,chunk);}
  if(chunk.members.length!==list.length||list.some((c,j)=>chunk.members[j]!==c)){chunk.members=list;chunk.dirty=true;}
 }
 mazeWallCoverRef=covers;mazeWallCoverLen=covers.length;
}
function renderMazeWallChunk(chunk){
 if(!chunk.canvas){
  const cached=[...mazeWallChunks.values()].filter(c=>c.canvas);
  if(cached.length>=MAZE_WALL_CACHE_LIMIT)evictMazeWallChunk(cached.reduce((a,b)=>a.used<b.used?a:b));
  chunk.canvas=document.createElement('canvas');chunk.canvas.width=WW;chunk.canvas.height=chunk.h;
 }
 if(!chunk.dirty&&chunk.assets===fragmentAssetSignature)return;
 invalidateStaticRaster(chunk.canvas);
 const context=gameCanvasContext(chunk.canvas),previous=g;
 context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,WW,chunk.h);context.imageSmoothingEnabled=false;
 context.save();context.translate(0,-chunk.y);g=context;
 try{
  // Preserve the original wall/fragment drawing order inside each clipped band.
  for(const c of chunk.members)if(c.fr)drawCoverFragment(c);else drawCoverAsset(c);
 }finally{g=previous;context.restore();}
 chunk.dirty=false;chunk.assets=fragmentAssetSignature;
}
function drawMazeWallChunks(cx,cy){
 if(mazeComparisonActive()&&mazeCompare.mode===2)return true;
 // Avoid caching placeholder artwork before both wall images have loaded.
 if(!assetOK(COVER_IMG.maze_wall)||!assetOK(COVER_IMG.maze_wall_vertical))return false;
 syncMazeWallChunks();
 const first=Math.max(0,Math.floor(cy/MAZE_WALL_CHUNK_H)),last=Math.min(Math.ceil(WH/MAZE_WALL_CHUNK_H)-1,Math.floor((cy+H)/MAZE_WALL_CHUNK_H));
 for(let i=first;i<=last;i++){
  const chunk=mazeWallChunks.get(i);if(!chunk)continue;
  chunk.used=++mazeWallCacheClock;renderMazeWallChunk(chunk);
  drawStaticRaster(chunk.canvas,0,chunk.y);
 }
 return true;
}
