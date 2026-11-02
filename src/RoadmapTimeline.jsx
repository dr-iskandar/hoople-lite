import React,{useState} from 'react';
import {ArrowRight,BarChart3,BookOpen,CalendarDays,Camera,CheckCheck,Compass,CreditCard,Globe2,Palette,PanelsTopLeft,QrCode,ScanFace,ShieldCheck,Ticket,Users,Workflow} from 'lucide-react';

const iconMap={passport:Compass,quiz:BookOpen,brand:Palette,qr:QrCode,event:CalendarDays,web:PanelsTopLeft,ticket:Ticket,pay:CreditCard,classes:BookOpen,photo:Camera,check:CheckCheck,analytics:BarChart3,face:ScanFace,privacy:ShieldCheck,flow:Workflow,community:Users,domain:Globe2};

const copy={
  id:{
    eyebrow:'HOOPLE / PRODUCT TIMELINE',title:'Mulai dari misi kecil.',titleAccent:'Menuju event yang naik kelas.',
    intro:'Hoople lite adalah pintu masuknya. Visi berikutnya: satu ekosistem yang membantu EO membuat, menjalankan, dan mengembangkan event sekaligus komunitasnya.',
    now:'DEMO SEKARANG',next:'BERIKUTNYA',later:'TAHAP LANJUTAN',explore:'Coba Hoople lite',
    note:'Timeline ini menunjukkan arah produk, bukan janji tanggal rilis. Fitur di luar tahap pertama belum tersedia pada demo.',
    stages:[
      {phase:'01',status:'DEMO SEKARANG',name:'Hoople lite',short:'Bikin interaksi yang bikin peserta aktif.',headline:'Dari pengunjung jadi pemain.',detail:'Mulai dengan digital passport, treasure hunt, dan kuis pilihan ganda. Kreator mengatur tampilan, misi, poin, dan reward; peserta mencoba pengalaman lewat browser.',features:[['passport','Passport & treasure hunt'],['quiz','Quiz pilihan ganda'],['qr','QR, foto & check-in misi'],['brand','Branding & preview'] ],outcome:'PROTOTIPE INTERAKTIF · DATA DISIMPAN DI BROWSER'},
      {phase:'02',status:'BERIKUTNYA',name:'Event platform',short:'Dari ide event sampai tiket terjual.',headline:'Satu tempat untuk membangun event.',detail:'EO dan komunitas dapat membuat event sendiri, menyusun halaman promosi, membuka kelas atau sesi, mengelola registrasi, lalu menjual tiket melalui checkout dan payment gateway.',features:[['event','Event & sesi / kelas'],['web','Landing page builder'],['ticket','Ticketing & registrasi'],['pay','Checkout & pembayaran']],outcome:'TARGET: END-TO-END EVENT SETUP'},
      {phase:'03',status:'TAHAP LANJUTAN',name:'On-site experience',short:'Operasional lancar, peserta makin terlibat.',headline:'Event berjalan lebih ringan.',detail:'Gabungkan check-in/out berbasis QR, kehadiran tiap kelas, photobooth yang bisa dibagikan, aktivasi interaktif, dan dashboard langsung untuk tim lapangan.',features:[['check','QR check-in & check-out'],['classes','Absensi kelas / sesi'],['photo','Photobooth & galeri'],['analytics','Live event dashboard']],outcome:'TARGET: OPERASIONAL + ENGAGEMENT'},
      {phase:'04',status:'TAHAP LANJUTAN',name:'Smart event layer',short:'Otomasi yang tetap menjaga privasi.',headline:'Lebih pintar, tetap manusiawi.',detail:'Eksplorasi face recognition berbasis persetujuan yang jelas, opsi check-in/out otomatis, alur peserta yang relevan, dan insight operasional. Verifikasi alternatif tanpa biometrik tetap disediakan.',features:[['face','Face recognition opt-in'],['privacy','Consent & kontrol data'],['flow','Auto check-in/out opsional'],['analytics','Insight peserta & event']],outcome:'TARGET: PRIVACY-FIRST AUTOMATION'},
      {phase:'05',status:'VISI JANGKA PANJANG',name:'Community OS',short:'Event selesai, hubungan terus hidup.',headline:'Bukan berhenti saat acara bubar.',detail:'Bantu komunitas tumbuh lewat database anggota berbasis izin, aktivasi berulang, loyalty, segmentasi, dan workspace multi-brand untuk EO atau agensi yang mengelola banyak klien.',features:[['community','Community CRM & loyalty'],['flow','Automasi engagement'],['domain','White-label & custom domain'],['analytics','Analitik lintas event']],outcome:'VISI: EO & COMMUNITY OPERATING SYSTEM'}
    ]
  },
  en:{
    eyebrow:'HOOPLE / PRODUCT TIMELINE',title:'Start with a small mission.',titleAccent:'Grow into a better event.',
    intro:'Hoople lite is the first step. The larger vision: one ecosystem for organizers to create, operate, and grow events and the communities around them.',
    now:'CURRENT DEMO',next:'COMING NEXT',later:'FUTURE PHASE',explore:'Try Hoople lite',
    note:'This timeline illustrates product direction, not committed release dates. Only the first stage is available in the current demo.',
    stages:[
      {phase:'01',status:'CURRENT DEMO',name:'Hoople lite',short:'Make every attendee part of the story.',headline:'Turn visitors into players.',detail:'Start with digital passports, treasure hunts, and multiple-choice quizzes. Creators set the look, tasks, points, and rewards; participants try the experience in their browser.',features:[['passport','Passports & treasure hunts'],['quiz','Multiple-choice quizzes'],['qr','QR, photo & check-in missions'],['brand','Branding & live preview']],outcome:'INTERACTIVE PROTOTYPE · DATA STAYS IN BROWSER'},
      {phase:'02',status:'COMING NEXT',name:'Event platform',short:'From an event idea to ticket checkout.',headline:'Build the whole event in one place.',detail:'Let organizers and communities create events, launch promotional pages, host classes and sessions, manage registration, and sell tickets through payment checkout.',features:[['event','Events, classes & sessions'],['web','Landing page builder'],['ticket','Ticketing & registration'],['pay','Checkout & payments']],outcome:'GOAL: END-TO-END EVENT SETUP'},
      {phase:'03',status:'FUTURE PHASE',name:'On-site experience',short:'Smoother operations, stronger engagement.',headline:'Make event days feel effortless.',detail:'Connect QR-based check-in/out, session attendance, shareable photobooths, interactive activations, and a live operations dashboard for the crew.',features:[['check','QR check-in & check-out'],['classes','Class / session attendance'],['photo','Photobooth & galleries'],['analytics','Live event dashboards']],outcome:'GOAL: OPERATIONS + ENGAGEMENT'},
      {phase:'04',status:'FUTURE PHASE',name:'Smart event layer',short:'Thoughtful automation with privacy built in.',headline:'Smarter without losing the human touch.',detail:'Explore explicit opt-in facial recognition, optional automatic check-in/out, relevant attendee journeys, and operational insights. Non-biometric check-in must remain available.',features:[['face','Opt-in face recognition'],['privacy','Consent & data controls'],['flow','Optional auto check-in/out'],['analytics','Attendee & event insights']],outcome:'GOAL: PRIVACY-FIRST AUTOMATION'},
      {phase:'05',status:'LONG-TERM VISION',name:'Community OS',short:'The event ends. The relationship grows.',headline:'Build what happens after the event.',detail:'Help communities thrive with permission-based member CRM, repeat activations, loyalty, segmentation, and multi-brand workspaces for agencies managing multiple clients.',features:[['community','Community CRM & loyalty'],['flow','Engagement automation'],['domain','White-label & custom domains'],['analytics','Cross-event analytics']],outcome:'VISION: EO & COMMUNITY OPERATING SYSTEM'}
    ]
  }
};

export default function RoadmapTimeline({locale='id',onStudio}){
  const [selected,setSelected]=useState(0);
  const t=copy[locale==='en'?'en':'id'];
  const stage=t.stages[selected];
  return <section className="roadmap-section" id="roadmap" aria-labelledby="roadmap-title">
    <div className="roadmap-heading"><span className="roadmap-kicker"><span className="roadmap-kicker-line"/>{t.eyebrow}</span><h2 id="roadmap-title">{t.title}<br/><em>{t.titleAccent}</em></h2><p>{t.intro}</p></div>
    <div className="roadmap-layout">
      <div className="roadmap-rail" aria-label={locale==='id'?'Tahapan pengembangan':'Product roadmap stages'}>
        {t.stages.map((item,index)=><button className={'roadmap-step '+(selected===index?'active':'')} key={item.phase} aria-pressed={selected===index} onClick={()=>setSelected(index)}>
          <span className="roadmap-step-index">{item.phase}</span><span className="roadmap-step-body"><small>{item.status}</small><strong>{item.name}</strong><em>{item.short}</em></span><ArrowRight size={18}/>
        </button>)}
      </div>
      <article className="roadmap-detail" aria-live="polite" key={stage.phase}>
        <div className="roadmap-detail-top"><span className="roadmap-chip">{stage.status}</span><span className="roadmap-large-number">/ {stage.phase}</span></div>
        <h3>{stage.headline}</h3><p>{stage.detail}</p>
        <div className="roadmap-feature-grid">{stage.features.map(([key,label])=>{const Icon=iconMap[key]||Compass;return <div className="roadmap-feature" key={label}><span><Icon size={22} strokeWidth={1.65}/></span><strong>{label}</strong></div>})}</div>
        <div className="roadmap-detail-foot"><span>{stage.outcome}</span>{selected===0&&<button onClick={onStudio}>{t.explore}<ArrowRight size={17}/></button>}</div>
      </article>
    </div>
    <div className="roadmap-bottom"><span>01 — 05 <i/> HOOPLE ECOSYSTEM</span><p>{t.note}</p></div>
  </section>;
}
