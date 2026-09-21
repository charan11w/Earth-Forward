import { FormEvent,useEffect,useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link,useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Recycle } from 'lucide-react';
import { signIn,homeFor } from '../../../store';
import { authenticate } from '../../../services/auth';
import { Field } from '../../common/UI';
export default function Auth({register=false,driver=false}:{register?:boolean;driver?:boolean}){
  const dispatch=useDispatch(),nav=useNavigate(),cache=useQueryClient();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[confirm,setConfirm]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{setEmail('');setPassword('');setName('');setConfirm('');setError('');},[register,driver]);
  async function go(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');
    if(register&&password!==confirm){setError('Passwords do not match');return;}
    setBusy(true);
    try{const session=await authenticate(email,password,register?{name}:undefined,driver);setEmail('');setPassword('');setName('');setConfirm('');cache.clear();dispatch(signIn(session));nav(homeFor(session.role),{replace:true});}
    catch(e){setError(e instanceof Error?e.message:'Sign in failed');setPassword('');setConfirm('');}
    finally{setBusy(false);}
  }
  return <div className="auth"><section className="auth-art"><div className="brand light"><span><Recycle/></span><b>earth<i>forward</i></b></div><div><span className="eyebrow">{driver?'COLLECTION TEAM':'WASTE LESS · LIVE MORE'}</span><h1>{driver?'Your route.\nA cleaner city.':'Small actions. A cleaner tomorrow.'}</h1><p>{driver?'Sign in to view your assigned truck, collection points and route.':'Book collections, find public bins and manage your saved addresses.'}</p></div></section><section className="auth-form"><form onSubmit={go} autoComplete="off"><h1>{register?'Create your account':driver?'Driver sign in':'Welcome back'}</h1><p>{register?'Register with your name, email and password. Add optional profile details later.':driver?'Use the driver account created by your administrator.':'Resident and administrator sign in.'}</p>
    {register&&<Field label="Full name"><input name="name" required minLength={2} value={name} onChange={e=>setName(e.target.value)}/></Field>}
    <Field label="Email"><input name="email" type="email" required autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)}/></Field>
    <Field label="Password"><input name="password" type="password" required minLength={8} maxLength={72} autoComplete={register?'new-password':'off'} value={password} onChange={e=>setPassword(e.target.value)}/></Field>
    {register&&<Field label="Confirm password"><input name="confirm" type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></Field>}
    {error&&<p role="alert" className="form-error">{error}</p>}<button className="button wide" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in'}</button>
    {!driver&&<p className="center"><Link to={register?'/auth/login':'/auth/register'}>{register?'Already registered? Sign in':'New resident? Create account'}</Link></p>}
    <p className="center"><Link to={driver?'/auth/login':'/auth/driver'}>{driver?'Resident / admin sign in':'Truck driver sign in'}</Link></p>
  </form></section></div>;
}

