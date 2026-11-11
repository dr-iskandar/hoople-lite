import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,ShieldCheck,X} from 'lucide-react';
import {useLocale} from './i18n';
import {beginCloudLogin,cloudEnabled,cloudRequest} from './cloudApi';
import './pricing.css';

const plans=[
 {id:'free',price:'0',limit:1,players:25,projects:1,color:'stone',features:{id:['1 draf experience','Preview & tutorial','Branding dasar'],en:['1 experience draft','Preview & tutorial','Basic branding']}},
 {id:'starter',price:'29.900',limit:1,players:100,projects:1,color:'sage',features:{id:['1 event aktif','Passport, hunt, quiz','Logo dan cover brand'],en:['1 active event','Passport, hunt, quiz','Branded logo and cover']}},
 {id:'creator',price:'69.900',limit:3,players:500,projects:3,color:'coral',features:{id:['3 event aktif','Brand kit reusable','Template & impor AI JSON'],en:['3 active events','Reusable brand kits','AI JSON templates & import']}},
 {id:'studio',price:'99.900',limit:10,players:2000,projects:10,color:'blue',features:{id:['10 event aktif','Branding multiklien','Prioritas fitur agency'],en:['10 active events','Multi-client branding','Agency feature priority']}}
];
const copy={id:{badge:'PRICING / EARLY ACCESS',title:'Mulai kecil. Main besar.',desc:'Harga psikologis yang ramah untuk kreator, EO, komunitas, dan brand kecil. Pilih sesuai skala aktivasi.',period:'/bulan',names:{free:'Gratis',starter:'Starter',creator:'Creator',studio:'Studio'},recommended:'Paling fleksibel',players:'peserta/bulan',details:'Detail paket',notLive:'Checkout HoPay tersedia khusus staging setelah login kreator.',modalTitle:'Checkout staging HoPay',modalText:'Transaksi ini untuk pengujian gateway sekali bayar, bukan langganan otomatis. Status pembayaran belum terverifikasi; paket tidak aktif walaupun halaman pembayaran menyatakan selesai.',freeText:'Paket gratis tidak memerlukan pembayaran.',login:'Masuk untuk checkout',workspace:'Buat atau pilih workspace di Studio terlebih dahulu.',loading:'Memeriksa akun dan workspace…',pay:'Lanjutkan ke HoPay staging',busy:'Membuat sesi checkout…',close:'Tutup',note:'Harga masih pra-rilis. Kuota, PPN, biaya gateway, billing period, dan refund harus disahkan sebelum produksi.'},en:{badge:'PRICING / EARLY ACCESS',title:'Start small. Play big.',desc:'Accessible pricing for creators, event teams, communities, and emerging brands.',period:'/month',names:{free:'Free',starter:'Starter',creator:'Creator',studio:'Studio'},recommended:'Most flexible',players:'participants/month',details:'Plan details',notLive:'HoPay checkout is available in staging after creator sign-in.',modalTitle:'HoPay staging checkout',modalText:'This is a one-time gateway test, not an automatic subscription. Payment cannot yet be verified and no plan will activate even if the payment page reports success.',freeText:'The free plan does not require checkout.',login:'Sign in to checkout',workspace:'Create or select a workspace in Studio first.',loading:'Checking account and workspace…',pay:'Continue to HoPay staging',busy:'Creating checkout session…',close:'Close',note:'Pre-launch prices. Quotas, VAT, gateway fees, billing period, and refunds require approval before production.'}};
export default function Pricing(){
 const {locale}=useLocale(),lang=locale==='en'?'en':'id',t=copy[lang],[selected,setSelected]=useState(null);
 const [checkoutState,setCheckoutState]=useState('loading'),[activeOrg,setActiveOrg]=useState(''),[checkoutError,setCheckoutError]=useState(''),[busy,setBusy]=useState(false);
 const requestKey=useRef('');
 useEffect(()=>{
   if(!selected || selected.id==='free')return;
   let live=true;
   setCheckoutState('loading');setCheckoutError('');setActiveOrg('');requestKey.current='';
   if(!cloudEnabled){setCheckoutState('disabled');return;}
   void (async()=>{
     try{
       await cloudRequest('/v1/auth/session');
       const response=await cloudRequest('/v1/orgs');
       const allowed=(response.organizations||[]).filter(org=>['owner','admin','billing'].includes(org.role));
       const active=allowed.find(org=>org.id===response.activeOrganizationId)||allowed[0];
       if(live){setActiveOrg(active?.id||'');setCheckoutState(active?'ready':'workspace');}
     }catch(error){if(live)setCheckoutState(error.status===401?'login':'disabled');}
   })();
   return()=>{live=false};
 },[selected?.id]);
 async function startCheckout(){
   if(!selected || !activeOrg || busy || checkoutState!=='ready')return;
   setBusy(true);setCheckoutError('');
   try{
     if(!requestKey.current)requestKey.current=crypto.randomUUID();
     const response=await cloudRequest(`/v1/orgs/${activeOrg}/billing/checkout`,{
       method:'POST',body:{planId:selected.id,idempotencyKey:requestKey.current},
     });
     const target=new URL(response.checkoutUrl);
     if(target.protocol!=='https:' || !['hoople.co.id','midtrans.com'].some(d=>target.hostname===d||target.hostname.endsWith('.'+d)))
       throw new Error('UNSAFE_CHECKOUT_URL');
     window.location.assign(target.href);
   }catch(error){
     if(error.status!==409)requestKey.current='';
     setCheckoutError(lang==='id'?'Checkout belum dapat dibuat. Periksa konfigurasi API/HoPay atau hubungi tim. Tidak ada paket yang diaktifkan.':'Could not create checkout. Check API/HoPay setup or contact the team. No plan was activated.');
   }finally{setBusy(false);}
 }
 return <section className="pricing-section" id="harga"><div className="pricing-head"><span className="market-kicker">{t.badge}</span><h2>{t.title}</h2><p>{t.desc}</p></div><div className="pricing-grid">{plans.map(p=><article key={p.id} className={'pricing-card '+p.color+(p.id==='creator'?' highlighted':'')}>
  {p.id==='creator'&&<span className="pricing-bestseller">{t.recommended}</span>}
  <div className="pricing-card-top"><span>{p.id.toUpperCase()}</span><h3>{t.names[p.id]}</h3><div className="pricing-amount"><small>Rp</small><strong>{p.price}</strong><small>{t.period}</small></div></div>
  <div className="pricing-card-count"><b>{p.players.toLocaleString('id-ID')}</b> {t.players}</div><ul>{p.features[lang].map(f=><li key={f}><Check size={15}/>{f}</li>)}</ul><button onClick={()=>setSelected(p)}>{t.details} <ArrowRight size={16}/></button></article>)}</div><p className="pricing-note"><ShieldCheck size={16}/>{t.notLive} {t.note}</p>
  {selected&&<div className="pricing-modal-shade" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setSelected(null)}}><div className="pricing-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-heading"><button aria-label="Close" className="pricing-close" onClick={()=>setSelected(null)} disabled={busy}><X size={20}/></button><span className="eyebrow">{selected.id.toUpperCase()} / STAGING</span><h3 id="checkout-heading">{selected.id==='free'?t.names.free:t.modalTitle}</h3><p>{selected.id==='free'?t.freeText:t.modalText}</p><div><b>{t.names[selected.id]}</b><strong>Rp{selected.price}{t.period}</strong></div>
    {selected.id!=='free'&&<p className="pricing-stage-status" role="status">{checkoutState==='loading'?t.loading:checkoutState==='workspace'?t.workspace:checkoutState==='disabled'?(lang==='id'?'Checkout belum dikonfigurasi untuk website ini.':'Checkout is not configured for this website.'):null}</p>}
    {selected.id!=='free'&&checkoutState==='login'&&<button className="button-dark" onClick={beginCloudLogin}>{t.login}</button>}
    {selected.id!=='free'&&checkoutState==='ready'&&<button className="button-dark" disabled={busy} onClick={()=>void startCheckout()}>{busy?t.busy:t.pay}</button>}
    {checkoutError&&<p className="pricing-stage-error" role="alert">{checkoutError}</p>}
    <button className="pricing-secondary-close" onClick={()=>setSelected(null)} disabled={busy}>{t.close}</button>
  </div></div>}
 </section>;
}
