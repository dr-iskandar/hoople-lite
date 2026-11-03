import React,{useState} from 'react';
import {Activity,ArrowLeft,ArrowUpRight,CheckCircle2,ChevronRight,CircleHelp,Compass,Eye,Gift,Globe2,GripVertical,Layers3,Monitor,MoveDown,MoveUp,Palette,Plus,Rocket,Smartphone,Ticket,Trash2,X} from 'lucide-react';
import {getPalette,slugify,uid,missionKind} from './data';
import {LanguageSwitch,useLocale} from './i18n';
import {questT} from './questCopy';
import MissionInspector from './MissionInspector';
import BrandingInspector from './BrandingInspector';
import RewardInspector from './RewardInspector';
import PublishInspector,{rewardImageReady} from './PublishInspector';
import {publicationIsValid} from './PublishSchedule';
import {displayExperienceStatus} from './release';
import Player from './Player';

const panels=[{id:'content',Icon:Layers3},{id:'missions',Icon:Compass},{id:'rewards',Icon:Gift},{id:'branding',Icon:Palette},{id:'publish',Icon:Rocket}];
function Field({label,value,onChange,textarea=false,hint}){
  return <label className="form-field"><span>{label}</span>{textarea?<textarea value={value||''} rows="3" onChange={e=>onChange(e.target.value)}/>:<input value={value||''} onChange={e=>onChange(e.target.value)}/ >}{hint&&<small>{hint}</small>}</label>;
}
export default function Builder({experience,onUpdate,onSaveCloud,cloudSaving=false,onBack,onPublish,onHelp,onLegal}){
  const {t,locale}=useLocale();
  const [panel,setPanel]=useState('content'),[device,setDevice]=useState('mobile'),[resetKey,setResetKey]=useState(0),[testMode,setTestMode]=useState(false),[policyAccepted,setPolicyAccepted]=useState(false);
  const update=patch=>onUpdate({...experience,...patch});
  const updateReward=patch=>update({reward:{...experience.reward,...patch}});
  const updateMission=(id,patch)=>update({missions:experience.missions.map(m=>m.id===id?{...m,...patch}:m)});
  const theme=getPalette(experience.palette);
  function reorderMissions(from,to){const next=[...experience.missions];if(from<0||to<0||from>=next.length||to>=next.length||from===to)return;const [item]=next.splice(from,1);next.splice(to,0,item);update({missions:next})}
  function addMission(mission){update({missions:[...experience.missions,mission]})}
  const missionsValid=experience.missions.length>0&&experience.missions.every(m=>m.name?.trim()&&Number(m.points)>=0&&(missionKind(m,experience.type)==='quiz'?(m.question?.trim()&&Array.isArray(m.options)&&m.options.length===4&&m.options.every(option=>option.trim())&&Number.isInteger(m.correctIndex)&&m.correctIndex>=0&&m.correctIndex<4):(missionKind(m,experience.type)!=='qr'||m.code?.trim())));
  const ready=!!experience.name.trim()&&missionsValid&&!!experience.reward.name.trim()&&experience.reward.threshold<=experience.missions.length&&rewardImageReady(experience.reward)&&!!experience.reward.footnote?.trim()&&publicationIsValid(experience.publication)&&policyAccepted;
  const showStatus=displayExperienceStatus(experience);
  return <div className="builder-shell">
    <header className="builder-header"><div className="builder-breadcrumb"><button className="plain-icon" onClick={onBack} aria-label={t('common.back')}><ArrowLeft size={19}/></button><span className="builder-logo" aria-label="Hoople lite">h</span><span>{t('builder.breadcrumb')}</span><ChevronRight size={15}/><strong>{experience.name}</strong><span className={'status-pill '+(showStatus!=='draft'?'status-live':'')}>{showStatus==='scheduled'?(locale==='id'?'Terjadwal':'Scheduled'):showStatus==='published'?t('builder.published'):t('builder.draft')}</span></div><div className="builder-header-actions"><LanguageSwitch/><span className="saved-mark"><CheckCircle2 size={16}/>{experience.cloud?(experience.cloud.dirty?(locale==='id'?'Belum tersimpan di cloud':'Unsaved cloud changes'):(locale==='id'?'Draft cloud tersimpan':'Cloud draft saved')):t('builder.save')}</span>{experience.cloud&&<button className="button-outline small" type="button" onClick={()=>void onSaveCloud?.()} disabled={cloudSaving||!experience.cloud.dirty}>{cloudSaving?(locale==='id'?'Menyimpan…':'Saving…'):(locale==='id'?'Simpan ke cloud':'Save to cloud')}</button>}<button className="button-outline small" onClick={()=>{setResetKey(n=>n+1);setTestMode(true)}}><Eye size={17}/>{t('builder.test')}</button><button className="button-dark small" onClick={()=>setPanel('publish')}>{t('common.publish')} <ArrowUpRight size={17}/></button></div></header>
    <div className="builder-body">
      <aside className="builder-rail"><span className="rail-title">BUILD</span>{panels.map(p=><button key={p.id} className={panel===p.id?'active':''} onClick={()=>setPanel(p.id)}><p.Icon size={21}/><span>{p.id==='branding'?'Branding':t('builder.'+p.id)}</span></button>)}<button className="rail-help" aria-label={t('builder.help')} onClick={onHelp}><CircleHelp size={20}/></button></aside>
      <section className="builder-inspector"><div className="inspector-intro"><div className="eyebrow">BUILDER / 01</div><h2>{panel==='branding'?(locale==='id'?'Identitas brand':'Brand identity'):t('builder.'+({content:'introContent',missions:'introMissions',rewards:'introRewards',publish:'introPublish'})[panel])}</h2><p>{panel==='branding'?(locale==='id'?'Logo, gambar, warna, dan tipografi untuk brand kamu.':'Make the experience unmistakably yours.'):t('builder.'+({content:'descContent',missions:'descMissions',rewards:'descRewards',publish:'descPublish'})[panel])}</p></div>
      <div className="inspector-scroll">
        {panel==='content'&&<div className="inspector-stack"><div className="inspector-section"><h3><span>01</span>{t('builder.basics')}</h3><Field label={t('builder.title')} value={experience.name} onChange={v=>update({name:v,slug:slugify(v)})}/><Field label={t('builder.subtitle')} value={experience.subtitle} textarea onChange={v=>update({subtitle:v})}/><Field label={t('builder.hero')} value={experience.welcome} onChange={v=>update({welcome:v})}/><Field label={t('builder.cta')} value={experience.buttonText} onChange={v=>update({buttonText:v})}/></div><div className="inspector-section"><h3><span>02</span>{t('builder.blocks')}</h3><p className="inspector-help">{t('builder.blocksDesc')}</p>{experience.blocks.map((b,i)=><div className="editable-block" key={b.id}><div><GripVertical size={17}/><strong>{t('builder.textBlock')} {i+1}</strong><button onClick={()=>update({blocks:experience.blocks.filter(x=>x.id!==b.id)})} aria-label={t('builder.deleteMission')}><Trash2 size={15}/></button></div><textarea value={b.text} rows="3" onChange={e=>update({blocks:experience.blocks.map(x=>x.id===b.id?{...x,text:e.target.value}:x)})}/></div>)}<button className="add-row" onClick={()=>update({blocks:[...experience.blocks,{id:uid(),text:locale==='id'?'Tulis pesan untuk peserta...':'Tell participants something useful...'}]})}><Plus size={17}/>{t('builder.addBlock')}</button></div></div>}
        {panel==='missions'&&<MissionInspector experience={experience} locale={locale} t={t} onUpdate={updateMission} onAdd={addMission} onReorder={reorderMissions} onDelete={id=>update({missions:experience.missions.filter(m=>m.id!==id)})}/>}
        {panel==='rewards'&&<RewardInspector experience={experience} locale={locale} t={t} onChange={reward=>update({reward})}/>}
        {panel==='branding'&&<BrandingInspector experience={experience} onUpdate={update} locale={locale}/>}
        {panel==='publish'&&<PublishInspector experience={experience} locale={locale} t={t} missionsValid={missionsValid} ready={ready} policyAccepted={policyAccepted} onPolicyAccepted={setPolicyAccepted} onLegal={onLegal} onPublish={onPublish} onScheduleChange={publication=>update({publication})}/>}
      </div></section>
      <main className="builder-stage"><div className="preview-toolbar"><div><strong>{t('builder.previewTitle')}</strong><span>{t('builder.previewDesc')}</span></div><div className="device-toggles"><button className={device==='mobile'?'chosen':''} onClick={()=>setDevice('mobile')} aria-label="Mobile preview"><Smartphone size={18}/></button><button className={device==='desktop'?'chosen':''} onClick={()=>setDevice('desktop')} aria-label="Desktop preview"><Monitor size={18}/></button><button onClick={()=>setResetKey(v=>v+1)} title={t('builder.restart')}><Activity size={18}/></button></div></div><div className={'preview-stage '+(device==='desktop'?'wide':'')}><div className="phone-device"><span className="phone-notch"/><Player key={experience.id+'-'+resetKey} experience={experience} preview/></div></div><div className="preview-foot"><span>{t('builder.previewNote')}</span><span>{t('builder.previewSimulation')}</span></div></main>
    </div>
    {testMode&&<div className="test-overlay"><div className="test-toolbar"><strong><Eye size={18}/>{t('builder.testTitle')}</strong><span>{t('builder.testDesc')}</span><button className="button-outline small" onClick={()=>setTestMode(false)}><X size={17}/>{t('common.close')}</button></div><div className="test-device"><Player experience={experience} preview key={resetKey}/></div></div>}
  </div>;
}
