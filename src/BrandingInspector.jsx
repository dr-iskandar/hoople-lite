import React,{useEffect,useRef,useState} from 'react';
import {Check,ImagePlus,Monitor,Palette,Save,SlidersHorizontal,Smartphone,Trash2,Upload,X} from 'lucide-react';
import {getBrand,palettes,uid} from './data';

const copy={
  id:{nav:'Branding',title:'Identitas brand',desc:'Sesuaikan setiap experience dengan identitas company, agency, atau komunitas.',kitTitle:'Brand kit tersimpan',kitEmpty:'Belum ada brand kit. Simpan pengaturan ini agar bisa dipakai lagi.',kitApply:'Pakai kit',kitSave:'Simpan sebagai brand kit',kitSuccess:'Brand kit tersimpan.',kitError:'Penyimpanan browser penuh. Coba gambar yang lebih kecil.',kitName:'Nama brand kit',brand:'NAMA BRAND / ORGANISASI',tagline:'TAGLINE (OPSIONAL)',visual:'Logo & gambar',logo:'Logo brand',cover:'Gambar cover',upload:'Unggah gambar',clear:'Hapus gambar',color:'Palet brand',presets:'Mulai dari preset',primary:'Warna utama',bg:'Warna latar',ink:'Warna teks',soft:'Warna pendamping',typography:'Tipografi',font:'FONT UTAMA',grotesk:'Space Grotesk — ekspresif',sans:'DM Sans — simpel',serif:'Georgia — editorial',localNote:'Upload gambar & crop disimpan lokal di browser. Link demo hanya membawa URL gambar publik, bukan file lokal.',logoUrl:'URL LOGO PUBLIK (OPSIONAL)',coverUrl:'URL COVER PUBLIK (OPSIONAL)',invalid:'Pilih gambar JPG, PNG, atau WebP di bawah 8 MB.',recommended:'Preview langsung berubah ketika brand diatur.',kitHelp:'Untuk agency: simpan identitas brand tiap klien lalu pilih saat membuat quest lain.',cropTitle:'Atur komposisi cover',cropHelp:'Satu foto, dua ukuran. Sesuaikan fokus gambar untuk layar mobile dan desktop.',mobile:'Mobile · 4:5',desktop:'Desktop · 16:9',zoom:'Zoom',horizontal:'Posisi horizontal',vertical:'Posisi vertikal',cropSave:'Simpan dua ukuran',cropEdit:'Crop ulang cover',cropCancel:'Batal',cropReady:'Cover mobile & desktop siap.',coverHint:'Disarankan foto resolusi tinggi, wajah/logo jangan di pinggir.'},
  en:{nav:'Branding',title:'Brand identity',desc:'Make each experience feel like your company, agency, or community.',kitTitle:'Saved brand kits',kitEmpty:'No brand kits yet. Save this setup to reuse it in another experience.',kitApply:'Apply kit',kitSave:'Save as brand kit',kitSuccess:'Brand kit saved.',kitError:'Browser storage is full. Try a smaller image.',kitName:'Brand kit name',brand:'BRAND / ORGANIZATION NAME',tagline:'TAGLINE (OPTIONAL)',visual:'Logo & imagery',logo:'Brand logo',cover:'Cover image',upload:'Upload image',clear:'Remove image',color:'Brand palette',presets:'Start from a preset',primary:'Primary',bg:'Background',ink:'Text',soft:'Secondary',typography:'Typography',font:'PRIMARY FONT',grotesk:'Space Grotesk — expressive',sans:'DM Sans — clean',serif:'Georgia — editorial',localNote:'Uploaded images and crops stay in this browser. Demo links include public image URLs, not local files.',logoUrl:'PUBLIC LOGO URL (OPTIONAL)',coverUrl:'PUBLIC COVER URL (OPTIONAL)',invalid:'Choose a JPG, PNG, or WebP image under 8 MB.',recommended:'Live preview updates as you change brand settings.',kitHelp:'For agencies: save each client’s brand identity and apply it to other quests.',cropTitle:'Frame your cover',cropHelp:'One photo, two formats. Set the focal point for mobile and desktop.',mobile:'Mobile · 4:5',desktop:'Desktop · 16:9',zoom:'Zoom',horizontal:'Horizontal position',vertical:'Vertical position',cropSave:'Save both sizes',cropEdit:'Re-crop cover',cropCancel:'Cancel',cropReady:'Mobile & desktop covers ready.',coverHint:'Use a high-resolution image and keep faces/logos away from the edges.'}
};
const storageKey='questpop-brand-kits-v1';
function loadKits(){try{const kits=JSON.parse(localStorage.getItem(storageKey));return Array.isArray(kits)?kits:[]}catch{return []}}
function shrinkImage(file,kind){
  return new Promise((resolve,reject)=>{
    const fileUrl=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      const maxWidth=kind==='logo'?320:960,maxHeight=kind==='logo'?320:500;
      const scale=Math.min(1,maxWidth/img.width,maxHeight/img.height);
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
      const context=canvas.getContext('2d');context.drawImage(img,0,0,canvas.width,canvas.height);
      const result=canvas.toDataURL('image/webp',kind==='logo'?0.8:0.69);
      URL.revokeObjectURL(fileUrl);resolve(result);
    };
    img.onerror=()=>{URL.revokeObjectURL(fileUrl);reject(new Error('Image could not be opened'))};
    img.src=fileUrl;
  });
}
const initialCrop=()=>({mobile:{x:50,y:50,zoom:1},desktop:{x:50,y:50,zoom:1}});
function canvasCrop(img,settings,width,height){
  const coverScale=Math.max(width/img.naturalWidth,height/img.naturalHeight)*settings.zoom;
  const srcWidth=width/coverScale,srcHeight=height/coverScale;
  const left=(img.naturalWidth-srcWidth)*(settings.x/100),top=(img.naturalHeight-srcHeight)*(settings.y/100);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  canvas.getContext('2d').drawImage(img,Math.max(0,left),Math.max(0,top),srcWidth,srcHeight,0,0,width,height);
  return canvas.toDataURL('image/webp',0.72);
}
function CoverCropDialog({src,onSave,onClose,locale,tr}){
  const [device,setDevice]=useState('mobile'),[settings,setSettings]=useState(initialCrop),[saving,setSaving]=useState(false);
  const current=settings[device];
  function change(key,value){setSettings(prev=>({...prev,[device]:{...prev[device],[key]:Number(value)}}))}
  async function save(){
    setSaving(true);
    try{
      const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src});
      onSave({coverMobile:canvasCrop(img,settings.mobile,560,700),coverDesktop:canvasCrop(img,settings.desktop,1024,576),cover:'',coverUrl:'',coverMobileUrl:'',coverDesktopUrl:''});
    }catch{setSaving(false)}
  }
  return <div className="cover-crop-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="cover-crop-dialog" role="dialog" aria-modal="true" aria-label={tr('cropTitle')}>
    <header><div><span className="eyebrow">IMAGE / CROP</span><h2>{tr('cropTitle')}</h2><p>{tr('cropHelp')}</p></div><button onClick={onClose} aria-label="Close"><X size={20}/></button></header>
    <div className="crop-device-tabs"><button className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}><Smartphone size={17}/>{tr('mobile')}</button><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}><Monitor size={17}/>{tr('desktop')}</button></div>
    <div className={'crop-canvas '+device}><img src={src} alt="Cover crop preview" style={{objectPosition:`${current.x}% ${current.y}%`,transform:`scale(${current.zoom})`,transformOrigin:`${current.x}% ${current.y}%`}}/><div className="crop-safe-area"/></div>
    <div className="crop-controls">{[{key:'zoom',min:1,max:2.5,step:.05},{key:'x',min:0,max:100,step:1},{key:'y',min:0,max:100,step:1}].map(c=><label key={c.key}><span>{tr(c.key==='x'?'horizontal':c.key==='y'?'vertical':'zoom')}</span><input type="range" min={c.min} max={c.max} step={c.step} value={current[c.key]} onChange={e=>change(c.key,e.target.value)}/><b>{c.key==='zoom'?current.zoom.toFixed(2)+'×':current[c.key]+'%'}</b></label>)}</div>
    <p className="crop-hint"><SlidersHorizontal size={15}/>{tr('coverHint')}</p><footer><button className="button-outline" onClick={onClose}>{tr('cropCancel')}</button><button className="button-dark" disabled={saving} onClick={save}><Check size={17}/>{saving?'...':tr('cropSave')}</button></footer>
  </section></div>;
}
function TextField({label,value,onChange,placeholder}){
  return <label className="form-field"><span>{label}</span><input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||''}/></label>;
}
export default function BrandingInspector({experience,onUpdate,locale}){
  const tr=key=>copy[locale==='en'?'en':'id'][key]||key,brand=getBrand(experience),logoRef=useRef(null),coverRef=useRef(null);
  const [kits,setKits]=useState(loadKits),[kitName,setKitName]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState('');
  const [cropSource,setCropSource]=useState('');
  useEffect(()=>()=>{if(cropSource.startsWith('blob:'))URL.revokeObjectURL(cropSource)},[cropSource]);
  const patchBrand=patch=>onUpdate({brand:{...brand,...patch}});
  async function upload(event,kind){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){setMessage(tr('invalid'));return}
    if(kind==='cover'){setCropSource(URL.createObjectURL(file));setMessage('');return}
    try{setLoading(kind);const value=await shrinkImage(file,kind);patchBrand({[kind]:value});setMessage('')}
    catch{setMessage(tr('invalid'))}finally{setLoading('')}
  }
  function saveKit(){
    const title=(kitName||brand.name||experience.name).trim();
    const next=[{id:uid(),name:title,brand:{...brand}},...kits].slice(0,12);
    try{localStorage.setItem(storageKey,JSON.stringify(next));setKits(next);setKitName('');setMessage(tr('kitSuccess'))}
    catch{setMessage(tr('kitError'))}
  }
  function applyPreset(p){onUpdate({palette:p.id,brand:{...brand,accent:p.accent,bg:p.bg,soft:p.soft,ink:p.ink}})}
  return <div className="inspector-stack brand-inspector">
    <div className="inspector-section"><h3><span>01</span>{tr('title')}</h3><p className="inspector-help">{tr('desc')}</p>
      <TextField label={tr('brand')} value={brand.name} onChange={name=>patchBrand({name})} placeholder={locale==='id'?'Contoh: Klub Padel Jakarta':'e.g. Jakarta Padel Club'}/>
      <TextField label={tr('tagline')} value={brand.tagline} onChange={tagline=>patchBrand({tagline})} placeholder={locale==='id'?'Contoh: Main, bertemu, eksplor':'e.g. Play, meet, explore'}/>
    </div>
    <div className="inspector-section"><h3><span>02</span>{tr('visual')}</h3>
      <div className="brand-assets-grid">
        {[{kind:'logo',ref:logoRef,photo:brand.logo||brand.logoUrl},{kind:'cover',ref:coverRef,photo:brand.coverMobile||brand.coverMobileUrl||brand.cover||brand.coverUrl}].map(item=><div className={'brand-asset '+item.kind} key={item.kind}>
          <strong>{tr(item.kind)}</strong>
          <div className="brand-asset-preview">{item.photo?<img src={item.photo} alt=""/>:<ImagePlus size={27}/>}</div>
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden ref={item.ref} onChange={event=>upload(event,item.kind)}/>
          <button className="brand-upload" disabled={loading===item.kind} onClick={()=>item.ref.current?.click()}><Upload size={14}/>{loading===item.kind?'...':tr('upload')}</button>
          {item.photo&&<button className="brand-clear" onClick={()=>patchBrand(item.kind==='cover'?{cover:'',coverUrl:'',coverMobile:'',coverDesktop:'',coverMobileUrl:'',coverDesktopUrl:''}:{logo:'',logoUrl:''})}><Trash2 size={12}/>{tr('clear')}</button>}
        </div>)}
      </div>
      <TextField label={tr('logoUrl')} value={brand.logoUrl} onChange={logoUrl=>patchBrand({logoUrl,logo:''})} placeholder="https://..."/>
      {(brand.coverMobile||brand.coverDesktop)&&<button className="brand-crop-again" onClick={()=>setCropSource(brand.coverDesktop||brand.coverMobile)}><SlidersHorizontal size={15}/>{tr('cropEdit')}</button>}
      <TextField label={tr('coverUrl')} value={brand.coverUrl} onChange={coverUrl=>patchBrand({coverUrl,cover:'',coverMobile:'',coverDesktop:'',coverMobileUrl:'',coverDesktopUrl:''})} placeholder="https://..."/>
      <p className="brand-notice">{tr('localNote')}</p>
    </div>
    <div className="inspector-section"><h3><span>03</span>{tr('color')}</h3><p className="inspector-help">{tr('presets')}</p>
      <div className="brand-presets">{palettes.map(p=><button key={p.id} title={p.name} className={experience.palette===p.id?'selected':''} onClick={()=>applyPreset(p)}><i style={{background:p.accent}}/><i style={{background:p.soft}}/><small>{p.name}</small>{experience.palette===p.id&&<Check size={14}/>}</button>)}</div>
      <div className="brand-color-grid">{[{key:'accent',label:'primary'},{key:'bg',label:'bg'},{key:'ink',label:'ink'},{key:'soft',label:'soft'}].map(item=><label key={item.key} className="brand-color-control"><span>{tr(item.label)}</span><div><input type="color" value={brand[item.key]} onChange={event=>patchBrand({[item.key]:event.target.value})}/><code>{brand[item.key]}</code></div></label>)}</div>
    </div>
    <div className="inspector-section"><h3><span>04</span>{tr('typography')}</h3><label className="form-field"><span>{tr('font')}</span><select value={brand.font} onChange={event=>patchBrand({font:event.target.value})}><option value="grotesk">{tr('grotesk')}</option><option value="sans">{tr('sans')}</option><option value="serif">{tr('serif')}</option></select></label><p className="brand-notice"><Palette size={16}/>{tr('recommended')}</p></div>
    <div className="inspector-section brand-kit-section"><h3><span>05</span>{tr('kitTitle')}</h3><p className="inspector-help">{tr('kitHelp')}</p>
      <TextField label={tr('kitName')} value={kitName} onChange={setKitName} placeholder={brand.name||experience.name}/>
      <button className="brand-save-kit" onClick={saveKit}><Save size={16}/>{tr('kitSave')}</button>
      {kits.length?<div className="brand-kit-list">{kits.map(kit=><div className="brand-kit-row" key={kit.id}><span style={{background:kit.brand?.accent||'#E6553E'}}/ ><b>{kit.name}</b><button onClick={()=>patchBrand({...kit.brand})}>{tr('kitApply')}</button></div>)}</div>:<p className="inspector-help">{tr('kitEmpty')}</p>}
      {message&&<p role="status" className="brand-message">{message}</p>}
    </div>
    {cropSource&&<CoverCropDialog src={cropSource} tr={tr} locale={locale} onClose={()=>setCropSource('')} onSave={patch=>{patchBrand(patch);setCropSource('');setMessage(tr('cropReady'))}}/>}
  </div>;
}
