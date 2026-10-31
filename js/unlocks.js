// Presentation only: progression and award persistence remain in their existing owners.
const UNLOCK_INSTRUCTOR_KEY='tankGameUnlockInstructorV1';
const UNLOCK_INSTRUCTORS=['instructor_1','instructor_2','instructor_3','instructor_4','instructor_5','instructor_6','instructor_7','instructor_8','instructor_9','instructor_10','instructor_11','instructor_12','instructor_0'];
// Choose once per result from observed run statistics. No gameplay RNG or frame work.
const INSTRUCTOR_DIALOGUE_KEY='tankGameInstructorDialogueV1';
const INSTRUCTOR_DIALOGUES=[
 {
  "kind": "success",
  "topic": "general",
  "text": "よくやった！作戦成功だ。わしもうれしいぞ"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "お見事！最後まで見ていて、つい応援に力が入ってしまった"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "やったな！今日は思いきり喜ぼう。わしも一緒に喜ばせてもらうぞ"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "成功だ！今の作戦、よかったなあ。もう一度見たくなったぞ"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "おお、やったぞ！これはお祝いだな。とっておきのおやつを出そうか"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "一度も見つからずに成功か！やるなあ。わしなら、うれしくて途中で声が出てしまいそうだ"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "こっそり大成功だな！敵に気づかれなかったと思うと、なんだか楽しいのう"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "最後まで気づかれなかったな！静かな作戦だったが、わしはずっとどきどきしていたぞ"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "見つからずにやり遂げたな。わしまで、つい息をひそめて見てしまった"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "うまく隠れて進めたな！敵はいつ気づくのかと思って、にやにやしてしまったぞ"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "危ない場面もあったが、成功だ！よくやり遂げたな。少し休もうか"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "ひやひやしたぞ。成功してよかったなあ。わしも、やっとほっとした"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "傷を負っても、最後までやり遂げたな。よく頑張った。今はひと息ついてよいぞ"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "やったな！苦しい場面もあっただろう。まずは、無事に作戦を終えたことを喜ぼう"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "よく粘ったな。危ないところでは、思わず「あっ」と声が出たぞ。成功して、本当によかった"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "その工夫、よかったぞ！気絶やスキルをうまく使うところは、見ていて楽しいな"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "おお、そこで使うのか！なるほどなあ。わしも試してみたくなった"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "うまくいったな！工夫が当たると気持ちがよいのう。見ているわしまでうれしくなる"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "うまいこと考えたなあ。やり方を変えると、同じ場所でも面白くなるものだな"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "技が役に立ったな！そういう使い方もあるのかと、わしも感心してしまったぞ"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "仲間も活躍したな！みんなでうまくいくと、うれしさも増すのう"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "仲間と一緒につかんだ成功だな。よし、みんなで喜ぼう！"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "いい作戦だったな！助け合ってうまくいくと、見ているほうまでうれしくなるぞ"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "仲間の助けがありがたかったな。わしも一緒に、お礼を言いたいくらいだ"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "いい連携だったぞ！それぞれの頑張りがつながると、うまくいくものだな"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "書類を持ち帰れたな！よしよし、これでひと安心だ"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "資料の回収、お見事！脱出できるまで、わしも落ち着かなかったぞ"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "書類を集めて、脱出も成功だ！こっそり探して持ち帰るのは、なかなか楽しいのう"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "大事な資料を手に入れたな！派手な作戦ではないが、こういう成功もいいものだ"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "回収から脱出まで、よくやった！最後まで見届けて、わしもほっとしたぞ"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "おっ、うれしい知らせが増えたな！こういうのは、何度見てもうれしいものだ"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "頑張ったことが形になったな！よかったのう。わしまで自慢したくなってしまう"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "また一歩、先へ進んだな！この先も楽しみだ。わしも応援しているぞ"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "おお、成長したな！前の自分が見たら、きっと驚くぞ"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "作戦成功に、うれしい知らせもついてきたな！今日はいい日になったのう"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "敵を倒して、目標も達成だ！よくやった。わしも、ほっとしたぞ"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "戦いを乗り越えて、やり遂げたな！応援していて、つい声が大きくなってしまった"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "お見事！戦いながらも、目標までたどり着いたな。よく頑張ったぞ"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "作戦成功だ！次はどんなやり方で挑むのか、楽しみになってきたぞ"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "よくやった！応援に夢中で、おやつを食べるのを忘れていたぞ"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "ああ、残念だったな。わしも悔しいぞ。まずは、ひと息つこうか"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "ううむ、今回はうまくいかなかったか。まあ、こんな日もある。また挑んでみよう"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "悔しいのう。少し休んでもよいぞ。おやつを食べながら、のんびりしようか"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "今回は残念だったな。もう一度やるか、今日は休むか。どちらでも、わしは応援しているぞ"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "おっと、あっという間だったな！わしもびっくりしたぞ。次は、もう少し先まで行きたいのう"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "早く終わってしまったなあ。悔しいが、こういうこともある。もう一度、やってみるか"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "最初のところでやられたか。わしも、張り切りすぎて失敗したことがあるぞ"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "むむ、早かったな。次は、動く前に少し様子を見てみようか。わしも一緒に見ておこう"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "見つかってしまったか！わしまで、思わず「しーっ」と言ってしまったぞ"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "敵に気づかれると、どきっとするな。わしも、つい身をすくめてしまった"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "見つかったときは、ひやっとしたぞ。悔しいなあ。次は、うまく通り抜けたいのう"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "むむ、敵もなかなか目ざといな。次は、別のところから近づいてみるのもよさそうだ"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "途中まで進めたな。今回は残念だったが、うまくいったところもあったぞ"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "目標に近づけたところもあったな。そこは、次の作戦でも生かせそうだぞ"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "途中の成果も、ちゃんと見ていたぞ。全部うまくいかなかったわけではないからな"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "進めたところもあったな！次はその先まで行けるかもしれん。わしも楽しみにしているぞ"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "危なかったなあ。わしも、つい「逃げろー」と声が出たぞ。少し休もうか"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "苦しい場面もあったな。見ているわしまで力が入ったぞ。今はひと息つこう"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "傷を負うと、焦ってしまうものだな。まずは、ゆっくり息を吐こうか"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "残念だったなあ。ひやひやして、おやつどころではなかったぞ。次も応援しているからな"
 }
];
let instructorDialogueNext=0,instructorDialogueRecent=[];
try{const saved=JSON.parse(localStorage.getItem(INSTRUCTOR_DIALOGUE_KEY)||'null');if(Number.isSafeInteger(saved?.next)&&saved.next>=0)instructorDialogueNext=saved.next;if(Array.isArray(saved?.recent))instructorDialogueRecent=saved.recent.filter(v=>Number.isInteger(v)&&v>=0&&v<INSTRUCTOR_DIALOGUES.length).slice(-12);}catch(_){}
function instructorDialogueTopics(s){
 const n=key=>Number.isFinite(s[key])?s[key]:0;
 const topics=new Set();
 if(s.final.cleared){
  if(n('time')>0&&n('detections')===0)topics.add('stealth');
  if(n('damageHits')>0||n('playerDamage')>0||n('vehicleDamage')>0)topics.add('resilience');
  if(n('tacticalStuns')>0||n('decoyLures')>0||n('wallBlocks')>0)topics.add('tactics');
  if(n('allyKills')>0||n('jointObjectiveSeconds')>0||n('partnerDocuments')>0||n('jointKills')>0)topics.add('team');
  if(n('documents')>0)topics.add('documents');
  if(s.newHigh||collectRunUnlocks(s).length>0)topics.add('growth');
  if(n('playerKills')>0)topics.add('combat');
 }else{
  if(n('time')>0&&n('time')<30)topics.add('early');
  if(n('detections')>0)topics.add('detected');
  if(n('documents')>0||n('capturePoints')>0||n('objectiveProgress')>0||n('objectiveDamage')>0||n('objectiveAdvance')>0)topics.add('progress');
  if(n('damageHits')>0||n('playerDamage')>0||n('vehicleDamage')>0)topics.add('damage');
 }
 return topics;
}
function instructorDialogueForRun(s){
 if(typeof s.instructorDialogue==='string')return s.instructorDialogue;
 const kind=s.final.cleared?'success':'failure',topics=instructorDialogueTopics(s);
 const eligible=INSTRUCTOR_DIALOGUES.map((line,id)=>({...line,id})).filter(line=>line.kind===kind);
 const relevant=eligible.filter(line=>topics.has(line.topic));
 const pool=relevant.length&&instructorDialogueNext%3!==2?relevant:eligible.filter(line=>line.topic==='general');
 const fresh=pool.filter(line=>!instructorDialogueRecent.includes(line.id));
 const choices=fresh.length?fresh:pool.filter(line=>line.id!==instructorDialogueRecent.at(-1));
 const line=(choices.length?choices:pool)[instructorDialogueNext%(choices.length||pool.length)];
 let name='';try{if(instructorDialogueNext%4===0&&typeof readIntroName==='function')name=readIntroName();}catch(_){}
 s.instructorDialogue=(name?name+'、':'')+line.text;
 instructorDialogueNext=(instructorDialogueNext+1)%1000000;instructorDialogueRecent=[...instructorDialogueRecent,line.id].slice(-12);
 try{localStorage.setItem(INSTRUCTOR_DIALOGUE_KEY,JSON.stringify({next:instructorDialogueNext,recent:instructorDialogueRecent}));}catch(_){}
 return s.instructorDialogue;
}

let unlockRun=null,unlockInstructorNext=0;
try{const saved=Number(localStorage.getItem(UNLOCK_INSTRUCTOR_KEY));if(Number.isSafeInteger(saved)&&saved>=0)unlockInstructorNext=saved%UNLOCK_INSTRUCTORS.length;}catch(_){}
function escapeUnlockText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function collectRunUnlocks(s){
 if(s?.training)return [];
 if(!s?.final||(typeof areaDebugEnabled!=='undefined'&&areaDebugEnabled)||s.awards?.disabled)return [];
 const items=[],stages=typeof STAGE_ORDER!=='undefined'?STAGE_ORDER:[],skills=typeof SK!=='undefined'?SK:[],titles=typeof TITLE_CATALOG!=='undefined'?TITLE_CATALOG:[];
 const stage=stages.find(v=>v.id===s.unlockedStage);
 if(stage&&!s.stageUnlockSaveFailed)items.push({kind:'stage',id:stage.id,name:(typeof stageDisplayNumber==='function'?stageDisplayNumber(stage.id)+' ':'')+stage.name,image:(stage.image.startsWith('laboratory/')?'assets/indoor/':'assets/ui/stages/')+stage.image+'.webp',note:'次回の出撃から選択できます'});
 const skill=skills.find(v=>v.id===s.unlockedSkill);
 if(skill&&!s.unlockSaveFailed)items.push({kind:'skill',id:skill.id,name:'「'+skill.n+'」',image:typeof skillCardIconSrc==='function'?skillCardIconSrc(skill.id):'',note:'次回の出撃から選択できます'});
 if(!s.awards?.saveFailed)for(const id of new Set(s.awards?.newTitles||[])){
  const title=titles.find(v=>v.id===id);if(title)items.push({kind:'title',id,name:title.name,title,note:title.type||'新しい称号を獲得しました'});
 }
 const promotion=s.careerPromotion;
 if(!s.awards?.saveFailed&&promotion&&Number.isInteger(promotion.previousLevel)&&Number.isInteger(promotion.level)&&promotion.previousLevel>=1&&promotion.level>promotion.previousLevel&&promotion.level<=16&&promotion.name){
  items.push({kind:'rank',id:'careerRank',name:promotion.name,note:promotion.from+' → '+promotion.name});
 }
 const boards=(s.leaderboardUpdates||[]).filter(v=>Number.isInteger(v.position)&&v.position>=1&&v.position<=30&&(v.board==='overall'||stages.some(stage=>stage.id===v.board)));
 if(boards.length){
  const best=Math.min(...boards.map(v=>v.position)),medal=best===1?'gold':best===2?'silver':'bronze';
  items.push({kind:'leaderboard',id:'leaderboard',name:Math.round(s.final.total).toLocaleString('ja-JP')+'点',image:'assets/ui/leaderboard/medal-'+medal+'.webp',note:boards.map(v=>(v.board==='overall'?'総合':stages.find(stage=>stage.id===v.board).name)+' '+v.position+'位').join(' ／ ')});
 }
 return items;
}
function renderUnlockCard(item){
 const labels={stage:'新ステージ',skill:'新スキル',title:'新称号',rank:'昇級！',leaderboard:'スコアボード更新'},label=labels[item.kind];
 const art=item.kind==='rank'?'<span class="unlock-rank-mark">↑</span>':item.kind==='title'?(typeof awardIcon==='function'?awardIcon(item.title,'title'):''):('<img src="'+escapeUnlockText(item.image)+'" alt="" decoding="async" loading="lazy">');
 return '<article class="unlock-card unlock-card-'+item.kind+'"><div class="unlock-card-art" aria-hidden="true">'+art+'</div><div class="unlock-card-copy"><h2>'+label+'</h2><div class="unlock-name">'+escapeUnlockText(item.name)+'</div>'+(item.kind==='leaderboard'||item.kind==='rank'?'<div class="unlock-leaderboard-ranks">'+escapeUnlockText(item.note)+'</div>':'')+'</div></article>';
}
let unlockRevealTimer=null,unlockScrollCleanup=null;
function startUnlockGameBgm(run){
 if(!run||unlockRun!==run||document.getElementById('unlockScreen').hidden)return;
 if(typeof beginResultGameBgm==='function')beginResultGameBgm(run);
 if(typeof updateGameBgm==='function')updateGameBgm();
}
function finishUnlockScroll(screen,run,reduced){
 const needsScroll=!reduced&&screen.scrollTop>1;
 if(!needsScroll){screen.scrollTo({top:0,left:0,behavior:'instant'});startUnlockGameBgm(run);return;}
 let finished=false;
 const done=()=>{
  if(finished)return;finished=true;
  if(unlockRevealTimer!==null)clearTimeout(unlockRevealTimer);unlockRevealTimer=null;
  screen.removeEventListener?.('scroll',onScroll);screen.removeEventListener?.('scrollend',onEnd);unlockScrollCleanup=null;
  startUnlockGameBgm(run);
 };
 const onEnd=()=>{if(screen.scrollTop<=1)done();};
 const onScroll=()=>{if(finished)return;if(unlockRevealTimer!==null)clearTimeout(unlockRevealTimer);unlockRevealTimer=setTimeout(done,150);};
 unlockScrollCleanup=()=>{finished=true;screen.removeEventListener?.('scroll',onScroll);screen.removeEventListener?.('scrollend',onEnd);};
 screen.addEventListener('scroll',onScroll,{passive:true});screen.addEventListener('scrollend',onEnd);
 // scrollend is preferred; the debounced scroll event supports older browsers.
 // A single bounded fallback also covers a scroll request that emits no events.
 unlockRevealTimer=setTimeout(done,1000);
 screen.scrollTo({top:0,left:0,behavior:'smooth'});
}
function cancelUnlockReveal(){
 if(unlockScrollCleanup){unlockScrollCleanup();unlockScrollCleanup=null;}
 if(unlockRevealTimer!==null){clearTimeout(unlockRevealTimer);unlockRevealTimer=null;}
 // Interrupted presentations leave every card readable during manual scrolling.
 document.getElementById('unlockList').classList.remove('unlock-sequencing');
}
function beginUnlockReveal(screen){
 cancelUnlockReveal();
 const list=document.getElementById('unlockList'),run=unlockRun;
 if(!list.querySelectorAll('.unlock-card').length){startUnlockGameBgm(run);return;}
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const behavior=reduced?'instant':'smooth';
 if(typeof loadGameSe==='function')loadGameSe('unlockCard',true);
 let index=0;
 list.classList.add('unlock-sequencing');
 function revealNext(){
  unlockRevealTimer=null;
  if(unlockRun!==run||screen.hidden)return;
  const cards=list.querySelectorAll('.unlock-card');
  if(index===cards.length){
   list.classList.remove('unlock-sequencing');
   finishUnlockScroll(screen,run,reduced);
   return;
  }
  const card=cards[index++];
  const top=Math.max(0,screen.scrollTop+card.getBoundingClientRect().top-screen.getBoundingClientRect().top-20);
  screen.scrollTo({top,left:0,behavior});
  card.classList.add('unlock-card-revealed');
  if(typeof sfx==='function')sfx('unlockCard');
  // Match the CSS reveal duration. The final completion returns immediately, without a dwell.
  unlockRevealTimer=setTimeout(revealNext,reduced?0:550);
 }
 unlockRevealTimer=setTimeout(revealNext,120);
}
// Manual interaction takes priority over the opening scroll.
const unlockScrollScreen=document.getElementById('unlockScreen');
function interruptUnlockReveal(){
 cancelUnlockReveal();
 unlockScrollScreen.scrollTo({top:unlockScrollScreen.scrollTop,left:0,behavior:'instant'});
 startUnlockGameBgm(unlockRun);
}
for(const event of ['pointerdown','touchstart','wheel','keydown'])unlockScrollScreen.addEventListener(event,interruptUnlockReveal,{passive:true});
function closeUnlockScreen(){
 cancelUnlockReveal();
 document.body.classList.remove('unlock-open');document.getElementById('unlockScreen').hidden=true;unlockRun=null;
}
function syncUnlockScreen(s){
 if(!s?.final){if(unlockRun)closeUnlockScreen();return false;}
 let updated=false;
 if(!s.unlockNoticePrepared){s.unlockNoticePrepared=true;s.unlockNoticeItems=collectRunUnlocks(s);s.unlockLeaderboardApplied=!!s.leaderboardUpdates?.length;}
 else if(s.leaderboardUpdates?.length&&!s.unlockLeaderboardApplied){
  s.unlockLeaderboardApplied=true;
  const notices=collectRunUnlocks(s).filter(v=>v.kind==='leaderboard');
  if(notices.length){
   s.unlockNoticeItems=s.unlockNoticeAcknowledged?notices:[...s.unlockNoticeItems,...notices];
   s.unlockNoticeAcknowledged=false;updated=true;
  }
 }
 if(s.unlockNoticeAcknowledged){if(unlockRun)closeUnlockScreen();return false;}
 if(unlockRun!==s){
  const screen=document.getElementById('unlockScreen'),image=document.getElementById('unlockInstructor');
  unlockRun=s;image.src='assets/ui/instructors/'+UNLOCK_INSTRUCTORS[unlockInstructorNext]+'.webp?v=2026.10.25.1434';
  unlockInstructorNext=(unlockInstructorNext+1)%UNLOCK_INSTRUCTORS.length;
  try{localStorage.setItem(UNLOCK_INSTRUCTOR_KEY,String(unlockInstructorNext));}catch(_){}
  document.getElementById('unlockEvaluate').textContent=s.training?'ステージ選択':'評価画面';
  document.getElementById('unlockDialogue').textContent=s.training?(s.final.cleared?'訓練を最後までやり遂げたな！実戦でも、落ち着いてこっそり進むのだ':'訓練はいつでもやり直せるぞ。自分のペースで練習してよい'):instructorDialogueForRun(s);
  document.getElementById('unlockList').innerHTML=s.training?'<p class="unlock-empty-note">新しいアンロックはありません。<br>次はステージを選んで実戦に挑戦しよう。</p>':s.unlockNoticeItems.length?s.unlockNoticeItems.map(renderUnlockCard).join(''):'<p class="unlock-empty-note">新しいアンロックはありません。<br>今回の戦績を評価画面で振り返ろう。</p>';
  screen.hidden=false;document.body.classList.add('unlock-open');screen.scrollTop=0;
  document.getElementById('unlockEvaluate').focus({preventScroll:true});
  beginUnlockReveal(screen);
 }else if(updated){const list=document.getElementById('unlockList'),shown=list.querySelectorAll('.unlock-card').length;if(!shown)list.innerHTML='';list.insertAdjacentHTML('beforeend',s.unlockNoticeItems.slice(shown).map(renderUnlockCard).join(''));if(!list.classList.contains('unlock-sequencing')&&typeof sfx==='function')sfx('unlockCard');}
 return true;
}
function acknowledgeRunUnlocks(){
 if(!unlockRun||typeof scoreStats==='undefined'||scoreStats!==unlockRun)return;
 const trainingRun=!!unlockRun.training;unlockRun.unlockNoticeAcknowledged=true;closeUnlockScreen();
 if(trainingRun){state='stage';stageMode='beginner';selectedStageId='beginner';if(typeof syncStageScreen==='function')syncStageScreen();}
 if(typeof sfx==='function')sfx('uiConfirm');syncResultScreen();
}
document.getElementById('unlockEvaluate').addEventListener('click',acknowledgeRunUnlocks);
addEventListener('keydown',event=>{
 if(!unlockRun)return;
 if(event.code==='Enter'||event.code==='Space'||event.code==='Escape'){
  event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)acknowledgeRunUnlocks();
 }
},{capture:true});
