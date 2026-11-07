/* Continuous world movement, connected regions, asset rendering and touch input. */
const TILE_SIZE = 32;
const COLS = 40;
const ROWS = 28;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ART_ROOT = 'assets/game/';
const MEDIEVAL = ART_ROOT + 'pixel_medieval_dungeon_bundle/pixel_medieval_v6/frames/';
const DUNGEON = ART_ROOT + 'pixel_medieval_dungeon_bundle/pixel_dungeon_v7/frames/';
const CREATURES = ART_ROOT + 'Fantasy_Creatures_Bundle/Fantasy_Creatures_Bundle/';
const images = new Map();
const input = { keys: new Set(), x: 0, y: 0, pointer: null, facing: 1, moving: false };
const camera = { x: 0, y: 0 };
let worldClock = 0;
let portalCooldown = 0;
let movementSaveTimer = 0;
let lastWorldFrame = null;
let lastBattle = null;
let battleVisual = { hero: 'idle', enemy: 'idle', heroUntil: 0, enemyUntil: 0, text: '', until: 0 };

const WORLD = {
  village: { name: 'Emberbrook Village', subtitle: 'A quiet refuge beneath the mountains', width: 44, height: 30, kind: 'village', spawn: [22, 17],
    portals: [
      { x: 20, y: 1, w: 4, h: 1.4, to: 'forest', at: [21, 29], label: 'Whispering Forest', color: '#a7d9a1' },
      { x: 10.2, y: 12.6, w: 1.6, h: 1, to: 'elderHouse', at: [10, 13], label: 'Elder’s House', color: '#ead39b' },
      { x: 30.2, y: 12.6, w: 1.6, h: 1, to: 'smithHouse', at: [10, 13], label: 'Blacksmith', color: '#ead39b' }
    ], buildings: [{x:6.4,y:6,w:9.6,h:6.5,doorX:11,label:'ELDER THALES', roof:'#536d85'}, {x:27,y:6,w:11,h:6.5,doorX:31,label:'THE FORGE',roof:'#8c4b45'}], props: [
      {asset:'well',x:21.2,y:21.2,size:80,solid:true},
      {asset:'market_stall',x:31.2,y:23,size:120,solid:true}
    ] },
  forest: { name: 'Whispering Forest', subtitle: 'Slimes stir between the ancient trees', width: 44, height: 34, kind: 'forest', spawn: [21,29],
    portals: [
      {x:20,y:32,w:4,h:1.2,to:'village',at:[22,3],label:'Emberbrook',color:'#ead39b'},
      {x:3,y:2,w:3,h:1.5,to:'cave',at:[13,22],label:'Stonebound Cavern · Lv 3',color:'#9dd4ed'},
      {x:38,y:2,w:3,h:1.5,to:'volcano',at:[14,25],label:'Ember Summit · Lv 5',color:'#f6a17e',gate:'dragon'}
    ], buildings: [], props: [] },
  cave: { name: 'Stonebound Cavern', subtitle: 'A rune-lit guardian waits in the depths', width: 28, height: 26, kind: 'cave', spawn:[13,22],
    portals: [{x:12,y:24,w:4,h:1,to:'forest',at:[5,5],label:'Whispering Forest',color:'#b3d7ab'}], buildings:[],props:[] },
  volcano: { name: 'Ember Summit', subtitle: 'Beyond the ash, the stolen harvest awaits', width:32,height:30,kind:'volcano',spawn:[14,25],
    portals: [{x:13,y:28,w:4,h:1,to:'forest',at:[39,5],label:'Whispering Forest',color:'#b3d7ab'}],buildings:[],props:[] },
  elderHouse: {name:'Elder’s House',subtitle:'Books, candlelight, and a new beginning',width:20,height:16,kind:'interior',spawn:[10,13],
    portals:[{x:9,y:14,w:2,h:1,to:'village',at:[11,14.5],label:'Return to village',color:'#ead39b'}],buildings:[],props:[
      {asset:'bookshelf',x:3,y:3,size:90,solid:true},{asset:'bookshelf',x:6,y:3,size:90,solid:true},
      {asset:'writing_desk',x:10,y:5,size:100,solid:true},{asset:'bed',x:16,y:4,size:100,solid:true},
      {asset:'table',x:5,y:9,size:85,solid:true},{asset:'chair',x:5,y:11,size:64,solid:true},
      {asset:'candelabra',x:12,y:5,size:68,animated:true},{asset:'fireplace',x:16,y:9,size:100,animated:true,solid:true}
    ] },
  smithHouse: {name:'Vulcan’s Forge',subtitle:'Rest, restock, and find your strongest build',width:20,height:16,kind:'interior',spawn:[10,13],
    portals:[{x:9,y:14,w:2,h:1,to:'village',at:[31,14.5],label:'Return to village',color:'#ead39b'}],buildings:[],props:[
      {asset:'anvil',x:7,y:7,size:90,solid:true},{asset:'weapon_rack',x:3,y:3,size:105,solid:true},
      {asset:'armor_stand',x:16,y:4,size:90,solid:true},{asset:'crate_stack',x:4,y:10,size:85,solid:true},
      {asset:'fireplace',x:12,y:3,size:115,animated:true,solid:true},{asset:'barrel',x:16,y:10,size:76,solid:true}
    ] }
};

WORLD.forest.landmarks = [{x:8,y:7,kind:'crystal',label:'Waystone · Cavern northwest'}];
WORLD.cave.landmarks = [{x:8,y:11,kind:'crystal'},{x:20,y:14,kind:'crystal'},{x:14,y:4,kind:'crystal'}];
WORLD.volcano.landmarks = [{x:9,y:10,kind:'brazier'},{x:23,y:10,kind:'brazier'}];

const SUPPLY_CACHES = [{map:'village',x:18,y:20,bit:1},{map:'forest',x:22,y:14,bit:2},{map:'cave',x:13,y:18,bit:4}];

const entities = [
  { id:'elder',map:'elderHouse',x:10,y:7.8,type:'npc',name:'Elder Thales',emoji:'🧙‍♂️'},
  { id:'smith',map:'smithHouse',x:10,y:7.8,type:'npc',name:'Smith Vulcan',emoji:'🔨'},
  { id:'slime1',map:'forest',x:17,y:25,type:'monster',name:'Forest Slime',hp:120,maxHp:120,atk:8,xp:50,gold:10,respawnTimer:0 },
  { id:'slime2',map:'forest',x:27,y:19,type:'monster',name:'Forest Slime',hp:120,maxHp:120,atk:8,xp:50,gold:10,respawnTimer:0 },
  { id:'goblin1',map:'forest',x:11,y:16,type:'monster',name:'Forest Goblin',hp:160,maxHp:160,atk:12,xp:65,gold:16,respawnTimer:0 },
  { id:'goblin2',map:'forest',x:33,y:12,type:'monster',name:'Forest Goblin',hp:160,maxHp:160,atk:12,xp:65,gold:16,respawnTimer:0 },
  { id:'golem',map:'cave',x:14,y:8,type:'boss',name:'Stone Golem',hp:450,maxHp:450,atk:18,xp:150,gold:60,reqLevel:3 },
  { id:'dragon',map:'volcano',x:16,y:8,type:'dragon',name:'Ember Dragon',hp:900,maxHp:900,atk:28,xp:500,gold:200,reqLevel:5 }
];
entities.forEach(ent => {ent.originX=ent.x;ent.originY=ent.y;ent.moveTimer=0;ent.facing=-1;});

function currentMap() { return WORLD[gameState.mapId] || WORLD.village; }
function modalIsOpen() { return !!document.querySelector('.modal-overlay[style*="display: flex"]'); }
function getCastMember(id) {
  return castData.find(c=>c.id === id.replace(/\d+$/, '')) || {name:id,emoji:'?'};
}
function entityVisible(ent) {
  return ent.map === gameState.mapId && !(ent.respawnTimer > 0) &&
    !(ent.id==='golem' && gameState.golemDefeated) && !(ent.id==='dragon' && gameState.dragonDefeated);
}
function asset(path) {
  if (!images.has(path)) {
    const img = new Image();
    img.src = path;
    images.set(path,img);
  }
  return images.get(path);
}
function blit(context,path,x,y,w,h) {
  const img=asset(path);
  if (!img.complete || !img.naturalWidth) return false;
  context.drawImage(img,x,y,w,h);
  return true;
}
function drawStrip(context,path,frames,x,y,size,flip=false,fps=10,ground=0.8,loop=true,elapsed=worldClock) {
  const img=asset(path);
  if(!img.complete || !img.naturalWidth) return false;
  const fw=img.naturalWidth/frames, fh=img.naturalHeight;
  const index=loop ? Math.floor(elapsed*fps)%frames : Math.min(frames-1,Math.floor(elapsed*fps));
  const width=size*fw/fh;
  context.save();context.translate(x,y);if(flip)context.scale(-1,1);
  context.drawImage(img,index*fw,0,fw,fh,-width/2,-size*ground,width,size);
  context.restore();return true;
}

function drawCharacter(context,id,x,y,size,state='idle',flip=false,elapsed=worldClock) {
  let ok=false;
  if(id==='hero') {
    const action=state==='attack'?'hit':state==='hurt'?'hurt':state==='death'?'death':state==='walk'?'walk':'idle';
    const counts={idle:35,walk:51,hit:90,hurt:58,death:62};
    // Kiro's action strips use many frames: run them at their intended fast rate.
    ok=drawStrip(context,ART_ROOT+`kiro_2.0/spritesheets/spr_kiro2_0_${action}_strip${counts[action]}.png`,counts[action],x,y,size*1.55,flip,action==='idle'?24:60,0.77,!['hit','hurt','death'].includes(action),elapsed);
  } else if(id.startsWith('slime')) {
    const action=state==='walk'?'hop':['attack','hurt','death'].includes(state)?state:'idle';
    const count={idle:5,hop:9,attack:9,hurt:5,death:9}[action];
    ok=drawStrip(context,ART_ROOT+`slime_essentials_4_slimes_v1/assets/animations/blue_slime/blue_slime_${action}_64x64_${count}f.png`,count,x,y,size,flip,10,0.77,!['attack','hurt','death'].includes(action),elapsed);
  } else if(id==='dragon') {
    paintDragon(context,x,y,size,state,flip,elapsed);
    ok=true;
  } else if(id==='golem') {
    const action=state==='attack'?'slam':state;
    const count=action==='hurt'?4:8;
    ok=drawStrip(context,CREATURES+'Rune_Golem/crystal/'+action+'_sheet.png',count,x,y,size,flip,10,0.957,!['attack','hurt','death'].includes(state),elapsed);
  } else if(id.startsWith('goblin')||id==='elder'||id==='smith') {
    const sprite=id==='elder'?'sprWizard':id==='smith'?'sprLizardMonk1':'sprGoblin1';
    // The wizard sheet contains seven distinct poses; keep its standing pose.
    ok=drawStrip(context,ART_ROOT+'DebtsInTheDepthsAssets/DebtsInTheDepthsAssets/Characters/'+sprite+'.png',id==='elder'?7:4,x,y+(id==='elder'?Math.sin(worldClock*2):0),size,flip,id==='elder'?0:8,0.96,true,elapsed);
  }
  if(!ok) {
    if(id==='elder') SpriteKitchen.drawMage(context,x,y-size/2,size);
    else if(id==='smith') {
      SpriteKitchen.drawMage(context,x,y-size/2,size);
      blit(context,MEDIEVAL+'anvil.png',x-17,y-18,34,34);
    } else if(id.startsWith('slime')) SpriteKitchen.drawSlime(context,x,y-size/2,size,worldClock);
    else if(id.startsWith('goblin')) SpriteKitchen.drawGoblin(context,x,y-size/2,size,worldClock);
    else {context.fillStyle='#d3a45e';context.fillRect(x-10,y-28,20,28);}
  }
}

function terrainAt(map,x,y) {
  if(map.kind==='interior')return 'tile_floor_wood';
  if(map.kind==='cave')return 'tile_dungeon_floor';
  if(map.kind==='volcano')return 'tile_dirt';
  if(map.kind==='village')return Math.abs(x-22)<2 || (y>=14&&y<=16) || (y>=23&&y<=25) ? 'tile_cobble':'tile_grass';
  return Math.abs(x-22)<2 || y<6 || y>29 ? 'tile_dirt':'tile_grass';
}
function scenery(map) {
  if(map.scenery)return map.scenery;
  const list=[];
  if(map.kind==='forest') {
    for(let y=2;y<map.height-2;y+=2.5)for(let x=2;x<map.width-2;x+=2.6) {
      const noise=Math.sin(x*39.7+y*17.3)*4375.5;
      if(y<5||y>map.height-4||[-1,0,1].some(dx=>[-1,0,1].some(dy=>regionTile('forest',x+dx,y+dy)==='trail')))continue;
      if(noise-Math.floor(noise)>0.32) list.push({x,y,kind:'tree',radius:0.38});
    }
  }
  if(map.kind==='cave'||map.kind==='volcano') {
    for(let y=4;y<map.height-3;y+=4) {
      const inset=map.kind==='volcano'?5.7:3.5;
      list.push({x:inset,y,kind:'rock',radius:0.6},{x:map.width-inset-.5,y:y+1,kind:'rock',radius:0.6});
    }
  }
  map.scenery=list;return list;
}
function isSolidTile(x,y,map=currentMap()) {
  if(x<1||y<1||x>map.width-1||y>map.height-1)return true;
  if(['wall','lava'].includes(regionTile(map.kind,Math.floor(x),Math.floor(y))))return true;
  if(map.landmarks?.some(item=>Math.hypot(x-item.x,y-item.y)<.55))return true;
  if(map.kind==='interior' && (x<1.8||y<2.5||x>map.width-1.8||y>map.height-1))return true;
  if(map.buildings.some(b=>x>b.x-0.2&&x<b.x+b.w+0.2&&y>b.y&&y<b.y+b.h-0.2))return true;
  if(scenery(map).some(p=>Math.hypot(x-p.x,y-p.y)<p.radius+0.28))return true;
  if(map.kind==='village' && ((x<4||x>40) || (y<4 && Math.abs(x-22)>2) || (y>26 && Math.abs(x-21)>2)))return true;
  if(map.props.some(p=>p.solid && Math.abs(x-p.x)<0.65 && Math.abs(y-p.y)<0.5))return true;
  return false;
}
function canStand(x,y) {
  const r=0.23;
  return !isSolidTile(x-r,y-r)&&!isSolidTile(x+r,y-r)&&!isSolidTile(x-r,y+r)&&!isSolidTile(x+r,y+r)&&
    !entities.some(e=>entityVisible(e)&&Math.hypot(e.x-x,e.y-y)<0.67);
}
function clearMovement() {
  input.keys.clear();input.x=0;input.y=0;input.pointer=null;input.moving=false;
  const knob=document.getElementById('joystick-knob');if(knob)knob.style.transform='translate(-50%, -50%)';
}
function enterMap(id,x,y) {
  if(!WORLD[id])return;
  clearMovement();
  gameState.mapId=id;
  gameState.playerX=x??WORLD[id].spawn[0];gameState.playerY=y??WORLD[id].spawn[1];
  if(isSolidTile(gameState.playerX,gameState.playerY)) [gameState.playerX,gameState.playerY]=WORLD[id].spawn;
  portalCooldown=1;
  saveGame();updateLocation();checkProximityPrompt();renderMap();
}
function updateLocation() {
  document.getElementById('location-name').textContent=currentMap().name;
  document.getElementById('location-description').textContent=currentMap().subtitle;
}
function nearbyTarget() {
  const close=entities.filter(entityVisible).map(e=>({entity:e,d:Math.hypot(e.x-gameState.playerX,e.y-gameState.playerY)})).filter(e=>e.d<1.9).sort((a,b)=>a.d-b.d);
  if(close.length)return {entity:close[0].entity};
  const cache = SUPPLY_CACHES.find(item => item.map === gameState.mapId && !(gameState.supplies & item.bit) && Math.hypot(item.x-gameState.playerX,item.y-gameState.playerY)<1.8);
  if(cache)return {cache};
  const portal=currentMap().portals.find(p=>gameState.playerX>p.x-0.7&&gameState.playerX<p.x+p.w+0.7&&gameState.playerY>p.y-0.7&&gameState.playerY<p.y+p.h+0.7);
  return portal?{portal}:null;
}
function summitUnlocked() {
  return gameState.golemDefeated && gameState.level >= 5;
}
function portalLocked(portal) {
  return portal.gate === 'dragon' && !summitUnlocked();
}
function usePortal(portal) {
  if(portalLocked(portal)) {
    portalCooldown=1.5;return;
  }
  enterMap(portal.to,...portal.at);
}
function performInteraction() {
  if(modalIsOpen())return;
  const target=nearbyTarget();
  if(target?.entity)interactWithEntity(target.entity);
  else if(target?.portal)usePortal(target.portal);
  else if(target?.cache) {
    gameState.supplies |= target.cache.bit;
    gameState.potions += 1; gameState.gold += 15;
    saveGame(); updateUI();
    showGameNotice('Supply cache found · +1 potion · +15 gold');
  }
}
function checkProximityPrompt() {
  const target=nearbyTarget();
  const toast=document.getElementById('interact-toast');
  toast.style.display=target?'flex':'none';
  document.getElementById('toast-icon').textContent=target?.cache?'✦':target?.portal?'↗':target?.entity?.type==='npc'?'✦':'⚔';
  document.getElementById('toast-msg').textContent=target?.portal && portalLocked(target.portal)?'Summit locked · defeat the Golem and reach Level 5':target?.cache?'Open supply cache · potion + 15 gold':target?.portal?`Enter ${target.portal.label}`:target?.entity?`${target.entity.type==='npc'?'Talk to':'Fight'} ${getCastMember(target.entity.id).name}`:'';
  document.getElementById('d-action').hidden=!target;
  document.getElementById('d-action').textContent=target?.cache?'Open':target?.portal?'Enter':target?.entity?.type==='npc'?'Talk':'Action';
}
function interactWithEntity(ent) {
  if(modalIsOpen()||!entityVisible(ent))return;
  clearMovement();
  if(ent.id==='elder')openElderDialogue();
  else if(ent.id==='smith')openSmithDialogue();
  else {
    if(ent.id==='golem'&&gameState.level<3){showGameNotice('Reach Level 3 by training in Whispering Forest first.');return;}
    if(ent.id==='dragon'&&!summitUnlocked()){showGameNotice('Defeat the Stone Golem and reach Level 5 first.');return;}
    startBattle(ent);
  }
}
function tryMove(dx,dy,dt=1/60) {
  if(modalIsOpen())return false;
  const length=Math.hypot(dx,dy);
  if(length<=0.08)return false;
  const speed = input.keys.has('shift') ? 5.7 : 3.8;
  const scale = speed * dt / Math.max(1, length);
  let moved=false;
  const nx=gameState.playerX+dx*scale,ny=gameState.playerY+dy*scale;
  if(canStand(nx,gameState.playerY)){gameState.playerX=nx;moved=true;}
  if(canStand(gameState.playerX,ny)){gameState.playerY=ny;moved=true;}
  if(dx)input.facing=dx>0?1:-1;
  return moved;
}
function tickMonsterAI(dt=0) {
  if(devState.freezeAI||modalIsOpen())return;
  entities.forEach(e=>{
    if(!entityVisible(e)||e.type==='npc')return;
    e.moveTimer-=dt;
    if(e.moveTimer<=0){e.moveTimer=1.5+Math.random()*2;e.angle=Math.random()*Math.PI*2;}
    const speed=e.type==='monster'?0.45:0.18;
    const nx=e.x+Math.cos(e.angle||0)*speed*dt,ny=e.y+Math.sin(e.angle||0)*speed*dt;
    if(Math.hypot(nx-e.originX,ny-e.originY)>2.5){e.angle=(e.angle||0)+Math.PI;return;}
    if(!isSolidTile(nx,ny)&&Math.hypot(nx-gameState.playerX,ny-gameState.playerY)>1.2 &&
      !entities.some(other=>other!==e&&entityVisible(other)&&Math.hypot(nx-other.x,ny-other.y)<1)) {
      e.facing=nx>e.x?1:-1;e.x=nx;e.y=ny;
    }
  });
}
function updateWorld(dt) {
  worldClock+=dt;portalCooldown=Math.max(0,portalCooldown-dt);
  if(modalIsOpen()){input.moving=false;return;}
  const k=input.keys;
  const dx=input.x+(k.has('d')||k.has('arrowright')?1:0)-(k.has('a')||k.has('arrowleft')?1:0);
  const dy=input.y+(k.has('s')||k.has('arrowdown')?1:0)-(k.has('w')||k.has('arrowup')?1:0);
  input.moving=tryMove(dx,dy,dt);
  if(input.moving){movementSaveTimer+=dt;if(movementSaveTimer>1){saveGame();movementSaveTimer=0;}}
  tickMonsterAI(dt);checkProximityPrompt();
  if(portalCooldown===0) {
    const p=currentMap().portals.find(p=>gameState.playerX>p.x&&gameState.playerX<p.x+p.w&&gameState.playerY>p.y&&gameState.playerY<p.y+p.h);
    if(p)usePortal(p);
  }
}

function drawTree(x,y,scale=1) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.fillStyle='#0b1f20aa';ctx.beginPath();ctx.ellipse(0,1,22,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#513c2f';ctx.fillRect(-5,-30,10,32);ctx.fillStyle='#76503a';ctx.fillRect(-3,-30,3,30);
  const crown=[[-34,-30],[-39,-47],[-31,-54],[-30,-67],[-18,-71],[-12,-81],[8,-81],[15,-73],[27,-72],[35,-62],[35,-54],[43,-46],[39,-30],[30,-25],[15,-28],[9,-21],[-12,-23],[-19,-29]];
  polygon(ctx,'#203f33',crown);
  polygon(ctx,'#41643a',[[-34,-43],[-25,-58],[-21,-68],[-9,-68],[-5,-77],[8,-77],[15,-65],[28,-66],[31,-53],[37,-45],[29,-33],[13,-37],[4,-28],[-9,-31],[-17,-38],[-28,-34]]);
  polygon(ctx,'#63834a',[[-27,-52],[-15,-65],[-7,-62],[-1,-74],[8,-74],[14,-62],[27,-58],[23,-47],[9,-49],[3,-39],[-12,-42],[-17,-50]]);
  ctx.fillStyle='#8ba457';
  ctx.fillRect(-11,-65,8,3);ctx.fillRect(2,-69,6,4);ctx.fillRect(13,-56,8,3);
  ctx.restore();
}
function drawBuilding(b) {
  const x=b.x*TILE_SIZE,y=b.y*TILE_SIZE,w=b.w*TILE_SIZE,h=b.h*TILE_SIZE;
  ctx.fillStyle='#0c151c66';ctx.fillRect(x-6,y+22,w+22,h-14);
  ctx.fillStyle='#b1a58c';ctx.fillRect(x,y+40,w,h-40);
  for(let sy=y+44;sy<y+h;sy+=16){ctx.fillStyle='#6f706a';ctx.fillRect(x,sy,w,2);}
  ctx.fillStyle='#41362f';ctx.fillRect(x+7,y+45,8,h-45);ctx.fillRect(x+w-15,y+45,8,h-45);
  ctx.fillStyle=b.roof;ctx.beginPath();ctx.moveTo(x-12,y+52);ctx.lineTo(x+w/2,y-18);ctx.lineTo(x+w+12,y+52);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#211e2d';ctx.lineWidth=4;ctx.stroke();
  for(let row=0;row<4;row++){ctx.strokeStyle='#ffffff18';ctx.beginPath();ctx.moveTo(x+row*14,y+42-row*13);ctx.lineTo(x+w-row*14,y+42-row*13);ctx.stroke();}
  blit(ctx,MEDIEVAL+'door_arched.png',b.doorX*TILE_SIZE-28,y+h-60,56,64);
  blit(ctx,MEDIEVAL+'window_stained.png',x+26,y+70,42,42);
  blit(ctx,MEDIEVAL+'window_stained.png',x+w-68,y+70,42,42);
  ctx.textAlign='center';ctx.font='bold 10px monospace';ctx.fillStyle='#f6deb2';ctx.fillText(b.label,x+w/2,y+h+20);
}
function renderMap() {
  const map=currentMap(),w=canvas.width,h=canvas.height;
  ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,w,h);
  camera.x=Math.max(0,Math.min(map.width*TILE_SIZE-w,gameState.playerX*TILE_SIZE-w/2));
  camera.y=Math.max(0,Math.min(map.height*TILE_SIZE-h,gameState.playerY*TILE_SIZE-h/2));
  if(map.width*TILE_SIZE<w)camera.x=(map.width*TILE_SIZE-w)/2;
  if(map.height*TILE_SIZE<h)camera.y=(map.height*TILE_SIZE-h)/2;
  ctx.fillStyle=map.kind==='volcano'?'#261d28':'#101b20';ctx.fillRect(0,0,w,h);
  ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));
  const x0=Math.max(0,Math.floor(camera.x/TILE_SIZE)),y0=Math.max(0,Math.floor(camera.y/TILE_SIZE));
  for(let y=y0;y<Math.min(map.height,y0+Math.ceil(h/TILE_SIZE)+1);y++)for(let x=x0;x<Math.min(map.width,x0+Math.ceil(w/TILE_SIZE)+1);x++) {
    const regional = regionTile(map.kind,x,y);
    if(regional) paintRegionTile(ctx,regional,x*TILE_SIZE,y*TILE_SIZE,worldClock);
    else paintGround(ctx,map.kind,terrainAt(map,x,y)==='tile_cobble',x*TILE_SIZE,y*TILE_SIZE,TILE_SIZE);
    if((x===0||y===0||x===map.width-1||y===map.height-1)&&map.kind==='interior') {
      blit(ctx,(map.kind==='interior'?MEDIEVAL+'tile_wall':DUNGEON+'tile_dungeon_wall')+'.png',x*TILE_SIZE,y*TILE_SIZE,TILE_SIZE,TILE_SIZE);
    }
  }
  if(map.kind==='village') {
    blit(ctx, ART_ROOT+'emberbrook/village.png', 0, 0, map.width*TILE_SIZE, map.height*TILE_SIZE);
  }
  if(map.kind==='interior')blit(ctx,MEDIEVAL+'tile_carpet.png',8*TILE_SIZE,7*TILE_SIZE,4*TILE_SIZE,7*TILE_SIZE);
  const objects=[];
  (map.kind==='village'?[]:scenery(map)).forEach(p=>objects.push({y:p.y,draw:()=>{
    if(p.kind==='tree')drawTree(p.x*TILE_SIZE,p.y*TILE_SIZE,0.83+(Math.floor(p.x*7+p.y*13)%6)*.075);
    else blit(ctx,DUNGEON+'rubble_pile.png',p.x*TILE_SIZE-40,p.y*TILE_SIZE-55,80,70);
  }}));
  (map.kind==='village'?[]:map.buildings).forEach(b=>objects.push({y:b.y+b.h,draw:()=>drawBuilding(b)}));
  const props=map.kind==='village'?[]:[...map.props];
  for(const item of map.landmarks||[]) {
    objects.push({y:item.y,draw:()=>{
      paintLandmark(ctx,item);
      if(item.label) {
        ctx.fillStyle='#f4e4aa';ctx.textAlign='center';ctx.font='bold 11px monospace';
        ctx.fillText(item.label,item.x*TILE_SIZE,item.y*TILE_SIZE-48);
      }
    }});
  }
  props.forEach(p=>objects.push({y:p.y,draw:()=>blit(ctx,(p.dungeon?DUNGEON:MEDIEVAL)+p.asset+(p.animated?'_'+Math.floor(worldClock*7)%6:'')+'.png',p.x*TILE_SIZE-p.size/2,p.y*TILE_SIZE-p.size*0.95,p.size,p.size)}));
  SUPPLY_CACHES.filter(item=>item.map===gameState.mapId && !(gameState.supplies & item.bit)).forEach(item=>objects.push({y:item.y,draw:()=>{
    const x=item.x*TILE_SIZE,y=item.y*TILE_SIZE;
    ctx.fillStyle='#ddad54';ctx.fillRect(x-12,y-16,24,16);
    ctx.strokeStyle='#65472c';ctx.lineWidth=3;ctx.strokeRect(x-12,y-16,24,16);
    ctx.fillStyle='#fff2b3';ctx.fillRect(x-2,y-10,4,6);
    ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText('✦',x,y-23+Math.sin(worldClock*3)*3);
  }}));
  entities.filter(entityVisible).forEach(ent=>objects.push({y:ent.y,draw:()=>{
    const size=ent.id==='dragon'?155:ent.id==='golem'?120:ent.type==='npc'?50:60;
    const x=ent.x*TILE_SIZE,y=ent.y*TILE_SIZE;
    ctx.fillStyle='#07171766';ctx.beginPath();ctx.ellipse(x,y,ent.type==='npc'?13:20,7,0,0,Math.PI*2);ctx.fill();
    drawCharacter(ctx,ent.id,x,y,size,ent.type==='npc'?'idle':'walk',ent.facing<0);
    ctx.textAlign='center';ctx.font='bold 10px monospace';ctx.fillStyle=ent.type==='npc'?'#f1daa7':'#f2d5c3';ctx.fillText(getCastMember(ent.id).name,x,y-size*0.85-6);
  }}));
  objects.push({y:gameState.playerY,draw:()=>{
    const x=gameState.playerX*TILE_SIZE,y=gameState.playerY*TILE_SIZE;
    ctx.fillStyle='#07171766';ctx.beginPath();ctx.ellipse(x,y,13,6,0,0,Math.PI*2);ctx.fill();
    drawCharacter(ctx,'hero',x,y,48,input.moving?'walk':'idle',input.facing<0);
  }});
  objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
  map.portals.forEach(p=>{
    const x=(p.x+p.w/2)*TILE_SIZE,y=(p.y+p.h/2)*TILE_SIZE;
    ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y,4+Math.sin(worldClock*3),0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#101c28dd';const labelWidth=p.label.length*6+16;ctx.fillRect(x-labelWidth/2,y-37,labelWidth,21);
    ctx.fillStyle=p.color;ctx.textAlign='center';ctx.font='10px monospace';ctx.fillText(p.label,x,y-23);
  });
  // Ambient motes give the outdoor regions gentle motion.
  for(let i=0;i<15;i++) {
    const x=(i*139+Math.sin(worldClock*0.5+i)*18)%(map.width*TILE_SIZE),y=(i*83+worldClock*8)%(map.height*TILE_SIZE);
    ctx.fillStyle=map.kind==='volcano'?'#ffb16a99':'#e6dca844';ctx.fillRect(x,y,2,2);
  }
  ctx.restore();

}
function initWorld() {
  if(gameState.worldVersion!==3||!WORLD[gameState.mapId]) {
    gameState.worldVersion=3;gameState.mapId='village';[gameState.playerX,gameState.playerY]=WORLD.village.spawn;
  }
  if(!Number.isFinite(gameState.playerX)||!Number.isFinite(gameState.playerY)||!canStand(gameState.playerX,gameState.playerY)) {
    [gameState.playerX,gameState.playerY]=currentMap().spawn;
  }
  updateLocation();
  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    const scale = Math.min(width / 320, Math.max(1, height / 480, width / 850));
    canvas.width = Math.round(width / scale);
    canvas.height = Math.round(height / scale);
    renderMap();
  }
  resizeCanvas();
  if (typeof ResizeObserver !== 'undefined') {
    const hud = document.querySelector('.top-bar');
    const quest = document.querySelector('.quest-banner');
    new ResizeObserver(() => { quest.style.top = (hud.offsetTop + hud.offsetHeight + 10) + 'px'; }).observe(hud);
  }
  window.addEventListener('resize',()=>{clearMovement();resizeCanvas();});
  document.addEventListener('pointerdown',e=>{ if(e.pointerType) document.body.dataset.input=e.pointerType; });
  window.addEventListener('keydown',e=>{
    if(e.target.closest('input, textarea, select, [contenteditable="true"]'))return;
    const key=e.key.toLowerCase();
    if(document.body.dataset) document.body.dataset.input='keyboard';
    if(key==='m'&&!e.repeat){toggleRegionMap();return;}
    if((key===' '||key==='enter')&&e.target.closest('button'))return;
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
    if(modalIsOpen())return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key))input.keys.add(key);
    if((key===' '||key==='e')&&!e.repeat)performInteraction();
  });
  window.addEventListener('keyup',e=>input.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{clearMovement();saveGame();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearMovement();saveGame();}});
  const action = document.getElementById('d-action');
  action.addEventListener('click', event => {
    if (!(event?.pointerType === 'touch' && event.isPrimary === false)) performInteraction();
  });
  action.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !event.isPrimary) {
      event.preventDefault();
      performInteraction();
    }
  });
  document.getElementById('interact-toast').addEventListener('click',performInteraction);
  const stick=document.getElementById('joystick');
  function movePointer(e) {
    if(input.pointer!==e.pointerId)return;
    const rect=stick.getBoundingClientRect(),radius=rect.width*0.32;
    let x=e.clientX-rect.left-rect.width/2,y=e.clientY-rect.top-rect.height/2;
    const len=Math.hypot(x,y);if(len>radius){x=x/len*radius;y=y/len*radius;}
    input.x=x/radius;input.y=y/radius;
    document.getElementById('joystick-knob').style.transform=`translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }
  stick.addEventListener('pointerdown',e=>{if(modalIsOpen()||input.pointer!==null)return;e.preventDefault();input.pointer=e.pointerId;stick.setPointerCapture(e.pointerId);movePointer(e);});
  stick.addEventListener('pointermove',movePointer);
  ['pointerup','pointercancel','lostpointercapture'].forEach(event=>stick.addEventListener(event,e=>{if(input.pointer===e.pointerId)clearMovement();}));
  // Preload the current region's key art, then other sheets load on demand.
  ['tile_grass','tile_cobble','door_arched','window_stained','well','market_stall'].forEach(key=>asset(MEDIEVAL+key+'.png'));
  asset(ART_ROOT+'kiro_2.0/spritesheets/spr_kiro2_0_idle_strip35.png');
}

function gameLoop(now=performance.now()) {
  const dt=lastWorldFrame===null?0:Math.min(0.05,Math.max(0,(now-lastWorldFrame)/1000));
  lastWorldFrame=now;updateWorld(dt);renderMap();renderBattleScene();requestAnimationFrame(gameLoop);
}
