import { useState } from 'react';
import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link,useParams } from 'react-router-dom';
import { api } from '../../../services/api';
import { RootState } from '../../../store';
import { Card,Badge,PageHead } from '../../common/UI';
import QueryStatus from '../../common/QueryStatus';
import LocationMap from '../../common/LocationMap';
export function WorkerDashboard(){
  const q=useQuery({queryKey:['worker-routes'],queryFn:()=>api<any[]>('/worker/routes')});
  return <><PageHead title="My collection routes" subtitle="Your assigned trucks, bins and household pickups."/><QueryStatus query={q}/>{q.data&&!q.data.length&&<Card><h2>No routes assigned yet</h2><p>Your administrator will assign a truck and collection route. Assigned routes will appear here.</p></Card>}<div className="list">{q.data?.map(r=><Card key={r.id} className="request"><div><h3>{r.truck.name} · {r.truck.registrationNumber}</h3><Badge>{r.status}</Badge><p>{r.stops.filter((s:any)=>s.status==='COMPLETED').length} of {r.stops.length} collected</p><p>{new Date(r.date).toLocaleDateString()} · {(r.totalDistance/1000).toFixed(2)} km estimated</p></div><Link className="button" to={'/worker/routes/'+r.id}>Open route</Link></Card>)}</div><p><Link className="text-button" to="/worker/bins">View public bin locations</Link></p></>;
}
export function RouteDetail(){
  const {id,stopId}=useParams(),role=useSelector((s:RootState)=>s.session.role),cache=useQueryClient(),[selected,setSelected]=useState<string>();
  const q=useQuery({queryKey:['route',id],queryFn:()=>api('/routes/'+id)});
  const action=useMutation({mutationFn:({path}:{path:string})=>api(path,{}),onSuccess:()=>cache.invalidateQueries()});
  const route=q.data,root=role==='admin'?'/admin':'/worker',chosen=stopId||selected;
  return <><PageHead title={route?'Route · '+route.truck.name:'Collection route'} subtitle="Follow the stop sequence and open road navigation for each location."/><QueryStatus query={q}/>{route&&<>
    <Card><div className="button-row"><Badge>{route.status}</Badge><span>Driver: {route.worker?.name||'Not assigned'}</span><span>Truck: {route.truck.registrationNumber}</span></div><p>{route.stops.length} stops · {(route.totalDistance/1000).toFixed(2)} km straight-line estimate</p>
      {role==='worker'&&route.status==='ASSIGNED'&&<button className="button" disabled={action.isPending} onClick={()=>action.mutate({path:'/worker/routes/'+id+'/start'})}>Start route</button>}
      {route.status==='COMPLETED'&&<p role="status">Route closed. The truck is available for another assignment.</p>}
    </Card>
    {action.error&&<p className="form-error" role="alert">{action.error.message}</p>}
    <div className="two section-gap"><div className="list">{route.stops.filter((s:any)=>!stopId||s.id===stopId).map((s:any)=>{
      const index=route.stops.findIndex((x:any)=>x.id===s.id),previous=index?route.stops[index-1]:{latitude:route.startLatitude,longitude:route.startLongitude};
      return <Card key={s.id} className={chosen===s.id?'selected-bin':''}><Badge>{s.binId?'BIN':'PICKUP'} · {s.status}</Badge><h3>Stop {s.sequence}: {s.address||s.pickupRequest?.address.addressLine||s.bin?.address}</h3>{s.pickupRequest&&<p>Resident: {s.pickupRequest.user.name}{s.pickupRequest.user.phone?' · '+s.pickupRequest.user.phone:''}</p>}{s.notes&&<p>Landmark / access: {s.notes}</p>}<div className="button-row"><button className="secondary" onClick={()=>setSelected(s.id)}>Show on map</button><a className="button" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${previous.latitude}%2C${previous.longitude}%3B${s.latitude}%2C${s.longitude}`}>Navigate to stop ↗</a>{!stopId&&<Link className="text-button" to={root+'/routes/'+id+'/stops/'+s.id}>Stop details</Link>}</div>
        {role==='worker'&&['PENDING','IN_PROGRESS'].includes(s.status)&&['ASSIGNED','IN_PROGRESS'].includes(route.status)&&<div className="button-row section-gap"><button className="button" disabled={action.isPending} onClick={()=>{if(window.confirm('Confirm collection at this stop?'))action.mutate({path:'/worker/stops/'+s.id+'/complete'});}}>Confirm collection</button><button className="secondary" disabled={action.isPending} onClick={()=>{if(window.confirm('Mark this stop as inaccessible?'))action.mutate({path:'/worker/stops/'+s.id+'/failed-access'});}}>Cannot access</button></div>}
      </Card>;
    })}{stopId&&!route.stops.some((s:any)=>s.id===stopId)&&<Card><p>This stop is not part of the route.</p></Card>}</div>
    <LocationMap points={route.stops.map((s:any)=>({...s,name:'Stop '+s.sequence+': '+s.address}))} selectedId={chosen} onSelect={setSelected} routePath={[{latitude:route.startLatitude,longitude:route.startLongitude},...route.stops]}/></div>
  </>}</>;
}

