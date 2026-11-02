import React from 'react';
import {ArrowUpRight,CheckCircle2,Globe2,Ticket} from 'lucide-react';
import PublishSchedule from './PublishSchedule';

const copy={
  id:{image:'Gambar hadiah sudah diatur',footnote:'S&K singkat hadiah sudah diisi',schedule:'Jadwalkan link demo',demo:'Buat link demo',before:'Sebelum event dipublikasikan',legal:'Pastikan quest aman, peserta setuju penggunaan kamera, hadiah sesuai janji, dan ketentuan dapat diakses.',terms:'Syarat',privacy:'Privasi',agree:'Saya menyatakan konten, media, lokasi, hadiah, dan semua misi event ini tidak melanggar hukum atau hak orang lain. Saya setuju dengan Syarat & Ketentuan Hoople lite.'},
  en:{image:'Reward image is ready',footnote:'Short reward terms are filled',schedule:'Schedule demo link',demo:'Create demo link',before:'Before publishing',legal:'Check mission safety, camera consent, prize accuracy, and visible event policies.',terms:'Terms',privacy:'Privacy',agree:'I confirm this event’s content, media, venues, rewards and missions are lawful and respect others’ rights. I agree to Hoople lite Terms & Conditions.'}
};

export const rewardImageReady=reward=>!!(reward?.image||/^https:\/\/\S+/i.test(reward?.imageUrl||''));

export default function PublishInspector({experience,locale,t,missionsValid,ready,onLegal,onPublish,policyAccepted,onPolicyAccepted,onScheduleChange}){
  const tr=copy[locale==='en'?'en':'id'];
  const reward=experience.reward||{};
  const checks=[
    {ok:!!experience.name?.trim(),label:t('builder.check1')},
    {ok:missionsValid,label:t('builder.check2')},
    {ok:!!reward.name?.trim()&&reward.threshold<=experience.missions.length,label:t('builder.check3')},
    {ok:rewardImageReady(reward),label:tr.image},
    {ok:!!reward.footnote?.trim(),label:tr.footnote}
  ];
  return <div className="inspector-stack publish-editor">
    <div className="publish-rocket"><Ticket size={72}/><span>READY / 01</span></div>
    <div className="inspector-section"><h3><span>01</span>{t('builder.preflight')}</h3><div className="publish-checks">{checks.map((check,i)=><div className={!check.ok?'warning':''} key={i}><CheckCircle2 size={18}/>{check.label}</div>)}</div></div>
    <div className="inspector-section"><h3><span>02</span>{t('builder.futureUrl')}</h3><div className="domain-demo"><Globe2 size={18}/>{experience.slug}.hooplelite.example</div><p className="inspector-help">{t('builder.domainNote')}</p></div>
    <PublishSchedule publication={experience.publication} onChange={onScheduleChange} locale={locale}/>
    <div className="builder-legal-note"><b>{tr.before}</b><p>{tr.legal}</p><div><button onClick={()=>onLegal('terms')}>{tr.terms}</button><button onClick={()=>onLegal('privacy')}>{tr.privacy}</button><button onClick={()=>onLegal('refund')}>Refund</button></div><label className="publish-attest"><input type="checkbox" checked={policyAccepted} onChange={event=>onPolicyAccepted(event.target.checked)}/><span>{tr.agree}</span></label></div>
    <button className="button-dark full" disabled={!ready} onClick={()=>onPublish(experience.id)}>{experience.publication?.mode==='scheduled'?tr.schedule:tr.demo} <ArrowUpRight size={18}/></button>
  </div>;
}
