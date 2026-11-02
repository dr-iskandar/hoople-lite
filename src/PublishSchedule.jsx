import React from 'react';
import {CalendarDays,Clock3,Info,Radio} from 'lucide-react';
import {formatRelease,releaseLocalValue,releaseZones,toReleaseInstant} from './release';

const copy={
  id:{title:'Jadwal akses peserta',desc:'Tentukan kapan link event mulai bisa dimainkan.',now:'Buka langsung',nowDesc:'Peserta bisa masuk setelah link demo dibuat.',later:'Jadwalkan tayang',laterDesc:'Link dapat dibagikan lebih awal, tetapi peserta melihat halaman “Segera dibuka”.',when:'TANGGAL & JAM TAYANG',zone:'ZONA WAKTU EVENT',summary:'Dijadwalkan untuk',invalid:'Pilih tanggal dan jam yang masih di masa depan.',demo:'Ini simulasi di browser. Pada produksi, backend akan mengunci akses dan materi event sebelum waktu tayang.',timeHint:'Tanggal dan jam mengikuti zona waktu yang kamu pilih, bukan zona waktu perangkat peserta.'},
  en:{title:'Participant access schedule',desc:'Choose when your event becomes playable.',now:'Open immediately',nowDesc:'Participants can enter as soon as the demo link is created.',later:'Schedule launch',laterDesc:'Share the link ahead of time; participants see a “Coming soon” screen.',when:'LAUNCH DATE & TIME',zone:'EVENT TIME ZONE',summary:'Scheduled for',invalid:'Choose a date and time in the future.',demo:'This is a browser simulation. The production backend will lock access and event content until launch.',timeHint:'Date and time follow the selected event time zone, not each participant’s device.'}
};

export function publicationIsValid(publication){
  if(publication?.mode!=='scheduled')return true;
  return !!publication?.startsAt&&Number.isFinite(Date.parse(publication.startsAt))&&Date.parse(publication.startsAt)>Date.now()+60_000;
}

export default function PublishSchedule({publication,onChange,locale}){
  const tr=copy[locale==='en'?'en':'id'];
  const mode=publication?.mode||'now',zone=publication?.timezone||'Asia/Jakarta';
  const localValue=releaseLocalValue(publication?.startsAt,zone),valid=publicationIsValid(publication);
  function switchMode(next){
    if(next==='now'){onChange({...publication,mode:'now',startsAt:''});return}
    const candidate=publication?.startsAt&&Date.parse(publication.startsAt)>Date.now()+60_000
      ?publication.startsAt:new Date(Date.now()+3*86400000).toISOString();
    const local=releaseLocalValue(candidate,zone).slice(0,11)+'09:00';
    onChange({...publication,mode:'scheduled',timezone:zone,startsAt:toReleaseInstant(local,zone)});
  }
  function setZone(timezone){
    onChange({...publication,timezone,startsAt:localValue?toReleaseInstant(localValue,timezone):''});
  }
  return <div className="inspector-section schedule-section">
    <h3><span>03</span>{tr.title}</h3><p className="inspector-help">{tr.desc}</p>
    <div className="schedule-options">
      <button type="button" className={'schedule-option '+(mode==='now'?'chosen':'')} onClick={()=>switchMode('now')} aria-pressed={mode==='now'}><span className="schedule-option-icon"><Radio size={19}/></span><span><strong>{tr.now}</strong><small>{tr.nowDesc}</small></span><i className="schedule-radio"/></button>
      <button type="button" className={'schedule-option '+(mode==='scheduled'?'chosen':'')} onClick={()=>switchMode('scheduled')} aria-pressed={mode==='scheduled'}><span className="schedule-option-icon"><CalendarDays size={19}/></span><span><strong>{tr.later}</strong><small>{tr.laterDesc}</small></span><i className="schedule-radio"/></button>
    </div>
    {mode==='scheduled'&&<div className="schedule-detail">
      <label className="form-field"><span>{tr.when}</span><input type="datetime-local" step="60" value={localValue} onChange={event=>onChange({...publication,mode:'scheduled',timezone:zone,startsAt:toReleaseInstant(event.target.value,zone)})}/></label>
      <label className="form-field"><span>{tr.zone}</span><select value={zone} onChange={event=>setZone(event.target.value)}>{releaseZones.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <p className="schedule-time-hint"><Clock3 size={15}/>{tr.timeHint}</p>
      {valid?<div className="schedule-summary"><CalendarDays size={17}/><span><small>{tr.summary}</small><b>{formatRelease(publication.startsAt,zone,locale)}</b></span></div>:<p className="schedule-invalid" role="alert">{tr.invalid}</p>}
    </div>}
    <p className="schedule-demo-note"><Info size={16}/>{tr.demo}</p>
  </div>;
}
