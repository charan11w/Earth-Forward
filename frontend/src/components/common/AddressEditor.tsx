import { ReactNode,useEffect,useRef,useState } from 'react';
import { Card,Field } from './UI';
import LocationMap,{Location} from './LocationMap';
import { reverseLocation } from '../../services/geocoding';
export type AddressDraft={id?:string;label:string;addressLine:string;area:string;landmark:string;accessNotes:string;isDefault:boolean;latitude?:number;longitude?:number};
export const emptyAddress=():AddressDraft=>({label:'Home',addressLine:'',area:'',landmark:'',accessNotes:'',isDefault:false});
export function addressPayload(d:AddressDraft){return {label:d.label,addressLine:d.addressLine,area:d.area,landmark:d.landmark,accessNotes:d.accessNotes,isDefault:d.isDefault,latitude:d.latitude,longitude:d.longitude};}
export default function AddressEditor({value,onChange,children,showLabel=false}:{value:AddressDraft;onChange:(d:AddressDraft)=>void;children?:ReactNode;showLabel?:boolean}){
  const latest=useRef(value);latest.current=value;
  const version=useRef(0),controller=useRef<AbortController>();const [lookup,setLookup]=useState(false),[error,setError]=useState('');
  useEffect(()=>()=>{version.current++;controller.current?.abort();},[]);
  function change(d:AddressDraft){latest.current=d;onChange(d);}
  function edit(key:keyof AddressDraft,v:string|boolean){
    // A late geocoder reply must never overwrite details the user is editing.
    if(key==='addressLine'||key==='area'){version.current++;controller.current?.abort();setLookup(false);}
    change({...latest.current,[key]:v});
  }
  async function select(p:Location){
    const request=++version.current;controller.current?.abort();setError('');
    change({...latest.current,id:undefined,latitude:p.latitude,longitude:p.longitude,addressLine:p.label||'',area:p.area||''});
    if(p.label){setLookup(false);return;}
    const c=new AbortController();controller.current=c;setLookup(true);
    const timeout=window.setTimeout(()=>c.abort(),12000);
    try{const result=await reverseLocation(p,c.signal);if(request===version.current)change({...latest.current,addressLine:result.label||'',area:result.area||''});}
    catch(e){if(request===version.current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Address lookup timed out. You can enter the details manually.');}
    finally{clearTimeout(timeout);if(request===version.current)setLookup(false);}
  }
  const point=value.latitude===undefined||value.longitude===undefined?undefined:{latitude:value.latitude,longitude:value.longitude};
  return <div className="two address-editor"><Card><div className="form-stack">
    {showLabel&&<Field label="Address label"><input required value={value.label} onChange={e=>edit('label',e.target.value)} placeholder="Home or work"/></Field>}
    <Field label="Address"><input required minLength={3} value={value.addressLine} onChange={e=>edit('addressLine',e.target.value)} placeholder="Select a map location, then add house / street details"/></Field>
    <Field label="Area / neighborhood"><input required minLength={2} value={value.area} onChange={e=>edit('area',e.target.value)}/></Field>
    <Field label="Landmark (optional)"><input value={value.landmark} onChange={e=>edit('landmark',e.target.value)} placeholder="Near the park, opposite the school…"/></Field>
    <Field label="Access instructions (optional)"><textarea value={value.accessNotes} onChange={e=>edit('accessNotes',e.target.value)} placeholder="Gate, floor or collection instructions"/></Field>
    {showLabel&&<label className="check-row"><input type="checkbox" checked={value.isDefault} onChange={e=>edit('isDefault',e.target.checked)}/>Use as my default address</label>}
    <p aria-live="polite">{lookup?'Looking up address…':point?'Location selected. Review the address and add your house details.':'Select a point on the map or search for your address.'}</p>
    {error&&<p className="form-error" role="status">{error}</p>}{children}
  </div></Card><LocationMap value={point} onChange={select}/></div>;
}

