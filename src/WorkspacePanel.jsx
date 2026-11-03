import React,{useEffect,useState} from 'react';
import {ArrowRight,Check,Cloud,CloudOff,LoaderCircle,LogIn,LogOut,Plus,UploadCloud} from 'lucide-react';
import {useLocale} from './i18n';
import {cloudEnabled,cloudRequest,beginCloudLogin,localDraftForImport,draftContainsLocalMedia} from './cloudApi';
import {slugify} from './data';
import {cloudDraftToEditor,cloudDraftEndpoint} from './cloudDraft';
import './workspace-cloud.css';

export default function WorkspacePanel({experiences,onWorkspaceInfo,onOpenCloud}) {
  const {locale}=useLocale(),id=locale==='id';
  const [creator,setCreator]=useState(null),[orgs,setOrgs]=useState([]);
  const [active,setActive]=useState(null),[items,setItems]=useState([]);
  const [loading,setLoading]=useState(cloudEnabled),[busy,setBusy]=useState(false);
  const [newOrg,setNewOrg]=useState(''),[showCreate,setShowCreate]=useState(false);
  const [notice,setNotice]=useState(''),[error,setError]=useState('');

  async function refresh() {
    if (!cloudEnabled)return;
    try {
      const session=await cloudRequest('/v1/auth/session');
      setCreator(session.creator);
      const list=await cloudRequest('/v1/orgs');
      setOrgs(list.organizations||[]);
      const oid=list.activeOrganizationId||null;
      setActive(oid);
      onWorkspaceInfo?.(list.organizations?.find(o=>o.id===oid)?.name||'');
      if (oid) {
        const projects=await cloudRequest(`/v1/orgs/${oid}/experiences`);
        setItems(projects.items||[]);
      } else setItems([]);
    } catch(err) {
      if(err.status===401){setCreator(null);setOrgs([]);setActive(null);setItems([]);onWorkspaceInfo?.('');}
      else setError(id?'API cloud belum dapat diakses. Draft lokal tetap aman.':'Cloud API is unavailable. Local drafts are safe.');
    } finally {setLoading(false);}
  }
  useEffect(()=>{void refresh()},[]);

  async function choose(oid) {
    setError('');setNotice('');setBusy(true);
    try {
      await cloudRequest('/v1/workspaces/active',{method:'PUT',body:{organizationId:oid}});
      await refresh();
    }catch{setError(id?'Gagal beralih workspace.':'Could not switch workspaces.')}
    finally{setBusy(false);}
  }
  async function create() {
    setBusy(true);setError('');
    try {
      const name=newOrg.trim();
      if(name.length<2){setError(id?'Nama minimal 2 karakter.':'Name must have at least 2 characters.');return;}
      let base=slugify(name).slice(0,48);
      if(base.length<2)base='workspace';
      await cloudRequest('/v1/orgs',{method:'POST',body:{name,slug:`${base}-${Math.random().toString(36).slice(2,7)}`}});
      setNewOrg('');setShowCreate(false);await refresh();
    }catch{setError(id?'Workspace belum berhasil dibuat.':'Could not create the workspace.')}
    finally{setBusy(false);}
  }
  async function importLocal() {
    if (!active || busy) return;
    setBusy(true);setError('');setNotice('');
    let imported=0,existing=0,failed=0,mediaSkipped=false;
    for(const experience of experiences) {
      try {
        mediaSkipped ||= draftContainsLocalMedia(experience);
        const draft=localDraftForImport(experience);
        if(!draft) {failed++;continue;}
        const result=await cloudRequest(`/v1/orgs/${active}/experiences/import`,{method:'POST',body:{draft}});
        if(result.alreadyImported)existing++;
        else imported++;
        mediaSkipped ||= Boolean(result.mediaSkipped);
      }catch{failed++;}
    }
    setNotice(id
      ? `${imported} draft tersalin, ${existing} sudah ada, ${failed} gagal. Data lokal tidak dihapus.${mediaSkipped?' Gambar lokal perlu diunggah ulang setelah layanan media tersedia.':''}`
      : `${imported} drafts copied, ${existing} already existed, ${failed} failed. Local data was kept.${mediaSkipped?' Local images need re-uploading once media service is available.':''}`);
    try {
      const response=await cloudRequest(`/v1/orgs/${active}/experiences`);
      setItems(response.items||[]);
    }catch{setError(id?'Tidak bisa memuat daftar cloud.':'Could not reload cloud drafts.')}
    setBusy(false);
  }
  async function openCloud(item) {
    if(!active||busy||item.status!=='draft')return;
    setBusy(true);setError('');
    try {
      const endpoint=cloudDraftEndpoint(active,item.id);
      const detail=await cloudRequest(endpoint);
      const brand=detail.brandKitId?await cloudRequest(`/v1/orgs/${active}/brand-kits/${detail.brandKitId}`):null;
      onOpenCloud?.(cloudDraftToEditor(detail,active,brand));
    }catch(error){setError(error.message==='PRIVATE_VALIDATION_UNAVAILABLE'
      ?(id?'Hak akses untuk data validasi misi tidak tersedia.':'Mission validation data is not available for this role.')
      :(id?'Draft cloud gagal dibuka. Periksa izin atau koneksi.':'Unable to open cloud draft. Check access or connection.'));}
    finally{setBusy(false);}
  }
  async function logout() {
    setBusy(true);setError('');
    try{await cloudRequest('/v1/auth/session',{method:'DELETE'});setCreator(null);setOrgs([]);setActive(null);setItems([]);onWorkspaceInfo?.('');}
    catch{setError(id?'Gagal keluar.':'Sign out failed.')}
    finally{setBusy(false);}
  }

  return <section className="cloud-workspace" id="cloud-workspace" aria-label={id?'Akun dan workspace':'Account and workspace'}>
    <div className="cloud-workspace-title">
      <span className="cloud-workspace-icon">{cloudEnabled?<Cloud size={21}/>:<CloudOff size={21}/>}</span>
      <div><small>{id?'RUANG KERJA':'WORKSPACE'}</small><h2>{id?'Studio & cloud':'Studio & cloud'}</h2></div>
      <span className={'cloud-mode '+(creator?'online':'')}>{creator?(id?'TERHUBUNG':'CONNECTED'):(id?'DEMO LOKAL':'LOCAL DEMO')}</span>
    </div>
    {!cloudEnabled?<p className="cloud-workspace-hint">{id?'Draft demo tersimpan di browser ini. Jangan masukkan data pribadi atau kode rahasia. Hubungkan VITE_API_BASE_URL untuk login dan workspace cloud.':'Demo drafts remain in this browser. Do not enter personal data or secret codes. Configure VITE_API_BASE_URL to enable cloud login and workspaces.'}</p>:
      loading?<p className="cloud-workspace-hint"><LoaderCircle size={16} className="spin"/>{id?'Memeriksa sesi kreator…':'Checking creator session…'}</p>:
      !creator?<div className="cloud-connect">
        <p>{id?'Masuk untuk mengelola workspace dan menyalin draft lokal ke cloud. Kamu bisa tetap memakai mode demo tanpa akun.':'Sign in to manage workspaces and copy local drafts to the cloud. Demo mode still works without an account.'}</p>
        <button className="button-dark small" onClick={beginCloudLogin}><LogIn size={16}/>{id?'Masuk kreator':'Creator sign in'} <ArrowRight size={15}/></button>
      </div>:
      <div className="cloud-connected">
        <div className="cloud-user"><span>{creator.displayName||creator.email||'Creator'}</span><button onClick={logout} disabled={busy}><LogOut size={15}/>{id?'Keluar':'Sign out'}</button></div>
        <div className="cloud-controls">
          <label><small>{id?'WORKSPACE AKTIF':'ACTIVE WORKSPACE'}</small>
            <select value={active||''} onChange={e=>void choose(e.target.value)} disabled={busy||!orgs.length}>
              {!orgs.length&&<option value="">{id?'Belum ada workspace':'No workspace yet'}</option>}
              {orgs.map(org=><option key={org.id} value={org.id}>{org.name} · {org.role}</option>)}
            </select></label>
          <button className="cloud-outline" onClick={()=>setShowCreate(v=>!v)} disabled={busy}><Plus size={16}/>{id?'Workspace baru':'New workspace'}</button>
        </div>
        {showCreate&&<form className="cloud-create" onSubmit={e=>{e.preventDefault();void create()}}>
          <input value={newOrg} onChange={e=>setNewOrg(e.target.value)} maxLength={100} placeholder={id?'Nama komunitas / EO':'Community / organizer name'} aria-label={id?'Nama workspace baru':'New workspace name'}/>
          <button type="submit" disabled={busy}>{id?'Buat':'Create'}</button></form>}
        {active&&<div className="cloud-import">
          <div><b>{id?'Draft cloud':'Cloud drafts'} <span>{items.length}</span></b>
            <p>{id?'Editor masih menyimpan perubahan di browser. Impor membuat salinan draft baru, bukan mengaktifkan event publik.':'The editor still saves locally. Import creates a cloud draft copy, not a public event.'}</p></div>
          <button className="button-dark small" disabled={busy||!experiences.length} onClick={()=>void importLocal()}>{busy?<LoaderCircle size={16} className="spin"/>:<UploadCloud size={16}/>}
            {id?'Impor draft lokal':'Import local drafts'}</button>
        </div>}
        {!!items.length&&<div className="cloud-list">{items.slice(0,8).map(item=><div key={item.id}><Check size={14}/><span>{item.title}</span><small>{item.missionCount} {id?'misi':'missions'} · cloud draft</small>{item.status==='draft'&&['owner','admin','editor'].includes(orgs.find(o=>o.id===active)?.role)&&<button className="cloud-outline" disabled={busy} onClick={()=>void openCloud(item)}>{id?'Edit cloud':'Edit cloud'}</button>}</div>)}</div>}
      </div>}
    {notice&&<p className="cloud-message" role="status">{notice}</p>}
    {error&&<p className="cloud-error" role="alert">{error}</p>}
  </section>;
}
