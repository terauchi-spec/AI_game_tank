// Presentation only: progression and award persistence remain in their existing owners.
const UNLOCK_INSTRUCTOR_KEY='tankGameUnlockInstructorV1';
const UNLOCK_INSTRUCTORS=['instructor_1','instructor_2','instructor_3','instructor_4','instructor_5','instructor_6','instructor_7','instructor_8','instructor_9','instructor_10','instructor_11','instructor_12','instructor_0'];
// Choose once per result from observed run statistics. No gameplay RNG or frame work.
const INSTRUCTOR_DIALOGUE_KEY='tankGameInstructorDialogueV1';
const INSTRUCTOR_DIALOGUES=[
 {
  "kind": "success",
  "topic": "general",
  "text": "やったな、作戦成功！わしもうれしいぞ。今はちょっと、にやにやしていてよい。"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "おお、やり遂げたな！最後は思わず身を乗り出してしまった。見ているわしまで力が入ったぞ。"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "よくやった！今日は胸を張ってよい日だな。わしも、となりで胸を張っておこう。"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "成功だ！もう一回やっても、また違う面白さがありそうだな。今の作戦、わしは好きだぞ。"
 },
 {
  "kind": "success",
  "topic": "general",
  "text": "お見事！うれしいなあ。こんなときは、いつものおやつまで少しおいしくなる気がする。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "一度も見つからなかったのか！すごいな。わしなら、うれしくて途中で声を出していたかもしれん。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "こっそり成功だな！見つからないまま終わると、なんだか秘密のいたずらが成功した気分だ。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "気づかれずにやり遂げたぞ。静かな作戦なのに、わしの心の中は大騒ぎだった。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "おお、最後まで見つからずに！こんな作戦を見ると、わしまで足音を小さくしたくなる。"
 },
 {
  "kind": "success",
  "topic": "stealth",
  "text": "見つからずに成功とは、やるなあ。敵が首をかしげていそうで、ちょっとにやけてしまう。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "ひやひやしたが、作戦成功だ！傷を負ってもやり遂げたな。今はひと息ついてよいぞ。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "危ない場面もあったなあ。だからこそ、成功の知らせがうれしい。わしも肩の力が抜けたぞ。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "傷を負いながらの成功か。よく粘ったな。見ているわしも、つい手を握りしめてしまった。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "やったぞ！苦しい場面もあったろう。今くらいは、ふうっと息を吐いて、一緒に喜ぼう。"
 },
 {
  "kind": "success",
  "topic": "resilience",
  "text": "よくやり遂げたな。危ないところでは、わしも「あっ」と声が出た。成功して、ほっとしたぞ。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "その工夫、いいなあ！気絶やスキルを生かした作戦は、見ていてわくわくするぞ。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "おお、そう来たか！道具や技は、使う人しだいで面白くなるな。わしも試したくなった。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "工夫が実ったな！力ずくとは違う面白さがある。思わず、にやりとしてしまったぞ。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "うまいこと考えたなあ。同じ場所でも、やり方が変わると別の道に見えるものだな。"
 },
 {
  "kind": "success",
  "topic": "tactics",
  "text": "技を生かして成功だ！「そこで使うのか」と驚くのは、教える側にいても楽しいものだ。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "仲間も活躍したな！一緒にうまくいくと、うれしさまで増える気がするぞ。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "みんなの力が働いたな。こういう成功はいいなあ。わしも、その輪に入りたくなる。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "仲間とつかんだ成功だ！一人で喜ぶより、顔を見合わせて喜びたくなるな。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "支え合って進めたな。助けてもらえるとうれしいし、助けられたら、もっとうれしいものだ。"
 },
 {
  "kind": "success",
  "topic": "team",
  "text": "いい連携だったな！それぞれの働きがつながるところを見ると、わしはわくわくする。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "書類を持ち出して成功だ！紙なのに、ずっしり大事なものを運んだ気分になるな。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "資料の回収、お見事！見つけたあとも作戦は続くからな。成功の知らせに、ほっとしたぞ。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "書類を集めて脱出できたな！こっそり持ち帰る作戦は、秘密の宝探しみたいでわくわくする。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "必要な資料を手に入れたぞ！派手さはなくても、こういう成功は、じわじわうれしいな。"
 },
 {
  "kind": "success",
  "topic": "documents",
  "text": "回収から脱出まで、やり遂げたな。わしまで「大事なもの、ちゃんと持ったか」と落ち着かなかったぞ。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "おっ、また一つ、うれしいことが増えたな！こういう知らせは、何度見ても顔がほころぶ。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "積み重ねが形になったな！目に見えるとうれしいものだ。わしまで、ちょっと得意な顔になってしまう。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "一歩先へ進んだぞ！この先に何があるのか、わしも気になってきた。楽しみが増えたな。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "おお、成長の知らせだ！前の自分が今を見たら、びっくりするかもしれんな。"
 },
 {
  "kind": "success",
  "topic": "growth",
  "text": "成功に、うれしい知らせまでついてきたな！今日はちょっと、ぜいたくな気分だぞ。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "敵を倒し、目標も達成だ！緊張したぶん、成功の知らせがぱっと明るく感じるな。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "戦いを越えて、やり遂げたな！わしも、つい応援に力が入ってしまったぞ。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "お見事！敵を倒す場面もあったが、ちゃんと目標へ届いたな。わしも、ほっとした。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "作戦成功だ！同じ目標でも、たどり着き方はいろいろだな。次はどんな作戦になるか楽しみだ。"
 },
 {
  "kind": "success",
  "topic": "combat",
  "text": "よくやった！戦いのある作戦は、見ているだけでもどきどきする。成功、一緒に喜ぼう。"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "ああ、今回は届かなかったか。わしも悔しいぞ。まずは、ひと息つこうか。"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "ううむ、作戦失敗か。こんな日もある。わしは、まだ次を楽しみにしているぞ。"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "残念だったなあ。うまくいかないときは、ちょっと休むのもありだ。おやつでもどうかな。"
 },
 {
  "kind": "failure",
  "topic": "general",
  "text": "今回は、うまくいかなかったな。もう一度でも、今日はここまででもよい。また一緒に挑もう。"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "おっと、もう終わってしまったか！わしも、まだ身構えていたところだ。次は少し長く遊びたいな。"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "あっという間だったなあ。こういうこともある。次の一歩が、ちょっと楽しみになってきたぞ。"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "むむ、出だしでつまずいたか。わしにも覚えがあるぞ。気合いばかり先に走ってしまうのだ。"
 },
 {
  "kind": "failure",
  "topic": "early",
  "text": "早い幕切れだったな。悔しいのう。次は、最初の景色を少し眺めてから進むのも面白そうだ。"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "見つかってしまったなあ。わしまで「しーっ」と言いたくなったぞ。気持ちだけでは隠れられんな。"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "敵に気づかれると、どきっとするな。わしなら帽子まで深くかぶり直してしまいそうだ。"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "見つかった場面、わしもひやっとした。悔しいが、次はこっそり通れるかもしれんぞ。"
 },
 {
  "kind": "failure",
  "topic": "detected",
  "text": "敵に気づかれたか。むむ、なかなか手ごわい。次はどこから近づこうか、わしも考えてしまうな。"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "途中まで進めたな！成功には届かなかったが、そこまでの工夫まで消えたわけではないぞ。"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "あとに残る前進があったな。結果は残念だが、「ここはうまくいった」と思う場所もありそうだ。"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "途中の成果もあったぞ。わしは、そこもうれしい。失敗の文字だけでは、全部はわからんな。"
 },
 {
  "kind": "failure",
  "topic": "progress",
  "text": "目標へ進めたところもあったな！次の作戦では、あの続きを見られるかもしれん。楽しみだ。"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "危ない場面があったなあ。わしも、つい「逃げろー」と声が出た。今はひと息ついてよいぞ。"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "苦しい展開だったな。よく粘った。わしも力が入りすぎて、肩がこってしまったぞ。"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "傷を負うと、気持ちまでせわしくなるな。今日はひとまず、ゆっくり息を吐こうか。"
 },
 {
  "kind": "failure",
  "topic": "damage",
  "text": "残念だったなあ。ひやひやして、わしもおやつを食べる手が止まったぞ。次は、もう少しのんびり見守りたいな。"
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
