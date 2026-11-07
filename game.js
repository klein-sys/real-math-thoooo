/* ============================================================================
   PAUSED COURSE DRAFT — not selected by the group or used by active combat.
   ============================================================================ */
const CalculusEngine = {
  // Balance 10 points: a quadratic keeps the derivatives simple.
  evaluateDamage(x) { return 6 * x * (10 - x); },
  evaluateFirstDerivative(x) { return 60 - 12 * x; },
  evaluateSecondDerivative(x) { return -12; },
  getOptimalStrength() { return 5; },
  getMaxDamage() { return 150; },

  // u is the fraction of the charge time elapsed, from 0 to 1.
  // This polynomial S-curve starts at 0 and ends at 1.
  evaluateGauge(t, T) {
    const u = Math.max(0, Math.min(1, t / T));
    return 3 * u * u - 2 * u * u * u;
  },
  evaluateGaugeRate(t, T) {
    const u = Math.max(0, Math.min(1, t / T));
    return 6 * u * (1 - u) / T;
  },
  evaluateGaugeSecondDeriv(t, T) {
    const u = Math.max(0, Math.min(1, t / T));
    return (6 - 12 * u) / (T * T);
  },
  evaluateTimingScore(t, T) {
    const u = Math.max(0, Math.min(1, t / T));
    return 4 * u * (1 - u);
  },
  calculateStrikeMultiplier(t, T) {
    return 0.5 + 1.5 * this.evaluateTimingScore(t, T);
  }
};

// Temporary playtest rules. Replace this boundary after the group selects a topic.
// The archived Strength allocation has no effect on this gameplay prototype.
const PrototypeCombat = {
  basePower: 150,
  levelFactor(level) { return 0.5 + 0.1 * level; },
  chargeProgress(t, duration) { return Math.max(0, Math.min(1, t / duration)); },
  strikeMultiplier(t, duration) {
    const progress = this.chargeProgress(t, duration);
    const accuracy = 1 - Math.abs(progress - 0.5) * 2;
    return 0.5 + 1.5 * accuracy;
  }
};

/* ============================================================================
   WEB AUDIO API SOUND SYNTHESIZER
   ============================================================================ */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) { this.enabled = false; return; }
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playStep() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playHit(isCrit = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isCrit ? 'square' : 'sawtooth';
    const startFreq = isCrit ? 600 : 300;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + (isCrit ? 0.3 : 0.15));
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + (isCrit ? 0.3 : 0.15));
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + (isCrit ? 0.3 : 0.15));
  }

  playHeal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + idx * 0.07 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.07);
      osc.stop(this.ctx.currentTime + idx * 0.07 + 0.2);
    });
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.12);
      osc.stop(this.ctx.currentTime + idx * 0.12 + 0.35);
    });
  }
}

const sounds = new SoundEngine();

/* ============================================================================
   GAME STATE & PROGRESSION (LOCALSTORAGE dq2 & dq2c)
   ============================================================================ */
const DEFAULT_CAST = [
  { id: 'hero', role: 'Main Character (Hero)', name: 'Hero', emoji: '🗡️', type: 'Player' },
  { id: 'elder', role: 'Village Elder', name: 'Elder Thales', emoji: '🧙‍♂️', type: 'NPC' },
  { id: 'smith', role: 'Blacksmith', name: 'Smith Vulcan', emoji: '🔨', type: 'NPC' },
  { id: 'slime', role: 'Forest Slime', name: 'Forest Slime', emoji: '🟢', type: 'Monster' },
  { id: 'goblin', role: 'Forest Goblin', name: 'Forest Goblin', emoji: '👺', type: 'Monster' },
  { id: 'golem', role: 'Stone Golem', name: 'Lithos Golem', emoji: '🗿', type: 'Mini-boss' },
  { id: 'dragon', role: 'Ember Dragon', name: 'Ember Dragon', emoji: '🐉', type: 'Final Boss' }
];

function readSave(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch { return null; }
}

// Story identities are fixed, including when loading older customized saves.
const castData = Object.freeze(DEFAULT_CAST.map(member => Object.freeze({ ...member })));

const defaultState = {
  level: 1,
  xp: 0,
  hp: 75,
  gold: 20,
  debt: 0,
  potions: 2,
  strength: 5.0, // x in [0, 10]
  golemDefeated: false,
  dragonDefeated: false,
  questStep: 0, // 0: talk elder, 1: reach lv3 & beat golem, 2: reach lv5 & beat dragon, 3: victory
  playerX: 5,
  playerY: 7,
  totalStrikes: 0,
  perfectInflections: 0,
  mapId: 'village',
  supplies: 0,
  worldVersion: 0
};
const savedState = readSave('dq2');
let gameState = { ...defaultState };
if (savedState && typeof savedState === 'object' && !Array.isArray(savedState)) {
  Object.keys(defaultState).forEach(key => {
    if (typeof savedState[key] === typeof defaultState[key] &&
        (typeof savedState[key] !== 'number' || Number.isFinite(savedState[key]))) {
      gameState[key] = savedState[key];
    }
  });
}
gameState.level = Math.max(1, Math.min(8, Math.floor(gameState.level)));
gameState.strength = Math.max(0, Math.min(10, gameState.strength));
gameState.hp = Math.max(1, Math.min(getMaxHP(), gameState.hp));
['xp', 'gold', 'debt', 'potions', 'totalStrikes', 'perfectInflections'].forEach(key => {
  gameState[key] = Math.max(0, Math.floor(gameState[key]));
});
gameState.questStep = gameState.dragonDefeated ? 3 : gameState.golemDefeated ? 2 : Math.min(1, Math.max(0, Math.floor(gameState.questStep)));

const devState = {
  godMode: false,
  freezeAI: false,
  debuffsEnabled: true
};

// Ensure max HP formula: 60 + 15 * level
function getMaxHP(level = gameState.level) {
  return 60 + 15 * level;
}

// XP required to reach next level: level * 60 (max level 8)
function getNextLevelXP(level = gameState.level) {
  return level * 60;
}

function saveGame() {
  try { localStorage.setItem('dq2', JSON.stringify(gameState)); }
  catch { showSaveWarning(); }
}

function saveCast() {
  try { localStorage.setItem('dq2c', JSON.stringify(castData)); }
  catch { showSaveWarning(); }
}

function showSaveWarning() {
  let warning = document.getElementById('save-warning');
  if (!warning) {
    warning = document.createElement('p');
    warning.id = 'save-warning';
    warning.setAttribute('role', 'status');
    warning.style.cssText = 'position:fixed;bottom:8px;left:8px;right:8px;z-index:10000;background:#422006;color:#fef3c7;padding:8px;text-align:center;font-size:12px;';
    warning.textContent = 'Browser storage is unavailable. You can keep playing, but progress will not be saved.';
    document.body.appendChild(warning);
  }
}

/* ============================================================================
   SPRITE KITCHEN ENGINE (PROD PROCEDURAL & RECIPE RENDERER FOR KITCHEN-V2)
   ============================================================================ */
const SpriteKitchen = {
  recipes: {
    mage: {
      schema: 1, engine: "kitchen-v2", seed: "studio-042", size: 32, kind: "mage",
      palette: ["#24203e","#403464","#64549b","#9380bf","#c5b4e3","#f6efd9","#211b34","#e3b594"],
      body: 40, detail: 20, eyes: 2, horns: false, outline: true, symmetry: true
    },
    slime: {
      schema: 1, engine: "kitchen-v2", seed: "studio-042", size: 32, kind: "slime",
      palette: ["#233342","#2f5e79","#468fa6","#81c7c6","#c2e9dd","#fff5dc","#223047","#f3adbb"],
      body: 55, detail: 20, eyes: 2, horns: false, outline: true, symmetry: true,
      animation: { engine: "kitchen-motion-v3", state: "idle", fps: 4, direction: "right" }
    }
  },
  canvases: {},
  images: {},

  init() {
    this.canvases.slime = this.buildSlimeSheet(this.recipes.slime.palette);
    this.canvases.mage = this.buildMageCanvas(this.recipes.mage.palette);

    // The world renderer loads the extracted archive art. These canvases are fallbacks.
  },

  tryLoadImage(key, src) {
    const img = new Image();
    img.onload = () => {
      this.images[key] = img;
      console.log(`[SpriteKitchen] Loaded exported asset: ${src}`);
    };
    img.src = src;
  },

  buildSlimeSheet(palette) {
    const c = document.createElement('canvas');
    c.width = 128; // 4 frames of 32x32
    c.height = 32;
    const sctx = c.getContext('2d');

    const frames = [
      { sx: 1.0, sy: 1.0, dy: 0 },
      { sx: 1.15, sy: 0.85, dy: 2 },
      { sx: 0.92, sy: 1.12, dy: -2 },
      { sx: 1.05, sy: 0.95, dy: 1 }
    ];

    frames.forEach((f, fIdx) => {
      const ox = fIdx * 32;
      for (let py = 0; py < 32; py++) {
        for (let px = 0; px < 32; px++) {
          const dx = (px - 16) / (10 * f.sx);
          const dy = (py - (22 + f.dy)) / (8 * f.sy);
          const taper = 1.0 + (py - (22 + f.dy)) * 0.035;
          const dist = (dx * dx) / (taper * taper) + dy * dy;

          if (dist <= 1.0) {
            if (dist > 0.8) {
              sctx.fillStyle = palette[0]; // outline #233342
            } else if (dy > 0.3) {
              sctx.fillStyle = palette[1]; // bottom shadow #2f5e79
            } else if (dx < -0.2 && dy < -0.2 && dist < 0.6) {
              sctx.fillStyle = (dx < -0.35 && dy < -0.35) ? palette[5] : palette[4]; // shine
            } else if (dy < -0.2) {
              sctx.fillStyle = palette[3]; // highlight #81c7c6
            } else if (Math.abs(dx) < 0.35 && dy > -0.15 && dy < 0.35) {
              sctx.fillStyle = palette[7]; // blush core #f3adbb
            } else {
              sctx.fillStyle = palette[2]; // body #468fa6
            }
            sctx.fillRect(ox + px, py, 1, 1);
          }
        }
      }

      // Eyes facing right (direction: "right")
      const eyeY = Math.round(20 + f.dy);
      const eye1X = Math.round(17 + (f.sx - 1) * 3);
      const eye2X = Math.round(22 + (f.sx - 1) * 4);

      // Eye 1
      sctx.fillStyle = palette[5];
      sctx.fillRect(ox + eye1X, eyeY - 2, 2, 3);
      sctx.fillStyle = palette[6];
      sctx.fillRect(ox + eye1X + 1, eyeY - 1, 1, 2);

      // Eye 2
      sctx.fillStyle = palette[5];
      sctx.fillRect(ox + eye2X, eyeY - 2, 2, 3);
      sctx.fillStyle = palette[6];
      sctx.fillRect(ox + eye2X + 1, eyeY - 1, 1, 2);

      // Cheeks
      sctx.fillStyle = palette[7];
      sctx.fillRect(ox + eye1X - 1, eyeY + 2, 2, 1);
      sctx.fillRect(ox + eye2X, eyeY + 2, 2, 1);
    });

    return c;
  },

  buildMageCanvas(palette) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const mctx = c.getContext('2d');

    function p(x, y, col) {
      if (x >= 0 && x < 32 && y >= 0 && y < 32) {
        mctx.fillStyle = palette[col];
        mctx.fillRect(x, y, 1, 1);
      }
    }
    function h(x1, x2, y, col) {
      for (let x = x1; x <= x2; x++) p(x, y, col);
    }

    // Hat Tip & Cone
    p(17, 3, 0); p(18, 4, 0); p(17, 4, 2);
    p(17, 5, 0); p(16, 5, 2); p(15, 5, 0);
    p(15, 6, 0); p(16, 6, 2); p(17, 6, 1); p(18, 6, 0);
    h(14, 18, 7, 2); p(13, 7, 0); p(19, 7, 0);
    h(13, 19, 8, 2); p(12, 8, 0); p(20, 8, 0);
    h(12, 20, 9, 2); p(11, 9, 0); p(21, 9, 0);
    h(11, 21, 10, 2); p(10, 10, 0); p(22, 10, 0);
    h(10, 22, 11, 2); p(9, 11, 0); p(23, 11, 0);
    // Ribbon & Star
    h(10, 22, 12, 1); p(9, 12, 0); p(23, 12, 0);
    p(16, 12, 5); p(15, 12, 4); p(17, 12, 4);
    // Brim
    h(7, 25, 13, 1); p(6, 13, 0); p(26, 13, 0);
    h(8, 24, 14, 0);

    // Face & Eyes
    h(12, 20, 15, 7); p(11, 15, 0); p(21, 15, 0);
    p(14, 15, 6); p(18, 15, 6);
    h(13, 19, 16, 7); p(12, 16, 0); p(20, 16, 0);
    p(15, 16, 6); p(17, 16, 6);

    // Flowing Beard
    h(12, 20, 17, 5); p(11, 17, 0); p(21, 17, 0);
    h(13, 19, 18, 5); p(12, 18, 0); p(20, 18, 0); p(16, 18, 4);
    h(13, 19, 19, 5); p(12, 19, 0); p(20, 19, 0);
    h(14, 18, 20, 5); p(13, 20, 0); p(19, 20, 0); p(16, 20, 4);
    h(14, 18, 21, 5); p(13, 21, 0); p(19, 21, 0);
    h(15, 17, 22, 5); p(14, 22, 0); p(18, 22, 0);
    p(16, 23, 5); p(15, 23, 0); p(17, 23, 0);
    p(16, 24, 0);

    // Robe & Magic Cuffs
    h(9, 11, 18, 2); h(21, 23, 18, 2); p(8, 18, 0); p(24, 18, 0);
    h(9, 11, 19, 2); h(21, 23, 19, 2); p(8, 19, 0); p(24, 19, 0);
    h(9, 11, 20, 4); h(21, 23, 20, 4);
    p(9, 21, 7); p(23, 21, 7);
    for (let ry = 21; ry <= 28; ry++) {
      const rx1 = Math.max(8, 13 - Math.floor((ry - 21) * 0.6));
      const rx2 = Math.min(24, 19 + Math.floor((ry - 21) * 0.6));
      p(rx1 - 1, ry, 0);
      h(rx1, rx2, ry, (ry % 2 === 0) ? 2 : 1);
      p(16, ry, 3);
      p(rx2 + 1, ry, 0);
    }
    h(8, 24, 29, 0);

    // Staff & Glowing Crystal
    for (let sy = 13; sy <= 28; sy++) {
      p(26, sy, 0);
      p(27, sy, 7);
    }
    p(27, 9, 5);
    h(26, 28, 10, 4);
    h(26, 28, 11, 5);
    p(27, 12, 3);

    return c;
  },

  drawSlime(targetCtx, x, y, size = 48, timeSec = 0) {
    if (this.images.slime) {
      targetCtx.drawImage(this.images.slime, x - size / 2, y - size / 2, size, size);
      return;
    }
    const frame = Math.floor(timeSec * 4) % 4; // 4 fps idle bounce
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(this.canvases.slime, frame * 32, 0, 32, 32, x - size / 2, y - size / 2, size, size);
  },

  drawMage(targetCtx, x, y, size = 48) {
    if (this.images.mage) {
      targetCtx.drawImage(this.images.mage, x - size / 2, y - size / 2, size, size);
      return;
    }
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(this.canvases.mage, 0, 0, 32, 32, x - size / 2, y - size / 2, size, size);
  },

  /* --- GOBLIN SPRITE (Procedural Kitchen-v2 style, 32x32, 4 frame walk) --- */
  buildGoblinSheet() {
    const c = document.createElement('canvas');
    c.width = 128; // 4 frames × 32
    c.height = 32;
    const gc = c.getContext('2d');
    const pal = ["#1a2e1a","#2d5a1e","#4a8c3f","#6db85a","#a8d86e","#f6efd9","#1a1a10","#c9462f"];
    // 0:outline, 1:darkGreen, 2:midGreen, 3:lightGreen, 4:highlight, 5:white, 6:pupil, 7:red

    const frames = [
      { legL: 0, legR: 0 },   // stand
      { legL: -1, legR: 1 },   // walk 1
      { legL: 0, legR: 0 },    // stand 2
      { legL: 1, legR: -1 }    // walk 2
    ];

    frames.forEach((f, fIdx) => {
      const ox = fIdx * 32;
      function p(x, y, ci) {
        if (x >= 0 && x < 32 && y >= 0 && y < 32) {
          gc.fillStyle = pal[ci];
          gc.fillRect(ox + x, y, 1, 1);
        }
      }
      function h(x1, x2, y, ci) { for (let x = x1; x <= x2; x++) p(x, y, ci); }

      // Pointy ears + head
      p(10, 8, 0); p(22, 8, 0);   // ear tips
      p(9, 9, 2); p(10, 9, 1); p(11, 9, 0);
      p(21, 9, 0); p(22, 9, 1); p(23, 9, 2);
      p(8, 10, 2); p(9, 10, 3); p(10, 10, 1); p(11, 10, 0);
      p(21, 10, 0); p(22, 10, 1); p(23, 10, 3); p(24, 10, 2);

      // Head dome
      h(13, 19, 7, 0);
      h(12, 20, 8, 2); p(11, 8, 0); p(21, 8, 0);
      h(11, 21, 9, 2);
      h(11, 21, 10, 3);
      h(11, 21, 11, 3);

      // Face: big yellow eyes + fangs
      h(12, 20, 12, 3); p(11, 12, 0); p(21, 12, 0);
      // Eyes
      p(13, 11, 5); p(14, 11, 5); p(13, 12, 5); p(14, 12, 5); // left eye white
      p(14, 11, 6); p(14, 12, 6); // left pupil
      p(18, 11, 5); p(19, 11, 5); p(18, 12, 5); p(19, 12, 5); // right eye
      p(18, 11, 6); p(18, 12, 6); // right pupil

      // Mouth + fangs
      h(14, 18, 13, 1); p(13, 13, 0); p(19, 13, 0);
      p(14, 14, 5); p(18, 14, 5); // fangs
      p(15, 13, 7); p(16, 13, 7); p(17, 13, 7); // red mouth

      // Chin
      h(13, 19, 14, 2); p(12, 14, 0); p(20, 14, 0);
      h(14, 18, 15, 0);

      // Body / tunic
      h(12, 20, 16, 0);
      h(11, 21, 17, 1); p(10, 17, 0); p(22, 17, 0);
      h(11, 21, 18, 1);
      h(11, 21, 19, 2);
      h(11, 21, 20, 2);
      h(12, 20, 21, 1);

      // Belt
      h(12, 20, 22, 0);
      p(16, 22, 4); // buckle

      // Lower body
      h(12, 20, 23, 1);
      h(13, 19, 24, 2);

      // Arms
      p(9, 18, 3); p(10, 18, 2); p(9, 19, 3); p(10, 19, 2);
      p(9, 20, 0); p(10, 20, 3);
      p(22, 18, 2); p(23, 18, 3); p(22, 19, 2); p(23, 19, 3);
      p(22, 20, 3); p(23, 20, 0);

      // Dagger in right hand
      p(24, 17, 0); p(24, 18, 4); p(24, 19, 5); p(24, 20, 5); p(24, 21, 5);

      // Legs with walk animation
      const ly = 25;
      h(13 + f.legL, 15 + f.legL, ly, 1); p(12 + f.legL, ly, 0); p(16 + f.legL, ly, 0);
      h(17 + f.legR, 19 + f.legR, ly, 1); p(16 + f.legR, ly, 0); p(20 + f.legR, ly, 0);
      h(13 + f.legL, 15 + f.legL, ly + 1, 2); p(12 + f.legL, ly + 1, 0); p(16 + f.legL, ly + 1, 0);
      h(17 + f.legR, 19 + f.legR, ly + 1, 2); p(16 + f.legR, ly + 1, 0); p(20 + f.legR, ly + 1, 0);
      // Feet
      h(12 + f.legL, 16 + f.legL, ly + 2, 0);
      h(16 + f.legR, 20 + f.legR, ly + 2, 0);
    });

    return c;
  },

  drawGoblin(targetCtx, x, y, size = 44, timeSec = 0) {
    if (this.images.goblin) {
      targetCtx.drawImage(this.images.goblin, x - size / 2, y - size / 2, size, size);
      return;
    }
    if (!this.canvases.goblin) {
      this.canvases.goblin = this.buildGoblinSheet();
    }
    const frame = Math.floor(timeSec * 4) % 4;
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(this.canvases.goblin, frame * 32, 0, 32, 32, x - size / 2, y - size / 2, size, size);
  }
};

/* ============================================================================
   DIALOGUE SYSTEM
   ============================================================================ */
function openElderDialogue() {
  const elder = getCastMember('elder');
  const dlgAvatar = document.getElementById('dlg-avatar');
  const dlgSpeaker = document.getElementById('dlg-speaker');
  const dlgText = document.getElementById('dlg-text');
  const dlgShop = document.getElementById('dlg-shop-options');

  dlgAvatar.innerHTML = '<canvas id="dlg-mage-canvas" width="48" height="48" style="image-rendering:pixelated; width:36px; height:36px; display:inline-block; vertical-align:middle;"></canvas>';
  setTimeout(() => {
    const dcv = document.getElementById('dlg-mage-canvas');
    if (dcv) {
      const dctx = dcv.getContext('2d');
      SpriteKitchen.drawMage(dctx, 24, 24, 46);
    }
  }, 10);
  dlgSpeaker.textContent = elder.name;
  dlgShop.style.display = 'none';

  if (gameState.questStep === 0) {
    gameState.questStep = 1;
    dlgText.innerHTML = `
"Welcome, young champion! The <strong>Ember Dragon</strong> burned our village fields and stole the harvest! 
The mountain cave is sealed by the <strong>Stone Golem</strong>. Train on the forest slimes until you reach <strong>Level 3</strong>, 
First, visit Vulcan in the red-roofed house for supplies. Then follow the north path into Whispering Forest. Practice on a slime before taking on the cave!"
    `;
    saveGame();
    updateUI();
  } else if (gameState.questStep === 1) {
    if (!gameState.golemDefeated) {
      dlgText.innerHTML = `
  "Train hard, hero! Slimes will grant you XP and gold. Defeat the Stone Golem at Level 3 to break the seal on the dragon's lair!"
`;
    } else {
      gameState.questStep = 2;
      dlgText.innerHTML = `
  "Incredible! You broke the Stone Golem's seal! Reach <strong>Level 5</strong>, stock up on potions, then take the northeast forest path to Ember Summit!"
`;
      saveGame();
      updateUI();
    }
  } else if (gameState.questStep === 2) {
    if (!gameState.dragonDefeated) {
      dlgText.innerHTML = `
  "The Ember Dragon awaits at Ember Summit. Rest at the Smith's house and bring potions. Watch your health when the dragon grows enraged!"
`;
    } else {
      dlgText.innerHTML = `
  "You brought our harvest home! Emberbrook will remember your courage when winter comes."
`;
    }
  } else {
    dlgText.textContent = 'You brought our harvest home! Emberbrook is safe because of you.';
  }

  openModal('modal-dialogue');
}

function openSmithDialogue() {
  const smith = getCastMember('smith');
  const dlgAvatar = document.getElementById('dlg-avatar');
  const dlgSpeaker = document.getElementById('dlg-speaker');
  const dlgText = document.getElementById('dlg-text');
  const dlgShop = document.getElementById('dlg-shop-options');

  dlgAvatar.textContent = smith.emoji;
  dlgSpeaker.textContent = smith.name;
  dlgShop.style.display = 'flex';

  const debtBtn = document.getElementById('btn-shop-debt-potion');
  const repayBtn = document.getElementById('btn-shop-repay-debt');
  const repayVal = document.getElementById('shop-debt-repay-val');

  if (debtBtn) {
    debtBtn.style.display = (gameState.gold < 20 && gameState.debt < 60) ? 'flex' : 'none';
  }
  if (repayBtn) {
    if (gameState.debt > 0 && gameState.gold > 0) {
      repayBtn.style.display = 'flex';
      const payAmt = Math.min(gameState.gold, gameState.debt);
      repayVal.textContent = `${payAmt}g`;
    } else {
      repayBtn.style.display = 'none';
    }
  }

  let debtNotice = "";
  if (gameState.debt > 0) {
    debtNotice = `<br><span style="color:#f87171; font-weight:600;">⚠️ Outstanding village debt: ${gameState.debt}g. Half of future monster bounties will be auto-repaid.</span>`;
  }

  dlgText.innerHTML = `
    "Welcome to the Forge, warrior! I can heal your wounds for free, or sell you potions. 
    A potion restores <strong>40 HP</strong>. Use one before a hard fight, or choose <strong>Item</strong> during battle. Healing here is always free."${debtNotice}
  `;

  openModal('modal-dialogue');
}

document.getElementById('btn-shop-heal').addEventListener('click', () => {
  gameState.hp = getMaxHP();
  sounds.playHeal();
  updateUI();
  saveGame();
  showGameNotice("💖 Your HP has been fully restored!");
});

document.getElementById('btn-shop-potion').addEventListener('click', () => {
  if (gameState.gold >= 20) {
    gameState.gold -= 20;
    gameState.potions += 1;
    sounds.playHeal();
    updateUI();
    saveGame();
    showGameNotice(`🧪 Potion acquired! You now carry ${gameState.potions} potions.`);
  } else {
    showGameNotice("❌ Not enough gold! Slay slimes or goblins to earn gold, or borrow on village credit below.");
  }
});

document.getElementById('btn-shop-debt-potion').addEventListener('click', () => {
  if (gameState.debt + 20 <= 60) {
    gameState.debt += 20;
    gameState.potions += 1;
    sounds.playHeal();
    updateUI();
    saveGame();
    showGameNotice(`💳 You took a potion on village credit (+20g debt)! Current debt: ${gameState.debt}g. Repay it with monster bounties.`);
    openSmithDialogue();
  } else {
    showGameNotice("⚠️ Maximum village credit limit reached (60g)! Slay monsters to pay off your debt.");
  }
});

document.getElementById('btn-shop-repay-debt').addEventListener('click', () => {
  if (gameState.debt > 0 && gameState.gold > 0) {
    const pay = Math.min(gameState.gold, gameState.debt);
    gameState.gold -= pay;
    gameState.debt -= pay;
    sounds.playFanfare();
    updateUI();
    saveGame();
    showGameNotice(`🪙 Repaid ${pay}g of village debt! Remaining debt: ${gameState.debt}g.`);
    openSmithDialogue();
  }
});

/* ============================================================================
   THE FORGE (CALCULUS OPTIMIZATION GRAPH & HUD)
   ============================================================================ */
const forgeCanvas = document.getElementById('forgeCanvas');
const fctx = forgeCanvas.getContext('2d');
const forgeSlider = document.getElementById('forge-slider');

function renderForgeGraph() {
  fctx.clearRect(0, 0, forgeCanvas.width, forgeCanvas.height);
  const w = forgeCanvas.width;
  const h = forgeCanvas.height;

  // Domain x in [0, 10], Range D(x) in [0, 160]
  const maxDamageDisplay = 160;

  // Draw Grid Lines
  fctx.strokeStyle = '#1e293b';
  fctx.lineWidth = 1;
  for (let xVal = 0; xVal <= 10; xVal += 2) {
    const px = (xVal / 10) * w;
    fctx.beginPath();
    fctx.moveTo(px, 0);
    fctx.lineTo(px, h);
    fctx.stroke();
  }

  // Draw Equation Curve: D(x) = 60x - 6x^2
  fctx.beginPath();
  fctx.strokeStyle = '#38bdf8';
  fctx.lineWidth = 3;

  for (let px = 0; px <= w; px++) {
    const x = (px / w) * 10;
    const yVal = CalculusEngine.evaluateDamage(x);
    const py = h - (yVal / maxDamageDisplay) * (h - 20) - 10;
    if (px === 0) fctx.moveTo(px, py);
    else fctx.lineTo(px, py);
  }
  fctx.stroke();

  // Highlight Critical Peak x = 5
  const optX = CalculusEngine.getOptimalStrength();
  const optY = CalculusEngine.getMaxDamage();
  const optPx = (optX / 10) * w;
  const optPy = h - (optY / maxDamageDisplay) * (h - 20) - 10;

  fctx.fillStyle = '#f59e0b';
  fctx.beginPath();
  fctx.arc(optPx, optPy, 6, 0, Math.PI * 2);
  fctx.fill();

  fctx.font = '10px JetBrains Mono';
  fctx.fillText('Max (x=5.00, D=150.0)', optPx - 60, optPy - 10);

  // Draw Current Player Point & Tangent Line
  const currentX = gameState.strength;
  const currentD = CalculusEngine.evaluateDamage(currentX);
  const slope = CalculusEngine.evaluateFirstDerivative(currentX);
  const currentPx = (currentX / 10) * w;
  const currentPy = h - (currentD / maxDamageDisplay) * (h - 20) - 10;

  // Draw Tangent Line: L(x) = D(x0) + D'(x0)(x - x0)
  fctx.strokeStyle = '#f43f5e';
  fctx.lineWidth = 2;
  fctx.beginPath();
  const deltaX = 1.5;
  const xLeft = Math.max(0, currentX - deltaX);
  const xRight = Math.min(10, currentX + deltaX);
  const yLeft = currentD + slope * (xLeft - currentX);
  const yRight = currentD + slope * (xRight - currentX);

  const pxLeft = (xLeft / 10) * w;
  const pyLeft = h - (yLeft / maxDamageDisplay) * (h - 20) - 10;
  const pxRight = (xRight / 10) * w;
  const pyRight = h - (yRight / maxDamageDisplay) * (h - 20) - 10;

  fctx.moveTo(pxLeft, pyLeft);
  fctx.lineTo(pxRight, pyRight);
  fctx.stroke();

  // Current marker point
  fctx.fillStyle = '#ef4444';
  fctx.beginPath();
  fctx.arc(currentPx, currentPy, 7, 0, Math.PI * 2);
  fctx.fill();
  fctx.strokeStyle = '#fff';
  fctx.lineWidth = 2;
  fctx.stroke();

  // Update Live Telemetry HUD values
  const concavity = CalculusEngine.evaluateSecondDerivative(currentX);
  document.getElementById('forge-str-val').textContent = currentX.toFixed(1);
  document.getElementById('forge-foc-val').textContent = (10 - currentX).toFixed(1);
  document.getElementById('tel-power').textContent = currentD.toFixed(1);
  document.getElementById('tel-slope').textContent = (slope >= 0 ? '+' : '') + slope.toFixed(1);
  document.getElementById('tel-concavity').textContent = concavity.toFixed(1);

  const statusEl = document.getElementById('tel-status');
  if (Math.abs(slope) <= 1.0 && concavity < 0) {
    statusEl.textContent = '🌟 Peak Optimal!';
    statusEl.style.color = '#10b981';
  } else if (slope > 0) {
    statusEl.textContent = '↗️ Add Strength';
    statusEl.style.color = '#38bdf8';
  } else {
    statusEl.textContent = '↘️ Add Focus';
    statusEl.style.color = '#f87171';
  }

  document.getElementById('ui-forge-ratio').textContent = `[${currentX.toFixed(1)}:${(10 - currentX).toFixed(1)}]`;
}

forgeSlider.addEventListener('input', (e) => {
  gameState.strength = parseFloat(e.target.value);
  saveGame();
  renderForgeGraph();
});

document.getElementById('btn-forge-optimal').addEventListener('click', () => {
  gameState.strength = CalculusEngine.getOptimalStrength();
  forgeSlider.value = gameState.strength;
  saveGame();
  renderForgeGraph();
});

/* ============================================================================
   BATTLE SYSTEM & S-CURVE TIMING GAUGE
   ============================================================================ */
let activeBattle = null;
let gaugeAnimFrame = null;
let gaugeStartTime = 0;
let gaugeDuration = 4.0; // T in seconds (Dragon enrage = 3.0s)
let isGaugeRunning = false;

function startBattle(enemy) {
  if (activeBattle) return;
  clearMovement();
  document.getElementById('battle-log').textContent = '';
  document.getElementById('battle-items').hidden = true;
  document.getElementById('report-details').hidden = true;
  document.getElementById('btn-report-details').textContent = 'Battle details';
  battleVisual = { hero: 'idle', enemy: 'idle', heroUntil: 0, enemyUntil: 0, until: 0 };
  const cast = getCastMember(enemy.id);
  activeBattle = {
    enemy: enemy,
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.maxHp,
    enemyAtk: enemy.atk,
    isEnraged: false,
    playerTurn: true,
    playerDebuffs: [],
    guarding: false,
    focused: false,
    history: []
  };

  // Setup DOM Elements
  document.getElementById('battle-player-sprite').textContent = getCastMember('hero').emoji;
  document.getElementById('battle-player-name').textContent = getCastMember('hero').name;

  document.getElementById('battle-enemy-name').textContent = cast.name || enemy.name;
  document.getElementById('battle-potion-count').textContent = gameState.potions;

  updateBattleUI();
  logBattle(`Encountered ${escapeHTML(cast.name || enemy.name)}! Choose Attack, Item, or Run.`);

  openModal('modal-battle');
  resetGauge();
}

function updateBattleUI() {
  const pPct = Math.max(0, (gameState.hp / getMaxHP()) * 100);
  const ePct = Math.max(0, (activeBattle.enemyHp / activeBattle.enemyMaxHp) * 100);

  document.getElementById('battle-player-hp-bar').style.width = `${pPct}%`;
  document.getElementById('battle-player-hp-text').textContent = `${gameState.hp} / ${getMaxHP()} HP`;

  document.getElementById('battle-enemy-hp-bar').style.width = `${ePct}%`;
  document.getElementById('battle-enemy-hp-text').textContent = `${Math.ceil(activeBattle.enemyHp)} / ${activeBattle.enemyMaxHp} HP`;
  document.getElementById('enemy-intent').textContent = `Next enemy hit: ${activeBattle.enemyAtk} damage · Guard reduces direct damage by 65%`;
  syncBattleActions();

  // Active Status Debuffs Row
  const debuffRow = document.getElementById('battle-debuffs-row');
  if (debuffRow) {
    if (!activeBattle.playerDebuffs || activeBattle.playerDebuffs.length === 0) {
      debuffRow.innerHTML = '<span style="font-size: 11px; color: var(--text-muted);">Status: Normal</span>';
    } else {
      debuffRow.innerHTML = activeBattle.playerDebuffs.map(d =>
        `<span class="tag-chip" style="${d.style}">${d.icon} ${d.name} (${d.duration}t)</span>`
      ).join(' ');
    }
  }

  // Check Dragon Enrage at 50% HP
  if (activeBattle.enemy.id === 'dragon' && !activeBattle.isEnraged && activeBattle.enemyHp > 0 && activeBattle.enemyHp <= activeBattle.enemyMaxHp * 0.5) {
    activeBattle.isEnraged = true;
    activeBattle.enemyAtk = 38;
    logBattle(`🔥 THE EMBER DRAGON ENRAGES! Gauge accelerates and attack surges to 38!`);
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
}

function logBattle(msg) {
  const logEl = document.getElementById('battle-log');
  const row = document.createElement('div');
  row.innerHTML = msg;
  logEl.appendChild(row);
  logEl.scrollTop = logEl.scrollHeight;
}

function syncBattleActions() {
  const canAct = !!activeBattle && activeBattle.playerTurn && !isGaugeRunning;
  document.getElementById('btn-battle-strike').disabled = !canAct;
  document.getElementById('btn-battle-guard').disabled = !canAct;
  document.getElementById('btn-battle-potion').disabled = !canAct;
  document.getElementById('btn-battle-run').disabled = !canAct || (activeBattle && activeBattle.enemy.type !== 'monster');
  document.getElementById('btn-use-potion').disabled = !canAct || gameState.potions <= 0;
  document.getElementById('item-potion-count').textContent = gameState.potions;
}

function resetGauge() {
  isGaugeRunning = false;
  if (gaugeAnimFrame) cancelAnimationFrame(gaugeAnimFrame);
  document.getElementById('gauge-fill').style.width = '0%';
  document.getElementById('gauge-needle').style.left = '0%';
  document.getElementById('battle-timer-val').textContent = 't = 0.00s';
  document.getElementById('btn-battle-strike').style.display = 'inline-flex';
  document.getElementById('btn-battle-tap').style.display = 'none';
  syncBattleActions();
}

function startGauge() {
  if (!activeBattle || !activeBattle.playerTurn || isGaugeRunning) return;
  isGaugeRunning = true;
  document.getElementById('battle-items').hidden = true;
  syncBattleActions();

  // Check Sticky Slime debuff (slows down timing gauge)
  const hasSticky = activeBattle.playerDebuffs && activeBattle.playerDebuffs.some(d => d.type === 'sticky');
  const baseT = (activeBattle.enemy.id === 'dragon' && activeBattle.isEnraged) ? 3.0 : 4.0;
  gaugeDuration = hasSticky ? baseT * 1.3 : baseT;
  gaugeStartTime = performance.now();

  document.getElementById('btn-battle-strike').style.display = 'none';
  document.getElementById('btn-battle-tap').style.display = 'inline-flex';
  document.getElementById('btn-battle-potion').disabled = true;

  function step(now) {
    if (!isGaugeRunning) return;
    const elapsedSec = (now - gaugeStartTime) / 1000;
    const t = Math.min(elapsedSec, gaugeDuration);

    const R = PrototypeCombat.chargeProgress(t, gaugeDuration);
    const pct = (R * 100).toFixed(1);

    document.getElementById('gauge-fill').style.width = `${pct}%`;
    document.getElementById('gauge-needle').style.left = `${pct}%`;
    document.getElementById('battle-timer-val').textContent = `t = ${t.toFixed(2)}s`;

    if (elapsedSec >= gaugeDuration) {
      // Auto release late tap
      executePlayerStrike(gaugeDuration);
    } else {
      gaugeAnimFrame = requestAnimationFrame(step);
    }
  }

  gaugeAnimFrame = requestAnimationFrame(step);
}

function executePlayerStrike(t) {
  if (!activeBattle || !activeBattle.playerTurn || !isGaugeRunning) return;
  activeBattle.playerTurn = false;
  isGaugeRunning = false;
  if (gaugeAnimFrame) cancelAnimationFrame(gaugeAnimFrame);

  const T = gaugeDuration;
  const mult = PrototypeCombat.strikeMultiplier(t, T);
  const isCrit = mult >= 1.8;

  gameState.totalStrikes++;
  if (isCrit) gameState.perfectInflections++;

  // Temporary combat balance, independent of the paused course draft.
  const baseD = PrototypeCombat.basePower;
  const lvlMod = PrototypeCombat.levelFactor(gameState.level);
  let totalDmg = Math.round(baseD * lvlMod * mult);
  if(activeBattle.focused) { totalDmg = Math.round(totalDmg * 1.35); activeBattle.focused=false; }
  if (devState.godMode) totalDmg *= 2; // God Mode bonus
  recordStrike(t, T, mult, totalDmg);
  animateCombat('hero', 'attack');
  animateCombat('enemy', activeBattle.enemyHp <= totalDmg ? 'death' : 'hurt', String(totalDmg));

  activeBattle.enemyHp = Math.max(0, activeBattle.enemyHp - totalDmg);
  sounds.playHit(isCrit);

  if (isCrit) {
    logBattle(`💥 <strong>CRITICAL HIT!</strong> Great timing! Dealt <strong>${totalDmg} damage</strong>.`);
  } else {
    logBattle(`🗡️ Your strike dealt <strong>${totalDmg} damage</strong>. Aim for the center for a stronger hit.`);
  }

  updateBattleUI();
  resetGauge();

  // Check Win Condition
  if (activeBattle.enemyHp <= 0) {
    handleBattleVictory();
    return;
  }

  // Enemy Turn
  activeBattle.playerTurn = false;
  syncBattleActions();
  queueEnemyTurn(1000);
}

function queueEnemyTurn(delay) {
  const encounter = activeBattle;
  encounter.enemyWarning = true;
  setTimeout(() => {
    if (activeBattle !== encounter) return;
    encounter.enemyWarning = false;
    enemyTurn();
  }, delay);
}

function enemyTurn() {
  if (!activeBattle) return;

  let dmg = activeBattle.enemyAtk;
  const stunDebuff = activeBattle.playerDebuffs.find(d => d.type === 'stun');
  if (stunDebuff) dmg += 4; // Extra damage from armor shatter

  if(activeBattle.guarding) { dmg=Math.ceil(dmg*0.35); activeBattle.guarding=false; }
  if (devState.godMode) {
    logBattle(`🛡️ God Mode active! 0 damage taken.`);
  } else {
    gameState.hp = Math.max(0, gameState.hp - dmg);
  }
  animateCombat('enemy', 'attack');
  animateCombat('hero', 'hurt', devState.godMode ? 'BLOCK' : '-' + dmg);
  sounds.playHit(false);
  logBattle(`🩸 ${escapeHTML(getCastMember(activeBattle.enemy.id).name)} strikes you for <strong>${devState.godMode ? 0 : dmg} HP</strong>!`);

  // Non-damaging effects last for their advertised number of full turns.
  activeBattle.playerDebuffs.forEach(d => { if (!d.tickDmg) d.duration--; });
  activeBattle.playerDebuffs = activeBattle.playerDebuffs.filter(d => d.duration > 0);

  // Debuff Infliction Chance
  if (devState.debuffsEnabled) {
    const eid = activeBattle.enemy.id;
    if (eid.startsWith('slime') && Math.random() < 0.35 && !activeBattle.playerDebuffs.some(d => d.type === 'sticky')) {
      activeBattle.playerDebuffs.push({
        type: 'sticky', name: 'Sticky Goo', icon: '🍯', duration: 2,
        style: 'background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4);'
      });
      logBattle(`🍯 <em>${activeBattle.enemy.name} sprays Sticky Goo! Charge time is 30% longer!</em>`);
    } else if (eid.startsWith('goblin') && Math.random() < 0.40 && !activeBattle.playerDebuffs.some(d => d.type === 'poison')) {
      activeBattle.playerDebuffs.push({
        type: 'poison', name: 'Poison', icon: '☠️', duration: 3, tickDmg: 6,
        style: 'background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);'
      });
      logBattle(`☠️ <em>${activeBattle.enemy.name} stabs with a Poisoned Dagger (-6 HP/turn)!</em>`);
    } else if (eid === 'golem' && Math.random() < 0.35 && !activeBattle.playerDebuffs.some(d => d.type === 'stun')) {
      activeBattle.playerDebuffs.push({
        type: 'stun', name: 'Armor Shatter', icon: '🗿', duration: 2,
        style: 'background: rgba(148, 163, 184, 0.2); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.4);'
      });
      logBattle(`🗿 <em>Stone Golem shatters your armor (+4 dmg taken)!</em>`);
    } else if (eid === 'dragon' && Math.random() < 0.50 && !activeBattle.playerDebuffs.some(d => d.type === 'burn')) {
      activeBattle.playerDebuffs.push({
        type: 'burn', name: 'Inferno Burn', icon: '🔥', duration: 3, tickDmg: 10,
        style: 'background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4);'
      });
      logBattle(`🔥 <em>Ember Dragon engulfs you in Inferno Flames (-10 HP/turn)!</em>`);
    }
  }

  updateUI();
  updateBattleUI();
  saveGame();

  if (gameState.hp <= 0) {
    handleBattleDefeat();
    return;
  }

  // Ticking player debuffs at the start of player turn
  setTimeout(() => {
    if (!activeBattle) return;
    processPlayerDebuffs();
  }, 700);
}

function processPlayerDebuffs() {
  if (!activeBattle) return;
  let tickDmg = 0;
  activeBattle.playerDebuffs.forEach(d => {
    if (d.tickDmg && !devState.godMode) {
      tickDmg += d.tickDmg;
      logBattle(`${d.icon} ${d.name} ticks for <strong>${d.tickDmg} damage</strong>!`);
    }
    if (d.tickDmg) d.duration -= 1;
  });

  activeBattle.playerDebuffs = activeBattle.playerDebuffs.filter(d => d.duration > 0);
  updateBattleUI();

  if (tickDmg > 0) {
    gameState.hp = Math.max(0, gameState.hp - tickDmg);
    sounds.playHit(false);
    updateUI();
    updateBattleUI();
  }

  if (gameState.hp <= 0) {
    handleBattleDefeat();
  } else {
    activeBattle.playerTurn = true;
    syncBattleActions();
    saveGame();
  }
}

function usePotion() {
  if (!activeBattle || !activeBattle.playerTurn || isGaugeRunning) return;
  if (gameState.potions <= 0) {
    showGameNotice("No potions remaining!");
    return;
  }
  animateCombat('hero', 'idle', '+40 HP');
  gameState.potions--;
  gameState.hp = Math.min(getMaxHP(), gameState.hp + 40);
  sounds.playHeal();
  logBattle(`🧪 Quaffed potion! Restored 40 HP.`);
  document.getElementById('battle-potion-count').textContent = gameState.potions;
  updateUI();
  updateBattleUI();

  // Consumes player turn
  activeBattle.playerTurn = false;
  syncBattleActions();
  saveGame();
  queueEnemyTurn(1000);
}

function handleBattleVictory() {
  activeBattle.playerTurn = false;
  syncBattleActions();
  const enemy = activeBattle.enemy;
  const cast = getCastMember(enemy.id);
  sounds.playFanfare();
  logBattle(`🎉 <strong>Victory! ${escapeHTML(cast.name || enemy.name)} was vanquished!</strong>`);

  // Award XP and Gold with Debt Auto-Repayment
  gameState.xp += enemy.xp;

  if (gameState.debt > 0) {
    const autoDebtPayment = Math.min(Math.ceil(enemy.gold * 0.5), gameState.debt);
    gameState.debt -= autoDebtPayment;
    const netGold = enemy.gold - autoDebtPayment;
    activeBattle.netGold = netGold;
    gameState.gold += netGold;
    logBattle(`💳 ${autoDebtPayment}g from monster bounty automatically paid off village debt! Remaining: ${gameState.debt}g`);
  } else {
    gameState.gold += enemy.gold;
  }

  if (enemy.id === 'golem') {
    gameState.golemDefeated = true;
    gameState.questStep = 2;
  } else if (enemy.id === 'dragon') {
    gameState.dragonDefeated = true;
    gameState.questStep = 3;
  } else if (enemy.respawnTimer !== undefined) {
    enemy.respawnTimer = 10; // 10s respawn
  }

  checkLevelUp();
  updateUI();
  saveGame();

  setTimeout(() => {
    finishBattle('Victory');
  }, 1200);
}

function handleBattleDefeat() {
  animateCombat('hero', 'death');
  gameState.hp = getMaxHP();
  gameState.gold = Math.floor(gameState.gold / 2);
  gameState.mapId = 'village';
  [gameState.playerX, gameState.playerY] = WORLD.village.spawn;
  updateLocation();
  saveGame();
  updateUI();
  finishBattle('Defeat');
}

function checkLevelUp() {
  let requiredXP = getNextLevelXP();
  while (gameState.xp >= requiredXP && gameState.level < 8) {
    gameState.xp -= requiredXP;
    gameState.level += 1;
    gameState.hp = getMaxHP();
    requiredXP = getNextLevelXP();
    sounds.playFanfare();
    showGameNotice(`⭐ LEVEL UP! You reached Level ${gameState.level}! Max HP increased to ${getMaxHP()}!`);
  }
}

// Victory Screen
function showVictoryScreen() {
  const statsEl = document.getElementById('victory-stats');
  statsEl.innerHTML = `
    • Final Level: Level ${gameState.level}<br>
    • Attacks made: ${gameState.totalStrikes}<br>
    • Gold remaining: ${gameState.gold}<br>
    • <strong>The harvest is home. Emberbrook can face the winter.</strong>
  `;
  openModal('modal-victory');
}

/* ============================================================================
   UI SYNC & CONTROLS BINDING
   ============================================================================ */
function updateUI() {
  const hero = getCastMember('hero');
  document.getElementById('ui-hero-avatar').textContent = hero.emoji;
  document.getElementById('ui-hero-name').textContent = hero.name;
  document.getElementById('ui-hero-lvl').textContent = `Lv ${gameState.level}`;

  const maxHp = getMaxHP();
  const hpPct = Math.max(0, (gameState.hp / maxHp) * 100);
  document.getElementById('ui-hp-bar').style.width = `${hpPct}%`;
  document.getElementById('ui-hp-text').textContent = `${gameState.hp}/${maxHp}`;

  const nextXp = getNextLevelXP();
  const xpPct = Math.min(100, (gameState.xp / nextXp) * 100);
  document.getElementById('ui-xp-bar').style.width = `${xpPct}%`;
  document.getElementById('ui-xp-text').textContent = `${gameState.xp}/${nextXp}`;

  document.getElementById('ui-gold-text').textContent = gameState.gold;
  document.getElementById('ui-potions-text').textContent = gameState.potions;
  document.getElementById('ui-debt-badge').style.display = gameState.debt > 0 ? 'inline' : 'none';
  document.getElementById('ui-debt-text').textContent = gameState.debt;

  // Objective text
  const qText = document.getElementById('ui-quest-text');
  const bBadge = document.getElementById('ui-boss-badge');

  if (gameState.questStep === 0) {
    qText.textContent = "Meet Elder Thales in the blue-roofed house on the left.";
    bBadge.textContent = "Act I: Village";
  } else if (gameState.questStep === 1) {
    qText.textContent = "Train in Whispering Forest. Reach Lv 3, then enter Stonebound Cavern.";
    bBadge.textContent = "Act II: Stone Golem";
  } else if (gameState.questStep === 2) {
    qText.textContent = "Reach Lv 5, then cross the forest to Ember Summit and slay the dragon.";
    bBadge.textContent = "Act III: Ember Dragon";
  } else {
    qText.textContent = "The Ember Dragon is vanquished! Peace is restored.";
    bBadge.textContent = "Victory!";
  }
}

// Modal helpers
function openModal(id) {
  // Retain the earlier draft screens for reference, outside the playable flow.
  if (id === 'modal-forge' || id === 'modal-math') return;
  clearMovement();
  if (activeBattle && id !== 'modal-battle') return;
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    if (modal.id !== id) modal.style.display = 'none';
  });
  document.getElementById(id).style.display = 'flex';
  if (id === 'modal-forge') {
    forgeSlider.value = gameState.strength;
    renderForgeGraph();
  }
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  if (id === 'modal-region-map') document.getElementById('btn-map').focus?.();
  if (id === 'modal-battle') {
    activeBattle = null;
    resetGauge();
    if (window._battleSpriteTimer) clearInterval(window._battleSpriteTimer);
  }
}

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal(btn.getAttribute('data-close'));
  });
});

function toggleRegionMap() {
  const panel = document.getElementById('modal-region-map');
  if (panel.style.display === 'flex') {
    closeModal(panel.id);
    return;
  }
  if (modalIsOpen()) return;
  const region = currentMap().kind === 'interior' ? 'village' : gameState.mapId;
  const states = {
    village: 'Open · rest and resupply',
    forest: 'Open · trail junction',
    cave: gameState.golemDefeated ? 'Guardian defeated' : gameState.level >= 3 ? 'Guardian available' : 'Guardian requires Level 3',
    volcano: gameState.dragonDefeated ? 'Harvest recovered' : summitUnlocked() ? 'Open · dragon arena' : 'Locked · defeat Golem and reach Lv 5'
  };
  for (const [id, status] of Object.entries(states)) {
    const label = document.getElementById('map-state-' + id);
    label.textContent = id === region ? 'You are here · ' + status : status;
    label.parentElement?.classList.toggle('atlas-current', id === region);
  }
  openModal(panel.id);
  panel.querySelector('[data-close]')?.focus();
}
document.getElementById('btn-map').addEventListener('click', toggleRegionMap);
document.addEventListener('keydown', event => {
  const panel = document.getElementById('modal-region-map');
  if (panel.style.display !== 'flex') return;
  if (event.key === 'Escape') toggleRegionMap();
  if (event.key === 'Tab') {
    const buttons = [...panel.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    const next = index < 0 ? (event.shiftKey ? buttons.length - 1 : 0) :
      (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next].focus();
  }
});

// Top bar buttons
document.getElementById('btn-forge').addEventListener('click', () => openModal('modal-forge'));
document.getElementById('btn-guide').addEventListener('click', () => openModal('modal-guide'));
document.getElementById('btn-victory-village').addEventListener('click', () => {
  closeModal('modal-victory');
  enterMap('village');
});
document.getElementById('btn-dev').addEventListener('click', () => openModal('modal-dev'));
[['god', 'godMode'], ['freeze', 'freezeAI'], ['debuffs', 'debuffsEnabled']].forEach(([id, key]) => {
  document.getElementById(`dev-toggle-${id}`).addEventListener('click', () => {
    devState[key] = !devState[key];
    const label = document.getElementById(`dev-val-${id}`);
    label.textContent = id === 'debuffs' ? (devState[key] ? 'ACTIVE' : 'OFF') :
      id === 'freeze' ? (devState[key] ? 'ON (Frozen)' : 'OFF (Moving)') : (devState[key] ? 'ON' : 'OFF');
    label.style.color = devState[key] ? '#10b981' : '#f87171';
  });
});
[['village','village'],['forest','forest'],['cave','cave'],['volcano','volcano']].forEach(([button,map])=>{
  document.getElementById('dev-warp-'+button).addEventListener('click',()=>{
    closeModal('modal-dev'); enterMap(map);
  });
});
[1, 3, 5, 8].forEach(level => {
  document.getElementById(`dev-btn-lvl${level}`).addEventListener('click', () => {
    gameState.level = level;
    gameState.xp = 0;
    gameState.hp = getMaxHP();
    saveGame();
    updateUI();
  });
});
document.getElementById('dev-btn-gold').addEventListener('click', () => {
  gameState.gold += 100;
  saveGame();
  updateUI();
});
document.getElementById('dev-btn-cleardebt').addEventListener('click', () => {
  gameState.debt = 0;
  saveGame();
  updateUI();
});
document.getElementById('btn-sound').addEventListener('click', () => {
  sounds.enabled = !sounds.enabled;
  document.getElementById('btn-sound').textContent = sounds.enabled ? '🔊' : '🔇';
});

// Battle buttons
document.getElementById('btn-battle-strike').addEventListener('click', () => startGauge());
document.getElementById('btn-battle-tap').addEventListener('click', () => {
  const elapsed = (performance.now() - gaugeStartTime) / 1000;
  executePlayerStrike(elapsed);
});
// Item selection and Run are bound by initCombat().

// Feedback stays inside the adventure, including shop and level-up messages.
let noticeTimer;
function showGameNotice(message) {
  const notice = document.getElementById('game-notice');
  notice.textContent = message;
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 5500);
}

// Slime Respawn Interval (Every second decrement)
setInterval(() => {
  entities.forEach(ent => {
    if (ent.respawnTimer > 0) {
      ent.respawnTimer -= 1;
      if (ent.respawnTimer <= 0) {
        ent.hp = ent.maxHp;
        renderMap();
      }
    }
  });
}, 1000);

// Initial Launch
SpriteKitchen.init();
initWorld();
initCombat();
updateUI();
checkProximityPrompt();
renderMap();
requestAnimationFrame(gameLoop);


document.getElementById('btn-fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.getElementById('game-container').requestFullscreen();
    }
  } catch {
    showGameNotice('Use your browser fullscreen control (F11 on desktop).');
  }
});


function guardTurn() {
  if (!activeBattle || !activeBattle.playerTurn || isGaugeRunning) return;
  activeBattle.guarding = true;
  activeBattle.focused = true;
  activeBattle.playerTurn = false;
  logBattle('Guard raised. Take 65% less direct damage, then strike with 35% more power.');
  syncBattleActions();
  queueEnemyTurn(550);
}
document.getElementById('btn-battle-guard').addEventListener('click', guardTurn);
