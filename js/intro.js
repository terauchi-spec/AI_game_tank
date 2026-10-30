// First-start conversation. Reuses existing compressed artwork; no map generation.
const INTRO_NAME_KEY='tankGamePlayerNameV1';
let introSessionName='',introStep=0,introComposing=false,introReadyAt=0,introLine=0;
let introTypingTimer=null,introFullText='',introTypedCount=0,introTrainingChoice=null;
function introAwaitingChoice(){return introStep===3&&introLine===2;}
function syncIntroChoices(){
 const choosing=introAwaitingChoice()&&introTypedCount===introFullText.length;
 document.getElementById('introChoices').hidden=!choosing;
 document.getElementById('introNext').hidden=choosing||introTypedCount<introFullText.length;
}
function stopIntroTyping(){
 if(introTypingTimer!==null)clearTimeout(introTypingTimer);
 introTypingTimer=null;
}
function finishIntroTyping(){
 stopIntroTyping();introTypedCount=introFullText.length;
 document.getElementById('introDialogue').textContent=introFullText;
 syncIntroChoices();
}
function revealIntroCharacter(){
 introTypingTimer=null;
 if(state!=='intro'||introStep===1)return;
 const copy=document.getElementById('introDialogue');
 introTypedCount=Math.min(introFullText.length,introTypedCount+1);
 copy.textContent=introFullText.slice(0,introTypedCount);
 if(introTypedCount<introFullText.length)introTypingTimer=setTimeout(revealIntroCharacter,40);
 else syncIntroChoices();
}
function startIntroTyping(text){
 stopIntroTyping();introFullText=text;introTypedCount=0;
 // Match the training guide: one cue per displayed phrase, including reduced motion.
 sfx('uiSelect');
 document.getElementById('introChoices').hidden=true;
 const copy=document.getElementById('introDialogue');copy.textContent='';copy.setAttribute('aria-label',text);
 document.getElementById('introNext').hidden=true;
 if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches){finishIntroTyping();return;}
 revealIntroCharacter();
}
function normalizeIntroName(value){
 const name=String(value||'').normalize('NFKC').trim();
 return /^[A-Za-z0-9\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fc-\u30fe]{1,10}$/u.test(name)?name:'';
}
function readIntroName(){
 try{return normalizeIntroName(localStorage.getItem(INTRO_NAME_KEY))||introSessionName;}catch(_){return introSessionName;}
}
function resetIntroName(){
 stopIntroTyping();introFullText='';introTypedCount=0;
 introTrainingChoice=null;introSessionName='';introStep=0;introLine=0;introComposing=false;introReadyAt=0;
 try{localStorage.removeItem(INTRO_NAME_KEY);}catch(_){}
 document.getElementById('introName').value='';
 document.getElementById('introName').removeAttribute('aria-invalid');
 document.getElementById('introNameError').textContent='';
 document.getElementById('introSaveNote').textContent='';
}
function startFromTitle(){
 if(state!=='title')return;
 if(readIntroName()){enterIntroSkillSelection();return;}
 state='intro';introStep=0;introLine=0;introTrainingChoice=null;introReadyAt=performance.now()+400;
 document.body.classList.remove('title-open');document.body.classList.add('intro-open');
 document.getElementById('introScreen').hidden=false;
 const image=document.getElementById('introInstructor');
 image.alt='司令本部で迎える教官';image.src='assets/ui/instructors/instructor_0.webp?v=2026.10.25.1434';
 showIntroStep();
}
function introDialogueLines(){
 if(introStep===3)return [
  'よくきたわね！私はアイラ',
  'あなたが一人前のこっそり兵士になれるようにお手伝いをさせてもらうわ',
  'じゃあさっそく、訓練場で基本的な戦い方を学びましょうか！'
 ];
 if(introStep===4)return ['オッケー！じゃあがんばってね'];
 if(introStep===0)return [
  'よくきたな！',
  'ここは、こっそり戦車師団の司令本部だ！',
  '貴様にはこれから、こっそり戦車大隊の隊長となってもらう',
  '・・・',
  'ところで貴様は自分の名前もなのらんのか！？'
 ];
 const name=readIntroName();
 return [
  'ほほう、'+name+'か・・・',
  'なかなか良い名前ではないか',
  'その名にはじぬよう、一人前のこっそり兵士をめざすがよい',
  'ではゆけ！'+name+'よ',
  'いきすぎたサバイバルゲームを決着させるのだ！'
 ];
}
// Keyboard changes the visible viewport on iOS without shrinking the layout viewport.
// Only name entry responds to these events; no per-frame viewport measurements.
function updateIntroNameViewport(){
 if(state!=='intro'||introStep!==1||typeof visualViewport==='undefined')return;
 const screen=document.getElementById('introScreen'),viewport=visualViewport;
 const top=Math.max(12,viewport.offsetTop-screen.getBoundingClientRect().top+12);
 screen.style.setProperty('--intro-form-top',top+'px');
 screen.style.setProperty('--intro-form-height',Math.max(1,viewport.height-24)+'px');
}
if(typeof visualViewport!=='undefined'){
 visualViewport.addEventListener('resize',updateIntroNameViewport);
 visualViewport.addEventListener('scroll',updateIntroNameViewport);
}
function showIntroStep(){
 const naming=introStep===1,copy=document.getElementById('introDialogue');
 if(naming){document.body.classList.add('intro-naming');updateIntroNameViewport();}
 else document.body.classList.remove('intro-naming');
 copy.hidden=naming;
 document.getElementById('introNameForm').hidden=!naming;
 const next=document.getElementById('introNext');
 next.setAttribute('aria-label',introStep===4?(introTrainingChoice?'訓練場へ':'スキル選択へ'):'次のセリフへ');
 if(naming){stopIntroTyping();next.hidden=true;}else startIntroTyping(introDialogueLines()[introLine]);
 document.getElementById('introScreen').scrollTop=0;
 if(naming)document.getElementById('introName').focus({preventScroll:true});else copy.focus({preventScroll:true});
}
function advanceIntroDialogue(){
 if(state!=='intro'||introStep===1||performance.now()<introReadyAt)return;
 introReadyAt=performance.now()+180;
 if(introTypedCount<introFullText.length){finishIntroTyping();return;}
 if(introAwaitingChoice())return;
 if(introLine<introDialogueLines().length-1)introLine++;
 else if(introStep===0){introStep=1;introLine=0;}
 else if(introStep===2){
  introStep=3;introLine=0;
  const image=document.getElementById('introInstructor');
  image.src='assets/characters/battlefield-assistant.webp';image.alt='戦場アシスタントのアイラ';
 }else{
  if(introTrainingChoice)enterIntroTraining();else enterIntroSkillSelection();
  return;
 }
 showIntroStep();
}
function closeIntro(){
 stopIntroTyping();
 document.getElementById('introScreen').hidden=true;document.body.classList.remove('intro-open');document.body.classList.remove('intro-naming');
 // Name entry must never leave action/movement keys pressed.
 for(const code in keys)keys[code]=false;
 bombReq=false;cannonReq=false;interact=false;skillReq=false;mdown=false;
}
function enterIntroSkillSelection(){
 closeIntro();rollSkillChoices();state='skill';
}
function enterIntroTraining(){
 closeIntro();rollSkillChoices();
 // Use the normal deployment path, including its preparation screen and input reset.
 selectedSkillId='throw';selectedStageId='training';state='stage';
 deploySelectedStage();
}
function chooseIntroTraining(train){
 if(state!=='intro'||!introAwaitingChoice()||introTypedCount<introFullText.length||performance.now()<introReadyAt)return;
 introTrainingChoice=train;introStep=4;introLine=0;introReadyAt=performance.now()+180;
 showIntroStep();
}
document.getElementById('introTrain').addEventListener('click',()=>chooseIntroTraining(true));
document.getElementById('introSkipTraining').addEventListener('click',()=>chooseIntroTraining(false));
// A single bubbling click advances once, whether the copy or next button is tapped.
document.getElementById('introConversation').addEventListener('click',event=>{
 if(event.target.closest('#introNameForm, #introChoices'))return;
 advanceIntroDialogue();
});
document.getElementById('introDialogue').addEventListener('keydown',event=>{
 if((event.key==='Enter'||event.key===' ')&&!event.repeat){event.preventDefault();advanceIntroDialogue();}
});
const introNameInput=document.getElementById('introName');
introNameInput.addEventListener('compositionstart',()=>{introComposing=true;});
introNameInput.addEventListener('compositionend',()=>{introComposing=false;});
document.getElementById('introNameForm').addEventListener('submit',event=>{
 event.preventDefault();if(state!=='intro'||introStep!==1||introComposing)return;
 const name=normalizeIntroName(introNameInput.value),error=document.getElementById('introNameError');
 if(!name){error.textContent='英数・ひらがな・カタカナの10文字以内で入力してください。';introNameInput.setAttribute('aria-invalid','true');introNameInput.focus();return;}
 introSessionName=name;introNameInput.value=name;introNameInput.removeAttribute('aria-invalid');error.textContent='';
 try{localStorage.setItem(INTRO_NAME_KEY,name);}catch(_){document.getElementById('introSaveNote').textContent='ブラウザに名前を保存できませんでした。次回は再入力が必要です。';}
 introStep=2;introLine=0;introNameInput.blur();introReadyAt=performance.now()+400;showIntroStep();
});
