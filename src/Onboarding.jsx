import React,{useState} from 'react';
import {ArrowLeft,ArrowRight,BadgeCheck,Check,Flag,Ticket,X} from 'lucide-react';
import {createExperience,makeMission,missionDefaults,palettes,templates,slugify} from './data';
import Brand from './Brand';
import {LanguageSwitch,useLocale} from './i18n';
import {questT} from './questCopy';

export default function Onboarding({initialType='passport',onDone,onCancel}){
  const {locale,t}=useLocale();
  const [step,setStep]=useState(0),[type,setType]=useState(initialType),[name,setName]=useState(''),[subtitle,setSubtitle]=useState(''),[palette,setPalette]=useState('pop'),[rewardName,setRewardName]=useState(locale==='id'?'Hadiah Spesial':'Mystery Goodie Bag'),[missionCount,setMissionCount]=useState(4),[error,setError]=useState('');
  const steps=t('onboarding.steps');
  function next(){
    if(step===1&&!name.trim()){setError(t('onboarding.nameError'));return}
    setError('');
    if(step<3){setStep(s=>s+1);return}
    const missions=missionDefaults(type,locale);
    while(missions.length<missionCount){missions.push(makeMission(type,missions.length,locale))}
    const e=createExperience({name:name.trim(),subtitle:subtitle.trim(),type,palette,rewardName,missions:missions.slice(0,missionCount),locale});
    e.reward.threshold=Math.min(3,e.missions.length);onDone(e);
  }
  return <div className="onboarding">
    <div className="onboard-header"><button className="brand-wrapper" onClick={onCancel}><Brand/></button><span className="xp-badge"><BadgeCheck size={15}/> {t('onboarding.mode')} <b>{step*25} XP</b></span><div className="onboard-right-actions"><LanguageSwitch/><button className="plain-icon" aria-label={t('common.close')} onClick={onCancel}><X size={21}/></button></div></div>
    <div className="onboard-body"><aside className="onboard-left"><div className="eyebrow">{t('onboarding.journey')}</div><h1>{t('onboarding.title1')}<br/><em>{t('onboarding.title2')}</em></h1><p>{t('onboarding.desc')}</p><div className="quest-timeline">{steps.map((q,i)=><div key={i} className={'quest-step '+(i===step?'is-current':'')+' '+(i<step?'is-done':'')}><span className="quest-number">{i<step?<Check size={15}/>:i+1}</span><strong>{q}</strong>{i===step&&<small>{t('onboarding.now')}</small>}</div>)}</div><div className="onboarding-stub"><span>QUEST PASS</span><strong>{String(step+1).padStart(2,'0')} / 04</strong><small>{t('onboarding.mode')}</small></div></aside>
    <main className="onboard-right"><div className="quest-progress"><span>{t('onboarding.mode')} {String(step+1).padStart(2,'0')} / 04</span><div>{steps.map((q,i)=><span key={q} className={i<=step?'filled':''}/>)}</div><b>{(step+1)*25}%</b></div>
      <section className="onboard-card"><span className="label-chip"><Ticket size={15}/>{t('onboarding.level')} {String(step+1).padStart(2,'0')} / 04</span><h2>{t('onboarding.stepTitle')[step]}</h2><p className="card-intro">{t('onboarding.stepDesc')[step]}</p>
        {step===0&&<div className="adventure-choices">{templates.map(tmp=><button key={tmp.id} className={'adventure-option '+(type===tmp.id?'active':'')} onClick={()=>setType(tmp.id)}><span className="adventure-emoji" style={{background:tmp.gradient}}>{tmp.emoji}</span><span><strong>{tmp.name}</strong><small>{t('templates.'+tmp.id+'.desc')}</small></span><span className="choice-circle">{type===tmp.id?<Check size={17}/>:null}</span></button>)}</div>}
        {step===1&&<div className="form-stack"><label className="form-field"><span>{t('onboarding.name')}</span><input autoFocus placeholder={t('onboarding.namePlaceholder')} value={name} onChange={e=>setName(e.target.value)}/><small>{t('onboarding.nameHint')}</small></label><label className="form-field"><span>{t('onboarding.description')}</span><textarea rows="3" placeholder={t('onboarding.descriptionPlaceholder')} value={subtitle} onChange={e=>setSubtitle(e.target.value)}/></label><div className="slug-card"><span>{t('onboarding.preview')}:</span><b> {slugify(name)||'your-quest'}.hooplelite.example</b></div></div>}
        {step===2&&<div className="vibe-grid">{palettes.map(p=><button className={'vibe-option '+(palette===p.id?'active':'')} key={p.id} onClick={()=>setPalette(p.id)}><span className="vibe-art" style={{background:p.bg}}><i style={{background:p.accent}}/><u style={{background:p.soft}}/><b style={{color:p.ink}}>Aa</b></span><strong>{p.name}</strong><small>{p.subtitle}</small>{palette===p.id&&<span className="vibe-check"><Check size={15}/></span>}</button>)}</div>}
        {step===3&&<div className="form-stack"><label className="form-field"><span>{type==='quiz'?questT(locale,'questions'):t('onboarding.missionCount')}</span><div className="number-counter"><button aria-label="Decrease" onClick={()=>setMissionCount(Math.max(2,missionCount-1))}>−</button><strong>{missionCount} {questT(locale,type==='quiz'?'questions':'tasks')}</strong><button aria-label="Increase" onClick={()=>setMissionCount(Math.min(8,missionCount+1))}>+</button></div></label><label className="form-field"><span>{t('onboarding.grandReward')}</span><input value={rewardName} onChange={e=>setRewardName(e.target.value)} placeholder={t('onboarding.rewardPlaceholder')}/></label><div className="finish-hint"><Flag size={28}/><div><strong>{t('onboarding.finishTitle')}</strong><p>{t('onboarding.finishDesc')}</p></div></div></div>}
        {error&&<p className="form-error">{error}</p>}
        <div className="onboard-actions"><button className="button-outline" onClick={()=>step?setStep(s=>s-1):onCancel()}><ArrowLeft size={17}/>{step?t('common.back'):t('common.cancel')}</button><button className="button-dark" onClick={next}>{step===3?t('onboarding.finish'):t('onboarding.next')} <ArrowRight size={18}/></button></div>
      </section><div className="onboard-foot">{t('onboarding.bottom')}</div>
    </main></div>
  </div>;
}
