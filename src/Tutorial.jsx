import React,{useEffect,useState} from 'react';
import {ArrowRight,BookOpen,Check,CheckCircle2,Circle,Compass,Flag,LayoutTemplate,MessageCircle,Paintbrush,PlayCircle,RotateCcw} from 'lucide-react';
import {useLocale} from './i18n';

const KEY='questpop-tutorial-progress';
const icons=[LayoutTemplate,Compass,Paintbrush,Flag,PlayCircle];
export default function Tutorial({onNew,onTemplates,onBuilder,onAi}){
  const {t,locale}=useLocale();
  const [done,setDone]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return []}});
  const steps=t('tutorial.steps');
  useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(done))}catch{}},[done]);
  const complete=(i)=>setDone(v=>v.includes(i)?v.filter(n=>n!==i):[...v,i]);
  const act=(i)=>{if(i===0)onTemplates();else if(i===1)onNew();else onBuilder()};
  return <div className="tutorial-page">
    <div className="tutorial-header"><span className="eyebrow">{t('tutorial.eyebrow')}</span><h1>{t('tutorial.title')}</h1><p>{t('tutorial.desc')}</p><div className="tutorial-progress"><strong>{t('tutorial.progress')}</strong><span>{done.length}/{steps.length}</span><div><i style={{width:(done.length/steps.length*100)+'%'}}/></div></div></div>
    <div className="tutorial-steps">{steps.map((s,i)=>{const Icon=icons[i];return <article className={'tutorial-step '+(done.includes(i)?'is-done':'')} key={i}><div className="tutorial-step-index">{String(i+1).padStart(2,'0')}</div><span className="tutorial-step-icon"><Icon size={24}/></span><div><span className="tutorial-overline">{t('tutorial.step')} {i+1}</span><h2>{s.title}</h2><p>{s.desc}</p><div className="tutorial-actions"><button className="button-dark" onClick={()=>act(i)}>{s.task}<ArrowRight size={16}/></button><button className={'button-outline '+(done.includes(i)?'done':'')} onClick={()=>complete(i)}>{done.includes(i)?<CheckCircle2 size={16}/>:<Circle size={16}/>} {done.includes(i)?t('tutorial.done'):t('tutorial.mark')}</button></div></div></article>})}</div>
    <div className="tutorial-ai-callout"><MessageCircle size={27}/><div><span className="eyebrow">NEW / EVENT WIZARD</span><h2>{locale==='id'?'Punya brief? Bikin draf dalam 4 langkah.':'Have a brief? Build a draft in 4 steps.'}</h2><p>{locale==='id'?'Ceritakan event, target peserta, dan formatnya. Buat Passport, Hunt, Quiz, atau semuanya sekaligus. Bisa juga copy prompt untuk ChatGPT lalu impor hasil JSON. Setelah itu tambahkan media sendiri dan crop cover untuk mobile serta desktop.':'Describe the event, audience, and format. Generate Passport, Hunt, Quiz, or all three. You can copy a ChatGPT prompt and import JSON, then add media and crop mobile/desktop covers.'}</p><button className="button-dark" onClick={onAi}>{locale==='id'?'Mulai dari Wizard':'Open Event Wizard'} <ArrowRight size={16}/></button></div></div>
    <button className="tutorial-reset" onClick={()=>setDone([])}><RotateCcw size={15}/>{t('tutorial.reset')}</button>
  </div>;
}
