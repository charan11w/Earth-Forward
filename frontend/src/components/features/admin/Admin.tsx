import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { Card,PageHead } from '../../common/UI';
import QueryStatus from '../../common/QueryStatus';
export { AdminUsers,AdminUserDetail } from './AdminUsers';
export { AdminTrucks,AdminBins } from './AdminFleet';
export { AdminRoutes,RoutePlanner } from './AdminRoutes';
export { AdminHotspots,AdminRequests,AdminRewards } from './AdminServices';
export function AdminDashboard(){
  const q=useQuery({queryKey:['admin-dashboard'],queryFn:()=>api('/admin/dashboard')});
  const tiles=[['users','Users & drivers','/admin/users'],['trucks','Trucks','/admin/trucks'],['bins','Active bins','/admin/bins'],['pendingPickups','Pending pickups','/admin/pickups'],['activeRoutes','Active routes','/admin/routes'],['openComplaints','Open reports','/admin/hotspots']];
  return <><PageHead title="Operations overview" subtitle="Live records from your community." action={<Link className="button" to="/admin/routes/new">Plan collection routes</Link>}/><QueryStatus query={q}/>{q.data&&<div className="grid3">{tiles.map(([key,label,to])=><Link key={key} to={to}><Card><strong className="stat-number">{q.data.counts[key]}</strong><h3>{label}</h3><span className="text-button">View details →</span></Card></Link>)}</div>}
    <Card className="section-gap"><h2>Manage collections</h2><div className="button-row"><Link className="secondary" to="/admin/users">Add drivers</Link><Link className="secondary" to="/admin/trucks">Add / assign trucks</Link><Link className="secondary" to="/admin/bins">Add bins</Link><Link className="secondary" to="/admin/bin-requests">Review bin requests</Link></div></Card>
  </>;
}

