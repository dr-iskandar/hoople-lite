import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Camera,Check,CheckCircle2,ChevronRight,ClipboardCheck,Clock3,Compass,Gift,Home,MapPin,QrCode,Ticket,X} from 'lucide-react';
import {getBrand,missionKind} from './data';
import {useLocale} from './i18n';
import {questT} from './questCopy';
import {formatRelease,isReleaseScheduled,releaseCountdown} from './release';

const kindIcons={checkin:MapPin,photo:Camera,qr:QrCode,quiz:ClipboardCheck};
const optionsLetters=['A','B','C','D'];

export default function Player({experience,preview=false,onExit,onLegal}){
  const {t,locale}=useLocale(),q=(key,vars)=>questT(locale,key,vars),brand=getBrand(experience);
  const displayFont={grotesk:'Space Grotesk, sans-serif',sans:'DM Sans, sans-serif',serif:'Georgia, serif'}[brand.font]||'Space Grotesk, sans-serif';
  const brandLogo=brand.logo||brand.logoUrl,brandCoverMobile=brand.coverMobile||brand.coverMobileUrl||brand.cover||brand.coverUrl,brandCoverDesktop=brand.coverDesktop||brand.coverDesktopUrl||brand.cover||brand.coverUrl||brandCoverMobile;
  const missions=experience.missions||[],isQuiz=experience.type==='quiz',publicDemo=experience.demoPublic===true;
  const PreviewIcon=isQuiz?ClipboardCheck:experience.type==='hunt'?Compass:Ticket;
  const rewardImage=experience.reward?.image||experience.reward?.imageUrl;
  const [clock,setClock]=useState(Date.now());
  const launchLocked=!preview&&isReleaseScheduled(experience,clock);
  const [started,setStarted]=useState(false),[tab,setTab]=useState('home'),[collected,setCollected]=useState([]),[redeemed,setRedeemed]=useState(false);
  const [activeId,setActiveId]=useState(null),[photo,setPhoto]=useState(null),[code,setCode]=useState(''),[notice,setNotice]=useState(''),[feedback,setFeedback]=useState(''),[cameraActive,setCameraActive]=useState(false),[cameraError,setCameraError]=useState('');
  const [cameraDisclosure,setCameraDisclosure]=useState(''),[cameraAccepted,setCameraAccepted]=useState(false);
  const fileRef=useRef(null),videoRef=useRef(null),streamRef=useRef(null),scanFrameRef=useRef(null),scanningRef=useRef(false);
  const active=missions.find(m=>m.id===activeId),activeKind=active?missionKind(active,experience.type):null;
  const threshold=Math.min(Math.max(1,Number(experience.reward?.threshold)||1),Math.max(1,missions.length));
  const points=missions.filter(m=>collected.includes(m.id)).reduce((sum,m)=>sum+Number(m.points||0),0);
  const maxPoints=missions.reduce((sum,m)=>sum+Number(m.points||0),0);
  const consentKey='qp-camera-consent-'+encodeURIComponent(experience.slug||experience.name||experience.id);
  const eligible=collected.length>=threshold;
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3000);return()=>clearTimeout(timer)},[notice]);
  useEffect(()=>{if(!launchLocked)return;const timer=setInterval(()=>setClock(Date.now()),15000);return()=>clearInterval(timer)},[launchLocked]);
  useEffect(()=>()=>{scanningRef.current=false;if(scanFrameRef.current)cancelAnimationFrame(scanFrameRef.current);streamRef.current?.getTracks().forEach(track=>track.stop())},[]);

  function stopCamera(){
    scanningRef.current=false;
    if(scanFrameRef.current)cancelAnimationFrame(scanFrameRef.current);
    scanFrameRef.current=null;
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
    if(videoRef.current)videoRef.current.srcObject=null;
    setCameraActive(false);
  }
  function closeMission(){
    stopCamera();
    if(photo?.url)URL.revokeObjectURL(photo.url);
    setPhoto(null);setActiveId(null);setCode('');setFeedback('');setCameraError('');
  }
  function openMission(m){
    if(photo?.url)URL.revokeObjectURL(photo.url);
    setPhoto(null);setCode('');setFeedback('');setCameraError('');setActiveId(m.id);
  }
  function requestCamera(mode){
    let granted=false;try{granted=sessionStorage.getItem(consentKey)==='accepted'}catch{}
    if(granted){if(mode==='qr')startCamera();else fileRef.current?.click();return}
    setCameraAccepted(false);setCameraDisclosure(mode);
  }
  function acceptCamera(){
    if(!cameraAccepted)return;
    try{sessionStorage.setItem(consentKey,'accepted')}catch{}
    const mode=cameraDisclosure;setCameraDisclosure('');
    if(mode==='qr')startCamera();else fileRef.current?.click();
  }
  function completeMission(m,keepOpen=false){
    if(collected.includes(m.id)){setNotice(q('already'));return}
    setCollected(previous=>previous.includes(m.id)?previous:[...previous,m.id]);
    setNotice(q('success',{count:Number(m.points||0)}));
    if(!keepOpen)closeMission();
  }
  function checkQR(value){
    if(!active)return;
    if(String(value).trim() && (publicDemo || String(value).trim().toLowerCase()===String(active.code||'').trim().toLowerCase())){
      completeMission(active);
    }else{
      setCameraError(q('qrWrong'));
    }
  }
  async function startCamera(){
    setCameraError('');
    if(!('BarcodeDetector' in window)||!navigator.mediaDevices?.getUserMedia){setCameraError(q('qrUnsupported'));return}
    try{
      const detector=new window.BarcodeDetector({formats:['qr_code']});
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      streamRef.current=stream;setCameraActive(true);
      const video=videoRef.current;
      if(!video){stream.getTracks().forEach(track=>track.stop());return}
      video.srcObject=stream;await video.play();
      scanningRef.current=true;
      async function tick(){
        if(!scanningRef.current)return;
        try{
          const codes=await detector.detect(video);
          if(codes.length){checkQR(codes[0].rawValue);if(publicDemo||String(codes[0].rawValue).trim().toLowerCase()===String(active.code).trim().toLowerCase())return}
        }catch{}
        if(scanningRef.current)scanFrameRef.current=requestAnimationFrame(tick);
      }
      tick();
    }catch{stopCamera();setCameraError(q('qrDenied'))}
  }
  function choosePhoto(event){
    const file=event.target.files?.[0];
    if(!file)return;
    if(photo?.url)URL.revokeObjectURL(photo.url);
    setPhoto({url:URL.createObjectURL(file),name:file.name});
    event.target.value='';
  }
  function answerQuiz(m,index){
    if(collected.includes(m.id))return;
    if(publicDemo || index===Number(m.correctIndex??0)){setFeedback('correct');completeMission(m,true)}
    else setFeedback('wrong');
  }
  const tabLabel=isQuiz?q('questions'):t('player.missions');
  const completedLabel=isQuiz?q('questions'):q('tasks');
  if(launchLocked){
    const date=formatRelease(experience.publication.startsAt,experience.publication.timezone,locale);
    const remaining=releaseCountdown(experience.publication.startsAt,clock);
    const waiting=locale==='en';
    return <div className="player player-scheduled" style={{'--player-accent':brand.accent,'--player-bg':brand.bg,'--player-ink':brand.ink,'--player-soft':brand.soft,'--player-font':displayFont}}>
      <header className="player-top"><span className="player-brand">{brandLogo?<img className="player-brand-logo" src={brandLogo} alt=""/>:<b>h</b>}<span>{brand.name||experience.name}</span></span><span className="player-live">{waiting?'COMING SOON':'SEGERA DIBUKA'}</span></header>
      <div className="scheduled-waiting-content"><div className="scheduled-icon"><span>01 / ACCESS</span><Clock3 size={44}/></div><span className="player-kicker">{waiting?'THE COUNTDOWN IS ON':'SEBENTAR LAGI'}</span><h2>{waiting?'Something good is on the way.':'Petualangannya segera dimulai.'}</h2><p>{waiting?`“${experience.name}” opens on`:`“${experience.name}” bisa dimainkan mulai`}</p><div className="scheduled-date">{date}</div><div className="scheduled-countdown"><div><b>{String(remaining?.days??0).padStart(2,'0')}</b><small>{waiting?'days':'hari'}</small></div><div><b>{String(remaining?.hours??0).padStart(2,'0')}</b><small>{waiting?'hours':'jam'}</small></div><div><b>{String(remaining?.minutes??0).padStart(2,'0')}</b><small>{waiting?'minutes':'menit'}</small></div></div><small className="scheduled-note">{waiting?'Save this link and come back when the event opens.':'Simpan link ini dan kembali saat event dibuka.'}</small></div>
    </div>;
  }
  return <div className="player" style={{'--player-accent':brand.accent,'--player-bg':brand.bg,'--player-ink':brand.ink,'--player-soft':brand.soft,'--player-font':displayFont}}>
    <header className="player-top"><span className="player-brand">{brandLogo?<img className="player-brand-logo" src={brandLogo} alt=""/>:<b>h</b>}<span>{brand.name||experience.name}</span></span><span className="player-live">{publicDemo?(locale==='id'?'DEMO · SIMULASI':'DEMO · SIMULATION'):preview&&isReleaseScheduled(experience)?'PREVIEW · '+(locale==='id'?'TERJADWAL':'SCHEDULED'):'● '+t('player.live')}</span></header>
    {!started?<div className="player-welcome">
      <div className={'player-art '+(brandCoverMobile?'with-brand-cover':'')}>{brandCoverMobile?<><img className="player-cover-image player-cover-mobile" src={brandCoverMobile} alt=""/><img className="player-cover-image player-cover-desktop" src={brandCoverDesktop} alt=""/></>:<><span className="art-blob"/><span className="art-emoji"><PreviewIcon size={95} strokeWidth={1.4}/></span></>}<span className="art-number">{isQuiz?'QUIZ':'PASS'} / 001</span></div>
      <span className="player-kicker">{brand.tagline||t('player.kicker')}</span>{publicDemo&&<p role="status" className="player-note">{locale==='id'?'Simulasi publik: kode QR dan jawaban kuis tidak diverifikasi; poin dan hadiah bukan transaksi asli.':'Public simulation: QR codes and quiz answers are not verified; points and rewards are not real transactions.'}</p>}<h2>{experience.welcome}</h2><p>{experience.subtitle}</p>
      <button className="player-primary" onClick={()=>setStarted(true)}>{experience.buttonText||q(isQuiz?'startQuiz':'startQuest')} <ArrowRight size={17}/></button><small className="player-tiny">{t('player.noDownload')}</small>
    </div>:<><div className="player-inner">
      {tab==='home'&&<div className="player-home"><span className="player-kicker">{t('player.hello')}</span><h2>{isQuiz?q('quizTitle'):t('player.collectTitle')}</h2><p>{isQuiz?q('quizDesc'):q('boardDesc')}</p>
        <div className="quest-score-card"><span>{q('score')}</span><div><strong>{points}</strong><small>/ {maxPoints} {q('points')}</small></div><div className="quest-score-track"><span style={{width:(maxPoints?points/maxPoints*100:0)+'%'}}/></div><p>{collected.length} {q('completedOf')} {missions.length} {completedLabel}</p></div>
        <div className="passport-card"><div className="passport-head"><strong>{q('yourProgress')}</strong><span>{collected.length}/{missions.length}</span></div><div className="stamp-grid">{missions.map((m,i)=><button key={m.id} title={m.name} className={'stamp '+(collected.includes(m.id)?'has-stamp':'')} onClick={()=>{setTab('missions');openMission(m)}}>{collected.includes(m.id)?<Check size={19}/>:String(i+1).padStart(2,'0')}</button>)}</div></div>
        <button className="reward-teaser" onClick={()=>setTab('rewards')}><span className="reward-teaser-image">{rewardImage?<img src={rewardImage} alt=""/>:<Gift size={22}/>}</span><span><strong>{eligible?q('rewardReady'):t('player.surprise')}</strong><small>{experience.reward?.name} · {Math.max(0,threshold-collected.length)} {q(isQuiz?'rewardMoreQuiz':'rewardMore')}</small></span><ChevronRight size={18}/></button>
        <button className="player-primary" onClick={()=>setTab('missions')}>{q(isQuiz?'ctaQuestions':'ctaMissions')} <ArrowRight size={17}/></button>
        {(experience.blocks||[]).map(b=><div className="player-extra" key={b.id}>{b.text}</div>)}
      </div>}
      {tab==='missions'&&<div className="player-missions"><span className="player-kicker">{q(isQuiz?'quizBoard':'board')}</span><h2>{q(isQuiz?'quizTitle':'boardTitle')}</h2><p>{q(isQuiz?'quizDesc':'boardDesc')}</p>
        <div className="quest-points-total"><strong>{points}</strong><span>/ {maxPoints} {q('points')}</span></div>
        <div className="player-mission-list">{missions.map((m,i)=>{const kind=missionKind(m,experience.type),Icon=kindIcons[kind];return <button className={'player-mission quest-mission '+(collected.includes(m.id)?'completed':'')} key={m.id} onClick={()=>openMission(m)}><span className="mission-number">{collected.includes(m.id)?<Check size={18}/>:<Icon size={19}/>}</span><span><strong>{m.name}</strong><small>{q('kinds.'+kind)} · {Number(m.points||0)} {q('points')}</small></span>{collected.includes(m.id)?<CheckCircle2 size={17}/>:<ChevronRight size={17}/>}</button>})}</div>
        <small className="player-note">{q('previewDisclaimer')}</small>
      </div>}
      {tab==='rewards'&&<div className="player-rewards"><div className={'reward-art '+(rewardImage?'with-reward-image':'')}>{rewardImage?<img src={rewardImage} alt={experience.reward?.name||'Reward'}/>:<Gift size={85}/>}<span>REWARD / 01</span></div><span className="player-kicker">{t('player.rewardLabel')}</span><h2>{experience.reward?.name}</h2><p>{q(isQuiz?'rewardHintQuiz':'rewardHint',{count:threshold})}</p>
        <div className="reward-meter"><strong>{Math.min(threshold,collected.length)} / {threshold}</strong><span>{completedLabel} · {points} {q('points')}</span></div>
        <button className="player-primary" disabled={!eligible||redeemed} onClick={()=>setRedeemed(true)}>{redeemed?t('player.redeemed'):eligible?t('player.claim'):t('player.keepGoing')} <Gift size={17}/></button>{redeemed&&<div className="redeemed-note">{t('player.redeemedNote')}</div>}
        {experience.reward?.footnote&&<div className="reward-footnote"><strong>{locale==='id'?'S&K SINGKAT':'SHORT TERMS'}</strong><p>{experience.reward.footnote}</p></div>}
        <small className="player-note">{q('scoreHint')}</small>
      </div>}
    </div><div className="player-bottom">{[{id:'home',label:t('player.home'),Icon:Home},{id:'missions',label:tabLabel,Icon:Compass},{id:'rewards',label:t('player.rewards'),Icon:Gift}].map(n=><button key={n.id} className={tab===n.id?'current':''} onClick={()=>setTab(n.id)}><n.Icon size={19}/><span>{n.label}</span></button>)}</div></>}
    {notice&&<div className="player-notice">{notice}</div>}
    {active&&<div className="quest-shade" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closeMission()}}><section className="quest-dialog" role="dialog" aria-modal="true" aria-label={active.name}>
      <button className="quest-dialog-close" aria-label={q('close')} onClick={closeMission}><X size={20}/></button>
      <span className="quest-dialog-tag">{q('kinds.'+activeKind)} <b>+{Number(active.points||0)} {q('points')}</b></span><h3>{activeKind==='quiz'?(active.question||active.name):active.name}</h3><p className="quest-dialog-description">{activeKind==='quiz'?q('quizIntro'):active.description}</p>
      {collected.includes(active.id)&&activeKind!=='quiz'&&<div className="quest-completed"><CheckCircle2 size={19}/>{q('done')}</div>}
      {activeKind==='checkin'&&!collected.includes(active.id)&&<div className="quest-action-body"><div className="quest-action-glyph"><MapPin size={35}/></div><p>{q('checkinHelp')}</p><button className="player-primary" onClick={()=>completeMission(active)}>{q('checkinAction')} <ArrowRight size={17}/></button></div>}
      {activeKind==='photo'&&!collected.includes(active.id)&&<div className="quest-action-body"><p>{q('photoHelp')}</p><input hidden ref={fileRef} type="file" accept="image/*" capture="environment" onChange={choosePhoto}/>{photo?<div className="quest-photo-selected"><img src={photo.url} alt={q('photoSelected')}/><small>{photo.name}</small></div>:<div className="quest-photo-placeholder"><Camera size={36}/><span>{q('photoIntro')}</span></div>}
        <button className="quest-secondary-action" onClick={()=>requestCamera('photo')}><Camera size={18}/>{q('photoAction')}</button><button className="player-primary" disabled={!photo} onClick={()=>photo?completeMission(active):setNotice(q('photoMissing'))}>{q('photoConfirm')} <ArrowRight size={17}/></button></div>}
      {activeKind==='qr'&&!collected.includes(active.id)&&<div className="quest-action-body"><p>{q('qrHelp')}</p><video ref={videoRef} className="quest-camera" playsInline muted autoPlay style={{display:cameraActive?'block':'none'}}/>
        {cameraActive&&<small className="quest-camera-caption">{q('qrScanning')}</small>}
        <button className="quest-secondary-action" onClick={cameraActive?stopCamera:()=>requestCamera('qr')}><QrCode size={19}/>{q(cameraActive?'stopCamera':'qrCamera')}</button><span className="quest-separator">{q('qrManual')}</span>
        <form className="quest-code-form" onSubmit={event=>{event.preventDefault();checkQR(code)}}><input value={code} onChange={event=>setCode(event.target.value)} placeholder={q('qrSample')} aria-label={q('qrSample')}/><button className="player-primary" type="submit" disabled={!code.trim()}>{q('qrVerify')}</button></form>{cameraError&&<p role="alert" className="quest-error">{cameraError}</p>}</div>}
      {activeKind==='quiz'&&<div className="quest-answers">{(active.options||[]).map((option,index)=><button key={index} className={'quest-answer '+(collected.includes(active.id)&&index===active.correctIndex?'correct':'')} disabled={collected.includes(active.id)} onClick={()=>answerQuiz(active,index)}><span>{optionsLetters[index]}</span><b>{option}</b>{collected.includes(active.id)&&index===active.correctIndex&&<Check size={18}/>}</button>)}
        {feedback==='wrong'&&<div role="alert" className="quest-answer-feedback wrong">{q('quizWrong')}</div>}
        {collected.includes(active.id)&&<><div className="quest-answer-feedback correct"><CheckCircle2 size={18}/>{publicDemo?(locale==='id'?'Simulasi jawaban tersimpan':'Demo answer recorded'):q('quizCorrect')} +{Number(active.points||0)} {q('points')}</div><button className="player-primary" onClick={closeMission}>{q('quizContinue')} <ArrowRight size={17}/></button></>}
      </div>}
    </section></div>}
    {cameraDisclosure&&<div className="camera-consent-shade" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCameraDisclosure('')}}><section className="camera-consent-dialog" role="dialog" aria-modal="true" aria-label={locale==='id'?'Persetujuan kamera':'Camera consent'}>
      <div className="camera-consent-icon"><Camera size={27}/></div><span className="eyebrow">CAMERA / PRIVACY</span><h3>{locale==='id'?'Sebelum membuka kamera…':'Before opening your camera…'}</h3>
      <p>{locale==='id'?`Event “${experience.name}” meminta kamera untuk ${cameraDisclosure==='qr'?'membaca QR checkpoint':'memilih atau mengambil foto misi'}.`: `“${experience.name}” requests camera access to ${cameraDisclosure==='qr'?'scan a checkpoint QR':'capture/select a mission photo'}.`}</p>
      <ul><li>{locale==='id'?'Kamera hanya digunakan untuk aktivitas yang kamu pilih. Di demo ini, video dan foto tidak dikirim ke server.':'Camera is used only for your selected task. This demo does not upload video or photos.'}</li><li>{locale==='id'?'Jangan merekam orang tanpa izin, tindakan ilegal, pornografi, eksploitasi anak, atau konten yang mengancam keselamatan dan privasi.':'Do not capture people without permission, illegal acts, pornography, child exploitation, or content violating safety and privacy.'}</li><li>{locale==='id'?'Kamu boleh menolak. Misi QR tetap bisa menggunakan kode manual; foto membutuhkan pilihan berkas.':'You can decline. QR tasks can use manual codes; photo tasks need a selected file.'}</li></ul>
      <label className="camera-consent-check"><input type="checkbox" checked={cameraAccepted} onChange={e=>setCameraAccepted(e.target.checked)}/><span>{locale==='id'?'Saya memahami tujuan kamera dan setuju menggunakannya secara bertanggung jawab untuk event ini.':'I understand this camera use and agree to use it responsibly for this event.'}</span></label>
      <div className="camera-consent-actions"><button onClick={()=>setCameraDisclosure('')}>{locale==='id'?'Tidak sekarang':'Not now'}</button><button disabled={!cameraAccepted} onClick={acceptCamera}>{locale==='id'?'Lanjutkan ke kamera':'Continue to camera'} <ArrowRight size={16}/></button></div>
      {onLegal&&<button className="camera-consent-policy" onClick={()=>onLegal('privacy')}>{locale==='id'?'Baca kebijakan privasi':'Read privacy policy'}</button>}
    </section></div>}
    {onLegal&&<div className="player-legal-links"><button onClick={()=>onLegal('terms')}>{locale==='id'?'Syarat':'Terms'}</button>·<button onClick={()=>onLegal('privacy')}>{locale==='id'?'Privasi':'Privacy'}</button></div>}
    {onExit&&!preview&&<button className="player-exit" onClick={onExit}><ArrowLeft size={14}/>{t('player.back')}</button>}
  </div>;
}
