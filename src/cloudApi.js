// Opt-in cloud API. Without VITE_API_BASE_URL the existing local demo is unchanged.
const endpoint = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/,'');
export const cloudEnabled = /^https?:\/\//.test(endpoint);

export async function cloudRequest(path,{method='GET',body}={}) {
  if (!cloudEnabled) throw new Error('CLOUD_NOT_CONFIGURED');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12_000);
  try {
    const response=await fetch(endpoint+path,{
      method,credentials:'include',signal:controller.signal,
      headers:body===undefined?{}:{'Content-Type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    });
    const data=response.status===204?{}:await response.json().catch(()=>({}));
    if (!response.ok) {
      const error=new Error(data.error||'CLOUD_UNAVAILABLE');
      error.status=response.status;
      throw error;
    }
    return data;
  } finally {clearTimeout(timeout);}
}

export function beginCloudLogin() {
  if (cloudEnabled) window.location.assign(endpoint+'/v1/auth/start');
}

// Keep all legacy keys and local drafts intact; server strips local-only media
// and stores quiz answer keys/QR validation separately from public config.
export function localDraftForImport(draft) {
  if (!draft || !Array.isArray(draft.missions)) return null;
  const clone=JSON.parse(JSON.stringify(draft));
  if (clone.brand) {
    for(const key of ['logo','cover','coverMobile','coverDesktop','logoUrl','coverUrl','coverMobileUrl','coverDesktopUrl']) {
      if (typeof clone.brand[key]==='string' && /^data:/i.test(clone.brand[key])) clone.brand[key]='';
    }
  }
  if (clone.reward) {
    for(const key of ['image','imageUrl']) {
      if (typeof clone.reward[key]==='string' && /^data:/i.test(clone.reward[key])) clone.reward[key]='';
    }
  }
  return clone;
}

export function draftContainsLocalMedia(draft) {
  const imageKeys=['logo','cover','coverMobile','coverDesktop','logoUrl','coverUrl','coverMobileUrl','coverDesktopUrl','image','imageUrl'];
  return [draft?.brand,draft?.reward].some(part=>part && imageKeys.some(key=>typeof part[key]==='string' && /^data:/i.test(part[key])));
}
