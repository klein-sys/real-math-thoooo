// Optional offline canvas previews. Set CANVAS_MODULE to @napi-rs/canvas's path.
// This renders the actual world/battle drawing code; it is not a browser layout test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,Image:NativeImage}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const elements=new Map(),pending=[];
function element(id='') {
  const el={id,style:{},listeners:{},dataset:{},textContent:'',innerHTML:'',hidden:false,
    addEventListener(event,fn){this.listeners[event]=fn;},appendChild(){},setAttribute(){},getAttribute(){return '';}};
  if(['gameCanvas','forgeCanvas','battle-scene'].includes(id)) {
    const surface=createCanvas(id==='gameCanvas'?960:id==='battle-scene'?720:600,id==='gameCanvas'?640:id==='battle-scene'?280:180);
    Object.defineProperties(el,{width:{get:()=>surface.width,set:v=>surface.width=v},height:{get:()=>surface.height,set:v=>surface.height=v}});
    el.getContext=()=>surface.getContext('2d');el.surface=surface;
  }
  return el;
}
for(const match of html.matchAll(/\bid="([^"]+)"/g))elements.set(match[1],element(match[1]));
const document={getElementById:id=>elements.get(id),createElement:()=>{const surface=createCanvas(32,32);return surface;},
  body:{appendChild(){}},addEventListener(){},querySelector:()=>[...elements.values()].find(e=>e.id.startsWith('modal-')&&e.style.display==='flex'),
  querySelectorAll:s=>s==='.modal-overlay'?[...elements.values()].filter(e=>e.id.startsWith('modal-')):[]};
class LocalImage extends NativeImage {
  set src(value) {
    const file=path.join(root,value);
    if(fs.existsSync(file)) {
      // decode() resolves native image loading before the final render pass.
      super.src=fs.readFileSync(file);
      pending.push(this.decode());
    }
  }
}
const context={document,Image:LocalImage,console,performance:{now:()=>1000},window:{innerWidth:1200,addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},
  setTimeout(){},setInterval(){},clearInterval(){},requestAnimationFrame(){},cancelAnimationFrame(){},alert(){}};
vm.createContext(context);
for(const name of ['world.js','combat.js','art-direction.js','game.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context);
const run=code=>vm.runInContext(code,context);
(async()=>{
  const output=path.join(root,'previews');fs.mkdirSync(output,{recursive:true});
  for(const map of ['village','forest','elderHouse','smithHouse','cave','volcano']) {
    run(`enterMap('${map}');`);
    await Promise.all(pending);run('renderMap();');
    await Promise.all(pending);run('renderMap();');
    fs.writeFileSync(path.join(output,map+'.png'),elements.get('gameCanvas').surface.toBuffer('image/png'));
  }
  run("enterMap('volcano');startBattle(entities[7]);renderBattleScene();");
  await Promise.all(pending);run('renderBattleScene();');
  fs.writeFileSync(path.join(output,'battle.png'),elements.get('battle-scene').surface.toBuffer('image/png'));
  console.log('Rendered six regions and the battle scene to previews/.');
})().catch(err=>{console.error(err);process.exitCode=1;});
