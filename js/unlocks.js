// Presentation only: progression and award persistence remain in their existing owners.
const UNLOCK_INSTRUCTOR_KEY='tankGameUnlockInstructorV1';
const UNLOCK_INSTRUCTORS=['instructor_1','instructor_2','instructor_3','instructor_4','instructor_5','instructor_6','instructor_7','instructor_8','instructor_9','instructor_10','instructor_11','instructor_12','instructor_0'];
// Choose once per result from observed run statistics. No gameplay RNG or frame work.
const INSTRUCTOR_DIALOGUE_KEY='tankGameInstructorDialogueV1';
const INSTRUCTOR_DIALOGUES=[
 {
  "kind": "success",
  "topic": "general",
  "text": "作戦成功だ。まずは喜ぼう。そのあとで、うまくいった理由を一つ見つけてみよう。"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "よくやった。成功は、次も同じようにできる理由を探してこそ、自分の力になるぞ。"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "目標を達成したな。急いだ場面と、待った場面。どちらが道を開いたかな。"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "成功おめでとう。自分の工夫を一つ言葉にしてみよう。次の作戦の道しるべになる。"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "いい結果だ。ただ、成功した方法が、いつも最善とは限らん。別の道も考えておこう。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "一度も見つからずに成功したな。目立たない工夫にも、大きな価値があるぞ。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "発見されずに目標達成だ。進む勇気だけでなく、待つ強さも働いたのかもしれんな。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "気づかれずに進めたな。見えないところで重ねた判断が、結果を支えたのだ。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "見つからずにやり遂げたぞ。敵をよく見ることは、自分を守ることにもつながる。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "静かな成功だな。どこで進み、どこで止まったか。その判断を覚えておこう。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "傷を負いながらも成功したな。最後まで進めた理由と、減らせた危険を考えてみよう。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "危ない場面を越えたな。よく粘った。ただし、我慢することだけが強さではないぞ。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "攻撃を受けても目標を達成したな。次は、同じ成果をもっと安全に出せるか試そう。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "苦しい場面もあっただろう。成功を喜びつつ、身を守る工夫を一つ持ち帰ろう。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "踏ん張ったな。次に似た場面が来たら、進むか、いったん退くか。選べる道を増やそう。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "気絶やスキルを作戦に生かしたな。力を出す場所を選ぶことも、大事な力だ。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "工夫が実を結んだな。使った道具より、使う場面を選んだ理由を覚えておこう。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "正面から進むだけが道ではないと示したな。次は、別の工夫でも道を開いてみよう。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "相手の動きを変える工夫があったな。自分が動く前に、状況を動かす考え方もある。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "技を生かして成功したぞ。使えるから使うのか、必要だから使うのか。そこも考えてみよう。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "仲間の働きも成功につながったな。自分の手柄だけでなく、支えてくれた力も見ておこう。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "一人ではない強さを生かしたな。助けを借りることも、立派な判断だぞ。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "仲間と得た成功だ。任せる場面と、自分が引き受ける場面を振り返ってみよう。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "支え合う力が働いたな。次は、自分が仲間を助けられる場面も探してみよう。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "みんなの力で道が開いたな。自分以外の働きに気づくと、次の作戦も変わってくる。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "重要書類を集めて成功したな。取ることと、無事に運び出すことは、ひと続きの仕事だ。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "書類を持ち出せたな。目先の相手より、本当の目標を見失わないことが大切だぞ。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "資料の回収をやり遂げたな。近い順に進む以外にも、安全な順という考え方がある。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "必要な情報を手に入れたな。目的を知っていると、しなくてよい行動も見えてくる。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "回収して脱出まで進めたな。途中の達成で気を抜かず、最後まで考える姿勢を大切にしよう。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "新しい記録や成長が形になったな。数字だけでなく、前よりできたことにも目を向けよう。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "一歩先へ進んだな。前の自分と比べて、どの判断が変わったか探してみよう。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "今回、新しく得たものがあるな。増えた選択肢をどう使うか、次の楽しみにしよう。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "積み重ねが形になったぞ。得意を伸ばす道も、苦手を試す道も、どちらも成長につながる。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "成長を喜ぼう。ただ、記録が伸びない日にも学びはある。そのことも忘れずにな。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "相手を倒し、目標も達成したな。倒した数だけでなく、何のための行動だったか考えよう。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "戦いを越えて成功したな。次は、戦わずに済む場面がなかったか探してみよう。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "行動する力を示したな。その力を、必要なときに必要なだけ使えるようになろう。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "戦いの中でも目標へ届いたな。目の前の相手に集中しすぎなかったか、振り返ってみよう。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "やり遂げたぞ。勝てる相手と戦うことと、戦う必要があることは、同じではないからな。"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "悔しい結果だったな。まずはひと息つこう。次に変えることは、一つ決めれば十分だ。"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "今回は目標に届かなかった。だが、この一回だけで君の力が決まるわけではないぞ。"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "うまくいかない日はある。できなかったことだけでなく、試したことにも目を向けよう。"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "失敗を急いで忘れなくてよい。どの場面からやり直したいか、そこに次のヒントがある。"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "今回は短い挑戦だったな。次はすぐに進まず、周りを見る時間を少しつくってみよう。"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "思ったより早く終わったかもしれんな。最初の一歩を変えるだけでも、先の景色は変わる。"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "出だしでつまずくこともある。まずは近くの危険を一つ確かめてから、動いてみよう。"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "急ぐ気持ちはわかる。だが、早く動くことと、早く目標に届くことは同じではないぞ。"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "敵に見つかった場面があったな。相手はどこを見ていたか、次の挑戦で確かめてみよう。"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "見つかると焦るものだ。そんなときほど、進む以外の選択も思い出してほしい。"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "敵に気づかれたあと、どう動いたかな。失敗の理由は、見つかった瞬間だけとは限らんぞ。"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "発見された場面には学びがある。物陰、距離、待つ時間。次はどれを変えてみるかな。"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "途中まで目標を進めたな。その工夫は残し、最後に足りなかった一つを探してみよう。"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "目標への前進はあったぞ。成功しなかったからといって、全部を変える必要はない。"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "途中で得た成果も、今回の戦績だ。よかった判断と、変えたい判断を分けて考えよう。"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "ここまで進めた理由を忘れるな。次は、残りの道をどう安全につなぐか考えてみよう。"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "攻撃を受けた場面があったな。逃げることを、弱さだと思わなくてよいぞ。"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "危険の中で粘ったな。ただ、同じ方法を続けるだけでは道が開かないこともある。"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "傷を負ったとき、何を優先したかな。目標を目指すことと、身を守ることを一緒に考えよう。"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "苦しい展開だったな。次は危険を一つ減らそう。助けや物陰を使う判断も、君の力だ。"
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
 if(!s?.final||(typeof areaDebugEnabled!=='undefined'&&areaDebugEnabled)||s.awards?.disabled)return [];
 const items=[],stages=typeof STAGE_ORDER!=='undefined'?STAGE_ORDER:[],skills=typeof SK!=='undefined'?SK:[],titles=typeof TITLE_CATALOG!=='undefined'?TITLE_CATALOG:[];
 const stage=stages.find(v=>v.id===s.unlockedStage);
 if(stage&&!s.stageUnlockSaveFailed)items.push({kind:'stage',id:stage.id,name:(typeof stageDisplayNumber==='function'?stageDisplayNumber(stage.id)+' ':'')+stage.name,image:'assets/ui/stages/'+stage.image+'.webp',note:'次回の出撃から選択できます'});
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
let unlockRevealTimer=null;
function cancelUnlockReveal(){
 if(unlockRevealTimer!==null){clearTimeout(unlockRevealTimer);unlockRevealTimer=null;}
 // Interrupted presentations leave every card readable during manual scrolling.
 document.getElementById('unlockList').classList.remove('unlock-sequencing');
}
function beginUnlockReveal(screen){
 cancelUnlockReveal();
 const list=document.getElementById('unlockList'),run=unlockRun;
 if(!list.querySelectorAll('.unlock-card').length)return;
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
   screen.scrollTo({top:0,left:0,behavior});
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
  document.getElementById('unlockDialogue').textContent=instructorDialogueForRun(s);
  document.getElementById('unlockList').innerHTML=s.unlockNoticeItems.length?s.unlockNoticeItems.map(renderUnlockCard).join(''):'<p class="unlock-empty-note">新しいアンロックはありません。<br>今回の戦績を評価画面で振り返ろう。</p>';
  screen.hidden=false;document.body.classList.add('unlock-open');screen.scrollTop=0;
  document.getElementById('unlockEvaluate').focus({preventScroll:true});
  beginUnlockReveal(screen);
 }else if(updated){const list=document.getElementById('unlockList'),shown=list.querySelectorAll('.unlock-card').length;if(!shown)list.innerHTML='';list.insertAdjacentHTML('beforeend',s.unlockNoticeItems.slice(shown).map(renderUnlockCard).join(''));if(!list.classList.contains('unlock-sequencing')&&typeof sfx==='function')sfx('unlockCard');}
 return true;
}
function acknowledgeRunUnlocks(){
 if(!unlockRun||typeof scoreStats==='undefined'||scoreStats!==unlockRun)return;
 unlockRun.unlockNoticeAcknowledged=true;closeUnlockScreen();
 if(typeof sfx==='function')sfx('uiConfirm');syncResultScreen();
}
document.getElementById('unlockEvaluate').addEventListener('click',acknowledgeRunUnlocks);
addEventListener('keydown',event=>{
 if(!unlockRun)return;
 if(event.code==='Enter'||event.code==='Space'||event.code==='Escape'){
  event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)acknowledgeRunUnlocks();
 }
},{capture:true});
