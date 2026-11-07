/* Battle animation, command menu and an optional explanation of actual strikes. */
function animateCombat(target,state,text='') {
  battleVisual[target]=state;
  battleVisual[target+'Start']=worldClock;
  battleVisual[target+'Until']=worldClock+(state==='death'?2:0.9);
  if(text){battleVisual.text=text;battleVisual.until=worldClock+1.2;battleVisual.target=target;}
}
function renderBattleScene() {
  if(!activeBattle)return;
  const scene=document.getElementById('battle-scene'),c=scene.getContext('2d'),w=scene.width,h=scene.height;
  c.imageSmoothingEnabled=false;
  const kind=currentMap().kind;
  paintBattleArena(c, kind, w, h, worldClock);
  const heroX=w*0.24,enemyX=w*0.76,ground=235;
  let heroState=battleVisual.heroUntil>worldClock?battleVisual.hero:'idle';
  let enemyState=battleVisual.enemyUntil>worldClock?battleVisual.enemy:'idle';
  if(activeBattle.enemyHp<=0)enemyState='death';
  const heroLunge=heroState==='attack'?Math.sin(Math.min(1,(worldClock-battleVisual.heroStart)/0.9)*Math.PI)*45:0;
  const enemyLunge=enemyState==='attack'?-Math.sin(Math.min(1,(worldClock-battleVisual.enemyStart)/0.9)*Math.PI)*30:0;
  if(activeBattle.enemy.id==='dragon' && (activeBattle.enemyWarning || enemyState==='attack')) {
    const striking=enemyState==='attack';
    c.fillStyle=striking?'#e5753f80':'#d8924966';
    c.fillRect(heroX-48,ground-16,96,32);
    c.strokeStyle='#f4ac64';c.lineWidth=2;c.strokeRect(heroX-48,ground-16,96,32);
    c.fillStyle='#ffe7a0';c.textAlign='center';c.font='bold 16px monospace';
    c.fillText(striking?'FLAME STRIKE':'FLAME INCOMING',heroX,ground-115);
    if(striking) {
      polygon(c,'#dd633baf',[[enemyX-74,ground-54],[heroX+16,ground-27],[heroX-31,ground-9],[heroX+10,ground+6],[enemyX-73,ground-43]]);
      polygon(c,'#ffce72',[[enemyX-83,ground-50],[heroX-10,ground-12],[heroX+17,ground-13]]);
    }
  }
  c.fillStyle='#06151a88';
  for(const x of [heroX,enemyX]){c.beginPath();c.ellipse(x,ground,48,11,0,0,Math.PI*2);c.fill();}
  drawCharacter(c,'hero',heroX+heroLunge,ground,100,heroState,false,worldClock-(battleVisual.heroStart||0));
  const enemy=activeBattle.enemy;
  drawCharacter(c,enemy.id,enemyX+enemyLunge,ground,enemy.id==='dragon'?220:enemy.id==='golem'?180:105,enemyState,true,worldClock-(battleVisual.enemyStart||0));
  if(worldClock<battleVisual.until) {
    const progress=1-(battleVisual.until-worldClock)/1.2;
    c.fillStyle=battleVisual.target==='enemy'?'#ffe0a1':'#fca7a7';c.strokeStyle='#10202a';c.lineWidth=4;
    c.textAlign='center';c.font='bold 24px monospace';
    const x=battleVisual.target==='enemy'?enemyX:heroX,y=98-progress*30;
    c.strokeText(battleVisual.text,x,y);c.fillText(battleVisual.text,x,y);
    if(progress<0.25){c.fillStyle='#fff1bd33';c.fillRect(x-55,ground-110,110,115);}
  }
  c.textAlign='left';c.font='11px monospace';c.fillStyle='#d6c8a9';c.fillText(currentMap().name.toUpperCase(),16,23);
}

function toggleBattleItems() {
  if(!activeBattle||!activeBattle.playerTurn||isGaugeRunning)return;
  const panel=document.getElementById('battle-items');
  panel.hidden=!panel.hidden;
  document.getElementById('item-potion-count').textContent=gameState.potions;
  document.getElementById('btn-use-potion').disabled=gameState.potions===0;
}
function tryRun() {
  if(!activeBattle||!activeBattle.playerTurn||isGaugeRunning)return;
  if(activeBattle.enemy.type!=='monster') {
    logBattle('The guardian blocks your escape. Defeat it to pass!');return;
  }
  activeBattle.playerTurn=false;syncBattleActions();
  if(Math.random()<0.75) {
    logBattle('You escaped safely. No rewards were earned.');
    finishBattle('Escaped');
  } else {
    logBattle('Your escape was blocked! The enemy takes a turn.');
    queueEnemyTurn(800);
  }
}
function finishBattle(outcome) {
  if(!activeBattle)return;
  const enemy=activeBattle.enemy;
  lastBattle={outcome,enemyId:enemy.id,enemyName:getCastMember(enemy.id).name,
    strikes:activeBattle.history||[],xp:outcome==='Victory'?enemy.xp:0,gold:outcome==='Victory'?(activeBattle.netGold??enemy.gold):0};
  closeModal('modal-battle');
  if(outcome==='Escaped') {
    // A short retreat creates space before the next encounter.
    const map=currentMap();
    const options=[[gameState.playerX,gameState.playerY+2],[gameState.playerX+2,gameState.playerY],[...map.spawn]];
    const safe=options.find(([x,y])=>canStand(x,y));
    if(safe)[gameState.playerX,gameState.playerY]=safe;
  }
  saveGame();updateUI();renderMap();showBattleReport();
}
function showBattleReport() {
  if(!lastBattle)return;
  document.getElementById('report-title').textContent=lastBattle.outcome==='Victory'?'Battle won':lastBattle.outcome==='Escaped'?'Safe retreat':'Back on your feet';
  document.getElementById('report-enemy').textContent=lastBattle.enemyName;
  document.getElementById('report-rewards').textContent=lastBattle.outcome==='Victory'?`+${lastBattle.xp} XP · +${lastBattle.gold} gold`:
    lastBattle.outcome==='Escaped'?'No rewards earned. Your items and remaining HP are kept.':'You recovered in Emberbrook and lost half your gold.';
  document.getElementById('report-strikes').textContent=`${lastBattle.strikes.length} attack${lastBattle.strikes.length===1?'':'s'} · ${lastBattle.strikes.reduce((n,s)=>n+s.damage,0)} total damage`;
  openModal('modal-report');
}
function showBattleDetails() {
  if(!lastBattle)return;
  const box=document.getElementById('report-details');
  box.hidden=!box.hidden;
  document.getElementById('btn-report-details').textContent=box.hidden?'Battle details':'Hide details';
  if(box.hidden)return;
  box.innerHTML=lastBattle.strikes.length?lastBattle.strikes.map((s,i)=>
    `<div class="proof-step"><strong>Attack ${i+1}</strong> · Level ${s.level}<br>`+
    `${s.critical?'Critical hit':'Normal hit'} · <strong>${s.damage} damage</strong>${s.godMode?' · God Mode active':''}</div>`).join(''):
    '<p>No attacks were made in this encounter.</p>';
}
function recordStrike(t,T,mult,damage) {
  activeBattle.history.push({level:gameState.level,critical:mult>=1.8,
    damage,godMode:devState.godMode});
}
function initCombat() {
  document.getElementById('btn-battle-run').addEventListener('click',tryRun);
  document.getElementById('btn-battle-potion').addEventListener('click',toggleBattleItems);
  document.getElementById('btn-use-potion').addEventListener('click',()=>{usePotion();document.getElementById('battle-items').hidden=true;});
  document.getElementById('btn-items-back').addEventListener('click',()=>document.getElementById('battle-items').hidden=true);
  document.getElementById('btn-report-details').addEventListener('click',showBattleDetails);
  document.getElementById('btn-report-continue').addEventListener('click',()=>{
    closeModal('modal-report');
    if(lastBattle?.enemyId==='dragon'&&lastBattle.outcome==='Victory')showVictoryScreen();
    clearMovement();checkProximityPrompt();
  });
}
