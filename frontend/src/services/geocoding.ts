import type { Location } from '../components/common/LocationMap';
export function placeFromFeature(f:any):Location{
  const p=f.properties||{};
  const street=[p.housenumber,p.street].filter(Boolean).join(' ');
  const area=p.district||p.locality||p.city||p.county||p.state||'';
  return {latitude:f.geometry.coordinates[1],longitude:f.geometry.coordinates[0],
    label:[...new Set([street||p.name,area,p.city,p.state,p.postcode].filter(Boolean))].join(', '),area};
}
const reverseCache=new Map<string,Location>();
export async function reverseLocation(point:Location,signal:AbortSignal):Promise<Location>{
  const key=point.latitude.toFixed(6)+','+point.longitude.toFixed(6);
  if(reverseCache.has(key))return {...reverseCache.get(key)!,latitude:point.latitude,longitude:point.longitude};
  const url=new URL(import.meta.env.VITE_GEOCODER_REVERSE_URL||new URL('../reverse',import.meta.env.VITE_GEOCODER_URL||'https://photon.komoot.io/api/').toString());
  url.searchParams.set('lat',String(point.latitude));url.searchParams.set('lon',String(point.longitude));url.searchParams.set('limit','1');
  const r=await fetch(url,{signal});
  if(!r.ok)throw new Error('Address lookup is unavailable. Enter the address and area manually.');
  const data=await r.json();
  if(!data.features?.length)throw new Error('No address found at this point. Enter the address and area manually.');
  const resolved={...placeFromFeature(data.features[0]),latitude:point.latitude,longitude:point.longitude};
  reverseCache.set(key,resolved);return resolved;
}

