import { useState } from 'react';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { Link,useParams } from 'react-router-dom';
import { api } from '../../../services/api';
import { Badge,Card,Field,PageHead } from '../../common/UI';
import QueryStatus from '../../common/QueryStatus';
import LocationMap from '../../common/LocationMap';
export function AdminUsers(){
  const cache=useQueryClient(),q=useQuery({queryKey:['admin-users'],queryFn:()=>api<any[]>('/admin/users')});
  const [open,setOpen]=useState(false),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[role,setRole]=useState('WORKER');
  const add=useMutation({mutationFn:()=>api('/admin/users',{name,email,password,role}),onSuccess:()=>{setName('');setEmail('');setPassword('');setOpen(false);cache.invalidateQueries({queryKey:['admin-users']});cache.invalidateQueries({queryKey:['admin-dashboard']});}});
  return <><PageHead title="Users & drivers" subtitle="Open user details or create an account for a collection driver." action={<button className="button" onClick={()=>{add.reset();setOpen(!open);}}>Add new user</button>}/>
    {open&&<Card className="section-gap"><form className="form-stack" autoComplete="off" onSubmit={e=>{e.preventDefault();add.mutate();}}><h2>Create account</h2><Field label="Full name"><input required minLength={2} value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Email"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></Field><Field label="Initial password"><input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)}/></Field><Field label="Account role"><select value={role} onChange={e=>setRole(e.target.value)}><option value="WORKER">Truck driver</option><option value="RESIDENT">Resident</option></select></Field><p>Drivers sign in at <Link className="text-button" to="/auth/driver">Driver sign in</Link>.</p>{add.error&&<p role="alert" className="form-error">{add.error.message}</p>}<div className="button-row"><button className="button" disabled={add.isPending}>Create account</button><button type="button" className="secondary" onClick={()=>{setPassword('');setOpen(false);}}>Cancel</button></div></form></Card>}
    <QueryStatus query={q}/>{q.data&&!q.data.length&&<Card><p>No users yet.</p></Card>}<div className="list">{q.data?.map(u=><Card key={u.id} className="request"><div><h3>{u.name}</h3><p>{u.email}</p><Badge>{u.role==='WORKER'?'DRIVER':u.role}</Badge>{u.assignedTruck&&<p>Truck: {u.assignedTruck.name}</p>}</div><Link className="button" to={'/admin/users/'+u.id}>View details</Link></Card>)}</div>
  </>;
}
export function AdminUserDetail(){
  const {id}=useParams(),q=useQuery({queryKey:['admin-user',id],queryFn:()=>api('/admin/users/'+id)});
  return <><PageHead title="User details"/><QueryStatus query={q}/>{q.data&&<><Card><div className="profile-summary">{q.data.photoUrl&&<img className="profile-photo" src={q.data.photoUrl} alt={q.data.name}/>}<div><h2>{q.data.name}</h2><Badge>{q.data.role}</Badge><p>{q.data.email}</p><p>Phone: {q.data.phone||'Not provided'}</p><p>Joined {new Date(q.data.createdAt).toLocaleDateString()}</p>{q.data.assignedTruck&&<p>Assigned truck: <Link className="text-button" to="/admin/trucks">{q.data.assignedTruck.name}</Link></p>}</div></div></Card>
    <h2>Saved addresses</h2>{!q.data.addresses.length?<Card><p>No saved addresses.</p></Card>:<div className="two"><Card>{q.data.addresses.map((a:any)=><div className="detail" key={a.id}><b>{a.label}{a.isDefault?' · Default':''}</b><span>{a.addressLine}, {a.area}</span><small>{a.landmark}</small><small>{a.accessNotes}</small></div>)}</Card><LocationMap points={q.data.addresses.map((a:any)=>({...a,name:a.label}))}/></div>}
    <h2>Recent pickup requests</h2><Card>{!q.data.pickups.length?<p>No pickup requests.</p>:q.data.pickups.map((p:any)=><Link className="activity" key={p.id} to={'/admin/pickups/'+p.id}><div><b>{p.wasteType}</b><small>{p.address.addressLine}</small></div><Badge>{p.status}</Badge></Link>)}</Card>
  </>}</>;
}

