import { useEffect,useRef,useState } from 'react';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { store } from '../../../store';
import { Badge,Card,Field,PageHead } from '../../common/UI';
import QueryStatus from '../../common/QueryStatus';
import LocationMap,{defaultLocation,Location,MapPoint} from '../../common/LocationMap';
import AddressEditor,{AddressDraft,addressPayload,emptyAddress} from '../../common/AddressEditor';
export async function loadPickups():Promise<any[]>{const rows=await api<any[]>(store.getState().session.role==='admin'?'/admin/pickups':'/pickups/my');return rows.map(p=>({...p,address:p.addressSnapshot||p.address}));}
const settings={
  pickup:{title:'Request a pickup',options:['General','Recyclable','Organic']},
  bin:{title:'Request a household bin',options:['Small','Medium','Large']},
  community:{title:'Request a community bin',options:['No nearby bin','Overflowing waste','Repeated dumping']},
  report:{title:'Report a waste problem',options:['Roadside dumping','Overflowing bin','Construction waste']},
  address:{title:'Your collection address',options:[]}
};
export function RequestForm({kind}:{kind:keyof typeof settings}){
  const c=settings[kind],cache=useQueryClient(),initialized=useRef(false);
  const q=useQuery({queryKey:['addresses'],queryFn:()=>api<any[]>('/addresses')});
  const [draft,setDraft]=useState<AddressDraft>(emptyAddress),[choice,setChoice]=useState(c.options[0]||''),[quantity,setQuantity]=useState(1),[description,setDescription]=useState('');
  useEffect(()=>{if(q.data&&!initialized.current){initialized.current=true;const a=q.data.find(a=>a.isDefault);if(a)setDraft({...emptyAddress(),...a});}},[q.data]);
  const m=useMutation({mutationFn:async()=>{
    if(draft.latitude===undefined||draft.longitude===undefined)throw new Error('Select your location on the map');
    const geo={latitude:draft.latitude,longitude:draft.longitude,address:[draft.addressLine,draft.area].join(', ')};
    if(kind==='community')return api('/community-bin-requests',{...geo,reason:choice,description,householdEstimate:quantity});
    if(kind==='report')return api('/complaints',{...geo,category:choice,description});
    const address=draft.id?draft:await api('/addresses',addressPayload(draft));
    if(kind==='address')return address;
    if(kind==='bin')return api('/bin-requests',{addressId:address.id,type:'HOUSEHOLD',size:choice,reason:description});
    return api('/pickups',{addressId:address.id,wasteType:choice==='Recyclable'?'DRY':choice==='Organic'?'WET':'MIXED',quantity,accessNotes:[draft.landmark,draft.accessNotes].filter(Boolean).join(' · ')});
  },onSuccess:()=>{cache.invalidateQueries({queryKey:['requests']});cache.invalidateQueries({queryKey:['addresses']});cache.invalidateQueries({queryKey:['profile']});}});
  if(m.isSuccess)return <Card className="success"><h2>{kind==='address'?'Address saved!':'Request submitted!'}</h2><p>Your details and map location have been saved.</p><Link className="button" to={kind==='pickup'?'/app/pickups':'/app/dashboard'}>{kind==='pickup'?'View my pickups':'Back to dashboard'}</Link></Card>;
  return <><PageHead title={c.title} subtitle="Choose a saved address or select a new point on the map."/><QueryStatus query={q}/>
    {!!q.data?.length&&<Card className="section-gap"><Field label="Saved address"><select value={draft.id||''} onChange={e=>{const a=q.data!.find(a=>a.id===e.target.value);setDraft(a?{...emptyAddress(),...a}:emptyAddress());}}><option value="">Use a new address</option>{q.data.map(a=><option key={a.id} value={a.id}>{a.label} — {a.addressLine}{a.isDefault?' (default)':''}</option>)}</select></Field><p><Link className="text-button" to="/profile">Manage saved addresses</Link></p></Card>}
    <form onSubmit={e=>{e.preventDefault();m.mutate();}}><AddressEditor value={draft} onChange={d=>setDraft({...d,id:undefined})}>
      {!!c.options.length&&<Field label={kind==='pickup'?'Waste type':'Choose an option'}><select value={choice} onChange={e=>setChoice(e.target.value)}>{c.options.map(o=><option key={o}>{o}</option>)}</select></Field>}
      {(kind==='pickup'||kind==='community')&&<Field label={kind==='pickup'?'Quantity (bags)':'Nearby households'}><input type="number" required min={1} max={1000} step={1} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></Field>}
      {['report','community','bin'].includes(kind)&&<Field label="Description / reason"><textarea required minLength={5} value={description} onChange={e=>setDescription(e.target.value)}/></Field>}
      {m.error&&<p className="form-error" role="alert">{m.error.message}</p>}<button className="button" disabled={m.isPending}>{m.isPending?'Submitting…':kind==='address'?'Save address':'Submit request'}</button>
    </AddressEditor></form>
  </>;
}
type Bin=MapPoint&{status:string;type:string;distanceMeters:number};
export function NearbyBins(){
  const [origin,setOrigin]=useState<Location>(defaultLocation),[selected,setSelected]=useState<string>();
  const q=useQuery({queryKey:['bins',origin.latitude,origin.longitude],queryFn:async():Promise<Bin[]>=>{
    const rows=await api<any[]>(`/bins/nearby?lat=${origin.latitude}&lng=${origin.longitude}&radius=50000`);
    return rows.map(b=>({...b,name:b.address}));
  }});
  return <><PageHead title="Nearby public bins" subtitle="Search or use your current location to find registered bins within 50 km."/><LocationMap value={origin} onChange={p=>{setOrigin(p);setSelected(undefined);}} points={q.data||[]} selectedId={selected} onSelect={setSelected}/><QueryStatus query={q}/>
    {q.data&&!q.data.length&&<Card><p>No registered public bins in this area.</p></Card>}
    <div className="grid3 bin-list">{q.data?.map(b=><Card key={b.id} className={selected===b.id?'selected-bin':''}><Badge>{b.type}</Badge><h3>{b.name}</h3><p>{(b.distanceMeters/1000).toFixed(2)} km away · straight-line distance</p><button className="secondary" onClick={()=>{setSelected(b.id);document.querySelector('.location-map')?.scrollIntoView({behavior:'smooth'});}}>View location</button> <a className="text-button" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.latitude}%2C${origin.longitude}%3B${b.latitude}%2C${b.longitude}`}>Directions ↗</a>{selected===b.id&&<p role="status">Shown on map: {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}</p>}</Card>)}</div>
  </>;
}

