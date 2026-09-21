import { api } from './api';
import { Session } from '../store';
export async function authenticate(email:string,password:string,profile?:{name:string},driver=false):Promise<Session>{
  const {user,token}=await api('/auth/'+(profile?'register':driver?'driver/login':'login'),{email:email.trim().toLowerCase(),password,...profile});
  const role=user.role.toLowerCase();
  if(!['resident','admin','worker'].includes(role))throw new Error('Unsupported account role');
  return {id:user.id,name:user.name,points:user.trashPoints,role,token,photoUrl:user.photoUrl};
}

