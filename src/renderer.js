'use strict';
(function(S){
 const TAU=Math.PI*2;
 const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
 function tint(hex,m,white=0){const a=rgb(hex);return`rgb(${a.map(v=>Math.round(S.clamp(v*m+white,0,255))).join(',')})`;}
 function circle(c,x,y,r,fill){c.beginPath();c.arc(x,y,Math.max(.1,r),0,TAU);if(fill)c.fillStyle=fill;c.fill();}
 function star(c,x,y,r,color){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=color;c.fill();}
 function sun(c,r,color){
   c.fillStyle=color;c.strokeStyle=color;c.lineWidth=r*.08;
   for(let i=0;i<24;i++){const a=i*TAU/24;c.beginPath();c.moveTo(Math.cos(a)*r*.59,Math.sin(a)*r*.59);c.lineTo(Math.cos(a+.06)*r*(i%2?.92:1.12),Math.sin(a+.06)*r*(i%2?.92:1.12));c.lineTo(Math.cos(a+.12)*r*.59,Math.sin(a+.12)*r*.59);c.fill();}
   circle(c,0,0,r*.64,color);c.strokeStyle='#8c651d';c.lineWidth=r*.06;c.beginPath();c.arc(0,0,r*.6,0,TAU);c.stroke();
   c.fillStyle='#76531a';circle(c,-r*.21,-r*.08,r*.055);circle(c,r*.21,-r*.08,r*.055);c.beginPath();c.moveTo(0,-r*.05);c.lineTo(-r*.04,r*.16);c.lineTo(r*.06,r*.16);c.stroke();c.beginPath();c.arc(0,r*.14,r*.22,.25,Math.PI-.25);c.stroke();
 }
 function gear(c,x,y,r,teeth,angle=0){
   c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#64542c';c.strokeStyle='#94814d';c.lineWidth=2;c.beginPath();
   for(let i=0;i<teeth*4;i++){const a=i*TAU/(teeth*4),rr=r*(i%4<2?1:.92);c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();c.stroke();
   const g=c.createRadialGradient(-r*.2,-r*.2,r*.1,0,0,r*.86);g.addColorStop(0,'#42402d');g.addColorStop(.66,'#292f2d');g.addColorStop(.7,'#907746');g.addColorStop(.76,'#3b3b2b');g.addColorStop(.84,'#7d673b');g.addColorStop(1,'#252923');circle(c,0,0,r*.88,g);c.strokeStyle='#c4a56255';c.lineWidth=1;for(const rr of [.81,.85]){c.beginPath();c.arc(0,0,r*rr,0,TAU);c.stroke();}c.fillStyle='#141c1b';for(let i=0;i<teeth*2;i++){c.save();c.rotate(i*TAU/(teeth*2));c.fillRect(r*.71,-r*.012,r*.05,r*.024);c.restore();}
   for(let i=0;i<8;i++){c.save();c.rotate(i*TAU/8);c.fillStyle='#625935';c.fillRect(r*.15,-r*.065,r*.58,r*.13);c.strokeStyle='#9c8751';c.lineWidth=1;c.strokeRect(r*.15,-r*.065,r*.58,r*.13);circle(c,r*.66,0,3,'#b19954');c.restore();}
   circle(c,0,0,r*.29,'#77704a');circle(c,0,0,r*.21,'#292f2b');circle(c,0,0,r*.12,'#83754c');c.strokeStyle='#c9a85c66';c.lineWidth=1;c.beginPath();c.arc(0,0,r*.255,0,TAU);c.stroke();for(let i=0;i<6;i++){const a=i*TAU/6;circle(c,Math.cos(a)*r*.245,Math.sin(a)*r*.245,Math.max(1.4,r*.013),'#b1a06a');}circle(c,-r*.04,-r*.04,r*.04,'#b7a369');c.restore();
 }
 class Renderer{
    constructor(element,cfg){this.canvas=element;this.ctx=element.getContext('2d',{alpha:false});this.cfg=cfg;this.camera={x:0,y:0,scale:1};this.w=0;this.h=0;this.dpr=1;this.floorKey='';this.background=null;this.backgroundSrc=null;this.backgroundCacheKey='';this.backgroundCache=null;this.backgroundPattern=null;this.tilePatterns=new WeakMap();this.backgroundLevels=[];this.gold=[];this.red=null;this.fps=60;this.lastTime=0;this.buildSprites();this.resize();}
   resize(){const rect=this.canvas.getBoundingClientRect();this.w=Math.max(1,rect.width);this.h=Math.max(1,rect.height);this.dpr=Math.min(devicePixelRatio||1,this.cfg.quality==='high'?2:this.cfg.quality==='medium'?1.5:1);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);}
   buildSprites(){
     const g=canvas(96,96),c=g.getContext('2d');const halo=c.createRadialGradient(48,48,5,48,48,47);halo.addColorStop(0,'#ffea47aa');halo.addColorStop(.35,'#ffcc0055');halo.addColorStop(1,'#ff950000');circle(c,48,48,47,halo);this.halo=g;
     for(let k=0;k<3;k++){const s=canvas(64,64),p=s.getContext('2d');const gold=p.createRadialGradient(26,24,1,32,32,20);gold.addColorStop(0,'#ffffbc');gold.addColorStop(.22,'#fff35b');gold.addColorStop(.58,'#ffdc22');gold.addColorStop(.84,'#eeb500');gold.addColorStop(1,'#b57602');p.shadowColor='#ffc422';p.shadowBlur=3;circle(p,32,32,19,gold);p.shadowBlur=0;p.strokeStyle='#ffe34488';p.lineWidth=1;p.beginPath();p.ellipse(32,32,15,18,-.22,0,TAU);p.stroke();p.fillStyle='#fff7b9aa';p.beginPath();p.ellipse(27,25,5,3,-.6,0,TAU);p.fill();this.gold.push(s);}
     this.red=canvas(24,24);const r=this.red.getContext('2d'),rg=r.createRadialGradient(12,12,0,12,12,12);rg.addColorStop(0,'#ff3d6c');rg.addColorStop(.15,'#ec1748bb');rg.addColorStop(1,'#de164a00');circle(r,12,12,12,rg);
   }
   buildFloor(){
     const cfg=this.cfg,key=[cfg.arena,cfg.floor,cfg.environment,cfg.decorations].join('|');if(key===this.floorKey)return;this.floorKey=key;
     const n=960,tex=canvas(n,n),c=tex.getContext('2d'),rng=new S.RNG(11112),r=(a,b)=>rng.range(a,b);
     c.fillStyle=cfg.arena==='nature'?'#041618':cfg.arena==='mechanical'?'#151d22':'#1a2029';c.fillRect(0,0,n,n);
     const base=rgb(cfg.environment);
     if(cfg.floor==='brick'){
       for(let row=0;row<30;row++)for(let col=-1;col<11;col++){const x=col*96+(row%2)*48,y=row*32,shade=r(.45,.85);c.fillStyle=`rgb(${base.map(v=>Math.floor(v*shade)).join(',')})`;c.fillRect(x+2,y+2,92,28);c.strokeStyle='#ffffff06';c.beginPath();c.moveTo(x+3,y+28);c.lineTo(x+92,y+28);c.stroke();c.fillStyle='#00000033';c.fillRect(x+3,y+3,90,2);for(let j=0;j<4;j++){c.fillStyle=r(0,1)>.5?'#ffffff05':'#00000014';c.fillRect(x+r(3,86),y+r(4,27),r(3,34),1);}}
     }else if(cfg.floor==='slate'){
       for(let row=0;row<8;row++)for(let col=0;col<8;col++){const s=r(.3,.65);c.fillStyle=`rgb(${base.map(v=>v*s).join(',')})`;c.fillRect(col*120+2,row*120+2,116,116);c.strokeStyle='#acbece0b';c.strokeRect(col*120+4,row*120+4,112,112);}
     }
     // Grain and hairline cracks are cached once, never regenerated per frame.
     for(let i=0;i<18000;i++){c.fillStyle=i%2?'#00000010':'#c6d6e405';c.fillRect(r(0,n),r(0,n),r(1,3),1);}
     for(let i=0;i<45;i++){let x=r(0,n),y=r(0,n);c.beginPath();c.moveTo(x,y);for(let j=0;j<6;j++){x+=r(-22,22);y+=r(-18,18);c.lineTo(x,y);}c.strokeStyle='#00000038';c.lineWidth=r(.4,1.2);c.stroke();}
     if(cfg.arena==='mechanical'){
       for(let x=0;x<n;x+=240){c.strokeStyle='#9b875837';c.lineWidth=2;c.beginPath();c.moveTo(x,0);c.lineTo(x,n);c.stroke();c.beginPath();c.moveTo(0,x);c.lineTo(n,x);c.stroke();for(let y=0;y<n;y+=240){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle='#514c31';c.fillRect(-8,-8,16,16);c.strokeStyle='#a2945a';c.strokeRect(-5,-5,10,10);c.restore();}}
       for(let i=0;i<Math.round(8*cfg.decorations);i++){const x=[290,740,180,640,470,880,70,470][i%8],y=[290,760,780,120,540,380,410,900][i%8],rr=i<2?210:r(40,90);c.globalAlpha=.62;gear(c,x,y,rr,Math.floor(rr/7),r(0,TAU));c.globalAlpha=1;}
     }else if(cfg.arena==='stone'){
       for(let i=0;i<Math.round(1.5*cfg.decorations);i++){const x=r(100,860),y=r(100,860),rr=r(110,220);c.save();c.translate(x,y);c.globalAlpha=.32;c.strokeStyle='#635f4d';c.lineWidth=20;c.beginPath();c.arc(0,0,rr,0,TAU);c.stroke();c.strokeStyle='#a28c56';c.lineWidth=1;for(let a=0;a<TAU;a+=.07){c.beginPath();c.moveTo(Math.cos(a)*(rr-11),Math.sin(a)*(rr-11));c.lineTo(Math.cos(a)*(rr+11),Math.sin(a)*(rr+11));c.stroke();}c.strokeStyle='#76623c';c.lineWidth=4;c.beginPath();c.arc(0,0,rr*.78,0,TAU);c.stroke();for(let a=0;a<TAU;a+=Math.PI/12){c.beginPath();c.moveTo(Math.cos(a)*rr*.2,Math.sin(a)*rr*.2);c.lineTo(Math.cos(a+.1)*rr*.65,Math.sin(a+.1)*rr*.65);c.stroke();}c.save();c.scale(1,1.2);sun(c,rr*.3,'#7c6f4e');c.restore();c.strokeStyle='#333933';c.lineWidth=3;c.beginPath();c.arc(-rr*.06,-rr*.03,rr*.035,Math.PI,TAU);c.stroke();c.beginPath();c.arc(rr*.06,-rr*.03,rr*.035,Math.PI,TAU);c.stroke();c.restore();}
     }else{
       c.fillStyle=tint(cfg.environment,.24);c.fillRect(0,0,n,n);
       for(let i=0;i<Math.round(55*cfg.decorations);i++){const x=r(0,n),y=r(0,n),rr=r(12,90);c.save();c.translate(x,y);c.rotate(r(0,TAU));const gr=c.createRadialGradient(-rr*.4,-rr*.3,0,0,0,rr);gr.addColorStop(0,'#31483b');gr.addColorStop(.5,'#122a24');gr.addColorStop(1,'#031312');c.fillStyle=gr;c.beginPath();for(let j=0;j<9;j++){const a=j*TAU/9,rad=rr*r(.65,1);c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad*.55);}c.closePath();c.fill();c.strokeStyle='#5980631f';c.stroke();c.restore();}
       for(let i=0;i<70*cfg.decorations;i++){c.strokeStyle='#13392b77';c.lineWidth=1;c.beginPath();const x=r(0,n),y=r(0,n);c.moveTo(x,y);c.bezierCurveTo(x+50,y-35,x-35,y-80,x+30,y-120);c.stroke();}
     }
     const shade=c.createRadialGradient(n*.45,n*.45,80,n*.5,n*.5,n*.7);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#00000066');c.fillStyle=shade;c.fillRect(0,0,n,n);this.floor=tex;this.pattern=this.ctx.createPattern(tex,'repeat');
   }
   syncBackground(){
     const selected=S.backgrounds?.find(b=>b.id===this.cfg.backgroundPreset);
     const src=selected?selected.src:this.cfg.backgroundPreset==='procedural'?'':this.cfg.background;
     if(this.backgroundSrc===src)return;
     this.backgroundSrc=src;this.background=null;this.backgroundCache=null;this.backgroundPattern=null;this.backgroundCacheKey='';this.tilePatterns=new WeakMap();this.backgroundLevels=[];
     if(!src)return;
     const img=new Image();
     img.onload=()=>{if(src!==this.backgroundSrc)return;this.background=img;this.backgroundLevels=[img];if(S.app)S.app.dirty=true;};
     img.src=src;
   }
   tilePattern(c){
     const img=this.background,scale=this.cfg.backgroundScale||1;
     // Cache downsampled levels once: large tile images should not be filtered from
     // full resolution every frame when the camera is zoomed out.
     const pixels=Math.min(1,(this.camera.scale||1)*this.dpr*scale);
     let level=0,factor=1;
     while(factor*.5>=pixels&&Math.min(img.width,img.height)*factor>64){factor*=.5;level++;}
     for(let i=this.backgroundLevels.length;i<=level;i++){
       const prev=this.backgroundLevels[i-1],tex=canvas(Math.max(1,Math.ceil(prev.width/2)),Math.max(1,Math.ceil(prev.height/2))),cc=tex.getContext('2d');
       cc.imageSmoothingQuality='high';cc.drawImage(prev,0,0,tex.width,tex.height);this.backgroundLevels.push(tex);
     }
     let entry=this.tilePatterns.get(c);const key=level+'|'+scale;
     if(!entry||entry.key!==key){const tex=this.backgroundLevels[level],pattern=c.createPattern(tex,'repeat');pattern.setTransform(new DOMMatrix().scale(scale*img.width/tex.width,scale*img.height/tex.height));entry={key,pattern};this.tilePatterns.set(c,entry);}
     this.backgroundPattern=entry.pattern;return entry.pattern;
   }
   drawBackground(c,left,top,width,height){
     this.buildFloor();if(c===this.ctx)c.fillStyle=this.pattern;else c.fillStyle=c.createPattern(this.floor,'repeat');c.fillRect(left,top,width,height);this.syncBackground();
     if(!this.background)return;
     const img=this.background,fit=this.cfg.backgroundFit;c.save();c.globalAlpha=this.cfg.backgroundOpacity;c.imageSmoothingEnabled=true;
     // Browser's fast bilinear sampling is sufficient at native resolution; expensive
     // high-quality downsampling happens only when a cached tile level is built.
     c.imageSmoothingQuality='low';
     if(fit==='tile'){c.fillStyle=this.tilePattern(c);c.fillRect(left,top,width,height);}
     else{
       const size=this.worldSize||4800,scale=this.cfg.backgroundScale||1,key=fit+'|'+size+'|'+scale;
       if(this.backgroundCacheKey!==key){
         let w=size*scale,h=size*scale;
         if(fit!=='stretch'){const k=(fit==='contain'?Math.min(size/img.width,size/img.height):Math.max(size/img.width,size/img.height))*scale;w=img.width*k;h=img.height*k;}
         this.backgroundCache={x:(size-w)/2,y:(size-h)/2,w,h};this.backgroundCacheKey=key;
       }
       const b=this.backgroundCache,x=Math.max(left,b.x),y=Math.max(top,b.y),right=Math.min(left+width,b.x+b.w),bottom=Math.min(top+height,b.y+b.h);
       // Draw only the visible source rectangle, preserving source resolution and
       // avoiding a map-sized intermediate canvas (up to hundreds of MB).
       if(right>x&&bottom>y)c.drawImage(img,(x-b.x)*img.width/b.w,(y-b.y)*img.height/b.h,(right-x)*img.width/b.w,(bottom-y)*img.height/b.h,x,y,right-x,bottom-y);
     }
     c.restore();c.fillStyle='rgba(0,0,0,'+this.cfg.backgroundDarken+')';c.fillRect(left,top,width,height);
   }
   snake(c,s,time,preview=false){
     if(!s.alive)return;const cfg=this.cfg,pal=S.getPalette(s.skin,cfg),r=s.displayRadius??s.radius,all=s.points();if(all.length<2)return;
     const pts=all.filter((_,i)=>i%3===0||i===all.length-1),N=pts.length,norms=[],radii=[];
     for(let i=0;i<N;i++){let dx,dy;if(i===0){dx=Math.cos(s.angle);dy=Math.sin(s.angle);}else{const a=pts[Math.max(0,i-1)],b=pts[Math.min(N-1,i+1)];dx=a.x-b.x;dy=a.y-b.y;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;}norms.push({x:-dy,y:dx});radii.push(r*S.clamp((N-1-i)/8+.15,.15,1));}
     c.save();if(!preview&&time-s.spawnTime<4)c.globalAlpha=.75+.25*Math.sin(time*8)**2;
     const path=new Path2D();path.moveTo(pts[0].x,pts[0].y);for(let i=1;i<N;i++)path.lineTo(pts[i].x,pts[i].y);
     const silhouette=new Path2D();for(let i=0;i<N;i++)silhouette.lineTo(pts[i].x+norms[i].x*radii[i],pts[i].y+norms[i].y*radii[i]);for(let i=N-1;i>=0;i--)silhouette.lineTo(pts[i].x-norms[i].x*radii[i],pts[i].y-norms[i].y*radii[i]);silhouette.closePath();c.lineCap='round';c.lineJoin='round';if(cfg.shadows>0){c.save();c.translate(r*.18,r*.35);c.fillStyle=`rgba(0,0,0,${cfg.shadows*.72})`;c.fill(silhouette);circle(c,s.x,s.y,r);c.restore();}
     if((s.player||preview)&&cfg.skinGlow>0&&cfg.quality==='high'){c.strokeStyle=tint(pal.colors[0],.6);c.globalAlpha*=cfg.skinGlow*.3;c.lineWidth=6;c.stroke(silhouette);c.globalAlpha=1;}
     c.fillStyle=tint(pal.colors[1],.78);c.fill(silhouette);
     const bands=cfg.quality==='high'?18:12;
     for(let band=0;band<bands;band++){
       const a=-1+band*2/bands-.018,b=-1+(band+1)*2/bands+.018,mid=(a+b)/2;const co=pal.colors[mid<-.34?0:mid>.34?2:1];const light=(.42+.52*Math.sqrt(1-mid*mid)+.15*(-mid))*cfg.material;
       c.fillStyle=tint(co,light);c.beginPath();for(let i=0;i<N;i++){const p=pts[i],n=norms[i],rr=radii[i];c.lineTo(p.x+n.x*a*rr,p.y+n.y*a*rr);}for(let i=N-1;i>=0;i--){const p=pts[i],n=norms[i],rr=radii[i];c.lineTo(p.x+n.x*b*rr,p.y+n.y*b*rr);}c.closePath();c.fill();
     }
     // Longitudinal highlights follow the same normals, rather than disconnected beads.
     for(const [offset,alpha] of [[-.67,.25],[.63,.08]]){c.beginPath();for(let i=0;i<N-3;i++){const p=pts[i],n=norms[i];c.lineTo(p.x+n.x*offset*radii[i],p.y+n.y*offset*radii[i]);}c.strokeStyle=tint(pal.highlight||'#ffffff',1);c.globalAlpha=alpha;c.lineWidth=Math.max(.8,r*.065);c.stroke();c.globalAlpha=1;}
     if(pal.pattern!=='none'){
       let dist=0,next=25;const spacing=(s.skin==='custom'?cfg.patternGap:pal.pattern==='stars'?86:57);for(let i=1;i<N-5;i++){const a=pts[i-1],p=pts[i];dist+=Math.hypot(p.x-a.x,p.y-a.y);if(dist<next)continue;next+=pal.pattern==='scales'?18:spacing;const n=norms[i],angle=Math.atan2(-n.x,n.y);c.save();c.translate(p.x,p.y);c.rotate(angle);const pr=r*(s.skin==='custom'?cfg.patternSize:1);
         if(pal.pattern==='stars'){for(let j=0;j<8;j++){const x=(j-3.5)*pr*.27,y=-Math.sin(j/7*Math.PI)*pr*.08;star(c,x,y,pr*.105,pal.decor);}}
         else if(pal.pattern==='sun'){sun(c,pr*.32,pal.decor);}
         else if(pal.pattern==='diamonds'){c.fillStyle=pal.decor;c.beginPath();c.moveTo(-pr*.3,0);c.lineTo(0,-pr*.27);c.lineTo(pr*.3,0);c.lineTo(0,pr*.27);c.fill();}
         else if(pal.pattern==='scales'){c.strokeStyle=pal.decor;c.globalAlpha=.5;c.lineWidth=1;for(let k=-2;k<=2;k++){c.beginPath();c.arc(k%2?4:0,k*pr*.26,pr*.22,-1.2,1.2);c.stroke();}}
         else{const g=c.createRadialGradient(-pr*.07,-pr*.09,1,0,0,pr*.29);g.addColorStop(0,tint(pal.decor,1.1,12));g.addColorStop(1,tint(pal.decor,.78));c.fillStyle=g;c.beginPath();c.ellipse(0,0,pr*.24,pr*.29,.3,0,TAU);c.fill();if(pal.rosettes){const ink=tint(pal.decor,.72);c.strokeStyle=ink;c.lineWidth=pr*.08;c.stroke();circle(c,pr*.42,pr*.47,pr*.09,ink);circle(c,-pr*.5,-pr*.35,pr*.07,ink);}}
         c.restore();
       }
     }
     // Rounded head, striped in local coordinates, shares the body material.
     c.save();c.translate(s.x,s.y);c.rotate(s.angle);c.beginPath();c.ellipse(0,0,r*1.04,r,0,0,TAU);c.clip();
     for(let band=0;band<bands;band++){const y=-r+band*2*r/bands,mid=(y+r/bands)/r,co=pal.head||pal.colors[mid<-.34?0:mid>.34?2:1];c.fillStyle=tint(co,(.43+.52*Math.sqrt(Math.max(0,1-mid*mid))-.14*mid)*cfg.material);c.fillRect(-r*1.1,y,r*2.2,r*2/bands+.3);}c.restore();
     c.save();c.translate(s.x,s.y);c.rotate(s.angle);
     for(const side of [-1,1]){const x=r*.35,y=side*r*.64,er=r*.49;c.shadowColor='#0009';c.shadowBlur=2;c.shadowOffsetY=2;const eg=c.createRadialGradient(x-er*.3,y-er*.3,0,x,y,er);eg.addColorStop(0,'#ffffff');eg.addColorStop(.55,pal.eye||'#ffffff');eg.addColorStop(1,'#b4cad3');circle(c,x,y,er,eg);c.shadowBlur=0;c.shadowOffsetY=0;const px=x+r*.11,py=y;circle(c,px,py,er*.68,'#1e3041');circle(c,px+r*.025,py,er*.52,'#050c16');circle(c,px-er*.17,py-er*.25,er*.21,'#ffffff');circle(c,px+er*.17,py+er*.18,er*.075,'#e9faff');}
     c.restore();c.restore();
   }
   badge(c,name,x,y,r){
     const p=S.getPalette(name,this.cfg);c.save();c.translate(x,y);c.beginPath();c.arc(0,0,r,0,TAU);c.clip();for(let i=0;i<3;i++){c.fillStyle=p.colors[i];c.fillRect(-r,-r+i*r*2/3,r*2,r*2/3+.5);}if(name==='venezuela'){for(let i=0;i<8;i++){const a=Math.PI+i*Math.PI/7;star(c,Math.cos(a)*r*.44,Math.sin(a)*r*.44+r*.13,r*.075,'#fff');}}else if(name==='argentina'||name==='original'){c.save();sun(c,r*.29,'#e8b430');c.restore();}else star(c,0,0,r*.35,p.decor);const g=c.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#ffffff66');g.addColorStop(.4,'#ffffff00');g.addColorStop(1,'#00000066');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();c.strokeStyle='#c0d9e577';c.lineWidth=1;c.beginPath();c.arc(x,y,r-.5,0,TAU);c.stroke();
   }
   label(c,s,scale){
     const amount=s.displayScore??s.score,text=S.formatScore(amount)+' '+this.cfg.currency;
     c.font=`600 ${Math.max(10,11/Math.sqrt(scale))}px Consolas,ui-monospace,monospace`;
     // Reserve digits up to the round goal: no width jitter as decimals change.
     const reserve=S.formatScore(Math.max(this.cfg.goal,s.score)).length+1+this.cfg.currency.length;
     const width=c.measureText('0'.repeat(Math.max(reserve,text.length))).width+12,x=s.x,y=s.y-(s.displayRadius??s.radius)-25;
     c.fillStyle='#102b11e0';c.fillRect(x-width/2,y,width,19);c.strokeStyle='#89ba6655';c.lineWidth=1;c.strokeRect(x-width/2,y,width,19);c.fillStyle=this.cfg.textColor;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y+9.5);
   }
   render(world,dt=1/60){
     const c=this.ctx,cfg=this.cfg,p=world.player;this.worldSize=world.size;const cam=this.camera;
     if(!cam.x){cam.x=p.x;cam.y=p.y;}const smooth=1-Math.exp(-dt*4.5);cam.x+=(p.x-cam.x)*smooth;cam.y+=(p.y-cam.y)*smooth;
     const targetScale=cfg.zoom*(this.w<600?.9:1.05)/Math.max(1,Math.sqrt((p.displayRadius??p.radius)/17));cam.scale+=(targetScale-cam.scale)*(1-Math.exp(-dt*2));const z=cam.scale;
     c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#070d14';c.fillRect(0,0,this.w,this.h);c.save();c.translate(this.w/2,this.h*.48);c.scale(z,z);c.translate(-cam.x,-cam.y);
     const left=cam.x-this.w/2/z-100,top=cam.y-this.h*.48/z-100,width=this.w/z+200,height=this.h/z+200;
     this.drawBackground(c,left,top,width,height);
     // The wall is an actual collision boundary, not a wrapping screen edge.
     c.save();c.beginPath();c.rect(left,top,width,height);c.rect(0,0,world.size,world.size);c.fillStyle='#01050bef';c.fill('evenodd');c.strokeStyle='#76ffbf77';c.lineWidth=1.5;c.shadowColor='#3effbc';c.shadowBlur=7;c.strokeRect(0,0,world.size,world.size);c.shadowBlur=0;c.restore();
     const rng=new S.RNG(531);for(let i=0;i<cfg.particles;i++){const x=rng.range(0,1800),y=rng.range(0,1800),size=4+rng.next()*7,xx=Math.floor(left/1800)*1800+x,yy=Math.floor(top/1800)*1800+y;for(let a=0;a<2;a++)for(let b=0;b<2;b++){const px=xx+a*1800,py=yy+b*1800;if(px<left||px>left+width||py<top||py>top+height)continue;const alpha=.5+.35*Math.sin(world.time*1.4+i);c.globalAlpha=alpha;c.drawImage(this.red,px-size/2,py-size/2,size,size);}}c.globalAlpha=1;
     for(const f of world.food){if(f.x<left||f.x>left+width||f.y<top||f.y>top+height)continue;const r=cfg.foodSize*f.size*(1+.035*Math.sin(world.time*3+f.phase));if(cfg.glow>0&&cfg.quality!=='low'){const sz=r*(4.4+cfg.glow);c.globalAlpha=.4*cfg.glow;c.drawImage(this.halo,f.x-sz/2,f.y-sz/2,sz,sz);c.globalAlpha=1;}c.drawImage(this.gold[0],f.x-r*1.68,f.y-r*1.68,r*3.36,r*3.36);}
     const visible=world.snakes.filter(s=>s.alive&&s.points().some(pt=>pt.x>left&&pt.x<left+width&&pt.y>top&&pt.y<top+height));visible.sort((a,b)=>a.radius-b.radius||a.id-b.id);for(const s of visible)this.snake(c,s,world.time);
     for(const e of world.effects){const t=e.age/e.duration;c.globalAlpha=1-t;if(e.type==='eat'){c.strokeStyle='#ffe875';c.lineWidth=2*(1-t);c.beginPath();c.arc(e.x,e.y,e.r*(1+t*.8),0,TAU);c.stroke();}else{for(let j=0;j<16;j++){const a=j*TAU/16,dist=t*90;c.fillStyle=j%2?'#ffe25b':'#e5ae3c';circle(c,e.x+Math.cos(a)*dist,e.y+Math.sin(a)*dist,3*(1-t));}}}c.globalAlpha=1;
     if(cfg.labels&&cfg.numbers)for(const s of visible)this.label(c,s,z);
     if(cfg.lighting<1){c.fillStyle=`rgba(0,0,0,${1-cfg.lighting})`;c.fillRect(left,top,width,height);}else if(cfg.lighting>1){c.globalCompositeOperation='screen';c.fillStyle=`rgba(147,167,140,${(cfg.lighting-1)*.22})`;c.fillRect(left,top,width,height);c.globalCompositeOperation='source-over';}c.restore();
     const vignette=c.createRadialGradient(this.w/2,this.h/2,Math.min(this.w,this.h)*.22,this.w/2,this.h/2,Math.max(this.w,this.h)*.7);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#010711aa');c.fillStyle=vignette;c.fillRect(0,0,this.w,this.h);
   }
   preview(element,time,skin=this.cfg.skin){
     const rect=element.getBoundingClientRect(),w=rect.width||400,h=rect.height||160,dpr=Math.min(devicePixelRatio||1,2);if(element.width!==Math.round(w*dpr)||element.height!==Math.round(h*dpr)){element.width=Math.round(w*dpr);element.height=Math.round(h*dpr);}const c=element.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);c.fillStyle=c.createPattern(this.floor||this.halo,'repeat');c.fillRect(0,0,w,h);
     // Background preview uses the exact uploaded image, fitted into the visible stage.
     if(this.background){c.globalAlpha=this.cfg.backgroundOpacity;const img=this.background,fit=this.cfg.backgroundFit,scale=this.cfg.backgroundScale||1;if(fit==='tile'){c.fillStyle=this.tilePattern(c);c.fillRect(0,0,w,h);}else{const k=(fit==='contain'?Math.min(w/img.width,h/img.height):Math.max(w/img.width,h/img.height))*scale,iw=fit==='stretch'?w*scale:img.width*k,ih=fit==='stretch'?h*scale:img.height*k;c.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);}c.globalAlpha=1;c.fillStyle=`rgba(0,0,0,${this.cfg.backgroundDarken})`;c.fillRect(0,0,w,h);}
     c.fillStyle='#020a1030';c.fillRect(0,0,w,h);for(let i=0;i<Math.round(this.cfg.density*10);i++){const x=w*.32+i*w*.038,y=h*.83+Math.sin(i*.45+time*.5)*6,rr=this.cfg.foodSize*.8;if(this.cfg.glow>0){const z=rr*(4.4+this.cfg.glow);c.globalAlpha=this.cfg.glow*.4;c.drawImage(this.halo,x-z/2,y-z/2,z,z);c.globalAlpha=1;}c.drawImage(this.gold[0],x-rr*1.68,y-rr*1.68,rr*3.36,rr*3.36);}for(let i=0;i<Math.round(this.cfg.particles/20);i++){c.globalAlpha=.6;c.drawImage(this.red,(i*97+21)%w,(i*53+17)%h,6,6);}c.globalAlpha=1;const sc=Math.min(w/650,h/160)*this.cfg.zoom;c.save();c.translate(w*.5,h*.51);c.scale(sc,sc);
     const pts=[];for(let i=0;i<100;i++){const x=255-i*5.2,y=Math.sin(i*.075+time*.55)*33;pts.push({x,y});}const s={alive:true,player:true,x:pts[0].x,y:pts[0].y,angle:Math.atan2(pts[0].y-pts[1].y,pts[0].x-pts[1].x),skin,radius:23,spawnTime:-10,points:()=>pts};this.snake(c,s,10,true);c.restore();
     if(this.cfg.lighting<1){c.fillStyle=`rgba(0,0,0,${1-this.cfg.lighting})`;c.fillRect(0,0,w,h);}else if(this.cfg.lighting>1){c.globalCompositeOperation='screen';c.fillStyle=`rgba(147,167,140,${(this.cfg.lighting-1)*.22})`;c.fillRect(0,0,w,h);c.globalCompositeOperation='source-over';}
   }
 }
 const formatter=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2,minimumFractionDigits:0}),scoreFormatter=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2,minimumFractionDigits:2});
 S.Renderer=Renderer;S.format=v=>formatter.format(Math.max(0,v));S.formatScore=v=>scoreFormatter.format(Math.max(0,v));
})(window.SA);
