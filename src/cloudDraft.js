import {createExperience,normalizeExperience,getBrand} from './data.js';

// Cloud drafts live in memory until the creator explicitly saves them. They
// are never written into the legacy questpop-* localStorage collections.
export function cloudDraftToEditor(detail,organizationId,brandKit){
  if(!detail?.id || !detail?.revision || !Array.isArray(detail.missions) || !organizationId)
    throw new Error('INVALID_CLOUD_DRAFT');
  const type=['passport','hunt','quiz'].includes(detail.type)?detail.type:'passport';
  const studio=detail.settings?.studio||{};
  const sample=createExperience({name:detail.title,type,missions:[]});
  const missions=detail.missions.map(m=>{
    const kind=type==='quiz'?'quiz':m.kind;
    if((kind==='quiz'&&!Number.isInteger(m.privateValidation?.correctIndex))
      ||(kind==='qr'&&typeof m.privateValidation?.code!=='string'))
      throw new Error('PRIVATE_VALIDATION_UNAVAILABLE');
    return {
      id:m.id,kind,name:m.title,description:m.description||'',points:m.points,
      ...(kind==='quiz'?{question:m.publicConfig?.question||'',
        options:m.publicConfig?.options||[],correctIndex:m.privateValidation.correctIndex}:{}),
      ...(kind==='qr'?{code:m.privateValidation.code}:{}),
    };
  });
  const brand=brandKit?.settings?getBrand({palette:studio.palette,
    brand:{...brandKit.settings,name:brandKit.settings.name||brandKit.name}}):getBrand({palette:studio.palette});
  return normalizeExperience({...sample,...studio,id:'cloud-'+organizationId+'-'+detail.id,
    name:detail.title,type,slug:detail.slug,missions,brand,status:'draft',
    cloud:{organizationId,experienceId:detail.id,revision:detail.revision,dirty:false}});
}

// Read-only cloud-to-editor adapter. Do not overwrite a local draft or assign
// the legacy import_key as a cloud identity.
export function cloudDraftEndpoint(orgId,id){
  if(!/^[0-9a-f-]{36}$/i.test(orgId)||!/^[0-9a-f-]{36}$/i.test(id))
    throw new Error('INVALID_CLOUD_ID');
  return '/v1/orgs/'+orgId+'/experiences/'+id;
}
