'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const context={window:{},console,Math,Date,Map,Set,Intl,localStorage:{getItem:()=>null,setItem:()=>{}}};vm.createContext(context);for(const name of ['config','core'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/'+name+'.js'),'utf8'),context);
const S=context.window.SA,tests=[];function test(name,fn){try{fn();tests.push({name,pass:true});console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;tests.push({name,pass:false,error:e.message});}}
const cfg=over=>Object.assign(S.clone(S.defaults),{aiEnabled:false,particles:0,foodCount:200,foodRate:0},over);
function world(over){const w=new S.World(cfg(over),1234);w.demo=false;return w;}
test('Grid reuses buckets, clears stale members and supports negative coordinates',()=>{const g=new S.Grid(90),a={x:-15,y:30},b={x:95,y:30};g.add(a);g.add(b);const out=[],bucket=g.cells.get(-1);g.near(-15,30,20,out);assert.ok(out.includes(a));assert.ok(!out.includes(b));g.clear();assert.equal(g.near(-15,30,20,out).length,0);g.add(a);assert.equal(g.cells.get(-1),bucket);assert.equal(g.near(-15,30,20,out),out);assert.equal(out.length,1);});
test('Body collision sample pool and snake point buffers reuse storage safely',()=>{const w=world({collision:'safe',foodCount:200}),s=w.player,pts=s.points();w.reindex();const sample=s._bodySamples[0];s.advance(1/60,w.cfg);assert.equal(s.points(),pts);w.reindex();assert.equal(s._bodySamples[0],sample);assert.equal(sample.x,s.x);assert.ok(s.bounds.minX<=s.x&&s.bounds.maxX>=s.x);});
test('Sanitize imports, numeric clamps, unsafe background, unknown properties',()=>{const c=S.sanitize({speed:Infinity,aiCount:1e9,glow:-5,primary:'javascript:x',background:'http://external',__proto__:{danger:1}});assert.equal(c.speed,145);assert.equal(c.aiCount,36);assert.equal(c.glow,0);assert.equal(c.primary,S.defaults.primary);assert.equal(c.background,'');assert.equal(c.danger,undefined);});
test('Lower default food count migrates only the previous default and keeps other preferences',()=>{
  const get=context.localStorage.getItem,set=context.localStorage.setItem;let stored=JSON.stringify({foodCount:1700,skin:'italy'});
  try{context.localStorage.getItem=()=>stored;context.localStorage.setItem=(_,value)=>{stored=value;};const c=S.storage.settings();assert.equal(c.foodCount,700);assert.equal(c.skin,'italy');assert.equal(JSON.parse(stored).foodCount,700);
    stored=JSON.stringify({foodCount:900,skin:'spain'});const custom=S.storage.settings();assert.equal(custom.foodCount,900);assert.equal(custom.skin,'spain');
  }finally{context.localStorage.getItem=get;context.localStorage.setItem=set;}
});
test('Food pickup sound is enabled once for existing installs but a later opt-out persists',()=>{
  const get=context.localStorage.getItem,set=context.localStorage.setItem,data=new Map([['serpent.settings',JSON.stringify({...S.defaults,sound:false})]]);
  try{
    context.localStorage.getItem=key=>data.get(key)??null;
    context.localStorage.setItem=(key,value)=>data.set(key,value);
    assert.equal(S.storage.settings().sound,true);
    data.set('serpent.settings',JSON.stringify({...S.defaults,sound:false}));
    assert.equal(S.storage.settings().sound,false);
  }finally{context.localStorage.getItem=get;context.localStorage.setItem=set;}
});
test('All configurable defaults have schema or asset metadata',()=>{for(const k of Object.keys(S.defaults))assert.ok(S.schema.some(s=>s[0]===k)||['background','backgroundName'].includes(k),k);});
test('Pickup sound presets and flag offset sanitize to supported options and range',()=>{assert.deepEqual(Array.from(S.schema.find(v=>v[0]==='pickupSound')[3]),['soft','crystal','bubble','spark','pluck']);assert.equal(S.sanitize({pickupSound:'unknown',flagOffset:500}).pickupSound,S.defaults.pickupSound);assert.equal(S.sanitize({flagOffset:500}).flagOffset,180);assert.equal(S.sanitize({flagOffset:-20}).flagOffset,0);});
test('Fixed movement and turn-rate bound',()=>{const w=world({collision:'safe'}),s=w.player;s.velocity=145;s.desired=s.angle+Math.PI;const a=s.angle,x=s.x,y=s.y;s.advance(1/60,w.cfg);assert.ok(Math.abs(S.angleDiff(s.angle,a))<=w.cfg.turnRate/60+1e-8);assert.ok(Math.abs(Math.hypot(s.x-x,s.y-y)-145/60)<1e-8);});
test('Head history follows exact path with no stretching',()=>{const w=world({collision:'safe'}),s=w.player;s.trail=[];s.length=700;s.velocity=145;s.lastSample={x:s.x,y:s.y};for(let i=0;i<600;i++){s.desired=Math.sin(i/80)*1.7;s.advance(1/60,w.cfg);}assert.ok(s.trail.length>100);for(let i=1;i<s.trail.length;i++)assert.ok(Math.abs(Math.hypot(s.trail[i].x-s.trail[i-1].x,s.trail[i].y-s.trail[i-1].y)-5)<1e-6);});
test('Collection grows score and body once only',()=>{const w=world(),p=w.player,score=p.score,len=p.length;w.addFood(p.x,p.y,1);const f=w.food.at(-1);w.collect(p,f);w.collect(p,f);assert.equal(p.score,score+f.value);assert.equal(p.length,len+w.cfg.growth*f.size);assert.equal(p.collected,1);assert.equal(f.alive,false);});
test('Collection increases width as well as length',()=>{
  const w=world({widthGrowth:.02}),p=w.player,w0=p.widthFactor,r0=p.radius,l0=p.length;
  w.addFood(p.x,p.y,2);w.collect(p,w.food.at(-1));
  assert.ok(p.length>l0&&p.widthFactor>w0&&p.radius>r0,'Food did not make the player visibly thicker');
});
test('World update collects food by proximity',()=>{const w=world(),p=w.player;w.food=[];w.addFood(p.x,p.y,1);w.update(1/60,{angle:p.angle});assert.equal(p.collected,1);});
test('Maximum length is respected',()=>{const w=world({maxLength:1000});w.player.length=999;w.addFood(w.player.x,w.player.y,2);w.collect(w.player,w.food.at(-1));assert.equal(w.player.length,1000);});
test('Boost accelerates and spends score/length',()=>{const w=world({collision:'safe'}),p=w.player;w.food=[];const initial=p.score;for(let i=0;i<100;i++)w.update(1/60,{angle:p.angle,boost:true});assert.ok(p.velocity>w.cfg.speed);assert.ok(p.score<initial);assert.ok(p.length<w.cfg.initialLength);});
test('Low-balance boost remains available and uses the configured reduced cost',()=>{
  const make=score=>{const w=world({collision:'safe',initialScore:score,boostMinScore:1,boostLowBalanceCost:.2});w.food=[];const p=w.player;p.score=score;p.velocity=w.cfg.speed;w.update(.1,{angle:p.angle,boost:true});return {w,p};};
  const low=make(40),high=make(1200);
  assert.ok(low.p.velocity>low.w.cfg.speed,'Low-balance player did not accelerate');
  assert.equal(low.p.score,40-0.1*80*.2);
  assert.equal(high.p.score,1200-0.1*80);
});
test('Death loot is a compact gold cluster with bounded object count',()=>{
  const w=world({aiEnabled:true,aiCount:1,aiMin:0,foodValue:10});const victim=w.snakes.find(s=>!s.player);w.food=[];
  victim.length=4200;victim.score=20000;victim.x=1200;victim.y=1300;
  w.kill(victim);
  const loot=w.food;
  assert.ok(loot.length>=48&&loot.length<=480);
  assert.ok(loot.every(f=>f.dropped),'Death loot must use the gold visual');
  assert.ok(Math.max(...loot.map(f=>f.x))-Math.min(...loot.map(f=>f.x))>300||Math.max(...loot.map(f=>f.y))-Math.min(...loot.map(f=>f.y))>300,'Loot is still a compact cluster');
  assert.ok(loot.reduce((sum,f)=>sum+f.value,0)>=victim.score*.65,'Trail lost too much of the victim reward');
});
test('Ground food mixes mostly gold with a small red minority',()=>{
  const w=world({foodCount:700});const ground=w.food.filter(f=>!f.dropped);
  const gold=ground.filter(f=>f.gold).length,red=ground.filter(f=>!f.gold).length;
  assert.ok(gold>0&&red>0,'Both ground food colors should spawn');
  assert.ok(red<ground.length*.12,`Too many red objects: ${red}/${ground.length}`);
  assert.ok(ground.every(f=>Number.isFinite(f.rewardScale)),'Ground gold must remain regular collectible food');
});
test('Food can mark rare ground gold separately from dropped loot',()=>{
  const w=world();w.food=[];
  w.addFood(200,200,1);w.addFood(250,250,1,false,true);w.addFood(300,300,1,true);
  assert.equal(w.food[0].dropped,false);
  assert.equal(w.food[0].gold,false);
  assert.equal(w.food[1].gold,true);
  assert.equal(w.food[1].dropped,false);
  assert.equal(w.food[2].dropped,true);
});
test('Player collection emits pickup event and a food-to-head animation',()=>{
  const w=world(),p=w.player;w.food=[];
  w.addFood(p.x-20,p.y,1,false,true);const item=w.food.at(-1);let heard=null;w.onEat=food=>{heard=food;};
  w.collect(p,item);
  assert.equal(heard,item);
  const effect=w.effects.find(e=>e.type==='eat');
  assert.ok(effect,'Missing pickup animation');
  assert.equal(effect.x,item.x);assert.equal(effect.y,item.y);
  assert.equal(effect.tx,p.x);assert.equal(effect.ty,p.y);
  assert.equal(effect.gold,true);
  assert.equal(effect.duration,.18);
});
test('AI actively moves, seeks food, and consumes it',()=>{const w=world({aiEnabled:true,aiCount:4,aiMin:0,aiMax:5,collision:'safe'});w.food=[];const s=w.snakes[1],x=s.x,y=s.y;w.addFood(x,y,1);for(let i=0;i<180;i++)w.update(1/60,{angle:w.player.angle});assert.ok(Math.hypot(s.x-x,s.y-y)>50);assert.ok(s.collected>=1);assert.equal(w.snakes.length,5);});
test('AI disabled removes all opponents',()=>{const w=world({aiEnabled:true,aiCount:4,aiMin:0});w.cfg.aiEnabled=false;w.sync();assert.equal(w.snakes.length,1);});
test('AI target min/max and respawn delay',()=>{const w=world({aiEnabled:true,aiCount:0,aiMin:2,aiMax:3,respawn:1,collision:'safe'});assert.equal(w.snakes.length,3);w.kill(w.snakes[1],null);for(let i=0;i<70;i++)w.update(1/60,{});assert.equal(w.snakes.filter(s=>s.alive&&!s.player).length,2);});
test('Death drops collectible gold and reports loss once',()=>{const w=world(),p=w.player;let events=0;w.onEnd=win=>{assert.equal(win,false);events++;};const n=w.food.length;w.kill(p,null);w.kill(p,null);assert.ok(w.food.length>n);assert.equal(events,1);assert.equal(p.alive,false);});
test('Ground colors stay separate from reduced death loot',()=>{
  assert.equal(S.defaults.foodCount,700);
  const w=world({initialLength:700,foodCount:200,aiEnabled:true,aiCount:1,aiMin:0});
  assert.ok(w.food.filter(f=>f.alive).every(f=>!f.dropped),'Starting/ambient food should not count as death loot');
  assert.ok(w.food.some(f=>f.alive&&f.gold),'Starting gold food missing');
  const regular=w.food.find(f=>f.alive);assert.equal(regular.dropped,false);
  const victim=w.snakes[1],length=victim.length,oldGoldCount=Math.ceil(length/10);
  const before=w.food.length;w.kill(victim);const loot=w.food.slice(before);
  assert.ok(loot.length>=48&&loot.length<=480,`Unexpected death trail size: ${loot.length}`);
  assert.ok(loot.every(f=>f.dropped&&f.rewardScale===null),'Death loot should retain gold-drop classification');
  assert.ok(loot.reduce((sum,f)=>sum+f.value,0)>=victim.score*.5,'Reduced drops lost too much total reward');
  assert.ok(loot.length>oldGoldCount*.9,'Death loot trail should preserve a long sequence of drops');
  const tail=victim.trail.at(-1);if(tail){w.addFood(tail.x,tail.y,.65,true);assert.equal(w.food.at(-1).dropped,true);}
});
test('Head-to-body collision kills and credits opponent',()=>{const w=world({aiEnabled:true,aiCount:1,aiMin:0,collision:'classic'});const p=w.player,b=w.snakes[1];w.time=5;p.spawnTime=b.spawnTime=0;p.velocity=0;p.x=1000;p.y=1000;p.trail=[{x:990,y:1000},{x:980,y:1000}];p.lastSample={x:1000,y:1000};b.x=1200;b.y=1000;b.trail=[];for(let x=1195;x>800;x-=5)b.trail.push({x,y:1000});b.lastSample={x:b.x,y:b.y};w.update(1/60,{});assert.equal(p.alive,false);assert.equal(b.kills,1);});
test('Boundary death and safe mode',()=>{for(const collision of ['classic','safe']){const w=world({collision});w.player.x=1;w.player.y=100;w.update(1/60,{});assert.equal(w.player.alive,collision==='safe');}});
test('Goal continues playing; boundary ends once and reset works',()=>{const w=world({goal:3001,collision:'classic'});let n=0;w.onEnd=()=>n++;w.addFood(w.player.x,w.player.y,1);w.update(1/60,{});w.update(1/60,{});assert.equal(n,0);assert.ok(w.player.alive);assert.ok(w.player.score>w.cfg.goal);w.player.x=-10;w.player.y=100;w.update(1/60,{});w.update(1/60,{});assert.equal(n,1);assert.equal(w.player.alive,false);w.reset();assert.equal(w.goalReached,false);assert.equal(w.player.score,3000);assert.equal(w.player.collected,0);});
test('Frame independence for 60 Hz fixed simulation',()=>{function simulate(frame){const w=world({collision:'safe'});w.food=[];let acc=0;for(let t=0;t<10-1e-6;t+=frame){acc+=frame;while(acc>=1/60-1e-9){w.update(1/60,{angle:-.65});acc-=1/60;}}return w.player;}const a=simulate(1/30),b=simulate(1/120);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001);});
test('Normal gameplay stability / 20 seconds / finite state',()=>{const w=new S.World(S.clone(S.defaults),321);w.demo=false;w.cfg.collision='safe';const t=performance.now();for(let i=0;i<1200;i++)w.update(1/60,{angle:Math.sin(i/120)});const ms=performance.now()-t;for(const s of w.snakes){assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.score));assert.ok(s.trail.length<1700);}assert.ok(w.food.length<8501);console.log('Simulation avg', (ms/1200).toFixed(2),'ms/step');});
test('AI never uses country flags at spawn, sync, reset or respawn',()=>{
  const allowed=new Set(S.botSkins);
  const w=world({skin:'venezuela',aiEnabled:true,aiCount:24,aiMin:0,aiMax:24,collision:'safe',respawn:1});
  for(let i=0;i<500;i++)assert.ok(allowed.has(w.randomSkin()));
  assert.equal(w.player.skin,'venezuela');
  w.snakes[1].preferredSkin='argentina';w.snakes[1].skin='brazil';w.sync();
  for(const variety of [false,true]){w.cfg.variety=variety;w.sync();assert.ok(w.snakes.filter(s=>!s.player).every(s=>allowed.has(s.skin)&&allowed.has(s.preferredSkin)));}
  w.kill(w.snakes[1]);for(let i=0;i<70;i++)w.update(1/60,{});
  assert.ok(w.snakes.filter(s=>!s.player).every(s=>allowed.has(s.skin)));w.reset();
  assert.ok(w.snakes.filter(s=>!s.player).every(s=>allowed.has(s.skin)));
});
test('Score animation is monotonic, retargetable, exact and frame-rate independent',()=>{
  function sample(fps){let v=3000;for(let i=0;i<fps/2;i++)v=S.smoothNumber(v,15000,1/fps);return v;}
  assert.ok(Math.abs(sample(30)-sample(120))<1e-7);
  let value=3000;for(let i=0;i<12;i++){const next=S.smoothNumber(value,15000,1/60);assert.ok(next>value&&next<15000);value=next;}
  const current=value;value=S.smoothNumber(value,21000,1/60);assert.ok(value>current&&value<21000);
  for(let i=0;i<180;i++)value=S.smoothNumber(value,21000,1/60);assert.equal(value,21000);
  const next=S.smoothNumber(value,20000,1/60);assert.ok(next<value&&next>20000);
  assert.equal(S.smoothNumber(3000,8000,0),3000);
});
test('Opponent variants reuse native materials and contain no country motifs',()=>{
  assert.equal(S.botSkins.length,20);
  const seen=new Set(),w=world({aiEnabled:true,aiCount:36,aiMin:0,aiMax:40});
  for(let i=0;i<1000;i++)seen.add(w.randomSkin());assert.equal(seen.size,20);
  for(const key of S.botSkins){const p=S.palettes[key];assert.equal(p.colors.length,3);assert.ok(['scales','spots','lightning','hex','lattice','spine'].includes(p.pattern));assert.ok(!['argentina','venezuela','brazil','italy','spain','peru','bolivia'].includes(key));}
});
test('Opponent starting scores scale with round entry, including reset and respawn',()=>{
  for(const base of [0,1,40,100,3000,30000]){
    const w=world({initialScore:base,aiEnabled:true,aiCount:12,aiMin:0,aiMax:36,collision:'safe',respawn:1});
    const check=s=>{assert.ok(Number.isInteger(s.score));assert.ok(s.score>=Math.round(base*.5)&&s.score<=Math.round(base*3),`${base}: ${s.score}`);assert.equal(s.displayScore,s.score);};
    w.snakes.filter(s=>!s.player).forEach(check);
    for(let i=0;i<50;i++){const s=w.addBot();check(s);w.snakes.pop();}
    const existing=w.snakes[1],score=existing.score;w.player.score=1000000;w.cfg.initialScore=20000;w.sync();assert.equal(existing.score,score);check(w.addBot());w.snakes.pop();
    const victim=w.snakes[1];w.kill(victim);w.food=[];w.cfg.foodRate=0;for(let i=0;i<70;i++)w.update(1/60,{});
    const replacement=w.snakes.find(s=>!s.player&&s.spawnTime>0);assert.ok(replacement,'No replacement');check(replacement);
    w.cfg.initialScore=base;w.reset();w.snakes.filter(s=>!s.player).forEach(check);
    w.cfg.initialScore=40;w.reset();assert.equal(w.roundInitialScore,40);assert.ok(w.snakes.filter(s=>!s.player).every(s=>s.score>=20&&s.score<=120));
  }
});
test('Manual food rewards below 50 apply to existing gold and preserve death loot',()=>{
  const w=world({initialScore:40,foodValue:1,aiEnabled:true,aiCount:1,aiMin:0});
  w.addFood(w.player.x,w.player.y,1);const normal=w.food.at(-1);assert.equal(normal.value,1);
  w.addFood(100,100,1.25);const rich=w.food.at(-1);w.kill(w.snakes[1]);const loot=w.food.at(-1),lootValue=loot.value;
  w.cfg.foodValue=7;w.sync();assert.equal(normal.value,7);assert.equal(rich.value,8.75);assert.equal(loot.value,lootValue);
  const initial=w.player.score;w.collect(w.player,normal);assert.equal(w.player.score,initial+7);
  w.sync();assert.equal(rich.value,8.75);
  for(const value of [1,7,40,499,1500])assert.equal(S.sanitize({foodValue:value}).foodValue,value);
});
test('Player collision assist protects head and neck from both sides, but not body or boundary',()=>{
  function scene(assist,x,y,grace=90){
    const w=world({aiEnabled:true,aiCount:1,aiMin:0,collision:'classic',playerCollisionAssist:assist,playerHeadGrace:grace});
    w.time=5;w.food=[];w.ai=()=>{};
    const p=w.player,b=w.snakes[1];
    for(const s of [p,b]){s.spawnTime=0;s.advance=()=>{};s._points=null;}
    b.x=1200;b.y=1000;b.angle=0;b.trail=[];for(let x=1195;x>=800;x-=5)b.trail.push({x,y:1000});
    p.x=x;p.y=y;p.angle=Math.PI/2;p.trail=[];for(let d=5;d<=300;d+=5)p.trail.push({x,y:y-d});
    return w;
  }
  for(const [x,y]of [[1200,1000],[1155,1010],[1155,990]]){const w=scene(true,x,y);w.update(1/60,{});assert.ok(w.player.alive,`Protected contact ${x},${y}`);}
  const classic=scene(false,1200,1000);classic.update(1/60,{});assert.equal(classic.player.alive,false);
  const body=scene(true,1000,1000);body.update(1/60,{});assert.equal(body.player.alive,false);
  const narrow=scene(true,1125,1000,40);narrow.update(1/60,{});assert.equal(narrow.player.alive,false);
  const wide=scene(true,1125,1000,120);wide.update(1/60,{});assert.ok(wide.player.alive);
  const border=scene(true,-1,1000);border.update(1/60,{});assert.equal(border.player.alive,false);
  const bots=world({aiEnabled:true,aiCount:2,aiMin:0,playerCollisionAssist:true});bots.time=5;bots.food=[];bots.ai=()=>{};
  const a=bots.snakes[1],b=bots.snakes[2];for(const s of bots.snakes){s.spawnTime=0;s.advance=()=>{};s._points=null;}
  a.x=b.x=1000;a.y=b.y=1000;a.trail=[{x:995,y:1000}];b.trail=[{x:1005,y:1000}];bots.update(1/60,{});assert.equal(a.alive,false);assert.equal(b.alive,false);
});
console.log(`${tests.filter(t=>t.pass).length}/${tests.length} tests passed`);
fs.writeFileSync(path.join(__dirname,'test-results.json'),JSON.stringify({tests},null,2));
