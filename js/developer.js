// The server session authorizes destructive actions; no password is stored in the browser.
let developerModeEnabled=false,developerTapCount=0,developerBusy=false;
function isDeveloperMode(){return developerModeEnabled;}
function setDeveloperMode(active){
 developerModeEnabled=!!active;
 document.body.classList[active?'add':'remove']('developer-mode');
 document.getElementById('titleDeveloper').hidden=!active;
 document.getElementById('titleSpecs').hidden=!active;
 if(!active){
  skillDebugAll=false;stageDebugAll=false;areaDebugEnabled=false;selectedAreaDebug=null;debugMode=0;debugInvincible=false;patrolRoutesVisible=false;
  if(typeof resetMazeComparison==='function')resetMazeComparison();
  debugRenderDiagnostic=null;skillMenuDirty=true;
  if(selectedStageId==='areaDebug'||selectedStageId==='frontOni')selectedStageId=null;
  if(typeof updateDebugBadge==='function')updateDebugBadge();
 }
}
async function developerApi(path,body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('/api/developer/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
  const data=await response.json();if(!response.ok){const error=Error(data.error||'request_failed');error.status=response.status;throw error;}return data;
 }finally{clearTimeout(timer);}
}
function closeDeveloperLogin(){
 if(developerBusy)return;
 document.getElementById('developerLogin').hidden=true;state='title';developerTapCount=0;
}
async function developerCreditTap(){
 if(state!=='title'||developerBusy)return;
 if(++developerTapCount<3)return;developerTapCount=0;
 if(isDeveloperMode()){
  setDeveloperMode(false);developerBusy=true;
  try{await developerApi('logout',{});}catch(_){/* Mode stays disabled in this page if offline. */}finally{developerBusy=false;}
  return;
 }
 state='developerPass';document.getElementById('developerLogin').hidden=false;
 document.getElementById('developerPin').value='';document.getElementById('developerLoginStatus').textContent='';
 document.getElementById('developerPin').focus({preventScroll:true});
}
document.getElementById('developerTrigger').addEventListener('click',developerCreditTap);
document.getElementById('developerCancel').addEventListener('click',closeDeveloperLogin);
document.getElementById('developerLoginForm').addEventListener('submit',async event=>{
 event.preventDefault();if(state!=='developerPass'||developerBusy)return;
 const password=document.getElementById('developerPin').value,status=document.getElementById('developerLoginStatus');
 if(password.length<16||password.length>256){status.textContent='16〜256文字のパスワードを入力してください。';return;}
 developerBusy=true;document.getElementById('developerSubmit').disabled=true;document.getElementById('developerCancel').disabled=true;status.textContent='確認中…';
 try{await developerApi('login',{password});setDeveloperMode(true);document.getElementById('developerPin').value='';document.getElementById('developerPin').blur();document.getElementById('developerLogin').hidden=true;state='title';sfx('uiConfirm');}
 catch(error){status.textContent=error.status===401?'パスワードが違います。':error.status===429?'しばらく待ってから再入力してください。':error.message==='developer_not_configured'?'開発者ログインは現在停止中です。':'認証できませんでした。通信をご確認ください。';}
 finally{developerBusy=false;document.getElementById('developerSubmit').disabled=false;document.getElementById('developerCancel').disabled=false;}
});
document.getElementById('titleDeveloper').addEventListener('click',()=>{
 if(state!=='title'||!isDeveloperMode())return;
 state='developer';document.getElementById('developerScreen').hidden=false;document.getElementById('developerStatus').textContent='';sfx('uiSelect');
});
function closeDeveloperScreen(){
 if(developerBusy)return;
 document.getElementById('developerScreen').hidden=true;state='title';
}
document.getElementById('developerHome').addEventListener('click',closeDeveloperScreen);
document.getElementById('developerLeaderboard').addEventListener('click',()=>{
 if(state!=='developer'||!isDeveloperMode()||developerBusy)return;
 openLeaderboard(true);
});
document.getElementById('developerResetScores').addEventListener('click',async()=>{
 if(state!=='developer'||!isDeveloperMode()||developerBusy)return;
 if(!confirm('全プレイヤーの総合・全ステージのスコアボードをリセットします。取り消せません。実行しますか？'))return;
 developerBusy=true;const button=document.getElementById('developerResetScores'),status=document.getElementById('developerStatus');button.disabled=true;status.textContent='リセット中…';
 try{
  await developerApi('reset-scoreboard',{});
  leaderboardPending={};saveLeaderboardPending();leaderboardRequest++;
  status.textContent='スコアボードをリセットしました。';
 }catch(error){if(error.status===401)setDeveloperMode(false);status.textContent=error.status===401?'認証が切れました。タイトルから再認証してください。':'リセットできませんでした。通信をご確認ください。';}
 finally{developerBusy=false;button.disabled=false;}
});
addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 if(state==='developerPass'){event.preventDefault();closeDeveloperLogin();}
 else if(state==='developer'){event.preventDefault();closeDeveloperScreen();}
});
// Reloading the page starts in normal mode; there is no auth polling.
