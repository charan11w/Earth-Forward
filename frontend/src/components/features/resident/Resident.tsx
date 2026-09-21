import { useState } from 'react';
import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link,useParams } from 'react-router-dom';
import { api } from '../../../services/api';
import { RootState } from '../../../store';
import { Card,Badge,PageHead } from '../../common/UI';
import QueryStatus from '../../common/QueryStatus';
import LocationMap from '../../common/LocationMap';
import { loadPickups } from './Locations';
const date=(d:string)=>new Date(d).toLocaleString();
const active=['CREATED','QUEUED','ASSIGNED','IN_PROGRESS','PICKED_UP'];
export function Dashboard(){
  const q=useQuery({queryKey:['dashboard'],queryFn:async()=>{const [user,pickups]=await Promise.all([api('/users/me'),api<any[]>('/pickups/my')]);return {user,pickups};}});
  return <><PageHead title={q.data?'Welcome, '+q.data.user.name:'Your dashboard'} subtitle="Your collection requests and community services."/><QueryStatus query={q}/>{q.data&&<>
    <div className="stats">{[['TrashPoints',q.data.user.trashPoints],['Active pickups',q.data.pickups.filter(p=>active.includes(p.status)).length],['Completed pickups',q.data.pickups.filter(p=>p.status==='COMPLETED').length]].map(([label,value])=><Card key={label}><strong className="stat-number">{value}</strong><p>{label}</p></Card>)}</div>
    <Card><h2>What would you like to do?</h2><div className="actions">{[['/app/pickups/new','Request pickup'],['/app/bins/request','Request a bin'],['/app/report','Report waste'],['/app/bins/nearby','Nearby bins']].map(([to,label])=><Link className="button" to={to} key={to}>{label}</Link>)}</div></Card>
    <div className="section-title"><h2>Recent pickups</h2><Link className="text-button" to="/app/pickups">View all</Link></div>
    {!q.data.pickups.length?<Card><p>No pickups yet. Request your first collection when you are ready.</p></Card>:<Card>{q.data.pickups.slice(0,5).map(p=><Link className="activity" key={p.id} to={'/app/pickups/'+p.id}><div><b>{p.wasteType} waste collection</b><small>{date(p.createdAt)}</small></div><Badge>{p.status}</Badge></Link>)}</Card>}
  </>}</>;
}
export function Pickups(){
  const role=useSelector((s:RootState)=>s.session.role),[tab,setTab]=useState('Active');
  const q=useQuery({queryKey:['requests',role],queryFn:loadPickups});
  const rows=q.data?.filter(p=>tab==='All'||(tab==='Active'?active.includes(p.status):p.status===tab.toUpperCase()));
  return <><PageHead title={role==='admin'?'Collection requests':'My pickups'} subtitle="Open a request to see its saved location and collection status." action={role==='resident'?<Link className="button" to="/app/pickups/new">New pickup</Link>:<Link className="button" to="/admin/routes/new">Assign collection routes</Link>}/>
    <div className="tabs">{['Active','Completed','Cancelled','All'].map(t=><button key={t} className={tab===t?'on':''} onClick={()=>setTab(t)}>{t}</button>)}</div><QueryStatus query={q}/>
    {rows&&!rows.length&&<Card><p>No requests in this view.</p></Card>}<div className="list">{rows?.map(p=><Card key={p.id} className="request"><div><h3>{p.wasteType} waste pickup</h3><p>{p.address.addressLine}</p><p>{date(p.createdAt)}</p>{role==='admin'&&<Link className="text-button" to={'/admin/users/'+p.userId}>{p.user?.name}</Link>}</div><div><Badge>{p.status}</Badge><Link to={(role==='admin'?'/admin':'/app')+'/pickups/'+p.id}>View details</Link></div></Card>)}</div>
  </>;
}
export function PickupDetail(){
  const {id}=useParams(),role=useSelector((s:RootState)=>s.session.role),cache=useQueryClient();
  const q=useQuery({queryKey:['requests',role],queryFn:loadPickups}),p=q.data?.find(p=>p.id===id);
  const cancel=useMutation({mutationFn:()=>api('/pickups/'+id+'/cancel',{},'PATCH'),onSuccess:()=>cache.invalidateQueries({queryKey:['requests']})});
  return <><PageHead title="Pickup details"/><QueryStatus query={q}/>{p?<div className="two"><Card><h2>{p.wasteType} waste collection</h2><Badge>{p.status}</Badge><h3>{p.address.addressLine}</h3><p>{p.address.area}</p>{p.address.landmark&&<p>Landmark: {p.address.landmark}</p>}<p>{p.accessNotes||p.address.accessNotes}</p><p>Quantity: {p.quantity} bags</p><p>Requested {date(p.createdAt)}</p>{p.route&&<p>Truck: {p.route.truck?.name} · Driver: {p.route.worker?.name||'Not assigned'}</p>}{role==='admin'&&p.user&&<p><Link className="text-button" to={'/admin/users/'+p.user.id}>Resident: {p.user.name}</Link></p>}{role==='resident'&&['CREATED','QUEUED'].includes(p.status)&&<button className="secondary" disabled={cancel.isPending} onClick={()=>{if(window.confirm('Cancel this pickup request?'))cancel.mutate();}}>Cancel pickup</button>}{cancel.error&&<p className="form-error" role="alert">{cancel.error.message}</p>}</Card><LocationMap value={{latitude:p.latitude,longitude:p.longitude}}/></div>:q.data&&<Card><p>Pickup not found.</p></Card>}</>;
}
export function Wallet(){
  const q=useQuery({queryKey:['wallet'],queryFn:()=>api('/wallet')});
  return <><PageHead title="TrashPoints wallet" action={<Link className="button" to="/app/rewards">Browse rewards</Link>}/><QueryStatus query={q}/>{q.data&&<><Card className="wallet"><span>AVAILABLE BALANCE</span><strong>{q.data.balance}</strong><b>TrashPoints</b></Card><h2>Point history</h2><Card>{!q.data.transactions.length?<p>No point transactions yet.</p>:q.data.transactions.map((t:any)=><div className="activity" key={t.id}><div><b>{t.description}</b><small>{date(t.createdAt)}</small></div><strong>{t.amount>0?'+':''}{t.amount}</strong></div>)}</Card></>}</>;
}
export function Rewards(){
  const cache=useQueryClient(),q=useQuery({queryKey:['rewards'],queryFn:()=>api<any[]>('/rewards')}),wallet=useQuery({queryKey:['wallet'],queryFn:()=>api('/wallet')});
  const redeem=useMutation({mutationFn:(id:string)=>api('/rewards/'+id+'/redeem',{}),onSuccess:()=>{cache.invalidateQueries({queryKey:['wallet']});cache.invalidateQueries({queryKey:['rewards']});cache.invalidateQueries({queryKey:['dashboard']});}});
  return <><PageHead title="Rewards" subtitle={wallet.data?'Available: '+wallet.data.balance+' TrashPoints':'Redeem earned points.'}/><QueryStatus query={q}/><QueryStatus query={wallet}/>{redeem.error&&<p className="form-error" role="alert">{redeem.error.message}</p>}{redeem.isSuccess&&<p role="status" className="notice">Reward requested. Your balance has been updated.</p>}{q.data&&!q.data.length&&<Card><p>No rewards are currently offered.</p></Card>}<div className="grid3">{q.data?.map(r=><Card key={r.id}><h3>{r.name}</h3><p>{r.description}</p><p>{r.pointsCost} points · {r.stock} available</p><button className="button" disabled={!wallet.data||wallet.data.balance<r.pointsCost||r.stock===0||redeem.isPending} onClick={()=>redeem.mutate(r.id)}>Redeem</button></Card>)}</div></>;
}

