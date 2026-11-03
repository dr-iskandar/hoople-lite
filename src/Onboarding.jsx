import React,{useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Flag,Palette,Send,Ticket,X} from 'lucide-react';
import {createExperience,makeMission,missionDefaults,palettes,templates,slugify} from './data';
import Brand from './Brand';
import {LanguageSwitch,useLocale} from './i18n';
import {questT} from './questCopy';
import './onboarding-map.css';

const illustrations={
  passport:'/onboarding-art/passport.png',
  hunt:'/onboarding-art/treasure-map.png',
  quiz:'/onboarding-art/quiz.png'
};
const journeyIcons=[Ticket,Flag,Palette,Send];
const copy={
  id:{
    rail:['FORMAT','MISI','TAMPILAN','TERBITKAN'],
    progress:'LANGKAH',
    of:'DARI',
    headline:['Bikin pengalaman','seru, yuk.'],
    intro:'Pilih cara main untuk experience pertamamu.',
    choose:'Mulai dari mana?',
    choices:{
      passport:'Check-in, foto, scan QR, kumpulkan poin.',
      hunt:'Temukan petunjuk lewat QR, foto, dan check-in.',
      quiz:'Soal pilihan ganda, jawaban benar dapat poin.'
    },
    next:['Lanjut bikin misi','Lanjut pilih tampilan','Lanjut atur penerbitan','Buka editor'],
    stepHeading:['','Kasih nama yang berkesan.','Pilih tampilan favoritmu.','Bikin pengalaman yang rewarding.'],
    stepSubheading:['','Mulai dari nama dan cerita singkat experience-mu.','Warna bisa diubah lagi kapan saja di editor.','Tentukan jumlah misi dan hadiah, lalu lanjut ke editor.']
  },
  en:{
    rail:['FORMAT','MISSIONS','STYLE','PUBLISH'],
    progress:'STEP',
    of:'OF',
    headline:['Let’s make something','fun together.'],
    intro:'Choose a way to play for your first experience.',
    choose:'Where shall we start?',
    choices:{
      passport:'Check in, take photos, scan QR, earn points.',
      hunt:'Find clues through QR, photos, and check-ins.',
      quiz:'Answer multiple-choice questions to earn points.'
    },
    next:['Continue to missions','Continue to style','Continue to publishing','Open the builder'],
    stepHeading:['','Give it a memorable name.','Choose your visual direction.','Make it worth playing.'],
    stepSubheading:['','Start with a name and a short story for your experience.','You can always change the colors in the editor.','Set the number of missions and the reward before opening the builder.']
  }
};

export default function Onboarding({initialType='passport',onDone,onCancel}){
  const {locale,t}=useLocale();
  const ui=copy[locale==='en'?'en':'id'];
  const [step,setStep]=useState(0);
  const [type,setType]=useState(initialType);
  const [name,setName]=useState('');
  const [subtitle,setSubtitle]=useState('');
  const [palette,setPalette]=useState('pop');
  const [rewardName,setRewardName]=useState(locale==='id'?'Hadiah Spesial':'Mystery Goodie Bag');
  const [missionCount,setMissionCount]=useState(4);
  const [error,setError]=useState('');
  const progress=(step+1)*25;

  function next(){
    if(step===1&&!name.trim()){setError(t('onboarding.nameError'));return}
    setError('');
    if(step<3){setStep(current=>current+1);return}
    const missions=missionDefaults(type,locale);
    while(missions.length<missionCount){missions.push(makeMission(type,missions.length,locale))}
    const experience=createExperience({
      name:name.trim(),subtitle:subtitle.trim(),type,palette,rewardName,
      missions:missions.slice(0,missionCount),locale
    });
    experience.reward.threshold=Math.min(3,experience.missions.length);
    onDone(experience);
  }

  function back(){
    setError('');
    if(step===0)onCancel();
    else setStep(current=>current-1);
  }

  return <div className="onboarding map-onboarding">
    <img className="map-landscape map-landscape-top" src="/onboarding-art/landscape.png" alt="" aria-hidden="true"/>
    <img className="map-landscape map-landscape-bottom" src="/onboarding-art/landscape.png" alt="" aria-hidden="true"/>
    <header className="onboard-header map-onboard-header">
      <button className="brand-wrapper" onClick={onCancel} aria-label={locale==='id'?'Kembali ke Studio':'Back to Studio'}><Brand/></button>
      <div className="onboard-right-actions"><LanguageSwitch/><button className="plain-icon" aria-label={t('common.close')} onClick={onCancel}><X size={19}/></button></div>
    </header>

    <div className="onboard-body map-onboard-body">
      <aside className="map-onboard-sidebar" aria-label={locale==='id'?'Tahapan membuat experience':'Experience creation steps'}>
        <nav className="map-journey" aria-label={locale==='id'?'Progres onboarding':'Onboarding progress'}>
          {ui.rail.map((label,index)=>{
            const Icon=journeyIcons[index];
            const isCurrent=index===step;
            const done=index<step;
            return <button key={label} type="button" className={'map-journey-step '+(isCurrent?'is-current ':'')+(done?'is-done':'')} aria-current={isCurrent?'step':undefined} aria-label={String(index+1).padStart(2,'0')+' '+label} disabled={index>step} onClick={()=>{setError('');setStep(index)}}>
              <span className="map-journey-icon">{done?<Check size={28} strokeWidth={2.2}/>:<Icon size={31} strokeWidth={1.7}/>}</span>
              <span className="map-journey-caption"><b>{String(index+1).padStart(2,'0')}</b><strong>{label}</strong></span>
            </button>;
          })}
        </nav>
      </aside>

      <main className="onboard-right map-onboard-main">
        <div className="quest-progress map-progress" aria-label={ui.progress+' '+(step+1)+' '+ui.of+' 4: '+progress+'%'}>
          <span>{ui.progress} {String(step+1).padStart(2,'0')} {ui.of} 04</span>
          <div aria-hidden="true">{[0,1,2,3].map(index=><span key={index} className={index<=step?'filled':''}/>)}</div>
          <b>{progress}%</b>
        </div>

        <section className="onboard-card map-onboard-card">
          <div className="map-intro">
            {step===0?<><h1>{ui.headline[0]}<br/><em>{ui.headline[1]}</em></h1><p>{ui.intro}</p></>:<><h1>{ui.stepHeading[step]}</h1><p>{ui.stepSubheading[step]}</p></>}
          </div>

          {step===0&&<>
            <h2 className="map-section-title">{ui.choose}</h2>
            <div className="adventure-choices map-choices" role="radiogroup" aria-label={ui.choose}>
              {templates.map(template=><button key={template.id} type="button" className={'adventure-option map-choice '+(type===template.id?'active':'')} role="radio" aria-checked={type===template.id} onClick={()=>setType(template.id)}>
                <img src={illustrations[template.id]} alt="" className="map-choice-art" draggable="false"/>
                <span className="map-choice-text"><strong>{template.name}</strong><small>{ui.choices[template.id]}</small></span>
                <span className="choice-circle map-choice-indicator" aria-hidden="true">{type===template.id?<Check size={25} strokeWidth={3.5}/>:null}</span>
              </button>)}
            </div>
          </>}

          {step===1&&<div className="form-stack map-form-stack">
            <label className="form-field"><span>{t('onboarding.name')}</span><input autoFocus required maxLength={120} placeholder={t('onboarding.namePlaceholder')} value={name} onChange={event=>setName(event.target.value)}/><small>{t('onboarding.nameHint')}</small></label>
            <label className="form-field"><span>{t('onboarding.description')}</span><textarea rows="3" maxLength={300} placeholder={t('onboarding.descriptionPlaceholder')} value={subtitle} onChange={event=>setSubtitle(event.target.value)}/></label>
            <div className="slug-card"><span>{t('onboarding.preview')}:</span><b>{slugify(name)||'your-quest'}.hooplelite.example</b></div>
          </div>}

          {step===2&&<div className="vibe-grid map-vibe-grid">{palettes.map(item=><button type="button" key={item.id} className={'vibe-option '+(palette===item.id?'active':'')} onClick={()=>setPalette(item.id)} aria-pressed={palette===item.id}>
            <span className="vibe-art" style={{background:item.bg}}><i style={{background:item.accent}}/><u style={{background:item.soft}}/><b style={{color:item.ink}}>Aa</b></span>
            <strong>{item.name}</strong><small>{item.subtitle}</small>
            {palette===item.id&&<span className="vibe-check"><Check size={15}/></span>}
          </button>)}</div>}

          {step===3&&<div className="form-stack map-form-stack">
            <label className="form-field"><span>{type==='quiz'?questT(locale,'questions'):t('onboarding.missionCount')}</span>
              <div className="number-counter"><button type="button" aria-label={locale==='id'?'Kurangi jumlah':'Decrease count'} onClick={()=>setMissionCount(Math.max(2,missionCount-1))}>−</button><strong>{missionCount} {questT(locale,type==='quiz'?'questions':'tasks')}</strong><button type="button" aria-label={locale==='id'?'Tambah jumlah':'Increase count'} onClick={()=>setMissionCount(Math.min(8,missionCount+1))}>+</button></div>
            </label>
            <label className="form-field"><span>{t('onboarding.grandReward')}</span><input value={rewardName} maxLength={120} onChange={event=>setRewardName(event.target.value)} placeholder={t('onboarding.rewardPlaceholder')}/></label>
            <div className="finish-hint"><Flag size={28}/><div><strong>{t('onboarding.finishTitle')}</strong><p>{t('onboarding.finishDesc')}</p></div></div>
          </div>}
          {error&&<p role="alert" className="form-error">{error}</p>}
        </section>
      </main>
    </div>

    <footer className="map-onboard-footer">
      <button type="button" className="map-back" onClick={back}><ArrowLeft size={29} strokeWidth={1.9}/>{t('common.back')}</button>
      <button type="button" className="map-next" onClick={next}>{ui.next[step]} <ArrowRight size={30} strokeWidth={2}/></button>
    </footer>
  </div>;
}
