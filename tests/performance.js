'use strict';
(async()=>{
 const frame=document.getElementById('subject');await new Promise(r=>frame.onload=r);const w=frame.contentWindow,S=w.SA,app=S.app;await app.ready;app.paused=true;for(const id of ['menu','pause','result'])w.document.getElementById(id).classList.add('hidden');
 const paced=new URLSearchParams(location.search).has('raf');
 const cfg=S.clone(app.cfg);Object.assign(app.cfg,S.clone(S.defaults),{collision:'safe',sound:false,backgroundPreset:'custom',backgroundFit:'tile'});
 const image=w.document.createElement('canvas');image.width=3072;image.height=2048;const c=image.getContext('2d');c.fillStyle='#162a32';c.fillRect(0,0,image.width,image.height);for(let i=0;i<12000;i++){c.fillStyle=i%2?'#1c3441':'#101e27';c.fillRect(i*73%3072,i*127%2048,28,17);}
 app.cfg.background=image.toDataURL('image/jpeg');app.changed();for(let i=0;i<100&&!app.renderer.background;i++)await new Promise(r=>setTimeout(r,20));app.world=new S.World(app.cfg,20261118);app.world.demo=false;
 const stats=a=>{a.sort((a,b)=>a-b);return {median:+a[Math.floor(a.length*.5)].toFixed(2),p95:+a[Math.floor(a.length*.95)].toFixed(2),max:+a[a.length-1].toFixed(2)}};
 const results=[];
 for(const mode of ['procedural','tile','cover','tile-hidpi-stress']){
 Object.assign(app.cfg,{foodCount:mode==='tile-hidpi-stress'?5000:1700,aiCount:mode==='tile-hidpi-stress'?36:14,aiMax:40});app.cfg.backgroundPreset=mode==='procedural'?'procedural':'custom';app.cfg.backgroundFit=mode==='tile-hidpi-stress'?'tile':mode==='procedural'?'tile':mode;app.world=new S.World(app.cfg,20261118);app.world.demo=false;app.changed();app.renderer.camera={x:app.world.player.x,y:app.world.player.y,scale:1};if(mode==='tile-hidpi-stress'){app.renderer.dpr=2;app.renderer.canvas.width=2560;app.renderer.canvas.height=1440;}for(let i=0;i<100&&mode!=='procedural'&&!app.renderer.background;i++)await new Promise(r=>setTimeout(r,20));
 const simulation=[],render=[],total=[],intervals=[];let lastFrame;
 for(let i=0;i<210;i++){if(paced){const timestamp=await new Promise(requestAnimationFrame);if(lastFrame){if(i>29)intervals.push(timestamp-lastFrame);}lastFrame=timestamp;}const start=performance.now();app.world.update(1/60,{angle:-.4+i*.003});const mid=performance.now();app.animateIndicators(1/60);app.renderer.render(app.world,1/60);const end=performance.now();if(i>29){simulation.push(mid-start);render.push(end-mid);total.push(end-start);}if(!paced&&i%6===0)await new Promise(r=>setTimeout(r,0));}
 results.push({mode,seed:20261118,food:app.cfg.foodCount,bots:app.cfg.aiCount,dpr:app.renderer.dpr,simulation:stats(simulation),render:stats(render),total:stats(total),frameIntervals:paced?stats(intervals):'CPU submission timings, not FPS'});
 }
 document.getElementById('result').textContent=JSON.stringify(results,null,2);document.body.dataset.done='true';Object.assign(app.cfg,cfg);app.changed();app.paused=true;
})().catch(e=>document.getElementById('result').textContent=e.stack);
