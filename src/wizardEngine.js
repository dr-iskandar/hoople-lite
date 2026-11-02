import {createExperience,slugify,uid} from './data';

const val=(s,max=140)=>String(s||'').trim().slice(0,max);
const points=(n,defaultValue=10)=>Number.isFinite(Number(n))?Math.max(0,Math.min(1000,Math.round(Number(n)))):defaultValue;
const byLocale=(locale,id,en)=>locale==='en'?en:id;
const shorten=(str,max=34)=>String(str||'').slice(0,max);

export function wizardDefaults(){return {name:'',brief:'',organizer:'',venue:'',audience:'',goal:'engagement',topic:'',facts:'',reward:'',count:4,format:'passport'}}
function makeQuestList(config,type,locale){
 const id=locale!=='en',name=val(config.name,60),venue=val(config.venue,50),topic=val(config.topic,50)||name;
 const n=Math.max(3,Math.min(8,Number(config.count)||4));
 const codeBase=(slugify(name).replace(/-/g,'').toUpperCase()||'EVENT').slice(0,12);
 const names=type==='passport'?[
  [id?'Check-in & ambil paspor':'Check in & collect your pass',id?'Konfirmasi kedatangan di '+(venue||'area registrasi')+'.':'Confirm your arrival at '+(venue||'the registration desk')+'.','checkin'],
  [id?'Cari booth pertama':'Find the first booth',id?'Scan kode QR di checkpoint pertama.':'Scan the QR code at the first checkpoint.','qr'],
  [id?'Abadikan momen '+shorten(topic,18):'Capture the '+shorten(topic,18)+' moment',id?'Ambil foto terkait '+topic+'. Pastikan semua orang di foto mengizinkan.':'Take a photo related to '+topic+'. Ask people for their permission.','photo'],
  [id?'Temukan QR terakhir':'Find the final QR',id?'Cari checkpoint final untuk menyelesaikan perjalanan.':'Find the final checkpoint to finish the journey.','qr'],
  [id?'Check-in di aktivitas favorit':'Check in at a favorite activity',id?'Konfirmasi kamu sudah mengunjungi area favorit.':'Confirm that you visited your favorite activity.','checkin'],
  [id?'Foto cerita event':'Your event story in a photo',id?'Ambil satu foto kreatif dan bertanggung jawab.':'Capture a creative, respectful photo.','photo'],
  [id?'Misi QR bonus':'Bonus QR mission',id?'Temukan kode QR bonus yang disiapkan panitia.':'Find the bonus QR prepared by the organizer.','qr'],
  [id?'Check-in penutupan':'Closing check-in',id?'Konfirmasi penyelesaian di area akhir.':'Confirm completion at the finish area.','checkin']
 ]:[
  [id?'Petunjuk pertama':'The first clue',id?'Temukan QR pembuka di '+(venue||'lokasi event')+'.':'Find the first QR at '+(venue||'the event venue')+'.','qr'],
  [id?'Buktikan penemuanmu':'Prove your discovery',id?'Foto area petunjuk berikutnya, dengan izin bila ada orang lain.':'Photograph the next clue spot with consent where needed.','photo'],
  [id?'Scan pos rahasia':'Scan the secret station',id?'Pindai QR checkpoint kedua untuk membuka petunjuk baru.':'Scan the second checkpoint QR to unlock your next hint.','qr'],
  [id?'Konfirmasi di pos tengah':'Midpoint check-in',id?'Check-in setelah menemukan pos tengah.':'Check in after finding the midpoint.','checkin'],
  [id?'Temukan tanda tersembunyi':'Find the hidden marker',id?'Cari dan pindai QR yang disembunyikan penyelenggara.':'Find and scan the QR hidden by the organizer.','qr'],
  [id?'Foto petualanganmu':'Capture your adventure',id?'Ambil foto momen terbaik dalam perjalanan.':'Capture the best moment of the journey.','photo'],
  [id?'Buka kunci terakhir':'Unlock the final stop',id?'Pindai QR penutup untuk menyelesaikan hunt.':'Scan the final QR to complete the hunt.','qr'],
  [id?'Check-in kemenangan':'Finish-line check-in',id?'Konfirmasi kedatangan di garis akhir.':'Confirm your arrival at the finish line.','checkin']
 ];
 return names.slice(0,n).map(([title,description,kind],i)=>({id:uid(),kind,name:title,description,points:kind==='qr'?20:kind==='photo'?15:10,code:codeBase+'-'+String(i+1).padStart(2,'0')}));
}
function options(answer){
 const variants=['Event komunitas lainnya','Sesi yang berbeda','Kegiatan lain','Program yang tidak terkait'];
 return [answer,...variants.filter(v=>v!==answer)].slice(0,4);
}
function makeQuizList(config,locale){
 const id=locale!=='en',name=val(config.name,60),organizer=val(config.organizer,80),audience=val(config.audience,60),venue=val(config.venue,70),topic=val(config.topic,70),goal=config.goal;
 const q=[
  {question:id?'Apa nama event yang sedang kamu ikuti?':'What is the name of this event?',answer:name,wrong:id?['Event Minggu Depan','Festival Kota Lain','Program Tanpa Nama']:['Next Week Event','Another City Festival','Unnamed Program']},
  {question:venue?(id?'Di mana event ini berlangsung?':'Where does this event take place?'):(id?'Untuk siapa pengalaman ini dirancang?':'Who is this experience for?'),answer:venue||audience||(id?'Peserta event':'Event participants'),wrong:id?['Lokasi yang belum diumumkan','Tempat lain','Secara acak']:['Unannounced venue','A different venue','Any random location']},
  {question:id?'Apa tema utama pengalaman ini?':'What is the main theme of this experience?',answer:topic||name,wrong:id?['Belanja tanpa tujuan','Aktivitas tanpa tema','Acara tidak terkait']:['Unrelated shopping','An activity without a theme','An unrelated event']},
  {question:organizer?(id?'Siapa penyelenggara event ini?':'Who is organizing this event?'):(id?'Bagaimana cara mendapat poin?':'How do you earn points?'),answer:organizer||(id?'Jawab pertanyaan dengan benar':'Answer the questions correctly'),wrong:id?['Peserta yang dipilih acak','Tidak ada penyelenggara','Semua pilihan benar']:['A random participant','There is no organizer','All choices are correct']},
  {question:id?'Apa yang penting saat berinteraksi di event?':'What matters when joining an event activity?',answer:id?'Menghormati privasi dan aturan event':'Respecting privacy and event rules',wrong:id?['Memotret siapa pun tanpa izin','Mengabaikan instruksi','Menyebarkan data orang']:['Photographing anyone without consent','Ignoring instructions','Sharing others’ data']},
  {question:id?'Apa tujuan utama kamu menyelesaikan kuis?':'What is the main goal of completing the quiz?',answer:id?'Belajar sambil mendapat poin':'Learn while earning points',wrong:id?['Menghapus tiket','Menghindari acara','Mematikan permainan']:['Delete your ticket','Avoid the event','Disable the game']}
 ];
 const factLines=String(config.facts||'').split(/\n+/).map(v=>v.trim()).filter(Boolean).slice(0,8);
 const facts=factLines.map(line=>{
   const parts=line.split(/\s*[|:]\s*/).map(v=>v.trim()).filter(Boolean);
   return parts.length>=2?{question:parts[0],answer:parts[1],wrong:parts.length>=5?parts.slice(2,5):(id?['Pilihan lain','Belum diketahui','Semua jawaban salah']:['Another option','Unknown','None of the above'])}:null;
 }).filter(Boolean);
 const questions=[...facts,...q];
 return questions.slice(0,Math.max(3,Math.min(8,Number(config.count)||4))).map((q,i)=>({id:uid(),kind:'quiz',name:(id?'Soal ':'Question ')+String(i+1).padStart(2,'0'),description:id?'Pilih satu jawaban paling tepat.':'Choose one correct answer.',question:q.question,options:[...new Set([q.answer,...q.wrong])].slice(0,4).concat(Array(Math.max(0,4-new Set([q.answer,...q.wrong]).size)).fill(id?'Pilihan lainnya':'Other option')),correctIndex:0,points:10}));
}

export function draftFromAnswers(config,locale='id'){
 const n=val(config.name,80)||byLocale(locale,'Event Seru Bareng','Our Event Adventure');
 const detail=val(config.brief,220),goal=config.goal;
 const goals={engagement:['Temui, ikuti, dan aktif di setiap aktivitas.','Join activities and engage with everyone.'],education:['Kenali tema dan brand lewat aktivitas singkat.','Discover the theme and brand through short activities.'],explore:['Jelajahi setiap area dan temukan checkpoint.','Explore every area and discover checkpoints.'],networking:['Bangun koneksi baru lewat aktivitas bersama.','Make new connections through shared activities.']};
 const goalMessage=(goals[goal]||goals.engagement)[locale==='en'?1:0];
 const types=config.format==='all'?['passport','hunt','quiz']:[config.format||'passport'];
 return types.map(type=>{
  const title=config.format==='all'?n+' · '+({passport:'Passport',hunt:'Treasure Hunt',quiz:'Quiz'}[type]):n;
  const missions=type==='quiz'?makeQuizList({...config,name:n},locale):makeQuestList({...config,name:n},type,locale);
  const exp=createExperience({name:title,subtitle:detail||goalMessage,type,missions,rewardName:val(config.reward,90)||byLocale(locale,'Hadiah dari panitia','Organizer reward'),locale});
  return {...exp,brand:{...exp.brand,name:val(config.organizer,100)||'',tagline:val(config.topic,90)||''},welcome:byLocale(locale,'Siap eksplor '+n+'?','Ready to explore '+n+'?'),blocks:[{id:uid(),text:goalMessage}],reward:{...exp.reward,threshold:Math.min(3,missions.length)}};
 });
}

export function importAiJson(raw,locale='id'){
 const cleaned=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let parsed;
 try{parsed=JSON.parse(cleaned)}catch{throw new Error(locale==='id'?'Format belum valid. Tempel output JSON dari AI, bukan hanya instruksinya.':'Invalid format. Paste the AI-generated JSON output, not just instructions.')}
 const entries=Array.isArray(parsed)?parsed:(parsed.experiences||[parsed]);
 if(!Array.isArray(entries)||!entries.length||entries.length>6)throw new Error(locale==='id'?'JSON harus berisi 1–6 experiences.':'JSON must contain 1–6 experiences.');
 return entries.map((item,i)=>{
  const type=['passport','hunt','quiz'].includes(item?.type)?item.type:'passport';
  if(!Array.isArray(item?.missions)||item.missions.length<1||item.missions.length>15)throw new Error('Experience '+(i+1)+': missions harus 1–15.');
  const missions=item.missions.map((mission,j)=>{
   const kind=type==='quiz'?'quiz':(['qr','checkin','photo'].includes(mission.kind)?mission.kind:'checkin');
   const m={id:uid(),kind,name:val(mission.name,90)||'Mission '+(j+1),description:val(mission.description,400),points:points(mission.points),code:val(mission.code,120)||'CHECK-'+(j+1)};
   if(kind==='quiz'){
     if(!val(mission.question,300)||!Array.isArray(mission.options)||mission.options.length!==4||!mission.options.every(v=>val(v,160))||!Number.isInteger(mission.correctIndex)||mission.correctIndex<0||mission.correctIndex>3)throw new Error('Question '+(j+1)+': isi question, empat options, correctIndex 0–3.');
     return {...m,question:val(mission.question,300),options:mission.options.map(x=>val(x,160)),correctIndex:mission.correctIndex};
   }
   return m;
  });
  const exp=createExperience({type,name:val(item.name,100)||'New experience',subtitle:val(item.subtitle,250),missions,rewardName:val(item.rewardName||item.reward?.name,100),locale});
  return {...exp,welcome:val(item.welcome,150)||exp.welcome,buttonText:val(item.buttonText,50)||exp.buttonText,brand:{...exp.brand,name:val(item.brand?.name,100),tagline:val(item.brand?.tagline,100)},reward:{...exp.reward,threshold:Math.min(Math.max(1,Math.round(Number(item.reward?.threshold)||3)),missions.length)}};
 });
}

export function chatGptTemplate(config,locale='id'){
 const briefing={event:config.name||'[NAMA EVENT]',description:config.brief||'[KONSEP / RUNDOWN EVENT]',organizer:config.organizer||'[PENYELENGGARA]',venue:config.venue||'[LOKASI]',audience:config.audience||'[TARGET PESERTA]',goal:config.goal,topic:config.topic||'[TEMA]',facts:config.facts||'[FAKTA UNTUK KUIS]',reward:config.reward||'[HADIAH]',format:config.format,count:Number(config.count)||4,language:locale==='en'?'English':'Bahasa Indonesia'};
 return `You are an expert event game designer for an Indonesian SaaS experience builder. Turn the event brief into a ready-to-edit, culturally relevant passport, treasure hunt, and/or multiple-choice quiz. No images, media or downloadable assets. Do not invent factual claims or event-specific facts that were not provided. Avoid dangerous, embarrassing, privacy-invading, adult, or unlawful tasks. Include meaningful points and QR codes for every QR mission. Quiz missions must have exactly four plausible answer options and a zero-based correctIndex. Return ONLY VALID JSON (no markdown) with this structure:\n{ "experiences": [ { "type": "passport|hunt|quiz", "name": "...", "subtitle": "...", "welcome": "...", "buttonText": "...", "brand": {"name":"...", "tagline":"..."}, "reward": {"name":"...", "threshold":3}, "missions": [ {"kind":"checkin|photo|qr|quiz", "name":"...", "description":"...", "code":"QR-CODE", "points":10, "question":"only for quiz", "options":["A","B","C","D"], "correctIndex":0} ] } ] }\nIf format is all, include one passport, one hunt, and one quiz. If format is a single type, include only that type. Use distinct questions, avoid repeating the correct answer in wrong options. Make ${briefing.count} missions for each. All quiz missions must use kind quiz; other types may mix checkin, photo, QR. Provide useful task copy requiring organizer setup for QR checkpoints and camera consent. Event brief:\n${JSON.stringify(briefing,null,2)}`;
}
