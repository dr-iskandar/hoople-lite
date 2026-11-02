import React,{useRef,useState} from 'react';
import {Gift,ImagePlus,Info,Link2,Trash2,Upload} from 'lucide-react';
import {questT} from './questCopy';

const copy={
  id:{image:'GAMBAR HADIAH',imageHelp:'Gunakan foto hadiah asli agar peserta tahu yang akan mereka dapatkan.',upload:'Unggah gambar',replace:'Ganti gambar',remove:'Hapus gambar',imageAlt:'Pratinjau gambar hadiah',url:'ATAU URL GAMBAR PUBLIK',urlHelp:'Untuk link demo yang dibagikan, gunakan URL gambar publik HTTPS.',note:'FOOTNOTE / S&K SINGKAT',notePlaceholder:'Contoh: 1 hadiah per peserta. Berlaku selama persediaan masih ada. Klaim di meja panitia.',noteHelp:'Maksimal 240 karakter. Ditampilkan di halaman hadiah peserta.',invalid:'Pilih JPG, PNG, atau WebP maksimal 8 MB.',failed:'Gambar tidak bisa dibaca. Coba gambar lain.',privacy:'Foto yang diunggah tersimpan lokal pada demo ini; belum diunggah ke server. Link demo antarperangkat hanya membawa URL publik.',need:'Gambar dan S&K singkat disarankan sebelum membagikan event.'},
  en:{image:'REWARD IMAGE',imageHelp:'Show the actual prize so participants know what they can earn.',upload:'Upload image',replace:'Replace image',remove:'Remove image',imageAlt:'Reward image preview',url:'OR PUBLIC IMAGE URL',urlHelp:'Use a public HTTPS image URL for demo links shared with others.',note:'FOOTNOTE / SHORT TERMS',notePlaceholder:'e.g. One prize per participant, while supplies last. Collect at the event desk.',noteHelp:'Up to 240 characters. Shown on the participant reward screen.',invalid:'Choose a JPG, PNG or WebP image under 8 MB.',failed:'Image could not be read. Try another file.',privacy:'Uploaded photos are stored only in this demo browser. Cross-device demo links carry public URLs only.',need:'We recommend adding an image and short terms before sharing.'}
};

function resizeReward(file){
  return new Promise((resolve,reject)=>{
    const objectUrl=URL.createObjectURL(file),image=new Image();
    image.onload=()=>{
      try{
        const scale=Math.min(1,880/image.naturalWidth,660/image.naturalHeight);
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        const result=canvas.toDataURL('image/webp',.73);
        URL.revokeObjectURL(objectUrl);resolve(result);
      }catch(error){URL.revokeObjectURL(objectUrl);reject(error)}
    };
    image.onerror=()=>{URL.revokeObjectURL(objectUrl);reject(new Error('Invalid image'))};
    image.src=objectUrl;
  });
}

export default function RewardInspector({experience,locale,t,onChange}){
  const tr=copy[locale==='en'?'en':'id'],reward=experience.reward||{},fileRef=useRef(null);
  const [message,setMessage]=useState(''),[loading,setLoading]=useState(false);
  const image=reward.image||reward.imageUrl;
  const change=patch=>onChange({...reward,...patch});
  async function upload(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){setMessage(tr.invalid);return}
    setLoading(true);setMessage('');
    try{const data=await resizeReward(file);change({image:data,imageUrl:''})}
    catch{setMessage(tr.failed)}finally{setLoading(false)}
  }
  return <div className="inspector-stack reward-editor">
    <div className="inspector-section"><h3><span>01</span>{t('builder.rewardSetup')}</h3>
      <label className="form-field"><span>{t('builder.rewardName')}</span><input value={reward.name||''} onChange={event=>change({name:event.target.value})}/></label>
      <label className="form-field"><span>{questT(locale,experience.type==='quiz'?'quizRewardThreshold':'rewardThreshold')}</span>
        <div className="number-counter compact"><button onClick={()=>change({threshold:Math.max(1,Number(reward.threshold||1)-1)})}>−</button><strong>{reward.threshold}</strong><button onClick={()=>change({threshold:Math.min(experience.missions.length,Number(reward.threshold||1)+1)})}>+</button></div>
        <small>{t('builder.outOf')} {experience.missions.length} {questT(locale,experience.type==='quiz'?'questions':'tasks')}</small>
      </label>
      <label className="form-field"><span>{t('builder.availableRewards')}</span><input type="number" min="0" value={reward.stock??0} onChange={event=>change({stock:Math.max(0,Math.floor(Number(event.target.value)||0))})}/></label>
    </div>
    <div className="inspector-section"><h3><span>02</span>{tr.image}</h3><p className="inspector-help">{tr.imageHelp}</p>
      <div className={'reward-image-preview '+(image?'has-image':'')}>
        {image?<img src={image} alt={tr.imageAlt}/>:<div className="reward-image-empty"><ImagePlus size={31}/><strong>{tr.image}</strong><small>JPG / PNG / WEBP</small></div>}
      </div>
      <input type="file" ref={fileRef} hidden accept="image/jpeg,image/png,image/webp" onChange={upload}/>
      <div className="reward-image-actions"><button className="reward-upload" disabled={loading} onClick={()=>fileRef.current?.click()}><Upload size={16}/>{loading?'...':image?tr.replace:tr.upload}</button>{image&&<button className="reward-image-clear" onClick={()=>change({image:'',imageUrl:''})}><Trash2 size={15}/>{tr.remove}</button>}</div>
      <label className="form-field"><span><Link2 size={13}/>{tr.url}</span><input type="url" placeholder="https://..." value={reward.imageUrl||''} onChange={event=>change({imageUrl:event.target.value,image:''})}/><small>{tr.urlHelp}</small></label>
      {message&&<p className="reward-upload-error" role="alert">{message}</p>}
      <p className="reward-upload-note"><Info size={15}/>{tr.privacy}</p>
    </div>
    <div className="inspector-section"><h3><span>03</span>{tr.note}</h3>
      <label className="form-field"><span>{tr.note}</span><textarea rows="4" maxLength={240} value={reward.footnote||''} onChange={event=>change({footnote:event.target.value})} placeholder={tr.notePlaceholder}/><small>{tr.noteHelp} · {(reward.footnote||'').length}/240</small></label>
    </div>
    <div className="info-tip"><Gift size={18}/>{t('builder.rewardNote')}</div>
  </div>;
}
