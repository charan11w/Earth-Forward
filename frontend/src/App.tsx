import { Navigate,Route,Routes,useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState,homeFor } from './store';
import Shell from './components/layout/Shell';
import Auth from './components/features/auth/Auth';
import { Dashboard,Pickups,PickupDetail,Rewards,Wallet } from './components/features/resident/Resident';
import { RequestForm,NearbyBins } from './components/features/resident/Locations';
import Profile from './components/features/resident/Profile';
import { WorkerDashboard,RouteDetail } from './components/features/worker/Worker';
import { AdminDashboard,AdminUsers,AdminUserDetail,AdminTrucks,AdminBins,AdminRoutes,RoutePlanner,AdminRequests,AdminHotspots,AdminRewards } from './components/features/admin/Admin';
function S({children}:{children:React.ReactNode}){
  const {token,role}=useSelector((s:RootState)=>s.session),{pathname}=useLocation();
  if(!token)return <Navigate to="/auth/login" replace/>;
  if(pathname!=='/profile'){
    const required=pathname.startsWith('/admin')?'admin':pathname.startsWith('/worker')?'worker':'resident';
    if(role!==required)return <Navigate to={homeFor(role)} replace/>;
  }
  return <Shell>{children}</Shell>;
}
function Home(){const s=useSelector((s:RootState)=>s.session);return <Navigate to={s.token?homeFor(s.role):'/auth/login'} replace/>;}
export default function App(){return <Routes>
  <Route path="/auth/login" element={<Auth key="login"/>}/><Route path="/auth/register" element={<Auth key="register" register/>}/><Route path="/auth/driver" element={<Auth key="driver" driver/>}/>
  <Route path="/profile" element={<S><Profile/></S>}/>
  <Route path="/app" element={<Navigate to="/app/dashboard" replace/>}/><Route path="/app/dashboard" element={<S><Dashboard/></S>}/>
  <Route path="/app/pickups" element={<S><Pickups/></S>}/><Route path="/app/pickups/new" element={<S><RequestForm key="pickup" kind="pickup"/></S>}/><Route path="/app/pickups/:id" element={<S><PickupDetail/></S>}/>
  <Route path="/app/address" element={<Navigate to="/profile" replace/>}/><Route path="/app/bins" element={<Navigate to="/app/bins/nearby" replace/>}/><Route path="/app/bins/nearby" element={<S><NearbyBins/></S>}/>
  <Route path="/app/bins/request" element={<S><RequestForm key="bin" kind="bin"/></S>}/><Route path="/app/community-bin" element={<S><RequestForm key="community" kind="community"/></S>}/><Route path="/app/report" element={<S><RequestForm key="report" kind="report"/></S>}/>
  <Route path="/app/wallet" element={<S><Wallet/></S>}/><Route path="/app/rewards" element={<S><Rewards/></S>}/>
  <Route path="/worker" element={<S><WorkerDashboard/></S>}/><Route path="/worker/routes" element={<S><WorkerDashboard/></S>}/><Route path="/worker/route" element={<Navigate to="/worker" replace/>}/>
  <Route path="/worker/bins" element={<S><NearbyBins/></S>}/><Route path="/worker/routes/:id" element={<S><RouteDetail/></S>}/><Route path="/worker/routes/:id/stops" element={<S><RouteDetail/></S>}/><Route path="/worker/routes/:id/stops/:stopId" element={<S><RouteDetail/></S>}/>
  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace/>}/><Route path="/admin/dashboard" element={<S><AdminDashboard/></S>}/>
  <Route path="/admin/users" element={<S><AdminUsers/></S>}/><Route path="/admin/users/:id" element={<S><AdminUserDetail/></S>}/>
  <Route path="/admin/trucks" element={<S><AdminTrucks/></S>}/><Route path="/admin/bins" element={<S><AdminBins/></S>}/><Route path="/admin/community-bins" element={<Navigate to="/admin/bins" replace/>}/>
  <Route path="/admin/routes" element={<S><AdminRoutes/></S>}/><Route path="/admin/routes/new" element={<S><RoutePlanner/></S>}/><Route path="/admin/routes/:id" element={<S><RouteDetail/></S>}/><Route path="/admin/routes/:id/stops" element={<S><RouteDetail/></S>}/><Route path="/admin/routes/:id/stops/:stopId" element={<S><RouteDetail/></S>}/>
  <Route path="/admin/pickups" element={<S><Pickups/></S>}/><Route path="/admin/pickups/:id" element={<S><PickupDetail/></S>}/>
  <Route path="/admin/bin-requests" element={<S><AdminRequests/></S>}/><Route path="/admin/hotspots" element={<S><AdminHotspots/></S>}/><Route path="/admin/rewards" element={<S><AdminRewards/></S>}/>
  <Route path="*" element={<Home/>}/>
</Routes>;}

