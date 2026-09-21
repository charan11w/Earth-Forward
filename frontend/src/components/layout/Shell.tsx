import { useEffect,useState } from 'react';
import { Link,NavLink,useLocation,useNavigate } from 'react-router-dom';
import { useDispatch,useSelector } from 'react-redux';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Menu,Recycle,LogOut,X } from 'lucide-react';
import { RootState,homeFor,signOut,updateProfile } from '../../store';
import { api } from '../../services/api';
const links={
  resident:[['/app/dashboard','Home'],['/app/pickups','Pickups'],['/app/bins/nearby','Nearby bins'],['/app/wallet','TrashPoints'],['/app/rewards','Rewards']],
  worker:[['/worker','My routes'],['/worker/bins','Bin locations']],
  admin:[['/admin/dashboard','Overview'],['/admin/users','Users & drivers'],['/admin/trucks','Trucks'],['/admin/bins','Bins'],['/admin/routes','Routes'],['/admin/pickups','Pickups'],['/admin/bin-requests','Bin requests'],['/admin/hotspots','Hotspots'],['/admin/rewards','Rewards']]
};
const labels:Record<string,string>={app:'Home',admin:'Admin',worker:'Driver',dashboard:'Overview',users:'Users & drivers',trucks:'Trucks',bins:'Bins',routes:'Routes',pickups:'Pickups','bin-requests':'Bin requests',hotspots:'Hotspots',rewards:'Rewards',wallet:'TrashPoints',nearby:'Nearby bins',request:'Request a bin',new:'New',profile:'My profile',address:'Address',report:'Report waste','community-bin':'Community bin',stops:'Stop'};
export default function Shell({children}:{children:React.ReactNode}){
  const session=useSelector((s:RootState)=>s.session),dispatch=useDispatch(),nav=useNavigate(),cache=useQueryClient(),location=useLocation();
  const [open,setOpen]=useState(false);
  const profile=useQuery({queryKey:['profile'],queryFn:()=>api('/users/me')});
  useEffect(()=>{if(profile.data)dispatch(updateProfile(profile.data));},[profile.data,dispatch]);
  const home=homeFor(session.role),parts=location.pathname.split('/').filter(Boolean);
  const crumbs=parts.map((p,i)=>({label:labels[p]||(i===parts.length-1?'Details':p),path:'/'+parts.slice(0,i+1).join('/')}));
  function logout(){if(!window.confirm('Sign out of your account?'))return;const driver=session.role==='worker';dispatch(signOut());cache.clear();nav(driver?'/auth/driver':'/auth/login',{replace:true});}
  return <div className="shell"><aside className={open?'open':''}><Link className="brand" to={home}><span><Recycle/></span><b>earth<i>forward</i></b></Link><button className="icon mobile" aria-label="Close menu" onClick={()=>setOpen(false)}><X/></button><div className="impact"><small>EARTH FORWARD</small><strong>{session.role==='worker'?'Collection team':session.role==='admin'?'Administration':'Your neighborhood'}</strong></div><nav aria-label="Main navigation">{links[session.role].map(([to,label])=><NavLink key={to} to={to} end={to===home} onClick={()=>setOpen(false)}>{label}</NavLink>)}</nav><div className="profile"><Link className="profile-link" to="/profile" onClick={()=>setOpen(false)}>{session.photoUrl?<img className="avatar" src={session.photoUrl} alt=""/>:<span className="avatar">{session.name.charAt(0)}</span>}<span><b>{session.name}</b><small>My profile</small></span></Link><button className="icon" aria-label="Sign out" onClick={logout}><LogOut/></button></div></aside>
    <main><div className="topbar"><button className="icon mobile" aria-label="Open menu" onClick={()=>setOpen(true)}><Menu/></button><nav className="breadcrumbs" aria-label="Breadcrumb"><Link to={home}>Home</Link>{crumbs.slice(parts[0]==='profile'?0:1).map((c,i,a)=><span key={c.path}> / {i===a.length-1?<span aria-current="page">{c.label}</span>:<Link to={c.path}>{c.label}</Link>}</span>)}</nav><Link className="secondary profile-shortcut" to="/profile">My profile</Link></div><div className="content">{children}</div></main>
  </div>;
}

