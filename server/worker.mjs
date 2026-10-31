const STAGES=new Set(['beginner','indoorBeginner','frontBeginner','baseIntermediate','indoor','frontIntermediate','base','indoorLab','front','decisive']);
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
const DEVELOPER_COOKIE='__Host-tankDeveloper';
const developerToken=request=>(request.headers.get('Cookie')||'').match(/(?:^|;\s*)__Host-tankDeveloper=([a-f0-9]{64})(?:;|$)/)?.[1];
const developerCookie=(value,age)=>DEVELOPER_COOKIE+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+age;
export class Scoreboard{
 constructor(ctx,env={}){this.ctx=ctx;this.env=env;}
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/developer/'))return this.developer(request,url.pathname);
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
  const updated=await this.ctx.storage.transaction(async tx=>{
   const updates=[];
   for(const board of ['overall',entry.stage]){
    const key='board:'+board,rows=await tx.get(key)||[],next=insertBest(rows,entry);
    const position=next.findIndex(v=>v.player===entry.player);
    if(next!==rows&&position>=0){await tx.put(key,next);updates.push({board,position:position+1});}
   }
   return updates;
  });
  return json({ok:true,updated});
 }
 async developer(request,path){
  const now=Date.now(),token=developerToken(request),password=this.env.DEVELOPER_PASSWORD;
  // No embedded fallback. A new namespace revokes pre-fix sessions; rotation revokes new sessions too.
  if(typeof password!=='string'||password.length<16||password.length>256)return json({error:'developer_not_configured'},503);
  const digest=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  const expected=await digest(password),fingerprint=Array.from(expected,b=>b.toString(16).padStart(2,'0')).join('');
  const key='developer:sessions:v2:'+fingerprint;
  if(path==='/api/developer/session'&&request.method==='GET'){
   const sessions=await this.ctx.storage.get(key)||{};return json({active:!!token&&sessions[token]>now});
  }
  if(request.method!=='POST')return json({error:'method'},405);
  if(path==='/api/developer/login'){
   let body;try{body=await request.json();}catch(_){return json({error:'invalid'},400);}
   const result=await this.ctx.storage.transaction(async tx=>{
    const attempts=await tx.get('developer:attempts')||{at:now,count:0};
    if(now-attempts.at>=60000){attempts.at=now;attempts.count=0;}
    if(attempts.count>=8)return {status:429};
    attempts.count++;await tx.put('developer:attempts',attempts);
    if(typeof body?.password!=='string'||body.password.length<16||body.password.length>256)return {status:401};
    const actual=await digest(body.password);let difference=0;for(let i=0;i<expected.length;i++)difference|=expected[i]^actual[i];
    if(difference)return {status:401};
    const sessions=Object.fromEntries(Object.entries(await tx.get(key)||{}).filter(([,until])=>until>now));
    const ids=Object.keys(sessions);while(ids.length>=20)delete sessions[ids.shift()];
    const fresh=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
    sessions[fresh]=now+28800000;await tx.put(key,sessions);return {status:200,token:fresh};
   });
   return result.status===200?json({active:true},200,{'Set-Cookie':developerCookie(result.token,28800)}):json({error:result.status===429?'rate_limited':'incorrect_password'},result.status);
  }
  if(path==='/api/developer/logout'){
   await this.ctx.storage.transaction(async tx=>{const sessions=await tx.get(key)||{};if(token)delete sessions[token];await tx.put(key,sessions);});
   return json({active:false},200,{'Set-Cookie':developerCookie('',0)});
  }
  if(path==='/api/developer/reset-scoreboard'){
   const allowed=await this.ctx.storage.transaction(async tx=>{
    const sessions=await tx.get(key)||{};if(!token||!(sessions[token]>now))return false;
    for(const board of ['overall',...STAGES])await tx.delete('board:'+board);
    return true;
   });
   return allowed?json({ok:true}):json({error:'unauthorized'},401);
  }
  return json({error:'not_found'},404);
 }

}
export default{
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  const developerPath=['/api/developer/session','/api/developer/login','/api/developer/logout','/api/developer/reset-scoreboard'].includes(url.pathname);
  if(url.pathname!=='/api/leaderboard'&&!developerPath)return json({error:'not_found'},404);
  if(!env.SCOREBOARD)return json({error:'unavailable'},503);
  if(request.method!=='GET'&&request.method!=='POST')return json({error:'method'},405);
  const board=env.SCOREBOARD.get(env.SCOREBOARD.idFromName('global-v1'));
  if(request.method==='GET'){if(developerPath&&url.pathname!=='/api/developer/session')return json({error:'method'},405);return board.fetch(request);}
  // Browser-origin requests only. Credentials and player IDs are never sent to clients in rows.
  if(request.headers.get('Origin')!==url.origin||!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'origin'},403);
  if(Number(request.headers.get('Content-Length'))>4096)return json({error:'too_large'},413);
  const raw=await request.text();if(raw.length>4096)return json({error:'too_large'},413);
  if(developerPath)return board.fetch(new Request(url,{method:'POST',headers:request.headers,body:raw}));
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
