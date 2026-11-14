'use strict';
(async()=>{
 const frame=document.getElementById('subject'),results=document.getElementById('results'),report=[];let w,app,S;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 async function test(name,fn){const li=document.createElement('li');try{await fn();li.textContent='PASS · '+name;report.push({name,pass:true});}catch(e){li.className='fail';li.textContent='FAIL · '+name+' — '+e.message;report.push({name,pass:false,error:e.message});console.error(e);}results.append(li);}
 function bind(){w=frame.contentWindow;S=w.SA;app=S.app;app.paused=true;}
 function tab(name){app.admin.showTab(name);}
 function change(key,value){const el=w.document.getElementById('setting-'+key);assert(el,'Missing control '+key);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));}
 function click(id){w.document.getElementById(id).click();}
 if(!frame.contentWindow.SA?.app)await new Promise(r=>frame.onload=r);bind();
 const savedSettings=localStorage.getItem('serpent.settings'),savedSkins=localStorage.getItem('serpent.skins');
 await test('Browser boot, canvas rendered, no external resources',()=>{assert(app.world.snakes.length>=1,'No world');app.renderer.render(app.world,1/60);const pixel=app.renderer.ctx.getImageData(640,360,1,1).data;assert(pixel[3]===255,'Blank canvas');assert(![...w.document.querySelectorAll('script[src],link[href]')].some(e=>/^https?:/.test(e.getAttribute('src')||e.getAttribute('href'))),'External resources');});
 await test('Six video backgrounds load, switch, cache and persist',async()=>{
   const original=S.clone(app.cfg);assert(S.backgrounds.length===6,'Six backgrounds missing');tab('background');assert(w.document.querySelectorAll('.background-card').length===6,'Missing cards');
   for(const bg of S.backgrounds){app.admin.chooseBackground(bg.id);app.renderer.syncBackground();for(let i=0;i<100&&!app.renderer.background;i++)await wait(20);assert(app.renderer.background?.width===1024,'Background failed: '+bg.id);assert(app.cfg.backgroundFit==='tile','Preset is not tiled');app.renderer.render(app.world,0);const cache=app.renderer.backgroundLevels;app.renderer.render(app.world,0);assert(cache===app.renderer.backgroundLevels,'Cache rebuilt');assert(S.sanitize(app.cfg).backgroundPreset===bg.id,'Preset not serializable');}
   await app.admin.save(false);assert(JSON.parse(localStorage.getItem('serpent.settings')).backgroundPreset==='video6','Preset not saved');
   app.admin.chooseBackground('procedural');app.renderer.syncBackground();assert(!app.renderer.background,'Procedural mode still has image');Object.assign(app.cfg,original);app.changed();
 });
 await test('All 38 range controls match displayed settings',()=>{let count=0;for(const name of ['skin','visual','background','gameplay','ai','ui']){tab(name);for(const el of w.document.querySelectorAll('#panel input[type=range]')){const key=el.dataset.key;assert(Math.abs(Number(el.value)-app.cfg[key])<.051,key+' slider mismatch');count++;}}assert(count>=38,'Not all ranges visited');});
 await test('Venezuela / Argentina apply to player without resetting physics',()=>{const p=app.world.player,x=p.x,length=p.length;app.admin.chooseSkin('venezuela');assert(p.skin==='venezuela','Skin not applied');assert(p.x===x&&p.length===length,'Physics reset');app.admin.chooseSkin('argentina');assert(p.skin==='argentina','Argentina not applied');const pal=S.getPalette('argentina',app.cfg);assert(pal.pattern==='sun','No sun motif');});
 await test('CUSTOM colors, patterns, collection save and apply',()=>{tab('skin');change('primary','#ff66aa');change('pattern','stars');assert(app.cfg.skin==='custom'&&app.world.player.skin==='custom','No custom switch');const name=w.document.querySelector('.custom-row input');name.value='Integration test skin';w.document.querySelector('.custom-row button').click();assert(app.admin.customs.some(s=>s.name==='Integration test skin'),'Skin not saved');app.admin.chooseSkin('original');tab('skin');const fields=[...w.document.querySelectorAll('.field')];const box=fields.find(e=>e.textContent.includes('Integration test skin'));box.querySelector('button').click();assert(app.cfg.primary==='#ff66aa'&&app.cfg.pattern==='stars','Collection apply failed');});
 await test('Food quantity and trail density change the world immediately',()=>{tab('gameplay');change('foodCount',2400);assert(app.world.food.length===2400,'Food count not applied');tab('visual');change('density',1.7);assert(app.world.food.length===2400,'Density rebuild failed');});
 await test('AI switch, count limits, speed settings are wired',()=>{tab('ai');change('aiEnabled',false);assert(app.world.snakes.length===1,'AI not disabled');change('aiEnabled',true);change('aiMin',0);change('aiCount',4);change('aiSpeed',170);app.world.respawnClock=app.cfg.respawn;app.world.update(1/60,{});assert(app.world.snakes.filter(s=>!s.player&&s.alive).length===4,'AI not restored');assert(app.cfg.aiSpeed===170,'AI speed failed');});
 await test('All three procedural arenas build distinct textures',()=>{tab('visual');const urls=[];for(const arena of ['stone','mechanical','nature']){change('arena',arena);app.renderer.render(app.world,1/60);urls.push(app.renderer.floor.toDataURL());}assert(new Set(urls).size===3,'Identical arena textures');});
 async function imageFile(name,kind){const c=w.document.createElement('canvas');c.width=96;c.height=64;const g=c.getContext('2d');g.fillStyle='#e55ab1';g.fillRect(0,0,96,64);g.fillStyle='#80dd91';g.fillRect(10,10,40,20);const blob=await new Promise(r=>c.toBlob(r,kind));return new w.File([blob],name,{type:''});}
 await test('PNG, JPG and JFIF decode by signature (empty MIME)',async()=>{for(const [name,mime]of [['arena.png','image/png'],['arena.jpg','image/jpeg'],['arena.jfif','image/jpeg']]){const f=await imageFile(name,mime);await app.admin.upload(f);assert(app.cfg.backgroundName===name,name+' not loaded');assert(app.cfg.background.startsWith('data:image/'),'Background absent');}await wait(50);assert(app.renderer.background,'Image not decoded');});
 await test('Background modes, opacity and darken survive JSON serialization',()=>{tab('background');for(const mode of ['cover','contain','stretch','tile']){change('backgroundFit',mode);app.renderer.render(app.world,1/60);}change('backgroundOpacity',.65);change('backgroundDarken',.4);const back=S.sanitize(JSON.parse(JSON.stringify(app.cfg)));assert(back.background===app.cfg.background&&back.backgroundFit==='tile','Background export loss');assert(back.backgroundOpacity===.65,'Opacity lost');});
 await test('Bad extensions, signature and oversized uploads rejected',async()=>{const old=app.cfg.background;await app.admin.upload(new w.File(['not an image'],'bad.jfif'));assert(app.cfg.background===old,'Bad signature accepted');await app.admin.upload(new w.File(['fake'],'fake.svg'));assert(app.cfg.background===old,'SVG accepted');await app.admin.upload({name:'large.jpg',size:13*1024*1024});assert(app.cfg.background===old,'Oversize accepted');});
 await test('JSON import rejects invalid values and restores valid settings',async()=>{await app.admin.import(new w.File([JSON.stringify({app:'serpent-arena',version:1,settings:{...app.cfg,speed:999999,primary:'#123456'},skins:app.admin.customs})],'settings.json'));assert(app.cfg.speed===260,'Range clamp failed');assert(app.cfg.primary==='#123456','Import failed');assert(app.cfg.backgroundName==='arena.jfif','Background metadata lost');});
 await test('Floating joystick and boost support independent touches',()=>{app.start();app.paused=true;const joy=w.document.getElementById('joystick'),game=w.document.getElementById('game'),boost=w.document.getElementById('boost');game.setPointerCapture=()=>{};joy.setPointerCapture=()=>{};boost.setPointerCapture=()=>{};game.dispatchEvent(new w.PointerEvent('pointerdown',{pointerId:7,pointerType:'touch',clientX:180,clientY:260,bubbles:true}));assert(joy.classList.contains('floating'),'Joystick did not float');assert(Math.abs(parseFloat(joy.style.left)-180)<1,'Joystick did not appear at touch point');game.dispatchEvent(new w.PointerEvent('pointermove',{pointerId:7,pointerType:'touch',clientX:230,clientY:260,bubbles:true}));app.direction();assert(Math.abs(app.input.angle)<.05,'Floating joystick direction failed');boost.dispatchEvent(new w.PointerEvent('pointerdown',{pointerId:8,pointerType:'touch',bubbles:true}));app.direction();assert(app.input.boost,'Boost second touch failed');game.dispatchEvent(new w.PointerEvent('pointercancel',{pointerId:7,bubbles:true}));boost.dispatchEvent(new w.PointerEvent('pointercancel',{pointerId:8,bubbles:true}));app.direction();assert(!joy.classList.contains('floating')&&!app.input.boost,'Pointer cancellation failed');});
 await test('WASD, arrow keys and blur cleanup',()=>{w.document.body.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true}));app.direction();assert(Math.abs(app.input.angle+Math.PI/2)<1e-5,'WASD failed');w.document.body.dispatchEvent(new w.KeyboardEvent('keyup',{code:'KeyW',key:'w',bubbles:true}));w.document.body.dispatchEvent(new w.KeyboardEvent('keydown',{code:'ArrowLeft',key:'ArrowLeft',bubbles:true}));app.direction();assert(Math.abs(Math.abs(app.input.angle)-Math.PI)<1e-5,'Arrow failed');w.document.body.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyC',key:'c',bubbles:true}));app.direction();assert(app.input.boost,'C boost failed');w.document.body.dispatchEvent(new w.KeyboardEvent('keyup',{code:'KeyC',key:'c',bubbles:true}));w.dispatchEvent(new w.Event('blur'));assert(app.keys.size===0,'Blur cleanup failed');});
 await test('Goal/result, restart and pause screens work',()=>{app.cfg.goal=app.world.player.score+1;app.world.addFood(app.world.player.x,app.world.player.y,1);app.world.update(1/60,{});assert(w.document.getElementById('result').classList.contains('hidden'),'Goal stopped the round');assert(app.world.player.alive,'Goal killed player');app.cfg.collision='classic';app.world.player.x=-10;app.world.player.y=100;app.world.update(1/60,{});assert(!w.document.getElementById('result').classList.contains('hidden'),'No result screen');click('restart');assert(app.world.player.alive&&app.playing&&!app.world.goalReached,'Restart failed');app.paused=false;app.pause();assert(!w.document.getElementById('pause').classList.contains('hidden'),'Pause screen absent');app.pause();assert(!app.paused,'Resume failed');app.paused=true;});
 await test('Skin/body preview renders pixels and uses same renderer',()=>{app.admin.open('skin');app.renderer.preview(w.document.getElementById('preview'),2,'venezuela');const c=w.document.getElementById('preview'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let saturated=0;for(let i=0;i<data.length;i+=40)if(data[i]>100&&data[i+2]<100)saturated++;assert(saturated>5,'No rendered Venezuela material');});
 await test('Saved settings and skin collection survive actual page reload',async()=>{app.cfg.speed=155;app.cfg.skin='argentina';await app.admin.save(false);frame.src='../index.html?admin=1&integration-reload=1';await new Promise(r=>frame.onload=r);bind();await app.ready;assert(app.cfg.speed===155&&app.cfg.skin==='argentina','Settings not persisted');assert(app.cfg.backgroundName==='arena.jfif','Background did not persist');assert(app.admin.customs.some(s=>s.name==='Integration test skin'),'Skin collection lost');assert(app.admin.visible,'?admin=1 failed');});
 await test('Mobile 390×844 layout: no horizontal overflow or clipped admin',async()=>{frame.style.width='390px';frame.style.height='844px';await wait(100);app.renderer.resize();const d=w.document.documentElement;assert(d.scrollWidth<=390,'Horizontal overflow');const panel=w.document.querySelector('.admin').getBoundingClientRect();assert(panel.width<=390&&panel.height<=844,'Admin out of bounds');tab('background');assert(w.document.getElementById('panel').querySelector('input[type=file]'),'No mobile file picker');});
 await test('Smoothed indicators share values, progress and stable label widths',()=>{
   const p=app.world.player,old=p.score;p.displayScore=old;p.displayRadius=p.radius;p.score=old+8400;
   app.animateIndicators(1/60);app.hud();const first=p.displayScore;
   assert(first>old&&first<p.score,'Score jumped instead of interpolating');
   assert(w.document.getElementById('score').textContent===S.formatScore(first)+' '+app.cfg.currency,'HUD uses raw score');
   const ratio=Number(w.document.getElementById('progress').style.transform.match(/scaleX\(([^)]+)\)/)[1]);
   assert(Math.abs(ratio-S.clamp(first/app.cfg.goal,0,1))<1e-6,'Progress not synchronized');
   const ctx=app.renderer.ctx,oldFill=ctx.fillText,oldRect=ctx.fillRect,texts=[],widths=[];
   try{ctx.fillText=function(t,...args){texts.push(t);return oldFill.call(this,t,...args);};ctx.fillRect=function(x,y,width,height){if(height===19)widths.push(width);return oldRect.call(this,x,y,width,height);};app.renderer.label(ctx,p,1);app.animateIndicators(1/60);app.renderer.label(ctx,p,1);}finally{ctx.fillText=oldFill;ctx.fillRect=oldRect;}
   assert(texts[0]===S.formatScore(first)+' '+app.cfg.currency,'Head label disagrees with HUD');
   assert(widths[0]===widths[1],'Label width jitters');
   for(let i=0;i<180;i++)app.animateIndicators(1/60);assert(p.displayScore===p.score,'Animation never reaches exact score');
   app.start();app.paused=true;assert(app.world.player.displayScore===app.cfg.initialScore,'New round animates from previous score');
 });
 await test('Result shows only exact numeric amount and two buttons after win or loss',()=>{
   for(const win of [true,false]){app.world.player.score=23625.78;app.finish(win);const el=w.document.getElementById('resultScore');assert(el.textContent===S.formatScore(23625.78),'Final total missing or estimated');assert(!/[a-zа-я]/i.test(el.textContent),'Result has currency or labels');}
   assert(w.document.getElementById('result').querySelectorAll('button').length===2,'Result actions changed');
   app.start();app.paused=true;assert(w.document.getElementById('resultScore').textContent==='','Stale amount on restart');
 });
 await test('Currency is free text, Spanish buttons and result contain no stats',()=>{
   tab('ui');change('currency','Mis monedas ✦');change('language','es');
   assert(w.document.getElementById('score').textContent.includes('Mis monedas ✦'),'Currency not applied');
   assert(w.document.getElementById('restart').textContent==='NUEVA RONDA','Spanish restart absent');
   assert(w.document.getElementById('toMenu').textContent==='Menú principal','Spanish menu absent');
   const result=w.document.getElementById('result');
   assert(result.querySelectorAll('button').length===2,'Result must have two buttons');
   assert(!/PTS|столкновение|объектов|соперников/i.test(result.textContent),'Result still has stats');
   assert(!w.document.getElementById('stats'),'Old FPS/length/player statistics remain');
 });
 await test('High-resolution PNG keeps exact source bytes and persists via IndexedDB',async()=>{
   const c=w.document.createElement('canvas');c.width=2400;c.height=700;const ctx=c.getContext('2d'),data=ctx.createImageData(c.width,c.height);
   let seed=123456;for(let i=0;i<data.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data.data[i]=seed>>>24;data.data[i+1]=seed>>>16&255;data.data[i+2]=seed>>>8&255;data.data[i+3]=255;}ctx.putImageData(data,0,0);
   const source=c.toDataURL('image/png'),blob=await new Promise(r=>c.toBlob(r,'image/png'));
   await app.admin.upload(new w.File([blob],'high-resolution.png'));
   assert(app.cfg.background===source,'Source image was recompressed or reduced');
   const saved=JSON.parse(localStorage.getItem('serpent.settings'));
   assert(saved.backgroundStored===true&&saved.background==='','Large image still occupies LocalStorage');
   assert(S.sanitize({background:source}).background===source,'High-resolution JSON import loses image');
   clearTimeout(app.admin.timer);frame.src='../index.html?admin=1&highres-reload=1';await new Promise(r=>frame.onload=r);bind();await app.ready;
   assert(app.cfg.background===source,'IndexedDB background lost on reload');
   await wait(100);assert(app.renderer.background?.width===2400,'Image did not preserve resolution');
 });
 await test('Background draw reuses patterns, caches zoom levels and crops visible source',()=>{
   const r=app.renderer,c=r.ctx;app.cfg.backgroundFit='tile';app.cfg.backgroundScale=1;r.camera.scale=1;r.render(app.world,0);
   const pattern=r.backgroundPattern;r.render(app.world,0);assert(r.backgroundPattern===pattern,'Tile pattern recreated every frame');
   r.camera.scale=.25;r.dpr=1;r.drawBackground(c,0,0,600,400);assert(r.backgroundLevels.length>=3,'Missing cached minification levels');
   const level=r.backgroundLevels[2];r.drawBackground(c,0,0,600,400);assert(r.backgroundLevels[2]===level,'Minification texture regenerated');
   for(const fit of ['cover','contain','stretch']){app.cfg.backgroundFit=fit;r.drawBackground(c,100,100,600,400);const b=r.backgroundCache;r.drawBackground(c,100,100,600,400);assert(b===r.backgroundCache,'Background layout not cached');assert(!b.getContext,'Map-sized background canvas allocated');}
   app.cfg.backgroundScale=.5;r.drawBackground(c,100,100,600,400);assert(r.backgroundCache.w===app.world.size*.5,'Scale ignored in stretch mode');r.resize();
 });
 await test('High-resolution tiled background stays within render budget',async()=>{
   app.cfg.backgroundFit='tile';app.cfg.backgroundScale=1;app.cfg.skin='original';app.cfg.quality='high';
   frame.style.width='1280px';frame.style.height='720px';await wait(50);app.renderer.resize();
   for(let i=0;i<8;i++)app.renderer.render(app.world,0);
   const timings=[];for(let i=0;i<60;i++){const t=performance.now();app.renderer.render(app.world,0);timings.push(performance.now()-t);if(i%10===9)await wait(0);}
   timings.sort((a,b)=>a-b);const median=timings[30],p95=timings[57];
   results.append(Object.assign(document.createElement('p'),{textContent:'Tiled 2400px render: median '+median.toFixed(2)+' ms; p95 '+p95.toFixed(2)+' ms'}));
   assert(median<33.4,'Median CPU rendering exceeds 30 FPS budget: '+median.toFixed(2)+' ms');
 });
 clearTimeout(app.admin.timer);await app.admin.save(false);if(savedSettings!==null)localStorage.setItem('serpent.settings',savedSettings);else localStorage.removeItem('serpent.settings');if(savedSkins!==null)localStorage.setItem('serpent.skins',savedSkins);else localStorage.removeItem('serpent.skins');
 const passed=report.filter(t=>t.pass).length;document.getElementById('status').textContent=`${passed}/${report.length} passed`;document.body.dataset.done='true';document.body.dataset.passed=String(passed);window.testReport=report;app.paused=true;
})();
