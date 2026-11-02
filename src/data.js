export const palettes = [
  {id:'pop',name:'Hoople Violet',subtitle:'Bold & playful',accent:'#A41CED',bg:'#F9F5FF',soft:'#E8D1FC',ink:'#211A2C'},
  {id:'citrus',name:'Noir Lilac',subtitle:'Quiet & editorial',accent:'#6236AE',bg:'#F8F7FB',soft:'#DDD0F6',ink:'#211D2A'},
  {id:'sunset',name:'Deep Plum',subtitle:'Warm & modern',accent:'#852BBA',bg:'#FCF8FF',soft:'#EEDCF7',ink:'#281C30'},
  {id:'cloud',name:'Mono Mode',subtitle:'Black & white',accent:'#2B2532',bg:'#FAFAFC',soft:'#E5E1EB',ink:'#16131B'}
];
export const templates = [
  {id:'passport',name:'Digital Passport',emoji:'🎟️',gradient:'#E8D1FC'},
  {id:'hunt',name:'Treasure Hunt',emoji:'🗺️',gradient:'#DCD2EF'},
  {id:'quiz',name:'Interactive Quiz',emoji:'🧠',gradient:'#EBE7F1'}
];
export const getPalette = id => palettes.find(p=>p.id===id)||palettes[0];
export const getTemplate = id => templates.find(t=>t.id===id)||templates[0];
export function getBrand(exp){
  const palette=getPalette(exp?.palette);
  return {name:'',tagline:'',logo:'',logoUrl:'',cover:'',coverUrl:'',coverMobile:'',coverDesktop:'',coverMobileUrl:'',coverDesktopUrl:'',accent:palette.accent,bg:palette.bg,soft:palette.soft,ink:palette.ink,font:'grotesk',...exp?.brand};
}
export const uid=()=>Math.random().toString(36).slice(2,10);
export const slugify=(s='')=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45);

const missionsByLanguage={
  id:{
    passport:[
      {kind:'checkin',name:'Check-in festival',description:'Konfirmasi kehadiranmu di area event.',points:10},
      {kind:'qr',name:'Scan QR booth',description:'Temukan QR di booth dan pindai untuk mendapatkan poin.',points:20},
      {kind:'photo',name:'Foto momen terbaik',description:'Ambil foto di area aktivitas sebagai bukti.',points:15},
      {kind:'qr',name:'Scan QR final',description:'Selesaikan perjalanan di titik terakhir.',points:25}
    ],
    hunt:[
      {kind:'qr',name:'Temukan petunjuk pertama',description:'Cari QR di titik pertama untuk membuka poin.',points:20},
      {kind:'photo',name:'Foto lokasi rahasia',description:'Ambil foto dari lokasi yang berhasil ditemukan.',points:15},
      {kind:'checkin',name:'Check-in garis akhir',description:'Konfirmasi kamu sudah tiba di tujuan.',points:10}
    ],
    quiz:[
      {name:'Soal 01',question:'Apa yang kamu dapat setelah menyelesaikan tantangan?',options:['Kartu parkir','Poin pengalaman','Nomor antrean','Buku panduan'],correctIndex:1,points:10},
      {name:'Soal 02',question:'Aktivitas mana yang bisa menjadi misi digital?',options:['Hanya membaca poster','Mengganti wallpaper','Check-in, foto, atau scan QR','Mematikan ponsel'],correctIndex:2,points:10},
      {name:'Soal 03',question:'Bagaimana peserta membuka reward dalam experience ini?',options:['Menyelesaikan misi yang dibutuhkan','Menutup browser','Melewati semua soal','Menghapus histori'],correctIndex:0,points:10}
    ]
  },
  en:{
    passport:[
      {kind:'checkin',name:'Festival check-in',description:'Confirm your arrival at the event.',points:10},
      {kind:'qr',name:'Scan booth QR',description:'Find the booth QR and scan it to earn points.',points:20},
      {kind:'photo',name:'Capture your moment',description:'Take a photo at the activity area as proof.',points:15},
      {kind:'qr',name:'Final QR checkpoint',description:'Complete the journey at the final station.',points:25}
    ],
    hunt:[
      {kind:'qr',name:'Find the first clue',description:'Discover the QR at your first stop.',points:20},
      {kind:'photo',name:'Photograph the secret spot',description:'Capture the hidden location you found.',points:15},
      {kind:'checkin',name:'Finish-line check-in',description:'Confirm you made it to the destination.',points:10}
    ],
    quiz:[
      {name:'Question 01',question:'What do you earn after completing a challenge?',options:['A parking ticket','Experience points','A queue number','A guidebook'],correctIndex:1,points:10},
      {name:'Question 02',question:'Which activities can become digital missions?',options:['Only reading a poster','Changing your wallpaper','Check-in, photo, or QR scan','Turning off your phone'],correctIndex:2,points:10},
      {name:'Question 03',question:'How does a participant unlock a reward here?',options:['Complete the required missions','Close the browser','Skip all questions','Clear browsing history'],correctIndex:0,points:10}
    ]
  }
};

export function makeMission(type,index,locale='id',kindOverride){
  const lang=locale==='en'?'en':'id';
  const entries=missionsByLanguage[lang][type]||missionsByLanguage[lang].passport;
  const sample=entries[index%entries.length];
  const isQuiz=type==='quiz';
  const kind=isQuiz?'quiz':(kindOverride||sample.kind);
  const n=index+1;
  const label=lang==='id'?{checkin:'Check-in',photo:'Misi foto',qr:'Scan QR'}:{checkin:'Check-in',photo:'Photo task',qr:'QR scan'};
  return {
    id:uid(),kind,name:index<entries.length?sample.name:(isQuiz?(lang==='id'?'Soal ':'Question ')+String(n).padStart(2,'0'):`${label[kind]} ${n}`),
    description:isQuiz?(lang==='id'?'Pilih satu jawaban yang paling tepat.':'Choose one correct answer.'):(sample.kind===kind?sample.description:(lang==='id'?'Selesaikan aktivitas ini untuk mendapat poin.':'Complete this activity to earn points.')),
    code:(type==='hunt'?'HUNT':'BOOTH')+'-'+String(n).padStart(2,'0'),
    points:sample.points||10,
    ...(isQuiz?{question:sample.question,options:[...sample.options],correctIndex:sample.correctIndex}:{})
  };
}
export function missionDefaults(type,locale='id'){return Array.from({length:type==='passport'?4:3},(_,i)=>makeMission(type,i,locale))}
export function missionKind(m,type){return type==='quiz'?'quiz':(['checkin','photo','qr'].includes(m?.kind)?m.kind:'qr')}
export const rewardFootnoteDefault=locale=>locale==='en'?'One reward per participant. Available while supplies last.':'Satu hadiah per peserta. Berlaku selama persediaan masih ada.';
export function normalizeExperience(exp,locale='id'){
  if(!exp || !Array.isArray(exp.missions))return exp;
  return {...exp,brand:getBrand(exp),reward:{image:'',imageUrl:'',footnote:rewardFootnoteDefault(locale),...exp.reward},publication:{mode:'now',timezone:'Asia/Jakarta',startsAt:'',...exp.publication},missions:exp.missions.map((m,i)=>{
    const kind=exp.type==='quiz'?'quiz':(m.kind||(['checkin','qr','photo','qr'][i%4]));
    const base=makeMission(exp.type,i,locale,kind);
    return {...base,...m,kind,points:Math.max(0,Number(m.points??base.points)||0),
      ...(kind==='quiz'?{question:m.question||base.question,options:Array.isArray(m.options)&&m.options.length===4?m.options:base.options,correctIndex:Number.isInteger(m.correctIndex)&&m.correctIndex>=0&&m.correctIndex<4?m.correctIndex:base.correctIndex}:{})};
  })};
}
export function createExperience(props={}){
  const type=props.type||'passport',isID=props.locale!=='en';
  return normalizeExperience({id:uid(),name:props.name||(isID?'Quest Baruku':'My Awesome Quest'),subtitle:props.subtitle||(isID?'Jelajahi, kumpulkan poin, dan buka hadiah.':'Explore, earn points and unlock something amazing.'),type,palette:props.palette||'pop',status:'draft',slug:slugify(props.name||'my-quest'),welcome:type==='quiz'?(isID?'Siap uji pengetahuanmu?':'Ready to test your knowledge?'):(isID?'Petualanganmu dimulai di sini.':'Your adventure starts here!'),buttonText:type==='quiz'?(isID?'Mulai kuis':'Start quiz'):(isID?'Mulai main':'Let’s play!'),missions:props.missions||missionDefaults(type,props.locale),reward:{name:props.rewardName||(isID?'Hadiah Spesial':'Mystery Goodie Bag'),threshold:3,stock:100,image:'',imageUrl:'',footnote:rewardFootnoteDefault(props.locale)},publication:{mode:'now',timezone:'Asia/Jakarta',startsAt:''},blocks:[{id:uid(),text:isID?'Selesaikan aktivitas untuk mendapat poin dan membuka hadiah.':'Complete activities, earn points and unlock a reward.'}],visitors:0,participants:0,createdAt:new Date().toISOString()},props.locale);
}
export function initialExperiences(){
  const a=createExperience({name:'Weekend Wander Fest',subtitle:'Explore the coolest corners and collect points.',type:'passport',palette:'pop',rewardName:'Limited Edition Tote Bag',locale:'en'});a.status='published';a.visitors=1248;a.participants=864;
  const b=createExperience({name:'Noir City Hunt',subtitle:'Every corner hides a clue. Ready?',type:'hunt',palette:'citrus',rewardName:'Secret Merch Box',locale:'en'});
  return [a,b];
}
export function loadExperiences(){try{const v=JSON.parse(localStorage.getItem('questpop-studio-v1'));if(Array.isArray(v))return v.map(e=>normalizeExperience(e))}catch{}return initialExperiences()}
export function makeShareUrl(exp){
  const brand=getBrand(exp);
  const payload={name:exp.name,subtitle:exp.subtitle,type:exp.type,palette:exp.palette,welcome:exp.welcome,buttonText:exp.buttonText,missions:exp.missions,reward:{...exp.reward,image:''},publication:exp.publication,blocks:exp.blocks,brand:{...brand,logo:'',cover:'',coverMobile:'',coverDesktop:''}};
  try{return location.origin+location.pathname+'#play='+encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))))}catch{return location.origin+location.pathname}
}
export function sharedExperience(){
  if(!location.hash.startsWith('#play='))return null;
  try{const p=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(6))))));return p?.name&&Array.isArray(p.missions)?normalizeExperience({...p,id:'share',status:'published'}):null}catch{return null}
}
