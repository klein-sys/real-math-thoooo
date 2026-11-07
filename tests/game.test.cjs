const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const project = path.join(__dirname, '..');
const sources = ['world.js', 'combat.js', 'art-direction.js', 'game.js'].map(file => fs.readFileSync(path.join(project, file), 'utf8'));

// Execute the actual game script with lightweight browser substitutes.
function boot(saves = {}, blocked = false) {
  const elements = new Map();
  const timers = [];
  const missingAssets = new Set();
  const drawing = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 20 }) : key === 'createRadialGradient' ? () => ({addColorStop(){}}) : () => {} });
  function element(id = '') {
    return { id, style: {}, dataset: {}, listeners: {}, width: 768, height: 576, textContent: '', innerHTML: '',
      addEventListener(event, fn) { this.listeners[event] = fn; },
      getContext() { return drawing; }, appendChild() {}, setAttribute() {},
      getBoundingClientRect() { return {left:0,top:0,width:100,height:100}; }, setPointerCapture() {},
      getAttribute() { return ''; }, querySelector() { return null; }, closest() { return false; }
    };
  }
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) elements.set(match[1], element(match[1]));
  const document = {
    getElementById: id => elements.get(id) || null,
    createElement: () => element(), body: { appendChild(el) { elements.set(el.id, el); } },
    querySelector: () => [...elements.values()].find(el => el.id.startsWith('modal-') && el.style.display === 'flex') || null,
    querySelectorAll: selector => selector === '.modal-overlay' ? [...elements.values()].filter(el => el.id.startsWith('modal-')) : [],
    addEventListener() {}
  };
  const sandbox = {
    document, console, performance: { now: () => 0 }, Image: class {
      set src(value) {
        this._src=value;
        const file=path.join(project,value);
        if(fs.existsSync(file)) {
          const bytes=fs.readFileSync(file);
          this.naturalWidth=bytes.readUInt32BE(16);this.naturalHeight=bytes.readUInt32BE(20);this.complete=true;
        } else {this.complete=false;if(value.startsWith('assets/game/'))missingAssets.add(value);}
      }
      get src(){return this._src;}
    },
    localStorage: { getItem(key) { if (blocked) throw Error('blocked'); return saves[key] ?? null; },
      setItem(key, value) { if (blocked) throw Error('blocked'); saves[key] = value; } },
    setTimeout(fn) { timers.push(fn); return timers.length; }, setInterval() { return 1; }, clearInterval() {}, clearTimeout() {},
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {}, alert() {},
    window: { innerWidth: 1200, listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; } }
  };
  vm.createContext(sandbox);
  sources.forEach(source => vm.runInContext(source, sandbox));
  return { run: code => vm.runInContext(code, sandbox), elements, timers, sandbox, missingAssets };
}

test('game initializes and malformed/partial/blocked saves recover', () => {
  for (const saves of [{}, { dq2: '{broken', dq2c: '{broken' }, { dq2: '{"gold":12}', dq2c: '[]' },
    { dq2: '{"level":99,"hp":999,"strength":-4,"playerX":999,"playerY":-1}', dq2c: '{}' }]) {
    const g = boot(saves);
    assert.equal(g.run('castData.length'), 7);
    assert.equal(g.run('Number.isFinite(gameState.hp) && gameState.level <= 8 && gameState.strength >= 0'), true);
    assert.equal(g.run('isSolidTile(gameState.playerX, gameState.playerY)'), false);
  }
  const g = boot({}, true);
  g.run('saveGame(); saveCast();');
  assert.ok(g.elements.has('save-warning'));
});

test('paused calculus draft remains intact for later review', () => {
  const g = boot();
  assert.equal(g.run('CalculusEngine.evaluateDamage(5)'), 150);
  assert.equal(g.run('CalculusEngine.evaluateFirstDerivative(5)'), 0);
  for (let x = 0; x <= 10; x += 0.5) {
    const h = 0.0001;
    const slope = g.run(`(CalculusEngine.evaluateDamage(${x+h}) - CalculusEngine.evaluateDamage(${x-h})) / ${2*h}`);
    assert.ok(Math.abs(slope - g.run(`CalculusEngine.evaluateFirstDerivative(${x})`)) < 1e-6);
    assert.ok(g.run(`CalculusEngine.evaluateDamage(${x})`) <= 150);
  }
  for (const T of [3, 4, 5.2]) {
    assert.equal(g.run(`CalculusEngine.evaluateGauge(0, ${T})`), 0);
    assert.equal(g.run(`CalculusEngine.evaluateGauge(${T}, ${T})`), 1);
    assert.equal(g.run(`CalculusEngine.evaluateGauge(${T/2}, ${T})`), 0.5);
    assert.equal(g.run(`CalculusEngine.evaluateGaugeSecondDeriv(${T/2}, ${T})`), 0);
    assert.equal(g.run(`CalculusEngine.calculateStrikeMultiplier(${T/2}, ${T})`), 2);
    assert.equal(g.run(`CalculusEngine.calculateStrikeMultiplier(${T}, ${T})`), 0.5);
    for (const t of [T/4, T/2, T*3/4]) {
      const h = 0.0001;
      const rate = g.run(`(CalculusEngine.evaluateGauge(${t+h}, ${T}) - CalculusEngine.evaluateGauge(${t-h}, ${T})) / ${2*h}`);
      assert.ok(Math.abs(rate - g.run(`CalculusEngine.evaluateGaugeRate(${t}, ${T})`)) < 1e-6);
    }
  }
});

test('potions cannot queue extra enemy turns or interrupt charging', () => {
  const g = boot();
  g.run("enterMap('forest'); startBattle(entities[2]); gameState.hp = 20; usePotion(); usePotion(); startGauge();");
  assert.equal(g.run('gameState.potions'), 1);
  assert.equal(g.run('gameState.hp'), 60);
  assert.equal(g.timers.length, 1);
  assert.equal(g.run('isGaugeRunning'), false);
  g.timers.shift()(); // enemy turn
  g.timers.shift()(); // player turn
  g.run('startGauge(); usePotion(); startGauge();');
  assert.equal(g.run('gameState.potions'), 1);
  assert.equal(g.run('isGaugeRunning'), true);
});

test('a killing hit rewards once and battle cleanup permits another encounter', () => {
  const g = boot();
  g.run('startBattle(entities[2]); startGauge(); executePlayerStrike(2); executePlayerStrike(2); usePotion();');
  assert.equal(g.run('gameState.totalStrikes'), 1);
  assert.equal(g.run('gameState.gold'), 30);
  assert.equal(g.run('gameState.xp'), 50);
  assert.equal(g.run('activeBattle.playerTurn'), false);
  g.timers.shift()();
  assert.equal(g.run('activeBattle'), null);
  g.run("closeModal('modal-report'); startBattle(entities[3]);");
  assert.equal(g.run('activeBattle.enemy.id'), 'slime2');
});

test('menus block encounter re-entry and allow switching without stacking', () => {
  const g = boot();
  g.run("openModal('modal-guide'); interactWithEntity(entities[2]);");
  assert.equal(g.run('activeBattle'), null);
  g.run("openModal('modal-dev');");
  assert.equal(g.elements.get('modal-guide').style.display, 'none');
  assert.equal(g.elements.get('modal-dev').style.display, 'flex');
  g.run("closeModal('modal-dev'); startBattle(entities[2]); openModal('modal-guide');");
  assert.equal(g.elements.get('modal-guide').style.display, 'none');
});

test('cast IDs resolve numbered enemies and user text is escaped', () => {
  const g = boot();
  assert.equal(g.run("getCastMember('slime2').name"), 'Forest Slime');
  assert.equal(g.run("getCastMember('goblin1').name"), 'Forest Goblin');
  assert.equal(g.run(`escapeHTML('<img src=x onerror="bad()">')`), '&lt;img src=x onerror=&quot;bad()&quot;&gt;');
});

test('developer controls change level, gold, AI and warp safely', () => {
  const g = boot();
  for (const id of ['dev-btn-lvl5', 'dev-btn-gold', 'dev-toggle-freeze', 'dev-warp-cave']) {
    g.elements.get(id).listeners.click();
  }
  assert.equal(g.run('gameState.level'), 5);
  assert.equal(g.run('gameState.gold'), 120);
  assert.equal(g.run('devState.freezeAI'), true);
  assert.equal(g.run('entities.some(e => e.x === gameState.playerX && e.y === gameState.playerY)'), false);
});

test('animation loop runs monster AI and gates bosses by progression', () => {
  const g = boot();
  g.run("var aiCalls = 0; tickMonsterAI = () => aiCalls++; gameLoop(); enterMap('cave'); interactWithEntity(entities[6]);");
  assert.equal(g.run('aiCalls'), 1);
  assert.equal(g.run('activeBattle'), null);
  g.run("gameState.level = 5; enterMap('volcano'); interactWithEntity(entities[7]);");
  assert.equal(g.run('activeBattle'), null);
  g.run('gameState.golemDefeated = true; interactWithEntity(entities[7]);');
  assert.equal(g.run('activeBattle.enemy.id'), 'dragon');
});

test('non-damaging debuffs last two turns and poison can cause defeat', () => {
  const g = boot();
  g.run(`startBattle(entities[2]); devState.debuffsEnabled = false;
    activeBattle.playerDebuffs = [{type:'sticky', duration:2}]; processPlayerDebuffs();`);
  assert.equal(g.run('activeBattle.playerDebuffs[0].duration'), 2);
  g.run('enemyTurn();');
  assert.equal(g.run('activeBattle.playerDebuffs[0].duration'), 1);
  g.run('enemyTurn();');
  assert.equal(g.run('activeBattle.playerDebuffs.length'), 0);
  g.run(`gameState.hp = 4; gameState.gold = 30;
    activeBattle.playerDebuffs = [{type:'poison', name:'Poison', icon:'', tickDmg:6, duration:1}];
    processPlayerDebuffs();`);
  assert.equal(g.run('activeBattle'), null);
  assert.equal(g.run('gameState.hp'), 75);
  assert.equal(g.run('gameState.gold'), 15);
});

test('debt repayments and both boss victories reach the ending', () => {
  const g = boot();
  g.run('gameState.level = 5; gameState.debt = 20; startBattle(entities[6]);');
  function finishBattle() {
    while (g.run('activeBattle && activeBattle.enemyHp > 0')) {
      g.run('startGauge(); executePlayerStrike(gaugeDuration / 2);');
      // Resolve the enemy turn, debuffs, or victory delay in their actual order.
      while (g.timers.length) g.timers.shift()();
    }
  }
  finishBattle();
  assert.equal(g.run('gameState.golemDefeated'), true);
  assert.equal(g.run('gameState.debt'), 0);
  assert.equal(g.run('gameState.gold'), 60);
  g.run("closeModal('modal-report'); enterMap('volcano'); gameState.hp = getMaxHP(); startBattle(entities[7]); devState.debuffsEnabled = false;");
  finishBattle();
  assert.equal(g.run('gameState.dragonDefeated'), true);
  assert.equal(g.run('gameState.questStep'), 3);
  assert.equal(g.elements.get('modal-report').style.display, 'flex');
  g.elements.get('btn-report-continue').listeners.click();
  assert.equal(g.elements.get('modal-victory').style.display, 'flex');
});

test('keyboard leaves form input alone and prevents arrow scrolling', () => {
  const g = boot();
  let prevented = false;
  g.sandbox.window.listeners.keydown({ key: 'ArrowLeft', target: { closest: () => true }, preventDefault() { prevented = true; } });
  assert.equal(g.run('gameState.playerX'), 22);
  assert.equal(prevented, false);
  g.sandbox.window.listeners.keydown({ key: 'ArrowLeft', target: { closest: () => false }, preventDefault() { prevented = true; } });
  g.run('updateWorld(1/60);');
  assert.ok(g.run('gameState.playerX') < 22);
  assert.ok(g.run('gameState.playerX') > 21.9);
  assert.equal(prevented, true);
});

test('HTML containers are balanced, modal dialogs are siblings, IDs are unique', () => {
  const stack = [];
  const ids = new Set();
  const markup = html.slice(0, html.indexOf('<script src='));
  for (const token of markup.matchAll(/<\/?(?:div|canvas|button|p|span)\b[^>]*>/g)) {
    const tag = token[0];
    const name = tag.match(/^<\/?(\w+)/)[1];
    if (tag.startsWith('</')) assert.equal(stack.pop(), name, `Bad nesting near ${tag} at ${token.index}`);
    else {
      if (tag.includes('class="modal-overlay"')) assert.equal(stack.length, 1, 'Modals must be siblings inside the game container');
      stack.push(name);
    }
  }
  assert.deepEqual(stack, []);
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
    // Ignore markup inside the script (e.g. dynamically generated sprite canvas).
    if (match.index > html.indexOf('<script src=')) break;
    assert.ok(!ids.has(match[1]), `Duplicate ID ${match[1]}`);
    ids.add(match[1]);
  }
});

test('joystick supports proportional movement, releases cleanly and stops at menus', () => {
  const g=boot(),stick=g.elements.get('joystick');
  stick.listeners.pointerdown({pointerId:1,clientX:66,clientY:50,preventDefault(){}});
  assert.equal(g.run('input.x'),0.5);
  g.run('updateWorld(1/60);');
  assert.ok(g.run('gameState.playerX')>22 && g.run('gameState.playerX')<22.04);
  stick.listeners.pointercancel({pointerId:1});
  assert.equal(g.run('input.x'),0);
  g.run("input.keys.add('w');openModal('modal-guide');updateWorld(1/60);");
  assert.equal(g.run('input.keys.size'),0);
  assert.equal(g.run('gameState.playerY'),17);
});

test('diagonal movement is normalized and fractional coordinates survive reload', () => {
  const saves={},g=boot(saves);
  const axial=g.run('tryMove(1,0);Math.hypot(gameState.playerX-22,gameState.playerY-17)');
  const diagonal=g.run('gameState.playerX=22;gameState.playerY=17;tryMove(1,1);Math.hypot(gameState.playerX-22,gameState.playerY-17)');
  assert.ok(Math.abs(axial-diagonal)<1e-10);
  const x=g.run('gameState.playerX');g.run('saveGame();');
  const restored=boot(saves);assert.equal(restored.run('gameState.playerX'),x);
  assert.equal(restored.run('gameState.worldVersion'),3);
});

test('house entrances and exits work and NPCs remain inside their houses', () => {
  const g=boot();
  g.run('gameState.playerX=11;gameState.playerY=13.5;performInteraction();');
  assert.equal(g.run('gameState.mapId'),'elderHouse');
  assert.equal(g.run("entities.filter(e=>e.type==='npc'&&entityVisible(e)).length"),1);
  g.run('gameState.playerX=10;gameState.playerY=9;performInteraction();');
  assert.equal(g.run('gameState.questStep'),1);
  assert.equal(g.elements.get('modal-dialogue').style.display,'flex');
  g.run("closeModal('modal-dialogue');gameState.playerY=14.3;performInteraction();");
  assert.equal(g.run('gameState.mapId'),'village');
  assert.equal(g.run("entities.filter(e=>e.type==='npc'&&entityVisible(e)).length"),0);
  g.run("enterMap('forest');usePortal(WORLD.forest.portals[2]);");
  assert.equal(g.run('gameState.mapId'),'forest');
});

test('Run succeeds without rewards, failure consumes a turn, bosses block escape', () => {
  const g=boot();
  g.run("enterMap('forest');startBattle(entities[2]);Math.random=()=>0.1;tryRun();");
  assert.equal(g.run('activeBattle'),null);
  assert.equal(g.run('lastBattle.outcome'),'Escaped');
  assert.equal(g.run('gameState.gold'),20);
  assert.equal(g.run('gameState.xp'),0);
  g.run("closeModal('modal-report');startBattle(entities[2]);Math.random=()=>0.9;tryRun();tryRun();");
  assert.equal(g.timers.length,1);
  assert.equal(g.run('activeBattle.playerTurn'),false);
  g.run("closeModal('modal-battle');startBattle(entities[6]);tryRun();");
  assert.equal(g.run('activeBattle.enemy.id'),'golem');
  assert.equal(g.elements.get('btn-battle-run').disabled,true);
});

test('Item opens an inventory and battle details show recorded hits without formulas', () => {
  const g=boot();
  g.run("enterMap('forest');startBattle(entities[2]);toggleBattleItems();");
  assert.equal(g.elements.get('battle-items').hidden,false);
  g.run('startGauge();executePlayerStrike(2);');
  g.timers.shift()();
  assert.equal(g.run('lastBattle.strikes[0].damage'),180);
  g.run('gameState.strength=1;showBattleDetails();');
  assert.match(g.elements.get('report-details').innerHTML,/Critical hit/);
  assert.match(g.elements.get('report-details').innerHTML,/180 damage/);
  assert.doesNotMatch(g.elements.get('report-details').innerHTML,/D\(|R\(|derivative|calculus/i);
  assert.equal(g.elements.get('report-details').hidden,false);
});

test('active combat is independent of the deferred course draft and old builds', () => {
  for (const strength of [0,5,10]) {
    const g=boot({dq2:JSON.stringify({strength})});
    g.run(`Object.keys(CalculusEngine).forEach(key=>CalculusEngine[key]=()=>{throw Error('Paused draft called');});
      enterMap('forest');startBattle(entities[2]);startGauge();executePlayerStrike(2);`);
    g.timers.shift()();
    assert.equal(g.run('lastBattle.strikes[0].damage'),180);
    assert.equal(g.run('PrototypeCombat.chargeProgress(1,4)'),0.25);
    assert.equal(g.run('PrototypeCombat.strikeMultiplier(0,4)'),0.5);
    assert.equal(g.run('PrototypeCombat.strikeMultiplier(4,4)'),0.5);
    g.run('showVictoryScreen();');
    assert.doesNotMatch(g.elements.get('victory-stats').innerHTML,/calculus|derivative|rating|forge/i);
  }
});

test('guide is available while formula and forge screens remain paused', () => {
  const g=boot();
  g.run("openModal('modal-forge');openModal('modal-math');");
  assert.equal(g.run('modalIsOpen()'),false);
  g.elements.get('btn-guide').listeners.click();
  assert.equal(g.elements.get('modal-guide').style.display,'flex');
  assert.match(html,/<title>Emberbrook: The Lost Harvest/);
  assert.match(html,/<div id="modal-forge"[^>]* hidden>/);
  assert.match(html,/<div id="modal-math"[^>]* hidden>/);
});

test('all regions and battle action sprites use valid extracted PNG assets', () => {
  const g=boot();
  g.run(`for(const id of Object.keys(WORLD)){enterMap(id);renderMap();}
    for(const id of ['hero','slime1','goblin1','elder','smith','golem','dragon']) {
      for(const action of ['idle','walk','attack','hurt','death'])drawCharacter(ctx,id,100,100,100,action);
    }
    startBattle(entities[7]);renderBattleScene();`);
  assert.deepEqual([...g.missingAssets],[]);
  assert.equal(g.run('Object.keys(WORLD).length'),6);
});

test('every map exit is reachable from its spawn with collision enabled', () => {
  const g=boot();
  const unreachable=g.run(`(()=>{
    const failures=[];
    for(const id of Object.keys(WORLD)) {
      enterMap(id);const map=currentMap(),seen=new Set(),queue=[[Math.round(gameState.playerX*2),Math.round(gameState.playerY*2)]];
      for(let i=0;i<queue.length;i++) {
        const [x,y]=queue[i],key=x+','+y;if(seen.has(key))continue;seen.add(key);
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx=x+dx,ny=y+dy;
          if(nx<2||ny<2||nx>(map.width-1)*2||ny>(map.height-1)*2||seen.has(nx+','+ny))continue;
          if(canStand(nx/2,ny/2))queue.push([nx,ny]);
        }
      }
      for(const p of map.portals) {
        const accessible=[...seen].some(key=>{const [x,y]=key.split(',').map(Number).map(v=>v/2);return x>p.x&&x<p.x+p.w&&y>p.y&&y<p.y+p.h;});
        if(!accessible)failures.push(id+' → '+p.to);
      }
      for(const e of entities.filter(entityVisible)) {
        const accessible=[...seen].some(key=>{const [x,y]=key.split(',').map(Number).map(v=>v/2);return Math.hypot(x-e.x,y-e.y)<1.9;});
        if(!accessible)failures.push(id+' → '+e.id);
      }
    }
    return failures;
  })()`);
  assert.equal(JSON.stringify(unreachable),'[]');
});

 test('old customized saves cannot rename story characters', () => {
 const g = boot({dq2c: JSON.stringify([{id:'elder',name:'Changed',emoji:'X'}])});
 assert.equal(g.run("getCastMember('elder').name"), 'Elder Thales');
 assert.equal(g.run('Object.isFrozen(castData[1])'), true);
 g.run("showGameNotice('Restored health')");
 assert.equal(g.elements.get('game-notice').textContent, 'Restored health');
 assert.equal(g.elements.get('game-notice').hidden, false);
 });
