import { FormEvent,useEffect,useState } from 'react';
import { useDispatch } from 'react-redux';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { updateProfile } from '../../../store';
import { Card,Field,PageHead } from '../../common/UI';
import AddressEditor,{AddressDraft,addressPayload,emptyAddress} from '../../common/AddressEditor';
import QueryStatus from '../../common/QueryStatus';
export default function Profile(){
  const cache=useQueryClient(),dispatch=useDispatch();
  const q=useQuery({queryKey:['profile'],queryFn:()=>api('/users/me')});
  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[photo,setPhoto]=useState<string|null>(null),[error,setError]=useState(''),[photoBusy,setPhotoBusy]=useState(false);
  const [draft,setDraft]=useState<AddressDraft|null>(null),[message,setMessage]=useState('');
  useEffect(()=>{if(q.data){setName(q.data.name);setPhone(q.data.phone||'');setPhoto(q.data.photoUrl||null);}},[q.data]);
  const save=useMutation({mutationFn:()=>api('/users/me',{name,phone:phone||null,photoUrl:photo},'PUT'),onSuccess:user=>{dispatch(updateProfile(user));cache.invalidateQueries({queryKey:['profile']});setMessage('Profile saved');}});
  const addressSave=useMutation({mutationFn:async()=>{
    if(draft?.latitude===undefined||draft.longitude===undefined)throw new Error('Select the address on the map');
    return api('/addresses'+(draft.id?'/'+draft.id:''),addressPayload(draft),draft.id?'PUT':'POST');
  },onSuccess:()=>{setDraft(null);cache.invalidateQueries({queryKey:['profile']});cache.invalidateQueries({queryKey:['addresses']});setMessage('Address saved');}});
  const remove=useMutation({mutationFn:(id:string)=>api('/addresses/'+id,undefined,'DELETE'),onSuccess:()=>{cache.invalidateQueries({queryKey:['profile']});cache.invalidateQueries({queryKey:['addresses']});}});
  async function upload(file?:File){
    if(!file)return;setError('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Choose a JPG, PNG or WebP photo smaller than 5 MB.');return;}
    setPhotoBusy(true);
    try{const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const context=canvas.getContext('2d')!;const side=Math.min(bitmap.width,bitmap.height);context.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,256,256);bitmap.close();setPhoto(canvas.toDataURL('image/jpeg',0.85));}
    catch{setError('This image could not be opened. Try a different photo.');}
    finally{setPhotoBusy(false);}
  }
  return <><PageHead title="My profile" subtitle="Manage your details and collection addresses."/><QueryStatus query={q}/>
    {q.data&&<><Card><form className="form-stack profile-form" onSubmit={(e:FormEvent)=>{e.preventDefault();setMessage('');save.mutate();}}>
      <div className="profile-photo">{photo?<img src={photo} alt="Your profile"/>:<span>{name.charAt(0)}</span>}</div>
      <Field label="Profile photo"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></Field>
      {photo&&<button className="secondary" type="button" onClick={()=>setPhoto(null)}>Remove photo</button>}
      <Field label="Full name"><input required minLength={2} value={name} onChange={e=>setName(e.target.value)}/></Field>
      <Field label="Email"><input value={q.data.email} readOnly/></Field>
      <Field label="Phone (optional)"><input type="tel" value={phone} maxLength={30} onChange={e=>setPhone(e.target.value)}/></Field>
      {(error||save.error)&&<p role="alert" className="form-error">{error||save.error?.message}</p>}
      <button className="button" disabled={save.isPending||photoBusy}>{save.isPending?'Saving…':'Save profile'}</button>
    </form></Card>
    <div className="section-title"><h2>Saved addresses</h2><button className="button" onClick={()=>{addressSave.reset();setDraft(emptyAddress());}}>Add address</button></div>
    {!q.data.addresses.length&&<Card><p>No saved addresses. Add one using the map to reuse it for pickups.</p></Card>}
    <div className="grid3">{q.data.addresses.map((a:any)=><Card key={a.id}><h3>{a.label}{a.isDefault?' · Default':''}</h3><p>{a.addressLine}</p><p>{a.area}</p>{a.landmark&&<p>Landmark: {a.landmark}</p>}<div className="button-row"><button className="secondary" onClick={()=>{addressSave.reset();setDraft({...emptyAddress(),...a});}}>Edit address</button><button className="secondary" disabled={remove.isPending} onClick={()=>{if(window.confirm('Delete this saved address?'))remove.mutate(a.id);}}>Delete</button></div></Card>)}</div>
    {remove.error&&<p className="form-error" role="alert">{remove.error.message}</p>}
    {draft&&<section className="section-gap"><h2>{draft.id?'Edit address':'Add address'}</h2><form onSubmit={e=>{e.preventDefault();addressSave.mutate();}}><AddressEditor value={draft} onChange={setDraft} showLabel>
      {addressSave.error&&<p className="form-error" role="alert">{addressSave.error.message}</p>}<div className="button-row"><button className="button" disabled={addressSave.isPending}>{addressSave.isPending?'Saving…':'Save address'}</button><button type="button" className="secondary" onClick={()=>setDraft(null)}>Cancel</button></div>
    </AddressEditor></form></section>}</>}
    {message&&<p role="status" className="notice">{message}</p>}
  </>;
}

