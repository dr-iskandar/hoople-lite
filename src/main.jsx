import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Activity,ArrowLeft,ArrowRight,ArrowUpRight,BarChart3,BadgeCheck,Check,ChevronDown,Compass,Copy,ExternalLink,Eye,Gift,Layers3,LayoutDashboard,Link2,LockKeyhole,Menu,MoreHorizontal,Plus,Ticket,Users,BookOpen,MessageCircle,X} from 'lucide-react';
import {getBrand,getTemplate,loadExperiences,makeShareUrl,sharedExperience,templates} from './data';
import {LanguageSwitch,LocaleProvider,useLocale} from './i18n';
import Brand from './Brand';
import Landing from './Landing';
import Tutorial from './Tutorial';
import Onboarding from './Onboarding';
import Builder from './Builder';
import Player from './Player';
import EventWizard from './EventWizard';
import LegalDialog from './LegalDialog';
import WorkspacePanel from './WorkspacePanel';
import {displayExperienceStatus,formatRelease,isReleaseScheduled} from './release';
import './styles.css';
import './refresh.css';
import './quest.css';
import './brand.css';
import './mission-modal.css';
import './reward-schedule.css';
import './sidebar-polish.css';
import './hoople-lite.css';

const menu=[{id:'dashboard',key:'overview',Icon:LayoutDashboard},{id:'projects',key:'experiences',Icon:Layers3},{id:'wizard',key:'wizard',Icon:MessageCircle},{id:'templates',key:'templates',Icon:Ticket},{id:'analytics',key:'analytics',Icon:BarChart3},{id:'tutorial',key:'tutorial',Icon:BookOpen}];
const experienceIcons={passport:Ticket,hunt:Compass,quiz:BookOpen};
function Sidebar({screen,onGo,onLanding,onNew,onLegal,onWorkspace,workspaceName,open}){
  const {t,locale}=useLocale();
  const help=locale==='en'?{heading:'HELP & INFO',guide:'Quick guide',guideDesc:'5 steps, hands-on',info:'About this demo'}:{heading:'BANTUAN & INFO',guide:'Panduan singkat',guideDesc:'5 langkah, langsung praktik',info:'Informasi demo'};
  return <aside className={'sidebar '+(open?'is-open':'')} aria-label={locale==='en'?'Studio navigation':'Navigasi Studio'}>
    <button className="sidebar-logo" onClick={onLanding} aria-label="Hoople lite home"><Brand/></button>
    <div className="sidebar-main">
      <button className="workspace-card" onClick={onWorkspace} title={locale==='id'?'Kelola workspace':'Manage workspace'}><span className="workspace-letter">h</span><span><small>{t('nav.workspace')}</small><b>{workspaceName||t('nav.workspaceName')}</b></span><ChevronDown size={16}/></button>
      <span className="side-label">{t('nav.createSpace')}</span>
      <nav aria-label={locale==='en'?'Creative menu':'Menu kreasi'}>{menu.map(m=><button key={m.id} className={screen===m.id?'active':''} aria-current={screen===m.id?'page':undefined} onClick={()=>onGo(m.id)}><m.Icon size={19}/>{m.id==='wizard'?'AI Event Wizard':t('nav.'+m.key)}{screen===m.id&&<i/>}</button>)}</nav>
      <button className="sidebar-new" onClick={()=>onNew()}><Plus size={18}/>{t('nav.newExperience')}</button>
      <div className="sidebar-flex"/>
      <div className="sidebar-support"><span className="sidebar-support-heading">{help.heading}</span>
        <button className="sidebar-guide" onClick={()=>onGo('tutorial')}><span className="sidebar-guide-icon"><BookOpen size={19}/></span><span className="sidebar-guide-copy"><small>HOW / TO</small><b>{help.guide}</b><em>{help.guideDesc}</em></span><ArrowUpRight size={16}/></button>
        <button className="sidebar-demo-info" onClick={()=>onLegal('terms')}><LockKeyhole size={16}/><span>{help.info}</span><ArrowUpRight size={15}/></button>
      </div>
    </div>
    <div className="sidebar-profile"><span>D</span><div><b>{t('nav.creator')}</b><small>{t('nav.profile')}</small></div><MoreHorizontal size={19}/></div>
  </aside>;
}
function ProjectCard({experience,onOpen}){
  const {t,locale}=useLocale(),tmp=getTemplate(experience.type),brand=getBrand(experience),logo=brand.logo||brand.logoUrl;
  const status=displayExperienceStatus(experience),label=status==='scheduled'?(locale==='id'?'Terjadwal':'Scheduled'):status==='published'?t('dashboard.published'):t('dashboard.draft'),Visual=experienceIcons[experience.type]||Ticket;
  return <button className="project-card" onClick={onOpen}><div className="project-cover" style={{background:brand.soft||tmp.gradient}}>{logo?<img className="brand-project-logo" src={logo} alt=""/>:<span className="type-mark"><Visual size={61} strokeWidth={1.45}/></span>}<small>{label}</small></div><div className="project-info"><span><b>{experience.name}</b><small>{brand.name||tmp.name} · {experience.missions.length} {t('dashboard.missions')}</small></span><span className="project-open"><ArrowUpRight size={18}/></span></div></button>;
}
function TemplateCard({template,onClick}){
  const {t}=useLocale(),Visual=experienceIcons[template.id]||Ticket;
  return <button className="template-card" onClick={onClick}><div className="template-cover" style={{background:template.gradient}}><span className="type-mark"><Visual size={58} strokeWidth={1.45}/></span></div><div className="template-info"><small>{t('templates.'+template.id+'.tag')}</small><h3>{template.name}</h3><p>{t('templates.'+template.id+'.desc')}</p><b>{t('common.create')} <ArrowUpRight size={17}/></b></div></button>;
}
function Dashboard({screen,experiences,onNew,onOpen,onGo,onAi,onWorkspaceInfo}){
  const {t}=useLocale(),projects=screen==='projects'?experiences:experiences.slice(0,3);
  const samplePlayers=experiences.reduce((s,e)=>s+(e.participants||0),0);
  return <div className="content"><div className="content-top"><span className="eyebrow">{t('dashboard.eyebrow')}</span><div><LanguageSwitch/><span className="free-plan">{t('common.free')}</span><span className="account-dot">D</span></div></div>
    <WorkspacePanel experiences={experiences} onWorkspaceInfo={onWorkspaceInfo}/>
    {screen!=='projects'&&<section className="hero"><div className="hero-text"><span className="hero-chip">{t('dashboard.heroBadge')}</span><h1>{t('dashboard.hero1')}<br/><em>{t('dashboard.hero2')}</em></h1><p>{t('dashboard.heroDesc')}</p><div className="hero-buttons"><button className="button-dark" onClick={onAi}><MessageCircle size={18}/>AI Event Wizard</button><button className="hero-link" onClick={()=>onNew()}>{t('dashboard.create')} <ArrowRight size={17}/></button></div></div><div className="dashboard-ticket-art" aria-hidden="true"><span>PLAY / MORE</span><strong>YOUR<br/>EVENT</strong><div>01 <i/> 02 <i/> 03</div><small>HOOPLE LITE PASS</small></div></section>}
    <div className="section-title"><div><span className="eyebrow">{t('dashboard.bigPicture')}</span><h2>{t('dashboard.overviewTitle')}</h2></div><small>{t('dashboard.sampleNote')}</small></div>
    <div className="stats"><div className="stat stat-purple"><span className="stat-icon"><Layers3 size={20}/></span><small>{t('dashboard.total')}</small><strong>{String(experiences.length).padStart(2,'0')}</strong><p>{t('dashboard.ready')}</p></div><div className="stat stat-pink"><span className="stat-icon"><Users size={20}/></span><small>{t('dashboard.sampleParticipants')}</small><strong>{samplePlayers.toLocaleString('id-ID')}</strong><p>{t('dashboard.sample')}</p></div><div className="stat stat-mint"><span className="stat-icon"><Activity size={20}/></span><small>{t('dashboard.publishedCount')}</small><strong>{String(experiences.filter(e=>displayExperienceStatus(e)==='published').length).padStart(2,'0')}</strong><p>{t('dashboard.momentum')}</p></div></div>
    <div className="section-title"><div><span className="eyebrow">{t('dashboard.creations')}</span><h2>{screen==='projects'?t('dashboard.all'):t('dashboard.continue')}</h2></div><button className="section-link" onClick={()=>onGo('projects')}>{t('common.viewAll')} <ArrowUpRight size={17}/></button></div>
    <div className="projects-grid">{projects.map(e=><ProjectCard key={e.id} experience={e} onOpen={()=>onOpen(e.id)}/>)}<button className="new-project" onClick={()=>onNew()}><span><Plus size={29}/></span><b>{t('dashboard.newTitle')}</b><small>{t('dashboard.newDesc')}</small><strong>{t('dashboard.newCta')} <ArrowRight size={16}/></strong></button></div>
    {screen!=='projects'&&<section id="templates"><div className="section-title"><div><span className="eyebrow">{t('dashboard.templatesEyebrow')}</span><h2>{t('dashboard.templatesTitle')}</h2></div></div><div className="templates-grid">{templates.map(tmp=><TemplateCard template={tmp} key={tmp.id} onClick={()=>onNew(tmp.id)}/>)}</div></section>}
    <footer className="app-footer">{t('dashboard.footer')}</footer>
  </div>;
}
function Templates({onNew}){const {t}=useLocale();return <div className="content stand-alone"><div className="studio-page-lang"><LanguageSwitch/></div><span className="eyebrow">{t('dashboard.templatesEyebrow')}</span><h1>{t('dashboard.templatesPage')}</h1><p>{t('dashboard.templatesPageDesc')}</p><div className="templates-grid">{templates.map(tmp=><TemplateCard key={tmp.id} template={tmp} onClick={()=>onNew(tmp.id)}/>)}</div></div>}
function Analytics({experiences,onBack}){const {t}=useLocale();return <div className="content stand-alone"><div className="studio-page-lang"><LanguageSwitch/></div><span className="eyebrow">ANALYTICS / DEMO</span><h1>{t('dashboard.analyticsTitle')}</h1><p>{t('dashboard.analyticsDesc')}</p><div className="stats"><div className="stat stat-purple"><small>{t('dashboard.publishedCount')}</small><strong>{experiences.filter(e=>displayExperienceStatus(e)==='published').length}</strong><p>{t('nav.profile')}</p></div><div className="stat stat-pink"><small>{t('dashboard.sampleVisitors')}</small><strong>{experiences.reduce((s,e)=>s+(e.visitors||0),0).toLocaleString('id-ID')}</strong><p>{t('dashboard.sample')}</p></div><div className="stat stat-mint"><small>{t('dashboard.sampleParticipants')}</small><strong>{experiences.reduce((s,e)=>s+(e.participants||0),0).toLocaleString('id-ID')}</strong><p>{t('dashboard.sample')}</p></div></div><div className="analytics-placeholder"><BarChart3 size={54}/><h2>{t('dashboard.analyticsEmpty')}</h2><p>{t('dashboard.analyticsEmptyDesc')}</p><button className="button-dark" onClick={onBack}>{t('dashboard.return')} <ArrowRight size={17}/></button></div></div>}
function PublishedModal({experience,onClose,onCopy,copied}){
  const {t,locale}=useLocale(),url=makeShareUrl(experience),scheduled=isReleaseScheduled(experience);
  const releaseTime=scheduled?formatRelease(experience.publication.startsAt,experience.publication.timezone,locale):'';
  return <div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><button className="modal-x" onClick={onClose} aria-label={t('common.close')}><X size={21}/></button><div className="modal-emoji"><Ticket size={62}/></div><span className="success-chip">{scheduled?(locale==='id'?'DEMO TERJADWAL':'DEMO SCHEDULED'):t('publish.badge')}</span><h2>{scheduled?(locale==='id'?'Link sudah siap.':'Your link is ready.'):t('publish.title1')}<br/><em>{scheduled?(locale==='id'?'Tunggu hari tayangnya.':'Let the countdown begin.'):t('publish.title2')}</em></h2><p>{scheduled?(locale==='id'?`Peserta melihat halaman hitung mundur sampai ${releaseTime}. Ini simulasi di browser; backend produksi akan mengunci data event.`:`Participants see a countdown until ${releaseTime}. This is a browser simulation; the production backend will protect event data.`):t('publish.desc')}</p><div className="copy-link"><Link2 size={17}/><span>{url.slice(0,61)}…</span><button onClick={()=>onCopy(url)} aria-label={t('publish.copy')}>{copied?<Check size={18}/>:<Copy size={18}/>}</button></div><div className="modal-buttons"><button className="button-outline" onClick={onClose}>{t('publish.edit')}</button><button className="button-dark" onClick={()=>window.open(url,'_blank','noopener,noreferrer')}>{scheduled?(locale==='id'?'Lihat halaman tunggu':'View waiting page'):t('publish.open')} <ExternalLink size={17}/></button></div><small className="modal-note"><LockKeyhole size={14}/>{t('publish.private')}</small></div></div>;
}
function App(){
  const {t,locale}=useLocale();
  const [experiences,setExperiences]=useState(loadExperiences),[screen,setScreen]=useState(()=>location.hash==='#studio'?'dashboard':'landing'),[selectedId,setSelectedId]=useState(''),[initialType,setInitialType]=useState('passport'),[mobileMenu,setMobileMenu]=useState(false),[publishedId,setPublishedId]=useState(''),[copied,setCopied]=useState(false),[notice,setNotice]=useState(''),[shared,setShared]=useState(sharedExperience),[legalTab,setLegalTab]=useState(''),[workspaceName,setWorkspaceName]=useState('');
  useEffect(()=>{try{localStorage.setItem('questpop-studio-v1',JSON.stringify(experiences))}catch{}},[experiences]);
  useEffect(()=>{const listener=()=>setShared(sharedExperience());window.addEventListener('hashchange',listener);return()=>window.removeEventListener('hashchange',listener)},[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),2900);return()=>clearTimeout(timer)},[notice]);
  const chosen=experiences.find(e=>e.id===selectedId);
  function goStudio(page='dashboard'){history.replaceState({},'','#studio');setScreen(page);setMobileMenu(false);window.scrollTo(0,0)}
  function goLanding(){history.replaceState({},'',location.pathname);setScreen('landing');setMobileMenu(false);window.scrollTo(0,0)}
  function startNew(type='passport'){history.replaceState({},'','#studio');setInitialType(type);setScreen('onboarding');setMobileMenu(false)}
  function openProject(id){setSelectedId(id);setScreen('builder')}
  function updateProject(next){setExperiences(old=>old.map(e=>e.id===next.id?next:e))}
  function finishQuest(e){setExperiences(old=>[e,...old]);setSelectedId(e.id);setScreen('builder');setNotice(locale==='id'?'Quest selesai. Editor sudah siap.':'Quest complete. Your builder is ready.')}
  function finishWizard(items){setExperiences(old=>[...items,...old]);setSelectedId(items[0].id);setScreen('builder');setNotice(locale==='id'?`${items.length} experience siap diedit.`:`${items.length} experience drafts ready.`)}
  function publish(id){setExperiences(old=>old.map(e=>e.id===id?{...e,status:isReleaseScheduled(e)?'scheduled':'published'}:e));setPublishedId(id)}
  async function copyLink(url){try{await navigator.clipboard.writeText(url);setCopied(true);setNotice(t('publish.copied'))}catch{window.prompt(t('publish.copy'),url)}}
  function leaveShared(){history.replaceState({},'',location.pathname);setShared(null);setScreen('landing')}
  if(shared)return <><div className="shared-app"><header><Brand/><LanguageSwitch/><button onClick={leaveShared}><ArrowLeft size={16}/>{t('common.studio')}</button></header><div className="shared-frame"><Player experience={shared} onExit={leaveShared} onLegal={setLegalTab}/></div></div>{legalTab&&<LegalDialog initial={legalTab} onClose={()=>setLegalTab('')}/>}</>;
  if(screen==='landing')return <><Landing onStudio={()=>goStudio()} onStart={()=>startNew()} onAi={()=>goStudio('wizard')} onTutorial={()=>goStudio('tutorial')} onLegal={setLegalTab}/>{legalTab&&<LegalDialog initial={legalTab} onClose={()=>setLegalTab('')}/>}</>;
  if(screen==='wizard')return <EventWizard onBack={()=>goStudio()} onCreate={finishWizard}/>;
  if(screen==='onboarding')return <Onboarding initialType={initialType} onDone={finishQuest} onCancel={()=>goStudio()}/>;
  if(screen==='builder'&&chosen)return <><Builder experience={chosen} onUpdate={updateProject} onBack={()=>goStudio()} onPublish={publish} onHelp={()=>goStudio('tutorial')} onLegal={setLegalTab}/>{publishedId&&<PublishedModal experience={experiences.find(e=>e.id===publishedId)||chosen} copied={copied} onCopy={copyLink} onClose={()=>{setPublishedId('');setCopied(false)}}/>}{notice&&<div className="toast"><BadgeCheck size={18}/>{notice}</div>}{legalTab&&<LegalDialog initial={legalTab} onClose={()=>setLegalTab('')}/>}</>;
  return <div className="app-shell"><Sidebar screen={screen} onGo={goStudio} onLanding={goLanding} onNew={startNew} onLegal={setLegalTab} onWorkspace={()=>{goStudio();setTimeout(()=>document.getElementById('cloud-workspace')?.scrollIntoView({behavior:'smooth'}),0)}} workspaceName={workspaceName} open={mobileMenu}/><main className="main-shell"><div className="mobile-toolbar"><button onClick={()=>setMobileMenu(m=>!m)} aria-label="Menu"><Menu size={23}/></button><Brand/><div><LanguageSwitch/><button onClick={()=>goStudio('wizard')} aria-label="AI Event Wizard"><MessageCircle size={21}/></button><button onClick={()=>startNew()} aria-label={t('common.create')}><Plus size={22}/></button></div></div>{screen==='analytics'?<Analytics experiences={experiences} onBack={()=>goStudio()}/>:screen==='templates'?<Templates onNew={startNew}/>:screen==='tutorial'?<div className="content"><div className="studio-page-lang"><LanguageSwitch/></div><Tutorial onAi={()=>goStudio('wizard')} onNew={()=>startNew()} onTemplates={()=>goStudio('templates')} onBuilder={()=>experiences.length?openProject(experiences[0].id):startNew()}/></div>:<Dashboard screen={screen} experiences={experiences} onNew={startNew} onAi={()=>goStudio('wizard')} onOpen={openProject} onGo={goStudio} onWorkspaceInfo={setWorkspaceName}/>}</main>{mobileMenu&&<button className="mobile-mask" onClick={()=>setMobileMenu(false)} aria-label={t('common.close')}/ >}{notice&&<div className="toast"><BadgeCheck size={18}/>{notice}</div>}{legalTab&&<LegalDialog initial={legalTab} onClose={()=>setLegalTab('')}/>}</div>;
}
createRoot(document.getElementById('root')).render(<LocaleProvider><App/></LocaleProvider>);
