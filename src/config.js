'use strict';
window.SA = window.SA || {};
(function (S) {
  S.version = 1;
  S.defaults = {
    skin:'original', primary:'#88c8ed', secondary:'#fff6dd', tertiary:'#83c4e8', head:'#91cce9', eyes:'#ffffff', highlight:'#ffffff', decor:'#e6a028', pattern:'spots', patternSize:1, patternGap:56, skinGlow:.2, material:1,
    arena:'stone', floor:'brick', environment:'#24313a', decorations:1, particles:220, lighting:1, glow:1, shadows:.7, absorption:true, collisionEffects:true, quality:'high', adaptiveQuality:true, zoom:1, wheelZoom:true, wheelZoomSpeed:1, boostGlow:true, boostGlowColor:'#a4efff', boostGlowIntensity:1, density:1,
    background:'', backgroundName:'', backgroundPreset:'custom', backgroundFit:'cover', backgroundScale:1, backgroundOpacity:1, backgroundDarken:.3,
    initialLength:700, initialScore:3000, speed:145, maxSpeed:265, turnRate:3.4, acceleration:350, growth:4, foodCount:1700, foodSize:7, goal:150000, mapSize:4800, foodRate:18, foodValue:240, collision:'classic', boosting:true, maxLength:4200,
    aiEnabled:true, aiCount:14, aiMin:8, aiMax:24, aiSpeed:125, difficulty:.8, aggression:.25, appetite:1, turnFrequency:.8, aiSize:1, respawn:5, variety:true,
    numbers:true, uiPosition:'top', uiScale:1, textColor:'#b0efa6', progressColor:'#2bfa1b', joystick:'glass', labels:true, currency:'ARS', language:'ru', sound:false
  };
  // Each control has a single source of truth; imported values use the same constraints.
  S.schema = [
    ['skin','Скин','select',['original','venezuela','argentina','bolivia','peru','custom','brazil','leopard','jade','ruby']],
    ['primary','Основной цвет','color'],['secondary','Вторичный цвет','color'],['tertiary','Дополнительный цвет','color'],['head','Цвет головы','color'],['eyes','Цвет глаз','color'],['highlight','Цвет бликов','color'],['decor','Цвет декора','color'],
    ['pattern','Форма узора','select',['spots','sun','stars','scales','diamonds','none']],['patternSize','Размер узоров','range',.4,2.5,.1],['patternGap','Расстояние узоров','range',20,140,1],['skinGlow','Свечение материала','range',0,1,.05],['material','Яркость материала','range',.5,1.6,.05],
    ['arena','Арена','select',['stone','mechanical','nature','cavern','moss','volcanic','crystal','abyss','desert']],['floor','Текстура пола','select',['brick','slate','noise']],['environment','Цвет окружения','color'],['decorations','Плотность декора','range',0,2,.1],['particles','Красные частицы','range',0,700,10],['lighting','Освещение','range',.35,1.5,.05],['glow','Свечение золота','range',0,2,.1],['shadows','Глубина теней','range',0,1,.05],['absorption','Эффект поглощения','check'],['collisionEffects','Эффект столкновений','check'],['quality','Качество графики','select',['high','medium','low']],['adaptiveQuality','Автооптимизация при просадках FPS','check'],['zoom','Масштаб камеры','range',.5,1.8,.05],['wheelZoom','Масштабирование колёсиком мыши','check'],['wheelZoomSpeed','Чувствительность колёсика','range',.2,3,.1],['boostGlow','Свечение игрока при ускорении','check'],['boostGlowColor','Цвет свечения при ускорении','color'],['boostGlowIntensity','Сила свечения при ускорении','range',0,2,.1],['density','Плотность золотых дорожек','range',.3,2,.1],
    ['backgroundPreset','Коллекция фонов из видео','select',['custom','procedural','video1','video2','video3','video4','video5','video6']],
    ['backgroundFit','Отображение фона','select',['cover','contain','stretch','tile']],['backgroundScale','Масштаб изображения (меньше — чётче)','range',.25,2,.05],['backgroundOpacity','Непрозрачность фона','range',0,1,.05],['backgroundDarken','Затемнение фона','range',0,.9,.05],
    ['initialLength','Начальная длина (новый раунд)','range',180,1800,10],['initialScore','Начальные очки (новый раунд)','range',0,30000,1],['speed','Скорость','range',60,260,5],['maxSpeed','Максимальная скорость','range',100,480,5],['turnRate','Скорость поворота (рад/с)','range',1,7,.1],['acceleration','Ускорение','range',50,900,25],['growth','Рост за объект','range',.5,18,.5],['foodCount','Количество еды','range',200,5000,100],['foodSize','Размер еды','range',3,13,.5],['goal','Цель раунда','range',1,500000,1],['mapSize','Размер мира (новый раунд)','range',2400,9000,100],['foodRate','Появление еды (объектов/с)','range',0,80,1],['foodValue','Очки за золотой объект','range',50,1500,10],['collision','Правила столкновений','select',['classic','body-only','safe']],['boosting','Разрешить ускорение','check'],['maxLength','Максимальная длина','range',1000,8000,100],
    ['aiEnabled','AI-противники','check'],['aiCount','Желаемое количество','range',0,36,1],['aiMin','Минимум противников','range',0,30,1],['aiMax','Максимум противников','range',0,40,1],['aiSpeed','Скорость AI','range',50,260,5],['difficulty','Навык избегания столкновений','range',0,1,.05],['aggression','Агрессивность','range',0,1,.05],['appetite','Активность поиска еды','range',0,2,.1],['turnFrequency','Частота смены направления','range',.2,3,.1],['aiSize','Размеры противников','range',.5,2,.1],['respawn','Задержка возрождения (с)','range',1,20,1],['variety','Разнообразные скины','check'],
    ['numbers','Числовые показатели','check'],['uiPosition','Расположение HUD','select',['top','bottom']],['uiScale','Размер интерфейса','range',.75,1.35,.05],['textColor','Цвет текста','color'],['progressColor','Цвет прогресс-бара','color'],['joystick','Вид джойстика','select',['glass','solid','minimal']],['labels','Плашки над змеями','check'],['currency','Название валюты / единиц очков','text',40],['language','Язык игры / Idioma del juego','select',['ru','es']],['sound','Звук сбора','check']
  ];
  S.clone = o => JSON.parse(JSON.stringify(o));
  S.clamp = (x,a,b) => Math.min(b,Math.max(a,x));
  S.sanitize = raw => {
    const r = S.clone(S.defaults);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return r;
    for (const [key,,type,a,b] of S.schema) {
      const v = raw[key];
      if(type==='text' && typeof v==='string') r[key]=v.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,a);
      if (type==='range' && typeof v==='number' && Number.isFinite(v)) r[key]=S.clamp(v,a,b);
      else if (type==='check' && typeof v==='boolean') r[key]=v;
      else if (type==='color' && typeof v==='string' && /^#[0-9a-f]{6}$/i.test(v)) r[key]=v;
      else if (type==='select' && a.includes(v)) r[key]=v;
    }
    if (typeof raw.background==='string' && raw.background.length<=18000000 && /^data:image\/(png|jpeg);base64,[a-z0-9+/=]+$/i.test(raw.background)) r.background=raw.background;
    if(typeof raw.backgroundName==='string') r.backgroundName=raw.backgroundName.slice(0,120);
    r.aiMax=Math.max(r.aiMin,r.aiMax); r.maxSpeed=Math.max(r.speed,r.maxSpeed);r.maxLength=Math.max(r.initialLength,r.maxLength);
    return r;
  };
  S.palettes = {
    original:{colors:['#83bedc','#fff6df','#87c5e4'],decor:'#dc982f',pattern:'spots',eye:'#ffffff',highlight:'#ffffff'},
    argentina:{colors:['#80c6ed','#fff9e9','#80c6ed'],decor:'#e3ac33',pattern:'sun',eye:'#ffffff',highlight:'#ffffff'},
    venezuela:{colors:['#f7d52b','#133cc5','#e52e42'],decor:'#ffffff',pattern:'stars',eye:'#ffffff',highlight:'#fffde6'},
    peru:{colors:['#d91023','#ffffff','#d91023'],decor:'#d91023',pattern:'none',eye:'#ffffff',highlight:'#ffffff'},
    bolivia:{colors:['#d52b1e','#f9e300','#007934'],decor:'#f9e300',pattern:'none',eye:'#ffffff',highlight:'#fffde6'},
    brazil:{colors:['#169852','#e5d137','#17633d'],decor:'#234ed2',pattern:'diamonds',eye:'#ffffff',highlight:'#d1ffb6'},
    jade:{colors:['#226c45','#67b361','#205d3c'],decor:'#a4c96a',pattern:'scales',eye:'#f5f7e4',highlight:'#c6ffc7'},
    ruby:{colors:['#63203e','#cf3b82','#841f48'],decor:'#321b40',pattern:'scales',eye:'#ffffff',highlight:'#ffbad7'},
    leopard:{colors:['#9b5520','#eab750','#b37725'],decor:'#4a2d1b',pattern:'spots',rosettes:true,eye:'#fff9e9',highlight:'#ffe7b6'},
    emerald:{colors:['#174e40','#45a780','#226956'],decor:'#a3d2a2',pattern:'scales',eye:'#f4fff7',highlight:'#a9efd2'},
    moss:{colors:['#354932','#83995b','#4b6040'],decor:'#c5c791',pattern:'scales',eye:'#fffbe8',highlight:'#d6e5b8'},
    teal:{colors:['#194c56','#4b9eaa','#21616c'],decor:'#a0d1c7',pattern:'scales',eye:'#efffff',highlight:'#bceef1'},
    amethyst:{colors:['#40315e','#9977b8','#58446f'],decor:'#d6b1da',pattern:'scales',eye:'#fff3ff',highlight:'#e5caff'},
    plum:{colors:['#4d263e','#a05b86','#653551'],decor:'#df9db9',pattern:'scales',eye:'#fff4f8',highlight:'#f4c1d9'},
    coral:{colors:['#713d3d','#c47b77','#90504c'],decor:'#f1bc9d',pattern:'spots',eye:'#fff7ed',highlight:'#ffd6c5'},
    amber:{colors:['#845727','#d5a757','#a77739'],decor:'#573c25',pattern:'spots',rosettes:true,eye:'#fffbe9',highlight:'#ffe0a4'},
    copper:{colors:['#653b2c','#b97950','#824a32'],decor:'#3d2925',pattern:'spots',rosettes:true,eye:'#fff4e6',highlight:'#eec7a1'},
    snowleopard:{colors:['#596871','#b0bab8','#74858a'],decor:'#38454d',pattern:'spots',rosettes:true,eye:'#f6ffff',highlight:'#e1edf0'}
  };
  // Country skins are intentionally absent; spawn and settings sync share this list.
  S.botSkins=Object.freeze(['jade','leopard','ruby','emerald','moss','teal','amethyst','plum','coral','amber','copper','snowleopard']);
  S.getPalette = (name,cfg) => name==='custom' ? {colors:[cfg.primary,cfg.secondary,cfg.tertiary],decor:cfg.decor,pattern:cfg.pattern,head:cfg.head,eye:cfg.eyes,highlight:cfg.highlight} : S.palettes[name]||S.palettes.original;
  S.storage={
    get(key,fallback){try{return JSON.parse(localStorage.getItem('serpent.'+key))??fallback;}catch{return fallback;}},
    put(key,value){localStorage.setItem('serpent.'+key,JSON.stringify(value));},
    settings(){return S.sanitize(this.get('settings',S.defaults));}
  };
  // Large images live in IndexedDB, not in the small synchronous LocalStorage quota.
  let assetDB,saveQueue=Promise.resolve(),storedBackground;
  function database(){
    return assetDB||(assetDB=new Promise((resolve,reject)=>{
      const req=indexedDB.open('serpent-assets',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('images');
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>{assetDB=null;reject(req.error);};
      req.onblocked=()=>{assetDB=null;reject(Error('Хранилище фонов заблокировано другой вкладкой'));};
    }));
  }
  S.storage.saveSettings=function(cfg){
    const snapshot={...cfg};
    saveQueue=saveQueue.catch(()=>{}).then(async()=>{
      if(snapshot.background.length>64000){
        if(storedBackground!==snapshot.background){
          const db=await database();
          await new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(snapshot.background,'arena');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
          storedBackground=snapshot.background;
        }
        this.put('settings',{...snapshot,background:'',backgroundStored:true});
      }else this.put('settings',snapshot);
    });
    return saveQueue;
  };
  S.storage.restoreBackground=async function(cfg){
    const saved=this.get('settings',{});if(!saved.backgroundStored||cfg.background)return;
    const name=cfg.backgroundName,db=await database();
    const data=await new Promise((resolve,reject)=>{const req=db.transaction('images').objectStore('images').get('arena');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    if(!cfg.background&&cfg.backgroundName===name&&typeof data==='string'){
      const valid=S.sanitize({background:data}).background;if(valid){cfg.background=valid;storedBackground=valid;}
    }
  };
})(window.SA);
