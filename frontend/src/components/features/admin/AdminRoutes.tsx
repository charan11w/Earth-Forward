import { useState } from 'react';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { Link,useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { Badge,Card,PageHead } from '../../common/UI';
import QueryStatus from '../../common/QueryStatus';
import LocationMap from '../../common/LocationMap';
export function AdminRoutes(){
  const q=useQuery({queryKey:['routes'],queryFn:()=>api<any[]>('/routes')});
  return <><PageHead title="Collection routes" subtitle="Assignments for your trucks and drivers." action={<Link className="button" to="/admin/routes/new">Add new / plan routes</Link>}/><QueryStatus query={q}/>{q.data&&!q.data.length&&<Card><p>No routes assigned yet. Add trucks and drivers, register bins or receive pickup requests, then plan routes.</p></Card>}<div className="list">{q.data?.map(r=><Card key={r.id} className="request"><div><h3>{r.truck.name}</h3><p>Driver: {r.worker?.name||'Not assigned'}</p><p>{r.stops.length} stops · {(r.totalDistance/1000).toFixed(2)} km estimated · {new Date(r.createdAt).toLocaleString()}</p><Badge>{r.status}</Badge></div><Link className="button" to={'/admin/routes/'+r.id}>View route</Link></Card>)}</div></>;
}
export function RoutePlanner(){
  const q=useQuery({queryKey:['planning'],queryFn:()=>api('/routes/planning')}),cache=useQueryClient(),nav=useNavigate();
  const [truckIds,setTrucks]=useState<string[]>([]),[binIds,setBins]=useState<string[]>([]),[pickupIds,setPickups]=useState<string[]>([]);
  const preview=useMutation({mutationFn:()=>api('/routes/preview',{truckIds,binIds,pickupIds})});
  const generate=useMutation({mutationFn:()=>api('/routes/generate',{truckIds,binIds,pickupIds}),onSuccess:()=>{cache.invalidateQueries();nav('/admin/routes');}});
  const toggle=(id:string,current:string[],set:(v:string[])=>void)=>{set(current.includes(id)?current.filter(x=>x!==id):[...current,id]);preview.reset();generate.reset();};
  return <><PageHead title="Plan collection routes" subtitle="Group nearby collection points across available trucks, then review before assigning."/><QueryStatus query={q}/>{q.data&&<>
    <div className="two"><Card><h2>Available trucks</h2>{!q.data.trucks.length&&<p>No available truck has a driver. <Link className="text-button" to="/admin/trucks">Add / assign trucks</Link>.</p>}{q.data.trucks.map((t:any)=><label className="check-row" key={t.id}><input type="checkbox" checked={truckIds.includes(t.id)} onChange={()=>toggle(t.id,truckIds,setTrucks)}/><span><b>{t.name}</b><small>{t.driver.name} · up to {t.capacity} stops</small></span></label>)}</Card>
    <Card><h2>Collection points</h2><div className="button-row"><button className="secondary" onClick={()=>{setBins(q.data.bins.map((b:any)=>b.id));setPickups(q.data.pickups.map((p:any)=>p.id));preview.reset();}}>Select all points</button><button className="secondary" onClick={()=>{setBins([]);setPickups([]);preview.reset();}}>Clear points</button></div>
      <h3>Bins needing collection ({q.data.bins.length})</h3>{q.data.bins.map((b:any)=><label className="check-row" key={b.id}><input type="checkbox" checked={binIds.includes(b.id)} onChange={()=>toggle(b.id,binIds,setBins)}/><span>{b.address}<small>{b.type}</small></span></label>)}
      <h3>Pending pickups ({q.data.pickups.length})</h3>{q.data.pickups.map((p:any)=><label className="check-row" key={p.id}><input type="checkbox" checked={pickupIds.includes(p.id)} onChange={()=>toggle(p.id,pickupIds,setPickups)}/><span>{p.address.addressLine}<small>{p.user.name} · {p.wasteType}</small></span></label>)}
      {!q.data.bins.length&&!q.data.pickups.length&&<p>No unassigned collection points.</p>}
    </Card></div>
    <p>Each point goes to a nearby truck with remaining stop capacity. Stops are ordered by proximity. Distances are straight-line estimates; drivers use road navigation at each stop.</p>
    <button className="button" disabled={!truckIds.length||!binIds.length&&!pickupIds.length||preview.isPending||generate.isPending} onClick={()=>preview.mutate()}>{preview.isPending?'Planning…':'Preview routes'}</button>
    {preview.error&&<p className="form-error" role="alert">{preview.error.message}</p>}
    {preview.data&&<section className="section-gap"><h2>Review assignments</h2>{preview.data.unassigned.length>0&&<p className="notice">{preview.data.unassigned.length} point(s) exceed the selected trucks’ capacity and will remain unassigned.</p>}<div className="list">{preview.data.routes.map((r:any)=><Card key={r.truckId}><h3>{r.truck.name} · {r.truck.driver.name}</h3><p>{r.ordered.length} stops · {(r.totalDistance/1000).toFixed(2)} km estimated</p><div className="two"><ol>{r.ordered.map((s:any)=><li key={s.id}>{s.address} <Badge>{s.kind}</Badge></li>)}</ol><LocationMap points={r.ordered.map((s:any)=>({...s,name:s.address}))} routePath={[{latitude:r.truck.currentLatitude,longitude:r.truck.currentLongitude},...r.ordered]}/></div></Card>)}</div>
      {generate.error&&<p role="alert" className="form-error">{generate.error.message}</p>}<button className="button wide" disabled={generate.isPending||!preview.data.routes.length} onClick={()=>generate.mutate()}>{generate.isPending?'Assigning…':'Assign routes to drivers'}</button>
    </section>}
  </>}</>;
}

