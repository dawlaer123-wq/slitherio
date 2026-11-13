'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const context={window:{},console,Math,Date,Map,Set,Intl,localStorage:{getItem:()=>null,setItem:()=>{}}};vm.createContext(context);for(const name of ['config','core'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/'+name+'.js'),'utf8'),context);
const S=context.window.SA,tests=[];function test(name,fn){try{fn();tests.push({name,pass:true});console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;tests.push({name,pass:false,error:e.message});}}
const cfg=over=>Object.assign(S.clone(S.defaults),{aiEnabled:false,particles:0,foodCount:200,foodRate:0},over);
function world(over){const w=new S.World(cfg(over),1234);w.demo=false;return w;}
test('Sanitize imports, numeric clamps, unsafe background, unknown properties',()=>{const c=S.sanitize({speed:Infinity,aiCount:1e9,glow:-5,primary:'javascript:x',background:'http://external',__proto__:{danger:1}});assert.equal(c.speed,145);assert.equal(c.aiCount,36);assert.equal(c.glow,0);assert.equal(c.primary,S.defaults.primary);assert.equal(c.background,'');assert.equal(c.danger,undefined);});
test('All configurable defaults have schema or asset metadata',()=>{for(const k of Object.keys(S.defaults))assert.ok(S.schema.some(s=>s[0]===k)||['background','backgroundName'].includes(k),k);});
test('Fixed movement and turn-rate bound',()=>{const w=world({collision:'safe'}),s=w.player;s.velocity=145;s.desired=s.angle+Math.PI;const a=s.angle,x=s.x,y=s.y;s.advance(1/60,w.cfg);assert.ok(Math.abs(S.angleDiff(s.angle,a))<=w.cfg.turnRate/60+1e-8);assert.ok(Math.abs(Math.hypot(s.x-x,s.y-y)-145/60)<1e-8);});
test('Head history follows exact path with no stretching',()=>{const w=world({collision:'safe'}),s=w.player;s.trail=[];s.length=700;s.velocity=145;s.lastSample={x:s.x,y:s.y};for(let i=0;i<600;i++){s.desired=Math.sin(i/80)*1.7;s.advance(1/60,w.cfg);}assert.ok(s.trail.length>100);for(let i=1;i<s.trail.length;i++)assert.ok(Math.abs(Math.hypot(s.trail[i].x-s.trail[i-1].x,s.trail[i].y-s.trail[i-1].y)-5)<1e-6);});
test('Collection grows score and body once only',()=>{const w=world(),p=w.player,score=p.score,len=p.length;w.addFood(p.x,p.y,1);const f=w.food.at(-1);w.collect(p,f);w.collect(p,f);assert.equal(p.score,score+f.value);assert.equal(p.length,len+w.cfg.growth*f.size);assert.equal(p.collected,1);assert.equal(f.alive,false);});
test('World update collects food by proximity',()=>{const w=world(),p=w.player;w.food=[];w.addFood(p.x,p.y,1);w.update(1/60,{angle:p.angle});assert.equal(p.collected,1);});
test('Maximum length is respected',()=>{const w=world({maxLength:1000});w.player.length=999;w.addFood(w.player.x,w.player.y,2);w.collect(w.player,w.food.at(-1));assert.equal(w.player.length,1000);});
test('Boost accelerates and spends score/length',()=>{const w=world({collision:'safe'}),p=w.player;w.food=[];const initial=p.score;for(let i=0;i<100;i++)w.update(1/60,{angle:p.angle,boost:true});assert.ok(p.velocity>w.cfg.speed);assert.ok(p.score<initial);assert.ok(p.length<w.cfg.initialLength);});
test('AI actively moves, seeks food, and consumes it',()=>{const w=world({aiEnabled:true,aiCount:4,aiMin:0,aiMax:5,collision:'safe'});w.food=[];const s=w.snakes[1],x=s.x,y=s.y;w.addFood(x,y,1);for(let i=0;i<180;i++)w.update(1/60,{angle:w.player.angle});assert.ok(Math.hypot(s.x-x,s.y-y)>50);assert.ok(s.collected>=1);assert.equal(w.snakes.length,5);});
test('AI disabled removes all opponents',()=>{const w=world({aiEnabled:true,aiCount:4,aiMin:0});w.cfg.aiEnabled=false;w.sync();assert.equal(w.snakes.length,1);});
test('AI target min/max and respawn delay',()=>{const w=world({aiEnabled:true,aiCount:0,aiMin:2,aiMax:3,respawn:1,collision:'safe'});assert.equal(w.snakes.length,3);w.kill(w.snakes[1],null);for(let i=0;i<70;i++)w.update(1/60,{});assert.equal(w.snakes.filter(s=>s.alive&&!s.player).length,2);});
test('Death drops collectible gold and reports loss once',()=>{const w=world(),p=w.player;let events=0;w.onEnd=win=>{assert.equal(win,false);events++;};const n=w.food.length;w.kill(p,null);w.kill(p,null);assert.ok(w.food.length>n);assert.equal(events,1);assert.equal(p.alive,false);});
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
  assert.equal(S.botSkins.length,12);
  const seen=new Set(),w=world({aiEnabled:true,aiCount:36,aiMin:0,aiMax:40});
  for(let i=0;i<500;i++)seen.add(w.randomSkin());assert.equal(seen.size,12);
  for(const key of S.botSkins){const p=S.palettes[key];assert.equal(p.colors.length,3);assert.ok(['scales','spots'].includes(p.pattern));assert.ok(!['argentina','venezuela','brazil'].includes(key));}
});
console.log(`${tests.filter(t=>t.pass).length}/${tests.length} tests passed`);
fs.writeFileSync(path.join(__dirname,'test-results.json'),JSON.stringify({tests},null,2));
