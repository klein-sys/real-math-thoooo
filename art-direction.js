/* Shared palette and pixel details for the world and battle arenas. */
function paintGround(context, kind, path, x, y, size) {
  const colors = kind === 'volcano' ? ['#493038','#694142'] :
    kind === 'cave' ? ['#303a4c','#47536a'] :
    kind === 'interior' ? ['#6c4835','#8a6043'] :
    path ? ['#a6794d','#bf925c'] : ['#536c37','#718c46'];
  const noise = (Math.imul(x + 37, 1597334677) ^ Math.imul(y + 71, 3812015801)) >>> 0;
  context.fillStyle = colors[0];
  context.fillRect(x, y, size, size);
  context.fillStyle = colors[1];
  context.fillRect(x + noise % (size - 4), y + (noise >>> 8) % (size - 4), 4, 2);
  context.fillRect(x + (noise >>> 16) % (size - 3), y + (noise >>> 24) % (size - 3), 2, 2);
  if (kind === 'interior') context.fillRect(x, y + size - 2, size, 1);
}

/* Terrain and collision share these tile classifications. */
function regionTile(kind, x, y) {
  if (kind === 'forest') {
    const trunk = 22 + Math.sin((y - 10) / 5) * 2;
    const fork = y <= 18 && Math.abs(y - (3 + (x - 4.5) * .75)) < 1.5 && x < 24;
    const summit = y <= 17 && Math.abs(y - (3 + (39 - x) * .68)) < 1.5 && x > 20;
    return Math.abs(x - trunk) < 2 || fork || summit || y >= 29 && Math.abs(x - 21) < 3 ? 'trail' : 'moss';
  }
  if (kind === 'cave') {
    if (x < 2 || x > 25 || y < 2 || y > 24 && (x < 12 || x > 15)) return 'wall';
    return x >= 11 && x <= 16 || y >= 5 && y <= 12 ? 'pavers' : 'stone';
  }
  if (kind === 'volcano') {
    if (x < 2 || x > 29 || y < 2) return 'wall';
    if (y > 4 && y < 24 && (x < 5 || x > 26)) return 'lava';
    return Math.hypot((x - 16) * .82, y - 9) < 6.1 ? 'arena' : 'basalt';
  }
  return null;
}

const REGION_PALETTES = {
  trail:['#a77744','#be9057','#835936'], moss:['#385736','#547645','#29432d'],
  wall:['#232737','#454454','#171a25'], stone:['#353748','#505267','#292b39'],
  pavers:['#41465a','#62697e','#303344'], basalt:['#392e36','#55404a','#261f2c'],
  arena:['#55404a','#835455','#3d2d38'], lava:['#bf4829','#f1843f','#662c2f']
};

function paintRegionTile(context, tile, x, y, clock) {
  const [base, light, shade] = REGION_PALETTES[tile];
  const seed = (Math.imul(x + 17, 1597334677) ^ Math.imul(y + 41, 3812015801)) >>> 0;
  context.fillStyle = base;
  context.fillRect(x,y,32,32);
  context.fillStyle = shade;
  if (tile === 'pavers' || tile === 'wall' || tile === 'arena') {
    context.fillRect(x,y+29,32,3);
    context.fillRect(x+((y/32)%2 ? 16 : 0),y,2,30);
  }
  context.fillRect(x+seed%24,y+(seed>>>8)%25,6,2);
  context.fillStyle = light;
  context.fillRect(x+(seed>>>16)%22,y+(seed>>>24)%23,tile==='lava'?12:5,2);
  if (tile === 'lava') context.fillRect(x+((Math.floor(clock*8)+seed)%20),y+22,9,2);
  if (tile === 'moss' && seed%4===0) {
    context.fillStyle='#6f8b4e';
    context.fillRect(x+7,y+14,2,5);context.fillRect(x+10,y+12,2,6);context.fillRect(x+13,y+15,2,4);
  }
  if (tile === 'moss' && seed%11===0) {
    context.fillStyle = seed%2 ? '#e6c471' : '#b68b9c';
    context.fillRect(x+9,y+10,3,3);
    context.fillRect(x+15,y+16,3,3);
  }
}

function paintLandmark(context, item) {
  const x=item.x*32,y=item.y*32;
  context.save();
  context.translate(x,y);
  const flame=item.kind==='brazier';
  const glow=context.createRadialGradient(0,-8,2,0,-8,58);
  glow.addColorStop(0,flame?'#ff94365c':'#80ddcb45');
  glow.addColorStop(1,'#00000000');
  context.fillStyle=glow;
  context.fillRect(-58,-66,116,116);
  if (flame) {
    context.fillStyle='#2e2430';context.fillRect(-15,-12,30,13);
    context.fillStyle='#95716a';context.fillRect(-18,-16,36,5);
    context.fillStyle='#ff8139';context.fillRect(-9,-25,18,9);
    context.fillStyle='#ffd46b';context.fillRect(-4,-30,8,12);
  } else {
    for(const [dx,height] of [[-14,23],[0,39],[13,29]]) {
      polygon(context,'#264e59',[[dx-8,0],[dx-8,-height+8],[dx,-height],[dx+7,-height+7],[dx+7,0]]);
      polygon(context,'#70c6bb',[[dx,-height],[dx+7,-height+7],[dx+4,-4],[dx,-9]]);
    }
  }
  context.restore();
}

function polygon(context, color, points) {
  context.fillStyle=color;
  context.beginPath();
  points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));
  context.closePath();
  context.fill();
}

/* The dragon's original shapes are animated at the same scale in both views. */
function paintDragon(context,x,y,size,state,flip,elapsed) {
  const dead=state==='death';
  const beat=dead ? 0 : Math.round(Math.sin(elapsed*6)*3);
  context.save();
  context.translate(x,y);
  context.scale((flip?-1:1)*size/104,size/104);
  if(dead){context.globalAlpha=Math.max(.2,1-elapsed*.45);context.scale(1,.4);}
  const hide=state==='hurt'?'#f6b17a':'#ba6345';
  polygon(context,'#522e39',[[-44,-21],[-29,-28],[-11,-26],[-18,-14],[-37,-15],[-48,-8],[-50,-12]]);
  polygon(context,'#42263a',[[-20,-30],[-46,-48+beat],[-37,-65+beat],[-15,-52],[4,-37],[18,-45],[40,-62+beat],[48,-47+beat],[42,-28],[29,-36],[14,-26]]);
  polygon(context,'#d18e65',[[-19,-34],[-40,-49+beat],[-35,-58+beat],[-15,-46],[-6,-36]]);
  polygon(context,'#d18e65',[[15,-38],[38,-55+beat],[43,-46+beat],[40,-34],[29,-42]]);
  polygon(context,'#43293a',[[-25,-20],[-22,-34],[-8,-43],[8,-43],[25,-50],[40,-46],[46,-32],[51,-29],[49,-18],[33,-13],[17,-17],[12,-5],[0,-3],[-4,-12],[-14,-5],[-24,-7]]);
  polygon(context,hide,[[-20,-22],[-17,-33],[-7,-39],[10,-38],[25,-46],[38,-43],[42,-31],[48,-26],[45,-21],[31,-17],[15,-22],[8,-9],[2,-8],[-3,-18],[-16,-9],[-20,-11]]);
  polygon(context,'#ebae77',[[-8,-25],[10,-30],[23,-35],[33,-31],[30,-23],[15,-22],[7,-13],[2,-13]]);
  polygon(context,'#f3d8a3',[[22,-43],[18,-55],[26,-50],[30,-44]]);
  polygon(context,'#f3d8a3',[[33,-44],[35,-54],[39,-44]]);
  context.fillStyle='#291f31';context.fillRect(35,-35,6,5);
  context.fillStyle='#ffe780';context.fillRect(37,-35,3,3);
  context.fillStyle='#8f483f';
  for (const [dx,dy] of [[-15,-28],[-9,-31],[-4,-34],[0,-29],[7,-34],[15,-35],[24,-39],[30,-41]]) {
    context.fillRect(dx,dy,4,2);
  }
  context.fillStyle='#f4d092';
  for (const [dx,dy] of [[-19,-9],[-15,-8],[2,-8],[7,-8],[42,-22]]) context.fillRect(dx,dy,3,2);
  if(state==='attack') {
    polygon(context,'#e06a3f',[[47,-25],[65,-32+beat],[75,-23],[65,-17],[49,-21]]);
    polygon(context,'#ffda77',[[49,-25],[65,-26],[69,-22],[51,-21]]);
  }
  context.restore();
}

function paintBattleArena(context, kind, width, height, clock) {
  const cave = kind === 'cave';
  const summit = kind === 'volcano';
  context.fillStyle = cave ? '#192331' : summit ? '#34242f' : '#253e38';
  context.fillRect(0,0,width,height);
  for(let i=0;i<9;i++) {
    const x=i*92-12;
    const top=46+(i*21)%52;
    if(cave || summit) {
      polygon(context,cave?'#394356':'#563740',[[x-26,187],[x+14,top+29],[x+35,top],[x+53,top+10],[x+85,top+65],[x+104,187]]);
      polygon(context,cave?'#303a4b':'#462c38',[[x+35,top],[x+53,top+10],[x+85,top+65],[x+104,187],[x+59,187]]);
    } else {
      context.fillStyle='#22382c';
      context.fillRect(x+39,top+40,12,180-top);
      polygon(context,'#355744',[[x,top+61],[x+8,top+36],[x+26,top+27],[x+32,top],[x+55,top],[x+63,top+20],[x+84,top+30],[x+95,top+59],[x+72,top+80],[x+17,top+80]]);
    }
  }
  const ground=cave?'pavers':summit?'arena':'trail';
  for(let x=0;x<width;x+=32)for(let y=184;y<height;y+=32) {
    paintRegionTile(context,ground,x,y,clock);
  }
  if(cave || summit) {
    paintLandmark(context,{x:1.8,y:5.8,kind:summit?'brazier':'crystal'});
    paintLandmark(context,{x:20.7,y:5.8,kind:summit?'brazier':'crystal'});
  }
}
