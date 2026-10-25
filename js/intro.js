// First-start conversation. Reuses existing compressed artwork; no map generation.
const INTRO_NAME_KEY='tankGamePlayerNameV1';
let introSessionName='',introStep=0,introComposing=false,introReadyAt=0;
function normalizeIntroName(value){
 const name=String(value||'').normalize('NFKC').trim();
 return /^[A-Za-z0-9\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fc-\u30fe]{1,10}$/u.test(name)?name:'';
}
function readIntroName(){
 try{return normalizeIntroName(localStorage.getItem(INTRO_NAME_KEY))||introSessionName;}catch(_){return introSessionName;}
}
function resetIntroName(){
 introSessionName='';introStep=0;introComposing=false;introReadyAt=0;
 try{localStorage.removeItem(INTRO_NAME_KEY);}catch(_){}
 document.getElementById('introName').value='';
 document.getElementById('introName').removeAttribute('aria-invalid');
 document.getElementById('introNameError').textContent='';
 document.getElementById('introSaveNote').textContent='';
}
function startFromTitle(){
 if(state!=='title')return;
 if(readIntroName()){enterIntroSkillSelection();return;}
 state='intro';introStep=0;introReadyAt=performance.now()+400;
 document.body.classList.remove('title-open');document.body.classList.add('intro-open');
 document.getElementById('introScreen').hidden=false;
 const image=document.getElementById('introInstructor');
 if(!image.getAttribute('src'))image.src='assets/ui/instructors/instructor_0.webp?v=2026.10.25.1434';
 showIntroStep();
}
function showIntroStep(){
 const first=introStep===0,naming=introStep===1;
 document.getElementById('introDialogue').hidden=naming;
 document.getElementById('introNameForm').hidden=!naming;
 const next=document.getElementById('introNext');next.hidden=naming;
 const copy=document.getElementById('introDialogue');
 if(first)copy.textContent='よくきたな！ここは、こっそり戦車師団の司令本部だ！\nお前にはこれから、こっそり戦車大隊の隊長となってもらう\n・・・\nところで貴様は自分の名前もいえないのか！？';
 else if(!naming){const name=readIntroName();copy.textContent='ほほう、'+name+'か・・・なかなか良い名前ではないか\nその名にはじぬよう、一人前のこっそり兵士をめざすがよい\nではゆけ！'+name+'よ　真のこっそり魂で、この戦況をかえてみせるのだ！';}
 next.textContent=first?'次へ':'スキル選択へ';
 document.getElementById('introScreen').scrollTop=0;
 if(naming)document.getElementById('introName').focus({preventScroll:true});else copy.focus({preventScroll:true});
}
function enterIntroSkillSelection(){
 document.getElementById('introScreen').hidden=true;document.body.classList.remove('intro-open');
 // Name entry must never leave action/movement keys pressed.
 for(const code in keys)keys[code]=false;
 bombReq=false;cannonReq=false;interact=false;skillReq=false;mdown=false;
 rollSkillChoices();state='skill';
}
document.getElementById('introNext').addEventListener('click',()=>{
 if(state!=='intro'||performance.now()<introReadyAt)return;
 sfx('uiConfirm');
 if(introStep===0){introStep=1;showIntroStep();}else if(introStep===2)enterIntroSkillSelection();
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
 sfx('uiConfirm');introStep=2;introReadyAt=performance.now()+400;showIntroStep();
});
