// Indonesian time zones do not observe daylight-saving time. Keep the absolute
// instant in UTC and the chosen display time zone alongside it.
export const releaseZones=[
  {id:'Asia/Jakarta',label:'WIB · Jakarta',offset:'+07:00'},
  {id:'Asia/Makassar',label:'WITA · Makassar',offset:'+08:00'},
  {id:'Asia/Jayapura',label:'WIT · Jayapura',offset:'+09:00'}
];

export const releaseZone=id=>releaseZones.find(zone=>zone.id===id)||releaseZones[0];

export function toReleaseInstant(localValue,zoneId='Asia/Jakarta'){
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue||''))return '';
  const timestamp=Date.parse(localValue+releaseZone(zoneId).offset);
  if(!Number.isFinite(timestamp))return '';
  const instant=new Date(timestamp).toISOString();
  return releaseLocalValue(instant,zoneId)===localValue?instant:'';
}

export function releaseLocalValue(instant,zoneId='Asia/Jakarta'){
  if(!instant||!Number.isFinite(Date.parse(instant)))return '';
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:releaseZone(zoneId).id,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(new Date(instant));
  const part=type=>parts.find(item=>item.type===type)?.value||'';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function formatRelease(instant,zoneId='Asia/Jakarta',locale='id'){
  if(!instant||!Number.isFinite(Date.parse(instant)))return '';
  return new Intl.DateTimeFormat(locale==='en'?'en-US':'id-ID',{
    timeZone:releaseZone(zoneId).id,dateStyle:'full',timeStyle:'short'
  }).format(new Date(instant))+' '+releaseZone(zoneId).label.split(' · ')[0];
}

export function isReleaseScheduled(experience,now=Date.now()){
  const publication=experience?.publication;
  return publication?.mode==='scheduled'&&!!publication?.startsAt&&
    Number.isFinite(Date.parse(publication.startsAt))&&Date.parse(publication.startsAt)>now;
}

export function displayExperienceStatus(experience,now=Date.now()){
  if(experience?.status==='draft')return 'draft';
  return isReleaseScheduled(experience,now)?'scheduled':'published';
}

export function releaseCountdown(instant,now=Date.now()){
  const delta=Math.max(0,Date.parse(instant)-now);
  if(!Number.isFinite(delta))return null;
  const days=Math.floor(delta/86400000);
  const hours=Math.floor(delta%86400000/3600000);
  const minutes=Math.floor(delta%3600000/60000);
  return {days,hours,minutes};
}
