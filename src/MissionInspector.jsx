import React,{useEffect,useRef,useState} from 'react';
import {Camera,Check,ClipboardCheck,GripVertical,MapPin,Plus,QrCode,Trash2,X} from 'lucide-react';
import {makeMission,missionKind} from './data';
import {questT} from './questCopy';

const icons={checkin:MapPin,photo:Camera,qr:QrCode,quiz:ClipboardCheck};
const ui={
 id:{drag:'Tahan lalu geser grip untuk mengubah urutan. Untuk keyboard, gunakan panah atas/bawah saat grip terfokus.',handle:'Geser urutan',add:'Tambah misi',edit:'Edit detail misi',newHelp:'Isi detailnya dulu, lalu tambahkan ke daftar.',editHelp:'Tekan Simpan untuk menerapkan perubahan.',cancel:'Batal',save:'Simpan misi',create:'Tambahkan misi',delete:'Hapus misi',sure:'Yakin hapus misi ini?',confirm:'Ya, hapus',keep:'Jangan hapus',required:'Lengkapi judul, poin, dan kolom wajib.',order:'Urutan tersimpan otomatis di browser.',done:'Urutan misi diperbarui.'},
 en:{drag:'Hold and drag the grip to reorder. For keyboard access, focus the grip and use up/down arrows.',handle:'Reorder',add:'Add mission',edit:'Edit mission details',newHelp:'Fill in the details before adding the mission.',editHelp:'Press Save to apply changes.',cancel:'Cancel',save:'Save mission',create:'Add mission',delete:'Delete mission',sure:'Delete this mission?',confirm:'Yes, delete',keep:'Keep mission',required:'Complete the title, points, and required fields.',order:'Order is saved automatically in the browser.',done:'Mission order updated.'}
};
const cloneMission=m=>({...m,options:Array.isArray(m.options)?[...m.options]:m.options});
function EditField({label,value,onChange,multiline=false,hint,type='text'}){
 return <label className="form-field"><span>{label}</span>{multiline?<textarea rows="3" value={value??''} onChange={e=>onChange(e.target.value)}/>:<input type={type} min={type==='number'?0:undefined} max={type==='number'?1000:undefined} value={value??''} onChange={e=>onChange(type==='number'?Math.max(0,Math.min(1000,Math.floor(Number(e.target.value)||0))):e.target.value)}/ >}{hint&&<small>{hint}</small>}</label>;
}
function MissionForm({draft,onChange,isNew,isQuiz,t,q,locale,onClose,onSave,onDelete}){
 const tr=ui[locale==='en'?'en':'id'],[deleteArmed,setDeleteArmed]=useState(false);
 const kind=missionKind(draft,isQuiz?'quiz':'passport'),Icon=icons[kind],update=patch=>onChange({...draft,...patch});
 const valid=!!draft.name?.trim()&&Number.isFinite(Number(draft.points))&&Number(draft.points)>=0&&(
  isQuiz?!!draft.question?.trim()&&Array.isArray(draft.options)&&draft.options.length===4&&draft.options.every(v=>String(v||'').trim())&&Number.isInteger(Number(draft.correctIndex))&&Number(draft.correctIndex)>=0&&Number(draft.correctIndex)<4:
  kind!=='qr'||!!draft.code?.trim()
 );
 useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[onClose]);
 return <div className="mission-modal-shade" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="mission-modal" role="dialog" aria-modal="true" aria-label={isNew?tr.add:tr.edit}>
   <header className="mission-modal-header"><div><span className="mission-modal-eyebrow">MISSION / {isNew?'CREATE':'EDIT'}</span><h2>{isNew?tr.add:tr.edit}</h2><p>{isNew?tr.newHelp:tr.editHelp}</p></div><button className="mission-modal-close" onClick={onClose} aria-label={tr.cancel}><X size={20}/></button></header>
   <div className="mission-modal-content"><div className="mission-modal-kind"><span className="mission-modal-kind-icon"><Icon size={22}/></span><div><b>{q('kinds.'+kind)}</b><small>+{Number(draft.points||0)} {q('points')}</small></div></div>
    {!isQuiz&&<label className="form-field"><span>{q('kindLabel')}</span><select value={kind} onChange={e=>update({kind:e.target.value})}>{['checkin','photo','qr'].map(k=><option key={k} value={k}>{q('kinds.'+k)}</option>)}</select></label>}
    <EditField label={t('builder.missionName')} value={draft.name} onChange={name=>update({name})}/>
    {isQuiz?<><EditField label={q('questionLabel')} value={draft.question} multiline onChange={question=>update({question})}/><div className="quest-option-editor">{(draft.options||['','','','']).map((option,i)=><EditField key={i} label={q('answerLabel')+' '+String.fromCharCode(65+i)} value={option} onChange={value=>update({options:(draft.options||['','','','']).map((old,j)=>i===j?value:old)})}/>)}</div><label className="form-field"><span>{q('correctAnswer')}</span><select value={draft.correctIndex??0} onChange={e=>update({correctIndex:Number(e.target.value)})}>{['A','B','C','D'].map((choice,i)=><option key={choice} value={i}>{choice} — {(draft.options||[])[i]||'...'}</option>)}</select></label></>:
    <><EditField label={t('builder.description')} value={draft.description} multiline onChange={description=>update({description})}/>{kind==='qr'&&<EditField label={q('qrCodeLabel')} value={draft.code} onChange={code=>update({code:code.toUpperCase()})} hint={q('qrEditorHelp')}/ >}{kind==='photo'&&<p className="quest-inspector-note"><Camera size={17}/>{q('photoEditorHelp')}</p>}{kind==='checkin'&&<p className="quest-inspector-note"><MapPin size={17}/>{q('checkinEditorHelp')}</p>}</>}
    <EditField label={q('pointsLabel')} value={Number(draft.points||0)} type="number" onChange={points=>update({points})}/>
    {!valid&&<p className="mission-modal-hint" role="status">{tr.required}</p>}
   </div>
   <footer className="mission-modal-footer">{!isNew&&<div className="mission-modal-delete">{deleteArmed?<><span>{tr.sure}</span><button onClick={()=>setDeleteArmed(false)}>{tr.keep}</button><button className="danger" onClick={onDelete}>{tr.confirm}</button></>:<button className="mission-delete-trigger" onClick={()=>setDeleteArmed(true)}><Trash2 size={16}/>{tr.delete}</button>}</div>}<div className="mission-modal-footer-actions"><button className="mission-cancel" onClick={onClose}>{tr.cancel}</button><button className="mission-save" disabled={!valid} onClick={onSave}><Check size={17}/>{isNew?tr.create:tr.save}</button></div></footer>
  </section></div>;
}
export default function MissionInspector({experience,locale,t,onUpdate,onAdd,onReorder,onDelete}){
 const q=key=>questT(locale,key),tr=ui[locale==='en'?'en':'id'],isQuiz=experience.type==='quiz';
 const [modal,setModal]=useState(null),[drop,setDrop]=useState(null),[feedback,setFeedback]=useState('');
 const dragRef=useRef(null),listRef=useRef(null);
 const totalPoints=experience.missions.reduce((sum,m)=>sum+Number(m.points||0),0);
 const openAdd=kind=>setModal({isNew:true,draft:makeMission(experience.type,experience.missions.length,locale,kind)});
 const openEdit=m=>setModal({isNew:false,draft:cloneMission(m)});
 function save(){if(!modal)return;modal.isNew?onAdd(modal.draft):onUpdate(modal.draft.id,modal.draft);setModal(null)}
 function startDrag(e,id){if(e.button!==0)return;e.preventDefault();const from=experience.missions.findIndex(m=>m.id===id);dragRef.current={id,from,to:from,pointerId:e.pointerId};try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}setDrop({id,from,to:from})}
 function moveDrag(e){const current=dragRef.current;if(!current||current.pointerId!==e.pointerId)return;const rows=[...(listRef.current?.querySelectorAll('[data-mission-id]')||[])];let to=rows.findIndex(row=>e.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2);if(to<0)to=rows.length-1;current.to=Math.max(0,to);setDrop({id:current.id,from:current.from,to:current.to})}
 function endDrag(e){const current=dragRef.current;if(!current||current.pointerId!==e.pointerId)return;dragRef.current=null;setDrop(null);if(current.from!==current.to){onReorder(current.from,current.to);setFeedback(tr.done)}}
 function keyMove(e,index){if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const to=index+(e.key==='ArrowUp'?-1:1);if(to<0||to>=experience.missions.length)return;const id=experience.missions[index].id;onReorder(index,to);setFeedback(tr.done);requestAnimationFrame(()=>listRef.current?.querySelector(`[data-mission-id="${id}"] .mission-grip`)?.focus())}
 return <div className="inspector-stack"><div className="inspector-section"><h3><span>01</span>{isQuiz?q('questions'):t('builder.missionList')} <small>{experience.missions.length} {isQuiz?q('questions'):t('builder.total')}</small></h3><p className="inspector-help">{q(isQuiz?'questionHelp':'missionHelp')}</p><p className="mission-drag-help"><GripVertical size={16}/>{tr.drag}</p>
   <div className="mission-editor-list mission-sortable-list" ref={listRef}>{experience.missions.map((m,i)=>{const kind=missionKind(m,experience.type),Icon=icons[kind];return <div data-mission-id={m.id} className={'mission-editor-row sortable-mission-row '+(drop?.id===m.id?'is-dragging ':'')+(drop&&drop.to===i&&drop.to!==drop.from?(drop.to>drop.from?'drop-after':'drop-before'):'')} key={m.id}>
     <button className="mission-grip" aria-label={`${tr.handle}: ${m.name}, ${i+1}/${experience.missions.length}`} title={tr.handle} onPointerDown={e=>startDrag(e,m.id)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={()=>{dragRef.current=null;setDrop(null)}} onKeyDown={e=>keyMove(e,i)}><GripVertical size={20}/></button>
     <button className="mission-main" onClick={()=>openEdit(m)}><span className="mission-emoji"><Icon size={19}/></span><span><strong>{m.name}</strong><small>{q('kinds.'+kind)} · {Number(m.points||0)} {q('points')}</small></span><span className="mission-edit-indicator">EDIT</span></button>
   </div>})}</div>
   <div className="quest-builder-add">{isQuiz?<button className="add-row" onClick={()=>openAdd('quiz')}><Plus size={17}/>{q('newQuestion')}</button>:['checkin','photo','qr'].map(kind=>{const Icon=icons[kind];return <button key={kind} className="quest-add-kind" onClick={()=>openAdd(kind)}><Icon size={17}/>{q(({checkin:'newCheckin',photo:'newPhoto',qr:'newQR'})[kind])}</button>})}</div><div className="quest-total-points"><span>{q('totalPoints')}</span><strong>{totalPoints} {q('points')}</strong></div><p className="mission-order-note" role="status">{feedback||tr.order}</p>
  </div>{modal&&<MissionForm draft={modal.draft} onChange={draft=>setModal(previous=>({...previous,draft}))} isNew={modal.isNew} isQuiz={isQuiz} t={t} q={q} locale={locale} onClose={()=>setModal(null)} onSave={save} onDelete={()=>{onDelete(modal.draft.id);setModal(null)}}/>}</div>;
}
