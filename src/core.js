'use strict';
(function(S){
  const TAU=Math.PI*2;
  // Frame-rate independent presentation only; simulation scores remain exact.
  S.smoothNumber=(current,target,dt,rate=12)=>{
    if(!Number.isFinite(current))return target;
    const gap=target-current;
    if(Math.abs(gap)<.005)return target;
    const next=current+gap*(-Math.expm1(-rate*Math.max(0,dt)));
    return Math.abs(target-next)<.005?target:next;
  };
  S.angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  class RNG{constructor(seed=20261111){this.n=seed>>>0;}next(){let t=this.n+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}range(a,b){return a+(b-a)*this.next();}}
  class Grid{
    constructor(size=110){this.size=size;this.cells=new Map();this.active=[];}
    clear(){for(const c of this.active)c.length=0;this.active.length=0;}
    // Integer keys and reusable buckets avoid thousands of strings/arrays per step.
    add(o){const k=Math.floor(o.x/this.size)+Math.floor(o.y/this.size)*65536;let c=this.cells.get(k);if(!c)this.cells.set(k,c=[]);if(c.length===0)this.active.push(c);c.push(o);}
    near(x,y,r,out=[]){out.length=0;for(let i=Math.floor((x-r)/this.size);i<=Math.floor((x+r)/this.size);i++)for(let j=Math.floor((y-r)/this.size);j<=Math.floor((y+r)/this.size);j++){const c=this.cells.get(i+j*65536);if(c)for(let k=0;k<c.length;k++)out.push(c[k]);}return out;}
  }
  function compact(list,keep){let n=0;for(let i=0;i<list.length;i++){const value=list[i];if(keep(value))list[n++]=value;}list.length=n;}
  const alive=o=>o.alive,liveSnake=s=>s.player||s.alive,liveEffect=e=>e.age<e.duration;
  class Snake{
    constructor(world,player=false){
      this.id=world.nextId++;this.player=player;this.alive=true;this.angle=world.rng.range(-Math.PI,Math.PI);this.desired=this.angle;this.velocity=0;this.score=player?world.cfg.initialScore:world.randomBotScore();this.length=player?world.cfg.initialLength:world.rng.range(300,1350)*world.cfg.aiSize;this.skin=player?world.cfg.skin:world.randomSkin();this.preferredSkin=this.skin;
      const pos=world.spawnPosition(player);this.x=pos.x;this.y=pos.y;if(!player&&world.player){this.angle=Math.atan2(world.player.y-this.y,world.player.x-this.x)+world.rng.range(-.6,.6);this.desired=this.angle;}this.spawnTime=world.time;this.trail=[];this.think=0;this.target=null;this.boost=false;this.boostClock=0;this.collected=0;this.kills=0;
      let tx=this.x,ty=this.y;for(let d=5;d<this.length+20;d+=5){const a=this.angle+Math.sin(d/160)*.85;tx-=Math.cos(a)*5;ty-=Math.sin(a)*5;this.trail.push({x:tx,y:ty});}
      this.lastSample={x:this.x,y:this.y};
      this.displayScore=this.score;this.displayRadius=this.radius;
    }
    get radius(){return S.clamp(11+Math.sqrt(Math.max(0,this.score))/42,12,30)*(this.player?1:Math.sqrt(this.worldSize||1));}
    points(){
      if(this._points)return this._points;
      const pts=this._pointBuffer||(this._pointBuffer=[]),head=this._headPoint||(this._headPoint={x:0,y:0}),tail=this._tailPoint||(this._tailPoint={x:0,y:0});head.x=this.x;head.y=this.y;pts[0]=head;
      let d=0,prev=head,n=1,minX=this.x,maxX=this.x,minY=this.y,maxY=this.y;
      for(const p of this.trail){const distance=Math.hypot(p.x-prev.x,p.y-prev.y);d+=distance;let point=p;
        if(d>=this.length){const k=(d-this.length)/(distance||1);tail.x=p.x+(prev.x-p.x)*k;tail.y=p.y+(prev.y-p.y)*k;point=tail;}
        pts[n++]=point;minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);
        if(d>=this.length)break;prev=p;
      }
      pts.length=n;const bounds=this.bounds||(this.bounds={});bounds.minX=minX;bounds.maxX=maxX;bounds.minY=minY;bounds.maxY=maxY;this._points=pts;return pts;
    }
    advance(dt,cfg){
      this._points=null;
      const diff=S.angleDiff(this.desired,this.angle);this.angle+=S.clamp(diff,-cfg.turnRate*dt,cfg.turnRate*dt);
      const base=this.player?cfg.speed:cfg.aiSpeed;
      const target=this.boost&&cfg.boosting&&this.score>800?cfg.maxSpeed:Math.min(base,cfg.maxSpeed);
      this.velocity+=S.clamp(target-this.velocity,-cfg.acceleration*dt,cfg.acceleration*dt);
      this.x+=Math.cos(this.angle)*this.velocity*dt;this.y+=Math.sin(this.angle)*this.velocity*dt;
      let dx=this.x-this.lastSample.x,dy=this.y-this.lastSample.y,dist=Math.hypot(dx,dy);
      while(dist>=5){const p={x:this.lastSample.x+dx/dist*5,y:this.lastSample.y+dy/dist*5};this.trail.unshift(p);this.lastSample=p;dx=this.x-p.x;dy=this.y-p.y;dist=Math.hypot(dx,dy);}
      this.trail.length=Math.min(this.trail.length,Math.ceil(this.length/5)+6);
    }
  }
  class World{
    constructor(cfg,seed=Date.now()){this.cfg=cfg;this.rng=new RNG(seed);this.nextId=1;this.time=0;this.food=[];this.snakes=[];this.effects=[];this.foodGrid=new Grid();this.bodyGrid=new Grid(90);this.foodNear=[];this.bodyNear=[];this.deaths=new Map();this.demo=true;this.respawnClock=0;this.foodClock=0;this.goalReached=false;this.size=cfg.mapSize;this.onEnd=null;this.onEat=null;this.reset();}
    randomBotScore(){
      // Anchor new opponents to this round's starting score, not the growing player score.
      // Averaging two samples favours comparable opponents over the ends of the range.
      const base=this.roundInitialScore;
      const min=Math.round(base*.5),max=Math.round(base*3);
      return Math.round(min+(max-min)*(this.rng.next()+this.rng.next())*.5);
    }
    randomSkin(){if(!this.cfg.variety)return'jade';return S.botSkins[Math.floor(this.rng.next()*S.botSkins.length)];}
    spawnPosition(player){
      if(player)return{x:this.size*.5,y:this.size*.5};
      for(let i=0;i<35;i++){const p=this.player;const angle=this.rng.range(0,TAU),rad=this.rng.range(560,Math.min(1700,this.size*.38));const x=S.clamp((p?.x||this.size/2)+Math.cos(angle)*rad,160,this.size-160),y=S.clamp((p?.y||this.size/2)+Math.sin(angle)*rad,160,this.size-160);if(!this.snakes.some(s=>Math.hypot(x-s.x,y-s.y)<180))return{x,y};}return{x:this.rng.range(200,this.size-200),y:this.rng.range(200,this.size-200)};
    }
    reset(){
      this.appliedFoodValue=this.cfg.foodValue;this.roundInitialScore=this.cfg.initialScore;this.time=0;this.size=this.cfg.mapSize;this.food=[];this.snakes=[];this.effects=[];this.goalReached=false;this.foodClock=0;this.respawnClock=0;this.player=new Snake(this,true);this.player.angle=-.65;this.player.desired=-.65;
      this.player.trail=[];let tx=this.player.x,ty=this.player.y;for(let d=5;d<this.player.length+20;d+=5){const a=-.65+.7*Math.sin(d/125);tx-=Math.cos(a)*5;ty-=Math.sin(a)*5;this.player.trail.push({x:tx,y:ty});}
      this.snakes.push(this.player);for(let i=0;i<this.botTarget();i++)this.addBot();this.populateFood(this.cfg.foodCount);
      // A discoverable first gold trail, not a scripted score increase.
      for(let i=0;i<14;i++){const t=i*.05;this.addFood(this.player.x+60+Math.cos(-.8+t)*i*13,this.player.y-45-Math.sin(.8+t)*i*13,1.25);}
      this.reindex();
    }
    botTarget(){const c=this.cfg;return c.aiEnabled?S.clamp(Math.round(c.aiCount),Math.round(c.aiMin),Math.round(c.aiMax)):0;}
    addBot(){const s=new Snake(this);s.worldSize=this.cfg.aiSize;this.snakes.push(s);return s;}
    addFood(x,y,rich=1,dropped=false){if(this.food.length>8500)return;this.food.push({id:this.nextId++,x:S.clamp(x,35,this.size-35),y:S.clamp(y,35,this.size-35),size:this.rng.range(.72,1.2)*rich,value:this.cfg.foodValue*rich,rewardScale:dropped?null:rich,dropped,phase:this.rng.range(0,TAU),alive:true});}
    populateFood(n){
      while(this.food.length<n){const near=this.rng.next()<.62,px=near?this.player.x:this.rng.range(150,this.size-150),py=near?this.player.y:this.rng.range(150,this.size-150);const x=S.clamp(px+this.rng.range(-1100,1100),120,this.size-120),y=S.clamp(py+this.rng.range(-1100,1100),120,this.size-120);if(this.rng.next()<.83){const a=this.rng.range(0,TAU),bend=this.rng.range(-1.3,1.3),len=Math.min(n-this.food.length,Math.floor(this.rng.range(18,65)*this.cfg.density));for(let i=0;i<len;i++){const t=i/len*Math.PI*1.8;this.addFood(x+Math.cos(a)*i*11+Math.sin(t)*bend*85,y+Math.sin(a)*i*11+Math.cos(t)*bend*85,this.rng.range(.8,1.35));}}else this.addFood(x,y,.7);}
    }
    reindex(){this.foodGrid.clear();for(const f of this.food)if(f.alive)this.foodGrid.add(f);this.bodyGrid.clear();for(const s of this.snakes){if(!s.alive)continue;const pts=s.points(),radius=s.radius,pool=s._bodySamples||(s._bodySamples=[]);for(let i=0,k=0;i<pts.length;i+=3,k++){const b=pool[k]||(pool[k]={snake:s});b.x=pts[i].x;b.y=pts[i].y;b.offset=i*5;b.r=radius*(i>pts.length-8?.7:1);this.bodyGrid.add(b);}}}
    ai(s,dt){
      s.think-=dt;if(s.think>0)return;s.think=this.rng.range(.12,.5)/this.cfg.turnFrequency;
      let vx=Math.cos(s.angle)*.5,vy=Math.sin(s.angle)*.5;
      const search=380;const candidates=this.foodGrid.near(s.x,s.y,search,this.foodNear);let best=null,bestScore=Infinity;
      for(const f of candidates){if(!f.alive)continue;const d=Math.hypot(f.x-s.x,f.y-s.y);const penalty=1+Math.abs(S.angleDiff(Math.atan2(f.y-s.y,f.x-s.x),s.angle))*.8;const rank=d*penalty/(f.size+.2);if(rank<bestScore){bestScore=rank;best=f;}}
      if(best&&this.cfg.appetite>0){const d=Math.hypot(best.x-s.x,best.y-s.y)||1;vx+=(best.x-s.x)/d*2*this.cfg.appetite;vy+=(best.y-s.y)/d*2*this.cfg.appetite;}
      const avoidDist=105+s.radius*2;for(const b of this.bodyGrid.near(s.x,s.y,avoidDist,this.bodyNear)){if(b.snake===s)continue;const dx=s.x-b.x,dy=s.y-b.y,d=Math.hypot(dx,dy);if(d<avoidDist&&d>1){const w=Math.pow(1-d/avoidDist,2)*7*this.cfg.difficulty;vx+=dx/d*w;vy+=dy/d*w;}}
      if(this.cfg.aggression>0&&s!==this.player&&this.player.alive){const p=this.player,d=Math.hypot(p.x-s.x,p.y-s.y);if(d<450&&d>100){const tx=p.x+Math.cos(p.angle)*100,ty=p.y+Math.sin(p.angle)*100;const dd=Math.hypot(tx-s.x,ty-s.y)||1;vx+=(tx-s.x)/dd*this.cfg.aggression;vy+=(ty-s.y)/dd*this.cfg.aggression;}}
      const edge=240;if(s.x<edge)vx+=(edge-s.x)/40;if(s.x>this.size-edge)vx-=(s.x-(this.size-edge))/40;if(s.y<edge)vy+=(edge-s.y)/40;if(s.y>this.size-edge)vy-=(s.y-(this.size-edge))/40;
      vx+=this.rng.range(-.2,.2);vy+=this.rng.range(-.2,.2);s.desired=Math.atan2(vy,vx);
    }
    collect(s,f){
      if(!f.alive||!s.alive)return;f.alive=false;s.score+=f.value;s.length=Math.min(this.cfg.maxLength,s.length+this.cfg.growth*f.size);s.collected++;s._points=null;
      if(s.player){if(this.cfg.absorption)this.effects.push({x:s.x,y:s.y,age:0,duration:.45,type:'eat',r:s.radius});if(this.onEat)this.onEat(f);}
    }
    kill(s,killer){
      if(!s.alive)return;s.alive=false;if(killer&&killer!==s)killer.kills++;
      const pts=s.points(),count=Math.min(90,Math.max(8,Math.ceil(s.length/30))),stride=Math.max(1,Math.floor(pts.length/count)),val=Math.max(this.cfg.foodValue,s.score/count*.55);
      for(let i=0;i<pts.length;i+=stride){this.addFood(pts[i].x+this.rng.range(-s.radius*.5,s.radius*.5),pts[i].y+this.rng.range(-s.radius*.5,s.radius*.5),1.3,true);if(this.food.length){this.food[this.food.length-1].value=val;}}
      if(this.cfg.collisionEffects)this.effects.push({x:s.x,y:s.y,age:0,duration:.8,type:'death',r:s.radius});
      if(s.player&&!this.demo&&!this.goalReached){this.goalReached=true;this.onEnd?.(false);}
    }
    sync(){
      if(this.appliedFoodValue!==this.cfg.foodValue){
        for(const f of this.food)if(f.alive&&Number.isFinite(f.rewardScale))f.value=this.cfg.foodValue*f.rewardScale;
        this.appliedFoodValue=this.cfg.foodValue;
      }
      this.player.skin=this.cfg.skin;this.player.length=Math.min(this.player.length,this.cfg.maxLength);this.player._points=null;
      const target=this.botTarget();const live=this.snakes.filter(s=>!s.player&&s.alive);if(live.length>target){const ids=new Set(live.slice(target));this.snakes=this.snakes.filter(s=>!ids.has(s));}
      this.food=this.food.filter(f=>f.alive).slice(0,this.cfg.foodCount+800);
      for(const s of this.snakes)if(!s.player){s.worldSize=this.cfg.aiSize;if(!S.botSkins.includes(s.preferredSkin)||(this.cfg.variety&&this._previousVariety===false)){s.preferredSkin=this.randomSkin();}s.skin=this.cfg.variety?s.preferredSkin:'jade';}this._previousVariety=this.cfg.variety;
    }
    update(dt,input={}){
      if(this.goalReached&&!this.demo)return;this.time+=dt;const p=this.player;
      if(this.demo&&p.alive)this.ai(p,dt);else if(p.alive){if(Number.isFinite(input.angle))p.desired=input.angle;p.boost=!!input.boost&&this.cfg.boosting;}
      for(const s of this.snakes){if(!s.alive)continue;if(!s.player)this.ai(s,dt);s.advance(dt,this.cfg);
        if(s.boost&&this.cfg.boosting&&s.score>800){s.score=Math.max(800,s.score-dt*80);s.length=Math.max(180,s.length-dt*8);s.boostClock+=dt;if(s.boostClock>.3){s.boostClock=0;const tail=s.trail[s.trail.length-1];if(tail)this.addFood(tail.x,tail.y,.65,true);}}
      }
      this.reindex();const deaths=this.deaths;deaths.clear();
      for(const s of this.snakes){if(!s.alive)continue;
        for(const f of this.foodGrid.near(s.x,s.y,s.radius+70,this.foodNear)){const dx=s.x-f.x,dy=s.y-f.y,d=Math.hypot(dx,dy);if(d<s.radius+this.cfg.foodSize*f.size){this.collect(s,f);}else if(s.player&&d<s.radius+60){const pull=(1-d/(s.radius+60))*220*dt;f.x+=dx/(d||1)*pull;f.y+=dy/(d||1)*pull;}}
        if(s.x<s.radius||s.y<s.radius||s.x>this.size-s.radius||s.y>this.size-s.radius){if(this.cfg.collision==='safe'||this.demo&&s.player){s.x=S.clamp(s.x,s.radius+2,this.size-s.radius-2);s.y=S.clamp(s.y,s.radius+2,this.size-s.radius-2);s.desired=Math.atan2(this.size/2-s.y,this.size/2-s.x);s.angle=s.desired;}else deaths.set(s,null);}
        if(this.cfg.collision==='safe'||this.time-s.spawnTime<4)continue;
        for(const b of this.bodyGrid.near(s.x,s.y,s.radius+34,this.bodyNear)){if(b.snake===s||!b.snake.alive||this.time-b.snake.spawnTime<3)continue;if(this.cfg.collision==='body-only'&&b.offset<40)continue;if(s.player&&this.cfg.playerCollisionAssist&&b.offset<this.cfg.playerHeadGrace)continue;if(Math.hypot(s.x-b.x,s.y-b.y)<s.radius*.65+b.r*.8){deaths.set(s,b.snake);break;}}
      }
      for(const [s,k] of deaths)this.kill(s,k);
      compact(this.food,alive);compact(this.snakes,liveSnake);
      this.foodClock+=dt*this.cfg.foodRate;const add=Math.min(Math.floor(this.foodClock),this.cfg.foodCount-this.food.length);this.foodClock-=Math.floor(this.foodClock);if(add>0)this.populateFood(this.food.length+add);
      if(!p.alive&&this.demo){this.player=new Snake(this,true);this.snakes=this.snakes.filter(s=>!s.player);this.snakes.unshift(this.player);}
      this.respawnClock+=dt;if(this.respawnClock>=this.cfg.respawn){this.respawnClock=0;const gap=this.botTarget()-this.snakes.filter(s=>s.alive&&!s.player).length;for(let i=0;i<gap;i++)this.addBot();}
      for(const e of this.effects)e.age+=dt;compact(this.effects,liveEffect);if(this.effects.length>200)this.effects.splice(0,this.effects.length-200);
      // Reaching the target only fills the progress bar. The round ends when the player crosses the arena boundary or collides.
    }
  }
  Object.assign(S,{RNG,Grid,Snake,World});
})(window.SA);
