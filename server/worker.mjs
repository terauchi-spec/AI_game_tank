const STAGES=new Set(['beginner','indoorBeginner','frontBeginner','base','indoor','front']);
const SKILLS=new Set(['throw','dig','decoy','buddy','drill','build','flame','sniper','hound','partner']);
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export function validateScore(v){
 if(!v||typeof v!=='object'||typeof v.name!=='string')return null;
 const name=v.name.normalize('NFKC').trim();
 if(!/^[A-Za-z0-9\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fc-\u30fe]{1,10}$/u.test(name)||!STAGES.has(v.stage)||!SKILLS.has(v.skill)||v.debug!==false||!Number.isSafeInteger(v.score)||v.score<=0||v.score>100000000||!['S','A','B','C','D','E','F'].includes(v.rank))return null;
 if(!Array.isArray(v.titles)||v.titles.length>40||v.titles.some(id=>typeof id!=='string'||!/^v3_[a-z0-9_]{1,60}$/.test(id)))return null;
 return {name,stage:v.stage,skill:v.skill,score:v.score,rank:v.rank,titles:[...new Set(v.titles)]};
}
export function insertBest(rows,entry){
 const old=rows.find(v=>v.player===entry.player);
 if(old&&old.score>=entry.score)return rows;
 return [...rows.filter(v=>v.player!==entry.player),entry].sort((a,b)=>b.score-a.score||a.at-b.at||a.player.localeCompare(b.player)).slice(0,30);
}
export class Scoreboard{
 constructor(ctx){this.ctx=ctx;}
 async fetch(request){
  const url=new URL(request.url);
  if(request.method==='GET'){
   const board=url.searchParams.get('board')||'overall';
   if(board!=='overall'&&!STAGES.has(board))return json({error:'invalid_board'},400);
   const rows=await this.ctx.storage.get('board:'+board)||[];
   return json({entries:rows.map(({player,...v})=>v)});
  }
  if(request.method!=='POST')return json({error:'method'},405);
  const body=await request.json(),score=validateScore(body.entry);
  if(!score||typeof body.player!=='string'||!/^[a-f0-9-]{36}$/.test(body.player))return json({error:'invalid_score'},400);
  const entry={...score,player:body.player,at:Date.now()};
  // Both boards update atomically; simultaneous submissions cannot lose a winner.
  await this.ctx.storage.transaction(async tx=>{
   for(const board of ['overall',entry.stage]){
    const key='board:'+board,rows=await tx.get(key)||[],next=insertBest(rows,entry);
    if(next!==rows)await tx.put(key,next);
   }
  });
  return json({ok:true});
 }
}
export default{
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(url.pathname!=='/api/leaderboard')return json({error:'not_found'},404);
  if(!env.SCOREBOARD)return json({error:'unavailable'},503);
  if(request.method!=='GET'&&request.method!=='POST')return json({error:'method'},405);
  const board=env.SCOREBOARD.get(env.SCOREBOARD.idFromName('global-v1'));
  if(request.method==='GET')return board.fetch(request);
  // Browser-origin requests only. Credentials and player IDs are never sent to clients in rows.
  if(request.headers.get('Origin')!==url.origin||!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'origin'},403);
  if(Number(request.headers.get('Content-Length'))>4096)return json({error:'too_large'},413);
  const raw=await request.text();if(raw.length>4096)return json({error:'too_large'},413);
  let entry;try{entry=validateScore(JSON.parse(raw));}catch(_){}if(!entry)return json({error:'invalid_score'},400);
  const cookie=request.headers.get('Cookie')||'',found=cookie.match(/(?:^|;\s*)__Host-tankPlayer=([a-f0-9-]{36})(?:;|$)/),player=found?.[1]||crypto.randomUUID();
  try{
   const response=await board.fetch(new Request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({player,entry:{...entry,debug:false}})}));
   const headers=new Headers(response.headers);
   if(!found)headers.set('Set-Cookie','__Host-tankPlayer='+player+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000');
   return new Response(response.body,{status:response.status,headers});
  }catch(_){return json({error:'unavailable'},503);}
 }
};
